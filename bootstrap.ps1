param(
  [switch]$SkipRtk
)

$ErrorActionPreference = "Stop"
$ConfigDir = "$env:USERPROFILE\.config\opencode"
$Temp = "$env:TEMP\opencode-bootstrap"
$RepoDir = $PSScriptRoot

Write-Output "=== OpenCode Dotfiles Bootstrap ==="

# 1. Copy config, skills, commands, and plugins
Write-Output "Copying config..."
New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
Copy-Item -Recurse "$RepoDir\config\*" $ConfigDir -Force
Copy-Item -Recurse "$RepoDir\skills" $ConfigDir -Force
Copy-Item -Recurse "$RepoDir\commands" "$ConfigDir\commands" -Force
Copy-Item -Recurse "$RepoDir\plugins" "$ConfigDir\plugins" -Force
Copy-Item "$RepoDir\AGENTS.md" "$ConfigDir\AGENTS.md" -Force

# 2. Create package.json with deps & install locally
Write-Output "Installing npm deps..."
$pkgPath = "$ConfigDir\package.json"
if (-not (Test-Path $pkgPath)) {
  @{
    dependencies = @{
      "@opencode-ai/plugin" = "latest"
      "opencode-lazy-loader" = "^1.0.3"
    }
  } | ConvertTo-Json | Set-Content $pkgPath -Encoding UTF8
}
Push-Location $ConfigDir
npm install
Pop-Location

# 3. Patch opencode-lazy-loader to use plural 'skills' path
#    (keybrdist fork fix — npm package still uses singular 'skill')
Write-Output "Patching lazy-loader path to 'skills' (plural)..."
$loaderPath = "$ConfigDir\node_modules\opencode-lazy-loader\dist\skill-loader.js"
if (Test-Path $loaderPath) {
  $content = Get-Content $loaderPath -Raw
  $content = $content.Replace(
    "join(homedir(), '.config', 'opencode', 'skill')",
    "join(homedir(), '.config', 'opencode', 'skills')"
  ).Replace(
    "join(process.cwd(), '.opencode', 'skill')",
    "join(process.cwd(), '.opencode', 'skills')"
  )
  Set-Content $loaderPath $content -NoNewline
}

# 4. Install RTK plugin (optional)
if (-not $SkipRtk) {
  $rtk = Get-Command rtk -ErrorAction SilentlyContinue
  if (-not $rtk) {
    Write-Output "=== RTK not found ==="
    Write-Output "Install it manually:"
    Write-Output "  cargo install --git https://github.com/rtk-ai/rtk"
    Write-Output "  Or download from: https://github.com/rtk-ai/rtk/releases"
    Write-Output ""
    Write-Output "Then run: rtk init -g --opencode"
  } else {
    Write-Output "RTK found, installing OpenCode plugin..."
    rtk init -g --opencode 2>$null
  }
}

Write-Output ""
Write-Output "=== Bootstrap complete ==="
Write-Output "Restart OpenCode to pick up changes."
