param(
  [switch]$SkipRtk
)

$ErrorActionPreference = "Stop"
$ConfigDir = "$env:USERPROFILE\.config\opencode"
$Temp = "$env:TEMP\opencode-bootstrap"
$RepoDir = $PSScriptRoot

Write-Output "=== OpenCode Dotfiles Bootstrap ==="

# 1. Copy config, skills, agents, and plugins
Write-Output "Copying config..."
New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
Copy-Item -Recurse "$RepoDir\config\*" $ConfigDir -Force

# Create opencode.jsonc from example if not present
$jsonc = "$ConfigDir\opencode.jsonc"
if (-not (Test-Path $jsonc)) {
  Copy-Item "$RepoDir\config\opencode.jsonc.example" $jsonc
  Write-Output "Created opencode.jsonc from example — edit API key before use"
}

Copy-Item -Recurse "$RepoDir\skills" $ConfigDir -Force
if (Test-Path "$RepoDir\agents") {
  New-Item -ItemType Directory -Path "$ConfigDir\agents" -Force | Out-Null
  Copy-Item -Recurse "$RepoDir\agents\*" "$ConfigDir\agents\" -Force
}
Copy-Item -Recurse "$RepoDir\plugins" "$ConfigDir\plugins" -Force
Copy-Item "$RepoDir\AGENTS.md" "$ConfigDir\AGENTS.md" -Force

# 2. Write package.json from template (always overwrites — keeps deps tracking latest)
Write-Output "Installing npm deps..."
$pkgPath = "$ConfigDir\package.json"
@{
  type = "module"
  dependencies = @{
    "@opencode-ai/plugin" = "latest"
  }
} | ConvertTo-Json | Set-Content $pkgPath -Encoding UTF8
Push-Location $ConfigDir
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm install
Pop-Location

# 3. Link .agents/skills/ unique skills into discovery scope
Write-Output "Linking .agents skills..."
$agentsDir = "$env:USERPROFILE\.agents\skills"
$existingSkills = Get-ChildItem "$ConfigDir\skills" -Directory | Select-Object -ExpandProperty Name
if (Test-Path $agentsDir) {
  Get-ChildItem $agentsDir -Directory | Where-Object { $_.Name -notin $existingSkills } | ForEach-Object {
    $link = Join-Path "$ConfigDir\skills" $_.Name
    if (-not (Test-Path $link)) {
      New-Item -ItemType Junction -Path $link -Target $_.FullName | Out-Null
      Write-Output "  Linked $($_.Name)"
    }
  }
}

# 5. Install RTK plugin (optional)
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
