[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidatePattern('^\d+(?:\.\d+){1,3}(?:[-+][0-9A-Za-z.-]+)?$')]
  [string]$Version,

  [string]$WaitForProcessId
)

$ErrorActionPreference = "Stop"

if (-not $WaitForProcessId) {
  $processIds = @(Get-Process -Name opencode -ErrorAction SilentlyContinue | ForEach-Object Id)
  if ($processIds) {
    $arguments = @(
      "-NoProfile",
      "-File", $PSCommandPath,
      "-Version", $Version,
      "-WaitForProcessId", ($processIds -join ',')
    )
    Start-Process -FilePath "pwsh" -ArgumentList $arguments -WindowStyle Hidden
    Write-Output "Queued OpenCode $Version update. Close all OpenCode windows to release opencode.exe."
    return
  }
} else {
  foreach ($processId in $WaitForProcessId -split ',') {
    if ($processId -notmatch '^\d+$') { throw "Invalid process ID: $processId" }
    Wait-Process -Id ([int]$processId) -ErrorAction SilentlyContinue
  }
}

& npm install --global "opencode-ai@$Version"
if ($LASTEXITCODE -ne 0) { throw "OpenCode npm update failed" }
Write-Output "Updated OpenCode to $Version."
