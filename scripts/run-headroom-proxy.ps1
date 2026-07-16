<#
.SYNOPSIS
  Run the Headroom proxy without an interactive console.

.DESCRIPTION
  Hosts the pinned Headroom proxy for the current-user scheduled task. Standard
  output and error are redirected to bounded machine-local logs. Persistent
  Headroom memory and learning remain disabled because Supermemory owns memory.

.EXAMPLE
  pwsh ./scripts/run-headroom-proxy.ps1 -Port 8787 -HeadroomExecutable "$HOME/.local/bin/headroom.exe"
#>
[CmdletBinding()]
param(
  [ValidateRange(1, 65535)]
  [int]$Port = 8787,

  [Parameter(Mandatory)]
  [string]$HeadroomExecutable,

  [string]$LogDir = [IO.Path]::Combine($HOME, ".local", "state", "opencode-headroom"),

  [ValidateRange(1, 100)]
  [int]$MaxLogSizeMB = 5
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $HeadroomExecutable -PathType Leaf)) {
  throw "Headroom executable not found: $HeadroomExecutable"
}

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
$stdoutLog = Join-Path $LogDir "proxy.stdout.log"
$stderrLog = Join-Path $LogDir "proxy.stderr.log"

function Rotate-Log([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return }
  if ((Get-Item -LiteralPath $Path).Length -lt ($MaxLogSizeMB * 1MB)) { return }
  $previous = "$Path.previous"
  Remove-Item -LiteralPath $previous -Force -ErrorAction SilentlyContinue
  Move-Item -LiteralPath $Path -Destination $previous -Force
}

Rotate-Log $stdoutLog
Rotate-Log $stderrLog

# LiteLLM can emit its provider-list banner during import. Set suppression
# before Python starts; redirection below is the final containment boundary.
$env:LITELLM_SUPPRESS_DEBUG_INFO = "True"
$env:LITELLM_LOG = "ERROR"
$env:HEADROOM_TELEMETRY = "off"

& $HeadroomExecutable proxy `
  --port $Port `
  --no-memory-tools `
  --no-memory-context `
  --no-learn `
  --no-telemetry `
  1>> $stdoutLog 2>> $stderrLog
exit $LASTEXITCODE
