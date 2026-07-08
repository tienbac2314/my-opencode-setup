param(
  [switch]$SkipRtk
)

$ErrorActionPreference = "Stop"
$ConfigDir = "$env:USERPROFILE\.config\opencode"
$Temp = "$env:TEMP\opencode-bootstrap"

Write-Output "=== OpenCode Dotfiles Bootstrap ==="

# 1. Copy config and skills
Write-Output "Copying config..."
New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
Copy-Item -Recurse "$PSScriptRoot\config\*" $ConfigDir -Force
Copy-Item -Recurse "$PSScriptRoot\skills" $ConfigDir -Force
Copy-Item -Recurse "$PSScriptRoot\commands" "$ConfigDir\commands" -Force
Copy-Item "$PSScriptRoot\AGENTS.md" "$ConfigDir\AGENTS.md" -Force

# 2. Install lazy-loader
Write-Output "Installing opencode-lazy-loader..."
$lazyOk = npm ls -g opencode-lazy-loader --json 2>$null | ConvertFrom-Json | Select-Object -ExpandProperty dependencies -ErrorAction SilentlyContinue
if (-not $lazyOk) {
  npm install -g opencode-lazy-loader 2>&1
} else {
  Write-Output "lazy-loader already installed, skipping"
}

# 3. Install RTK plugin (optional)
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

# 4. Install npm deps for config dir
Write-Output "Installing npm deps..."
if (Test-Path "$ConfigDir\package.json") {
  Push-Location $ConfigDir
  npm install
  Pop-Location
}

Write-Output ""
Write-Output "=== Bootstrap complete ==="
Write-Output "Restart OpenCode to pick up changes."
Write-Output ""
Write-Output "=== Post-install cleanup ==="
