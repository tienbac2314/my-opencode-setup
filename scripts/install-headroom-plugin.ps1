param(
  [string]$VersionsFile = "$HOME\.config\opencode\versions.env",
  [string]$CacheDir = "$HOME\.cache\opencode-headroom",
  [string]$Repository = "https://github.com/headroomlabs-ai/headroom.git"
)

$ErrorActionPreference = "Stop"

foreach ($command in @("git", "bun")) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "Required command not found on PATH: $command"
  }
}

$versions = & "$PSScriptRoot\read-versions.ps1" -Path $VersionsFile | ConvertFrom-Json
$source = Join-Path $CacheDir "source"
$entry = Join-Path $source "plugins\opencode\dist\entry.opencode.js"

New-Item -ItemType Directory -Path $CacheDir -Force | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $source ".git"))) {
  & git clone --filter=blob:none $Repository $source
  if ($LASTEXITCODE -ne 0) { throw "Failed to clone Headroom source" }
}

& git -C $source fetch origin $versions.HEADROOM_GIT_COMMIT --depth 1
if ($LASTEXITCODE -ne 0) { throw "Failed to fetch pinned Headroom commit" }
& git -C $source checkout --detach $versions.HEADROOM_GIT_COMMIT
if ($LASTEXITCODE -ne 0) { throw "Failed to check out pinned Headroom commit" }

Push-Location (Join-Path $source "plugins\opencode")
try {
  & bun install --frozen-lockfile
  if ($LASTEXITCODE -ne 0) {
    & bun install
    if ($LASTEXITCODE -ne 0) { throw "Headroom plugin dependency install failed" }
  }
  & bun run build
  if ($LASTEXITCODE -ne 0) { throw "Headroom OpenCode plugin build failed" }
} finally {
  Pop-Location
}

if (-not (Test-Path -LiteralPath $entry -PathType Leaf)) {
  throw "Headroom plugin entry missing after build: $entry"
}

Write-Output $entry
