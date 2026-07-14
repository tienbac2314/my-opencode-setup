param(
  [switch]$SkipRtk,
  [switch]$SkipCodeGraph,
  [switch]$UpdateOnly,
  [ValidateSet("OmoSlim")]
  [string]$Component,
  [string]$VersionsFile
)

$ErrorActionPreference = "Stop"
$ConfigDir = "$env:USERPROFILE\.config\opencode"
$RepoDir = $PSScriptRoot

New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
if (-not $VersionsFile) {
  $VersionsFile = "$ConfigDir\versions.env"
}
if (-not (Test-Path -LiteralPath $VersionsFile)) {
  Copy-Item "$RepoDir\config\versions.env.example" $VersionsFile
  Write-Output "Created private version file: $VersionsFile"
}
$versions = & "$RepoDir\scripts\read-versions.ps1" -Path $VersionsFile | ConvertFrom-Json

function Install-OmoSlim {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Version,
    [switch]$Required
  )

  $bunx = Get-Command bunx -ErrorAction SilentlyContinue
  if (-not $bunx) {
    if ($Required) {
      throw "bunx not found. Install Bun before updating OMO Slim."
    }
    Write-Output "  [warn] bunx not found - install bun first: https://bun.sh"
    return
  }

  bunx "oh-my-opencode-slim@$Version" install --yes 2>&1 | Out-Null
  Write-Output "  oh-my-opencode-slim@$Version installed"

  Copy-Item "$RepoDir\config\oh-my-opencode-slim.json" "$ConfigDir\oh-my-opencode-slim.json" -Force
  Write-Output "  Restored tailored OMO Slim config"

  Copy-Item "$RepoDir\config\tui.json" "$ConfigDir\tui.json" -Force
  & "$RepoDir\scripts\pin-opencode-plugin.ps1" -Path "$ConfigDir\tui.json" -Name "oh-my-opencode-slim" -Version $Version
  if ($versions.OPENCODE_GOAL_PLUGIN_VERSION) {
    & "$RepoDir\scripts\pin-opencode-plugin.ps1" -Path "$ConfigDir\tui.json" -Name "@prevalentware/opencode-goal-plugin" -Version $versions.OPENCODE_GOAL_PLUGIN_VERSION
  }
  Write-Output "  Restored and pinned TUI plugin config"

  $activeConfigPath = "$ConfigDir\opencode.jsonc"
  if (-not (Test-Path -LiteralPath $activeConfigPath)) {
    throw "Active OpenCode config not found: $activeConfigPath"
  }
  & "$RepoDir\scripts\pin-opencode-plugin.ps1" -Path $activeConfigPath -Name "oh-my-opencode-slim" -Version $Version
  if ($versions.OPENCODE_GOAL_PLUGIN_VERSION) {
    & "$RepoDir\scripts\pin-opencode-plugin.ps1" -Path $activeConfigPath -Name "@prevalentware/opencode-goal-plugin" -Version $versions.OPENCODE_GOAL_PLUGIN_VERSION
  }
  Write-Output "  Restored pinned global plugin config"

  New-Item -ItemType Directory -Path "$ConfigDir\plugins" -Force | Out-Null
  Copy-Item "$RepoDir\plugins\*" "$ConfigDir\plugins" -Force
  Write-Output "  Restored six audited local plugins"

  Push-Location $ConfigDir
  try {
    npm install --save-exact "oh-my-opencode-slim@$Version" 2>&1 | Out-Null
  } finally {
    Pop-Location
  }
  Write-Output "  Normalized exact OMO Slim package"
}

if ($UpdateOnly) {
  if ($Component -ne "OmoSlim") {
    throw "-UpdateOnly requires -Component OmoSlim"
  }

  Write-Output "=== OpenCode Targeted Update ==="
  Install-OmoSlim -Version $versions.OH_MY_OPENCODE_SLIM_VERSION -Required
  Write-Output "=== OMO Slim update complete ==="
  Write-Output "Run 'ping all agents' and verify TUI/Desktop plugin lists."
  return
}

