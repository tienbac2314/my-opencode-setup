<#
.SYNOPSIS
  Update one reviewed OpenCode component at its exact private-file version.

.DESCRIPTION
  Compatibility entrypoint for the targeted update path in bootstrap.ps1.
  This script never uses broad package updates or raw upstream overwrites.
#>

param(
  [ValidateSet("OmoSlim")]
  [string]$Component = "OmoSlim",
  [switch]$DryRun,
  [string]$VersionsFile
)

$ErrorActionPreference = "Stop"
$RepoDir = $PSScriptRoot
$ConfigDir = "$env:USERPROFILE\.config\opencode"
if (-not $VersionsFile) {
  $VersionsFile = "$ConfigDir\versions.env"
}

if (-not (Test-Path -LiteralPath $VersionsFile)) {
  throw "Private version file not found: $VersionsFile. Run bootstrap.ps1 once or copy config/versions.env.example."
}

$versions = & "$RepoDir\scripts\read-versions.ps1" -Path $VersionsFile | ConvertFrom-Json
if ($DryRun) {
  Write-Output "Component: OmoSlim"
  Write-Output "Version: $($versions.OH_MY_OPENCODE_SLIM_VERSION)"
  Write-Output "Would run exact OMO Slim installer for version $($versions.OH_MY_OPENCODE_SLIM_VERSION)"
  Write-Output "Would restore: config/oh-my-opencode-slim.json"
  Write-Output "Would restore and repin: config/tui.json and active opencode.jsonc"
  Write-Output "Would restore: all six audited local plugins"
  Write-Output "Would install exact npm package under: $ConfigDir"
  return
}

& "$RepoDir\bootstrap.ps1" -UpdateOnly -Component $Component -VersionsFile $VersionsFile
