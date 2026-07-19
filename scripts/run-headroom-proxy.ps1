<#
.SYNOPSIS
  Run the Headroom proxy without an interactive console.

.DESCRIPTION
  Hosts the pinned Headroom proxy for the current-user scheduled task. Standard
  output and error are merged into a bounded machine-local rolling log. Persistent
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
$combinedLog = Join-Path $LogDir "proxy.log"
$maxLogBytes = [long]$MaxLogSizeMB * 1MB
$maximumLineCharacters = [Math]::Max(1, [int](($maxLogBytes - 2) / 4))

function Rotate-Log([string]$Path, [long]$RequiredBytes = 0) {
  $currentBytes = if (Test-Path -LiteralPath $Path -PathType Leaf) {
    (Get-Item -LiteralPath $Path).Length
  } else {
    0
  }
  if ($currentBytes -eq 0 -or ($currentBytes + $RequiredBytes) -lt $maxLogBytes) { return }
  $previous = "$Path.previous"
  Remove-Item -LiteralPath $previous -Force -ErrorAction SilentlyContinue
  Move-Item -LiteralPath $Path -Destination $previous -Force
}

function Write-BoundedLogLine([string]$Line) {
  if ($Line.Length -gt $maximumLineCharacters) {
    $Line = $Line.Substring(0, $maximumLineCharacters)
  }
  $rendered = "$Line$([Environment]::NewLine)"
  $requiredBytes = [Text.Encoding]::UTF8.GetByteCount($rendered)
  Rotate-Log $combinedLog $requiredBytes
  [IO.File]::AppendAllText($combinedLog, $rendered, [Text.UTF8Encoding]::new($false))
}

Rotate-Log $combinedLog

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
  2>&1 | ForEach-Object { Write-BoundedLogLine ([string]$_) }
$proxyExitCode = $LASTEXITCODE
exit $proxyExitCode
