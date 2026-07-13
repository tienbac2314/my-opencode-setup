param(
  [switch]$SkipRtk,
  [switch]$SkipCodeGraph,
  [switch]$SkipMem0
)

$ErrorActionPreference = "Stop"
$ConfigDir = "$env:USERPROFILE\.config\opencode"
$RepoDir = $PSScriptRoot

Write-Output "=== OpenCode Dotfiles Bootstrap ==="

# ─── 1. Copy config, skills, agents, plugins ───
Write-Output "[1/8] Copying config files..."
New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null

# Create opencode.jsonc from example if not present (preserves user's API key)
$jsonc = "$ConfigDir\opencode.jsonc"
if (-not (Test-Path $jsonc)) {
  Copy-Item "$RepoDir\config\opencode.jsonc.example" $jsonc
  Write-Output "  Created opencode.jsonc from example — edit API key before use"
} else {
  Write-Output "  opencode.jsonc exists — skipping (won't overwrite your API key)"
}

# Copy AGENTS.md
Copy-Item "$RepoDir\AGENTS.md" "$ConfigDir\AGENTS.md" -Force

# Copy tui.json
if (Test-Path "$RepoDir\config\tui.json") {
  Copy-Item "$RepoDir\config\tui.json" "$ConfigDir\tui.json" -Force
  Write-Output "  Copied tui.json"
}

# Copy skills
Copy-Item -Recurse "$RepoDir\skills" $ConfigDir -Force

# Copy agents
if (Test-Path "$RepoDir\agents") {
  New-Item -ItemType Directory -Path "$ConfigDir\agents" -Force | Out-Null
  # Migration: remove legacy web-search-modules from agents/ (moved to data/)
  $legacyModules = "$ConfigDir\agents\web-search-modules"
  if (Test-Path $legacyModules) {
    Remove-Item $legacyModules -Recurse -Force
    Write-Output "  Migrated web-search-modules from agents/ to data/"
  }
  Copy-Item -Recurse "$RepoDir\agents\*" "$ConfigDir\agents\" -Force
}

# Copy data (web-search-strategies, etc.)
if (Test-Path "$RepoDir\data") {
  New-Item -ItemType Directory -Path "$ConfigDir\data" -Force | Out-Null
  Copy-Item -Recurse "$RepoDir\data\*" "$ConfigDir\data\" -Force
}

# ─── 2. Install file-based plugins (auto-discovered from plugins/ dir) ───
Write-Output "[2/8] Installing file-based plugins..."
$pluginsDir = "$ConfigDir\plugins"
New-Item -ItemType Directory -Path $pluginsDir -Force | Out-Null

# Clean up legacy/duplicate plugins from previous configurations
$legacyPlugins = @("opencode-lazy-load.ts", "tokens-source.ts", "rtk.ts", "mem0-selfhost-patch.ts")
foreach ($lp in $legacyPlugins) {
  Remove-Item (Join-Path $pluginsDir $lp) -Force -ErrorAction SilentlyContinue
}

Copy-Item -Recurse "$RepoDir\plugins\*" "$pluginsDir\" -Force
Copy-Item "$RepoDir\mem0-selfhost-patch.ts" "$ConfigDir\mem0-selfhost-patch.ts" -Force
Copy-Item "$RepoDir\verify-patch.ts" "$ConfigDir\verify-patch.ts" -Force
Write-Output "  Installed: models-discovery.js, mem0-selfhost-patch.ts, and verify-patch.ts"

# Download tokens command
New-Item -ItemType Directory -Path "$ConfigDir\commands" -Force | Out-Null
try {
  Invoke-RestMethod -Uri "https://raw.githubusercontent.com/omarwaly-ai/OpenCode-tokens-source/main/commands/tokens.md" -OutFile "$ConfigDir\commands\tokens.md" -TimeoutSec 15
  Write-Output "  Downloaded: commands/tokens.md"
} catch {
  Write-Output "  [warn] Failed to download tokens.md"
}

# ─── 3. Write package.json + npm install ───
Write-Output "[3/8] Installing npm dependencies..."
$pkgPath = "$ConfigDir\package.json"
@{
  type = "module"
  dependencies = @{
    "@opencode-ai/plugin" = "latest"
    "@ai-sdk/openai-compatible" = "latest"
    "@mem0/opencode-plugin" = "latest"
  }
} | ConvertTo-Json | Set-Content $pkgPath -Encoding UTF8
Push-Location $ConfigDir
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm install 2>&1 | Out-Null
Pop-Location
Write-Output "  npm install complete"