Write-Output "=== OpenCode Dotfiles Bootstrap ==="

# ─── 1. Copy config, skills, agents, plugins ───
Write-Output "[1/8] Copying config files..."
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
Write-Output "  Installed file-based plugins from repository"

# Create Supermemory config only when absent so bootstrap never overwrites credentials.
$supermemoryConfig = "$ConfigDir\supermemory.jsonc"
if (-not (Test-Path $supermemoryConfig)) {
  Copy-Item "$RepoDir\config\supermemory.jsonc.example" $supermemoryConfig
  Write-Output "  Created supermemory.jsonc from template"
}

# Remove root-level Mem0 artifacts left by older installations.
Remove-Item "$ConfigDir\mem0-selfhost-patch.ts" -Force -ErrorAction SilentlyContinue
Remove-Item "$ConfigDir\mem0-selfhost-patch.ts.disabled" -Force -ErrorAction SilentlyContinue
Remove-Item "$ConfigDir\verify-patch.ts" -Force -ErrorAction SilentlyContinue

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
$config = Get-Content "$ConfigDir\opencode.jsonc" -Raw | ConvertFrom-Json
$dependencies = [ordered]@{
  "@opencode-ai/plugin"       = $versions.OPENCODE_PLUGIN_VERSION
  "@ai-sdk/openai-compatible" = $versions.AI_SDK_OPENAI_COMPATIBLE_VERSION
  "opencode-supermemory"      = $versions.OPENCODE_SUPERMEMORY_VERSION
  "@prevalentware/opencode-goal-plugin" = $versions.OPENCODE_GOAL_PLUGIN_VERSION
}
foreach ($plugin in $config.plugin) {
  if ($plugin -is [string] -and $plugin -notmatch '^\./') {
    $separator = $plugin.LastIndexOf('@')
    if ($separator -gt 0) {
      $packageName = $plugin.Substring(0, $separator)
      $version = $plugin.Substring($separator + 1)
      $dependencies[$packageName] = $version
    } else {
      $dependencies[$plugin] = "latest"
    }
  }
}
$dependencies["opencode-update-notifier"] = $versions.OPENCODE_UPDATE_NOTIFIER_VERSION
$dependencies["oh-my-opencode-slim"] = $versions.OH_MY_OPENCODE_SLIM_VERSION
@{
  type = "module"
  dependencies = $dependencies
} | ConvertTo-Json | Set-Content $pkgPath -Encoding UTF8
Push-Location $ConfigDir
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm install 2>&1 | Out-Null
Pop-Location
Write-Output "  npm install complete"

# ─── 4. Install oh-my-opencode-slim ───
Write-Output "[4/8] Installing oh-my-opencode-slim..."
Install-OmoSlim -Version $versions.OH_MY_OPENCODE_SLIM_VERSION

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

# ─── 6. Supermemory configuration ───
Write-Output "[6/8] Checking Supermemory configuration..."
if ((Get-Content $supermemoryConfig -Raw) -match 'sm_your_api_key_here') {
  Write-Output "  [warn] Add API key to $supermemoryConfig"
} else {
  Write-Output "  Supermemory configuration present"
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
    Copy-Item "$RepoDir\plugins\rtk.ts" "$ConfigDir\plugins\rtk.ts" -Force
    Write-Output "  Restored audited RTK plugin"
  }
}

Write-Output ""
Write-Output "=== Bootstrap complete ==="
Write-Output ""
Write-Output "Next steps:"
Write-Output "  1. Edit API key in: $ConfigDir\opencode.jsonc"
Write-Output "  2. Run 'codegraph init' in each project you want indexed"
Write-Output "  3. Configure Supermemory in: $ConfigDir\supermemory.jsonc"
Write-Output "  4. Run 'ping all agents' in OpenCode to verify omo-slim"
Write-Output "  5. Restart your terminal for env vars to take effect"
Write-Output ""
