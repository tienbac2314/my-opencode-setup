param(
  [string]$Commit,
  [string]$CacheDir = [IO.Path]::Combine($HOME, ".cache", "opencode-headroom"),
  [string]$Repository = "https://github.com/headroomlabs-ai/headroom.git"
)

$ErrorActionPreference = "Stop"

foreach ($command in @("git", "bun")) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "Required command not found on PATH: $command"
  }
}

if (-not $Commit) {
  $manifest = Get-Content ([IO.Path]::Combine($PSScriptRoot, "..", "config", "components.json")) -Raw | ConvertFrom-Json
  $Commit = ($manifest.components | Where-Object id -eq "headroom-source").target
}
if ($Commit -notmatch '^[0-9a-fA-F]{40}$') { throw "Commit must be a full 40-character Git SHA" }
$source = Join-Path $CacheDir "source"
$entry = [IO.Path]::Combine($source, "plugins", "opencode", "dist", "entry.opencode.js")

New-Item -ItemType Directory -Path $CacheDir -Force | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $source ".git"))) {
  & git clone --filter=blob:none $Repository $source
  if ($LASTEXITCODE -ne 0) { throw "Failed to clone Headroom source" }
}

& git -C $source fetch origin $Commit --depth 1
if ($LASTEXITCODE -ne 0) { throw "Failed to fetch pinned Headroom commit" }
& git -C $source checkout --detach $Commit
if ($LASTEXITCODE -ne 0) { throw "Failed to check out pinned Headroom commit" }

Push-Location ([IO.Path]::Combine($source, "plugins", "opencode"))
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
