<#
.SYNOPSIS
  Manage the independent Headroom proxy used by OpenCode Desktop and CLI.

.DESCRIPTION
  On Windows, installs a current-user logon scheduled task that runs the pinned
  Headroom proxy hidden and restarts it after failure. The task does not modify
  OpenCode providers, models, MCP servers, or configuration files.

.EXAMPLE
  pwsh ./scripts/manage-headroom-proxy.ps1 install

.EXAMPLE
  pwsh ./scripts/manage-headroom-proxy.ps1 status

.EXAMPLE
  pwsh ./scripts/manage-headroom-proxy.ps1 remove
#>
[CmdletBinding(SupportsShouldProcess)]
param(
  [Parameter(Position = 0)]
  [ValidateSet("install", "remove", "start", "stop", "status")]
  [string]$Action = "status",

  [ValidateRange(1, 65535)]
  [int]$Port = 8787,

  [string]$TaskName = "OpenCode Headroom Proxy",

  [string]$MarkerFile = [IO.Path]::Combine($HOME, ".config", "opencode", "headroom-proxy.url"),

  [string]$Manifest = [IO.Path]::Combine($PSScriptRoot, "..", "config", "components.json"),

  [string]$RunnerFile = [IO.Path]::Combine($PSScriptRoot, "run-headroom-proxy.ps1")
)

$ErrorActionPreference = "Stop"
if (-not $IsWindows) {
  throw "Headroom login-task management currently supports Windows only. Run 'headroom proxy --port $Port' from your user service manager on this platform."
}

function Test-HeadroomProxy {
  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/livez" -TimeoutSec 2
    return $health.service -eq "headroom-proxy" -and $health.status -eq "healthy"
  } catch {
    return $false
  }
}

function Wait-HeadroomProxy([bool]$Expected, [int]$Seconds = 30) {
  $deadline = [DateTime]::UtcNow.AddSeconds($Seconds)
  do {
    if ((Test-HeadroomProxy) -eq $Expected) { return $true }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $deadline)
  return $false
}

function Get-ProxyTask {
  return Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
}

switch ($Action) {
  "install" {
    $headroom = Get-Command headroom -CommandType Application,ExternalScript -ErrorAction Stop |
      Select-Object -First 1
    $manifestValue = Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
    $expectedVersion = [string]($manifestValue.components | Where-Object id -eq "headroom-python").target
    $actualVersion = ((& $headroom.Source --version) -join " ").Trim()
    if (-not $expectedVersion -or $actualVersion -notmatch "(?<![0-9.])$([regex]::Escape($expectedVersion))(?![0-9.])") {
      throw "Headroom version drift: expected $expectedVersion, got '$actualVersion'."
    }
    if (-not (Test-Path -LiteralPath $RunnerFile -PathType Leaf)) {
      throw "Headroom proxy runner missing: $RunnerFile"
    }
    $existingTask = Get-ProxyTask
    $restartOwnedTask = $existingTask -and [string]$existingTask.State -eq "Running"
    $user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $pwsh = Get-Command pwsh -CommandType Application -ErrorAction Stop | Select-Object -First 1
    $runnerArgument = $RunnerFile.Replace('"', '\"')
    $headroomArgument = $headroom.Source.Replace('"', '\"')
    $taskArguments = "-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -File `"$runnerArgument`" -Port $Port -HeadroomExecutable `"$headroomArgument`""
    $taskAction = New-ScheduledTaskAction -Execute $pwsh.Source -Argument $taskArguments -WorkingDirectory $HOME
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
    $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet `
      -AllowStartIfOnBatteries `
      -DontStopIfGoingOnBatteries `
      -Hidden `
      -StartWhenAvailable `
      -MultipleInstances IgnoreNew `
      -RestartCount 3 `
      -RestartInterval (New-TimeSpan -Minutes 1) `
      -ExecutionTimeLimit ([TimeSpan]::Zero)
    $task = New-ScheduledTask -Action $taskAction -Trigger $trigger -Principal $principal -Settings $settings

    if ($PSCmdlet.ShouldProcess($TaskName, "register current-user Headroom proxy logon task")) {
      Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null
      if ($restartOwnedTask) {
        Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        Wait-HeadroomProxy $false 15 | Out-Null
      }
      if ($restartOwnedTask -or -not (Test-HeadroomProxy)) { Start-ScheduledTask -TaskName $TaskName }
      if (-not (Wait-HeadroomProxy $true)) {
        throw "Headroom proxy task was installed but port $Port did not become healthy."
      }
      New-Item -ItemType Directory -Path (Split-Path $MarkerFile) -Force | Out-Null
      [IO.File]::WriteAllText($MarkerFile, "http://127.0.0.1:$Port`n", [Text.UTF8Encoding]::new($false))
    }
  }
  "remove" {
    if ((Get-ProxyTask) -and $PSCmdlet.ShouldProcess($TaskName, "stop and unregister Headroom proxy task")) {
      Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
      Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }
    if ((Test-Path -LiteralPath $MarkerFile) -and $PSCmdlet.ShouldProcess($MarkerFile, "remove Headroom bridge enablement marker")) {
      Remove-Item -LiteralPath $MarkerFile -Force
    }
  }
  "start" {
    if (-not (Get-ProxyTask)) { throw "Scheduled task not installed: $TaskName" }
    Start-ScheduledTask -TaskName $TaskName
    if (-not (Wait-HeadroomProxy $true)) { throw "Headroom proxy did not become healthy on port $Port." }
  }
  "stop" {
    if (Get-ProxyTask) { Stop-ScheduledTask -TaskName $TaskName }
    if (-not (Wait-HeadroomProxy $false 10)) {
      throw "Scheduled task stopped but a different process still owns Headroom port $Port."
    }
  }
  "status" {}
}

$taskState = Get-ProxyTask
[pscustomobject]@{
  TaskName = $TaskName
  Installed = $null -ne $taskState
  State = if ($taskState) { [string]$taskState.State } else { "NotInstalled" }
  ProxyUrl = "http://127.0.0.1:$Port"
  Enabled = Test-Path -LiteralPath $MarkerFile
  Healthy = Test-HeadroomProxy
}
