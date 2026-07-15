[CmdletBinding(SupportsShouldProcess)]
param(
  [switch]$SkipRtk,
  [switch]$SkipCodeGraph,
  [switch]$SkipTests,
  [switch]$SkipEnvironment,
  [string]$ConfigDir = [IO.Path]::Combine($HOME, ".config", "opencode"),
  [string]$CacheDir = [IO.Path]::Combine($HOME, ".cache", "opencode")
)

$ErrorActionPreference = "Stop"
$RepoDir = $PSScriptRoot
$manifest = Get-Content "$RepoDir\config\components.json" -Raw | ConvertFrom-Json

function Copy-Tree([string]$Source, [string]$Destination) {
  if (-not (Test-Path -LiteralPath $Source)) { return }
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  Copy-Item (Join-Path $Source "*") $Destination -Recurse -Force
}

function Set-BackgroundAgentEnvironment {
  if ($IsWindows) {
    [Environment]::SetEnvironmentVariable("OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS", "true", "User")
  } else {
    $environmentDir = Join-Path $HOME ".config\environment.d"
    New-Item -ItemType Directory -Path $environmentDir -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $environmentDir "opencode.conf") -Value "OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true" -Encoding utf8
  }
  $env:OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS = "true"
}

function Copy-UniqueSkills {
  $destination = Join-Path $ConfigDir "skills"
  New-Item -ItemType Directory -Path $destination -Force | Out-Null
  $external = @(
    (Join-Path $HOME ".agents\skills"),
    (Join-Path $HOME ".claude\skills")
  ) | Where-Object { Test-Path -LiteralPath $_ }
  $externalNames = @($external | ForEach-Object { Get-ChildItem -LiteralPath $_ -Directory | ForEach-Object Name } | Select-Object -Unique)
  foreach ($name in $externalNames) {
    Remove-Item -LiteralPath (Join-Path $destination $name) -Recurse -Force -ErrorAction SilentlyContinue
  }
  foreach ($item in Get-ChildItem -LiteralPath "$RepoDir\skills" -Directory) {
    $target = Join-Path $destination $item.Name
    if ($item.Name -in $externalNames) {
      continue
    }
    New-Item -ItemType Directory -Path $target -Force | Out-Null
    Copy-Item (Join-Path $item.FullName "*") $target -Recurse -Force
  }
}

Write-Output "=== OpenCode setup ==="
New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null

$globalConfig = Join-Path $ConfigDir "opencode.jsonc"
if (-not (Test-Path -LiteralPath $globalConfig)) {
  Copy-Item "$RepoDir\config\opencode.jsonc.example" $globalConfig
  Write-Output "Created $globalConfig. Add credentials after setup."
}
Copy-Item "$RepoDir\config\tui.json" (Join-Path $ConfigDir "tui.json") -Force
Copy-Item "$RepoDir\config\oh-my-opencode-slim.json" (Join-Path $ConfigDir "oh-my-opencode-slim.json") -Force
Copy-Item "$RepoDir\AGENTS.md" (Join-Path $ConfigDir "AGENTS.md") -Force
Copy-Tree "$RepoDir\agents" (Join-Path $ConfigDir "agents")
Copy-Tree "$RepoDir\data" (Join-Path $ConfigDir "data")
Copy-Tree "$RepoDir\commands" (Join-Path $ConfigDir "commands")

$supermemory = Join-Path $ConfigDir "supermemory.jsonc"
if (-not (Test-Path -LiteralPath $supermemory)) {
  Copy-Item "$RepoDir\config\supermemory.jsonc.example" $supermemory
}

foreach ($legacy in @("opencode-lazy-load.ts", "tokens-source.ts", "mem0-selfhost-patch.ts")) {
  Remove-Item (Join-Path $ConfigDir "plugins\$legacy") -Force -ErrorAction SilentlyContinue
}
Remove-Item (Join-Path $ConfigDir "mem0-selfhost-patch.ts") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $ConfigDir "verify-patch.ts") -Force -ErrorAction SilentlyContinue

$excluded = @()
if ($SkipRtk) { $excluded += "rtk" }
if ($SkipCodeGraph) { $excluded += "codegraph" }
if ($excluded.Count) {
  $selected = @($manifest.components | Where-Object { -not $_.optional -and -not $_.disabled -and $_.id -notin $excluded } | ForEach-Object id)
  $apply = @("-NoProfile", "-File", "$RepoDir\maintain.ps1", "apply", "-Component", ($selected -join ','), "-ConfigDir", $ConfigDir, "-CacheDir", $CacheDir)
} else {
  $selected = @($manifest.components | Where-Object { -not $_.optional -and -not $_.disabled } | ForEach-Object id)
  $apply = @("-NoProfile", "-File", "$RepoDir\maintain.ps1", "apply", "-Component", ($selected -join ','), "-ConfigDir", $ConfigDir, "-CacheDir", $CacheDir)
}
& pwsh @apply
if ($LASTEXITCODE -ne 0) { throw "Component installation failed" }
Copy-UniqueSkills

if (-not $SkipCodeGraph) {
  & codegraph install --yes
  & codegraph telemetry off
}
if (-not $SkipRtk) {
  if (Get-Command rtk -ErrorAction SilentlyContinue) {
    & rtk init -g
    Copy-Item "$RepoDir\plugins\rtk.ts" (Join-Path $ConfigDir "plugins\rtk.ts") -Force
  }
}
if (-not $SkipEnvironment) { Set-BackgroundAgentEnvironment }

if (-not $SkipTests) {
  & pwsh -NoProfile -File "$RepoDir\maintain.ps1" verify -ConfigDir $ConfigDir -CacheDir $CacheDir
  if ($LASTEXITCODE -ne 0) { throw "Setup verification failed" }
}

Write-Output "=== Setup complete ==="
Write-Output "Add private credentials, restart terminal, then run: pwsh ./maintain.ps1 verify"
