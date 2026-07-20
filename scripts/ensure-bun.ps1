<#
.SYNOPSIS
  Ensure the standalone Bun runtime required by upstream OpenCode plugins.

.DESCRIPTION
  Keeps an existing Bun installation unchanged. When bun or bunx is missing,
  runs Bun's official platform installer and refreshes PATH for this process.
#>
[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = "Stop"

function Test-BunCommands {
  foreach ($name in @("bun", "bunx")) {
    $command = Get-Command $name -CommandType Application,ExternalScript -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if (-not $command) { return $false }
    try {
      & $command.Source --version *> $null
      if (-not $? -or $LASTEXITCODE -ne 0) { return $false }
    } catch {
      return $false
    }
  }
  return $true
}

if (Test-BunCommands) {
  Write-Output "Bun prerequisite already available."
  return
}

if (-not $PSCmdlet.ShouldProcess("official Bun user installation", "download and execute the upstream installer")) {
  return
}

if ($IsWindows) {
  Invoke-RestMethod https://bun.sh/install.ps1 | Invoke-Expression
} else {
  if (-not (Get-Command bash -ErrorAction SilentlyContinue)) {
    throw "Bun installation requires bash. Install bash, then rerun setup.ps1."
  }
  if (-not (Get-Command curl -ErrorAction SilentlyContinue)) {
    throw "Bun installation requires curl. Install curl, then rerun setup.ps1."
  }
  & bash -lc "curl -fsSL https://bun.sh/install | bash"
  if ($LASTEXITCODE -ne 0) { throw "Official Bun installer failed." }
}

$bunRoot = if ($env:BUN_INSTALL) { $env:BUN_INSTALL } else { Join-Path $HOME ".bun" }
$bunBin = Join-Path $bunRoot "bin"
if (Test-Path -LiteralPath $bunBin) {
  $env:PATH = "$bunBin$([IO.Path]::PathSeparator)$env:PATH"
}

if (-not (Test-BunCommands)) {
  throw "Bun installation completed but bun or bunx is unavailable. Restart the terminal, confirm ~/.bun/bin is on PATH, then rerun setup.ps1."
}

Write-Output "Installed official Bun prerequisite."
