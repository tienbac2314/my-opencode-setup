<#
.SYNOPSIS
  Start a temporary Headroom proxy and launch OpenCode.

.DESCRIPTION
  Diagnostic fallback for systems without the login proxy task. Starts or
  reuses the local proxy, enables the globally auto-discovered bridge through
  process environment, and launches the real OpenCode executable. Normal
  Desktop and CLI use does not require this script after service installation.

.EXAMPLE
  pwsh ./scripts/start-opencode-headroom.ps1 models 9router

.EXAMPLE
  pwsh ./scripts/start-opencode-headroom.ps1 run --model 9router/oc/deepseek-v4-flash-free "Return HEADROOM_OK"
#>
[CmdletBinding(PositionalBinding = $false)]
param(
  [ValidateRange(1, 65535)]
  [int]$Port = 8787,

  [ValidateRange(1, 300)]
  [int]$StartupTimeoutSeconds = 30,

  [Parameter(Position = 0, ValueFromRemainingArguments)]
  [string[]]$OpenCodeArgs
)

$ErrorActionPreference = "Stop"
$headroom = Get-Command headroom -CommandType Application,ExternalScript -ErrorAction Stop |
  Select-Object -First 1
$opencode = Get-Command opencode -CommandType Application,ExternalScript -ErrorAction Stop |
  Select-Object -First 1
$proxyUrl = "http://127.0.0.1:$Port"

function Test-HeadroomProxy {
  try {
    $health = Invoke-RestMethod -Uri "$proxyUrl/livez" -TimeoutSec 2
    return $health.service -eq "headroom-proxy" -and $health.status -eq "healthy"
  } catch {
    return $false
  }
}

$proxyProcess = $null
if (-not (Test-HeadroomProxy)) {
  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $headroom.Source
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.ArgumentList.Add("proxy")
  $startInfo.ArgumentList.Add("--port")
  $startInfo.ArgumentList.Add([string]$Port)
  $startInfo.ArgumentList.Add("--no-memory-tools")
  $startInfo.ArgumentList.Add("--no-memory-context")
  $startInfo.ArgumentList.Add("--no-learn")
  $startInfo.ArgumentList.Add("--no-telemetry")
  $proxyProcess = [Diagnostics.Process]::Start($startInfo)

  $deadline = [DateTime]::UtcNow.AddSeconds($StartupTimeoutSeconds)
  while (-not (Test-HeadroomProxy)) {
    if ($proxyProcess.HasExited) {
      throw "Headroom proxy exited during startup with code $($proxyProcess.ExitCode)."
    }
    if ([DateTime]::UtcNow -ge $deadline) {
      throw "Headroom proxy did not become healthy within $StartupTimeoutSeconds seconds."
    }
    Start-Sleep -Milliseconds 200
  }
}

$previousProxy = [Environment]::GetEnvironmentVariable("HEADROOM_PROXY_URL", "Process")
$exitCode = 1
try {
  $env:HEADROOM_PROXY_URL = $proxyUrl
  & $opencode.Source @OpenCodeArgs
  $exitCode = $LASTEXITCODE
} finally {
  [Environment]::SetEnvironmentVariable("HEADROOM_PROXY_URL", $previousProxy, "Process")
  if ($proxyProcess -and -not $proxyProcess.HasExited) {
    try {
      $proxyProcess.Kill($true)
      $proxyProcess.WaitForExit(5000) | Out-Null
    } catch {
      Stop-Process -Id $proxyProcess.Id -Force -ErrorAction SilentlyContinue
    }
  }
}

$global:LASTEXITCODE = $exitCode
exit $exitCode