# ─── 4. Install oh-my-opencode-slim ───
Write-Output "[4/8] Installing oh-my-opencode-slim..."
$bunx = Get-Command bunx -ErrorAction SilentlyContinue
if ($bunx) {
  bunx oh-my-opencode-slim@latest install 2>&1 | Out-Null
  Write-Output "  oh-my-opencode-slim installed"
  # Restore our 9router preset if the installer overwrote it
  if (Test-Path "$RepoDir\config\oh-my-opencode-slim.json") {
    Copy-Item "$RepoDir\config\oh-my-opencode-slim.json" "$ConfigDir\oh-my-opencode-slim.json" -Force
    Write-Output "  Restored 9router preset config"
  }
} else {
  Write-Output "  [warn] bunx not found — install bun first: https://bun.sh"
}

# ─── 5. Install CodeGraph ───
if (-not $SkipCodeGraph) {
  Write-Output "[5/8] Installing CodeGraph..."
  $cg = Get-Command codegraph -ErrorAction SilentlyContinue
  if (-not $cg) {
    npm install -g @colbymchenry/codegraph 2>&1 | Out-Null
    Write-Output "  CodeGraph installed via npm"
  } else {
    Write-Output "  CodeGraph already installed ($(codegraph --version))"
  }
  # Wire into agents (idempotent)
  codegraph install --yes 2>&1 | Out-Null
  codegraph telemetry off 2>&1 | Out-Null
  Write-Output "  CodeGraph configured for OpenCode"
} else {
  Write-Output "[5/8] Skipping CodeGraph (--SkipCodeGraph)"
}

# ─── 6. Mem0 self-hosted fetch patch ───
if (-not $SkipMem0) {
  Write-Output "[6/8] Installing Mem0 self-hosted patch..."
  # The patch plugin (mem0-selfhost-patch.ts) is copied to the root ConfigDir
  # and loaded explicitly in the plugin array of opencode.jsonc to run before
  # the official @mem0/opencode-plugin is loaded at startup.
  Write-Output "  mem0-selfhost-patch.ts installed (loaded explicitly in opencode.jsonc)"
  Write-Output "  Required env vars: MEM0_HOST, MEM0_API_KEY"
  if (-not $env:MEM0_HOST) {
    Write-Output "  [warn] MEM0_HOST not set — run: [System.Environment]::SetEnvironmentVariable('MEM0_HOST', 'https://mem0.tienbac.dpdns.org', 'User')"
  }
  if (-not $env:MEM0_API_KEY) {
    Write-Output "  [warn] MEM0_API_KEY not set — run: [System.Environment]::SetEnvironmentVariable('MEM0_API_KEY', 'YOUR_KEY', 'User')"
  }
} else {
  Write-Output "[6/8] Skipping Mem0 (--SkipMem0)"
}

# ─── 7. Set environment variables ───
Write-Output "[7/8] Setting environment variables..."
$bgAgents = [System.Environment]::GetEnvironmentVariable('OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS', 'User')
if ($bgAgents -ne 'true') {
  [System.Environment]::SetEnvironmentVariable('OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS', 'true', 'User')
  Write-Output "  Set OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true (User scope)"
} else {
  Write-Output "  OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS already set"
}

# ─── 8. Link .agents/skills/ unique skills into discovery scope ───
Write-Output "[8/8] Linking .agents skills..."
$agentsDir = "$env:USERPROFILE\.agents\skills"
$existingSkills = Get-ChildItem "$ConfigDir\skills" -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name
if (Test-Path $agentsDir) {
  Get-ChildItem $agentsDir -Directory | Where-Object { $_.Name -notin $existingSkills } | ForEach-Object {
    $link = Join-Path "$ConfigDir\skills" $_.Name
    if (-not (Test-Path $link)) {
      New-Item -ItemType Junction -Path $link -Target $_.FullName | Out-Null
      Write-Output "  Linked $($_.Name)"
    }
  }
} else {
  Write-Output "  No .agents/skills/ found — skipping"
}

# ─── Optional: RTK ───
if (-not $SkipRtk) {
  $rtk = Get-Command rtk -ErrorAction SilentlyContinue
  if ($rtk) {
    Write-Output "RTK found, installing OpenCode plugin..."
    rtk init -g --opencode 2>$null
  }
}

Write-Output ""
Write-Output "=== Bootstrap complete ==="
Write-Output ""
Write-Output "Next steps:"
Write-Output "  1. Edit API key in: $ConfigDir\opencode.jsonc"
Write-Output "  2. Run 'codegraph init' in each project you want indexed"
Write-Output "  3. Run '/honcho:setup' or '/mem0:setup' in OpenCode for memory"
Write-Output "  4. Run 'ping all agents' in OpenCode to verify omo-slim"
Write-Output "  5. Restart your terminal for env vars to take effect"
Write-Output ""
