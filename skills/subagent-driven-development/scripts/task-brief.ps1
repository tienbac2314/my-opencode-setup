param(
  [Parameter(Mandatory, Position = 0)][string]$PlanFile,
  [Parameter(Mandatory, Position = 1)][int]$TaskNumber,
  [Parameter(Position = 2)][string]$OutFile
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $PlanFile -PathType Leaf)) {
  throw "no such plan file: $PlanFile"
}

if (-not $OutFile) {
  $root = (& git rev-parse --show-toplevel 2>$null)
  if ($LASTEXITCODE -ne 0) { throw 'current directory is not inside a Git repository' }
  $directory = Join-Path $root '.superpowers\sdd'
  New-Item -ItemType Directory -Path $directory -Force | Out-Null
  Set-Content -LiteralPath (Join-Path $directory '.gitignore') -Value '*'
  $OutFile = Join-Path $directory "task-$TaskNumber-brief.md"
}

$insideFence = $false
$insideTask = $false
$lines = foreach ($line in Get-Content -LiteralPath $PlanFile) {
  if ($line -match '^```') {
    $insideFence = -not $insideFence
  } elseif (-not $insideFence -and $line -match '^#+\s+Task\s+(\d+)(?:\D|$)') {
    $insideTask = [int]$Matches[1] -eq $TaskNumber
  }
  if ($insideTask) { $line }
}

if (-not $lines) {
  throw "task $TaskNumber not found in $PlanFile"
}

Set-Content -LiteralPath $OutFile -Value $lines
Write-Output "wrote ${OutFile}: $($lines.Count) lines"
