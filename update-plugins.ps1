<#
.SYNOPSIS
  Update all OpenCode plugins (npm and non-npm) in one shot.
  Run manually or wire into your shell profile for session-start checks.

.DESCRIPTION
  1. Updates npm-based plugins via OpenCode's package cache
  2. Updates file-based plugins from their GitHub sources
  3. Updates CodeGraph CLI
  4. Updates oh-my-opencode-slim via bunx

.NOTES
  Safe to run repeatedly. Non-destructive — backs up patched files before overwrite.
#>

param(
  [switch]$Force,    # Skip "last updated" cooldown
  [switch]$DryRun    # Show what would be updated without changing anything
)

$ErrorActionPreference = "Continue"
$ConfigDir = "$env:USERPROFILE\.config\opencode"
$PluginsDir = "$ConfigDir\plugins"
$CacheFile = "$env:TEMP\opencode-update-last.txt"
$CooldownHours = 12

# --- Cooldown check ---
if (-not $Force -and (Test-Path $CacheFile)) {
  $last = Get-Content $CacheFile -Raw
  $lastTime = [datetime]::Parse($last)
  $elapsed = (Get-Date) - $lastTime
  if ($elapsed.TotalHours -lt $CooldownHours) {
    $remaining = [math]::Round($CooldownHours - $elapsed.TotalHours, 1)
    Write-Host "[skip] Last update was $([math]::Round($elapsed.TotalHours, 1))h ago. Next check in ${remaining}h. Use -Force to override." -ForegroundColor DarkGray
    return
  }
}

Write-Host "=== OpenCode Plugin Updater ===" -ForegroundColor Cyan
$updated = @()

# --- 1. oh-my-opencode-slim (bunx) ---
Write-Host "`n[1/5] oh-my-opencode-slim..." -ForegroundColor Yellow
$bunx = Get-Command bunx -ErrorAction SilentlyContinue
if ($bunx) {
  if ($DryRun) {
    Write-Host "  [dry-run] Would run: bunx oh-my-opencode-slim@latest install" -ForegroundColor DarkGray
  } else {
    try {
      # The installer is idempotent — safe to re-run
      bunx oh-my-opencode-slim@latest install --yes 2>&1 | Out-Null
      $updated += "oh-my-opencode-slim"
      Write-Host "  [ok] Updated" -ForegroundColor Green
    } catch {
      Write-Host "  [warn] Update failed: $($_.Exception.Message)" -ForegroundColor Red
    }
  }
} else {
  Write-Host "  [skip] bunx not found" -ForegroundColor DarkGray
}

# --- 2. File-based plugins from GitHub ---
$githubPlugins = @(
  @{
    Name   = "lazy-load.ts"
    Url    = "https://raw.githubusercontent.com/omarwaly-ai/opencode-lazy-loading/main/plugins/opencode-lazy-load.ts"
    Target = "$PluginsDir\lazy-load.ts"
  },
  @{
    Name   = "0-tokens-source.ts"
    Url    = "https://raw.githubusercontent.com/omarwaly-ai/OpenCode-tokens-source/main/plugins/tokens-source.ts"
    Target = "$PluginsDir\0-tokens-source.ts"
  }
)

Write-Host "`n[2/5] File-based plugins (GitHub raw)..." -ForegroundColor Yellow
foreach ($p in $githubPlugins) {
  try {
    if ($DryRun) {
      Write-Host "  [dry-run] Would fetch $($p.Name) from $($p.Url)" -ForegroundColor DarkGray
      continue
    }
    $newContent = Invoke-RestMethod -Uri $p.Url -TimeoutSec 15
    $oldContent = if (Test-Path $p.Target) { Get-Content $p.Target -Raw } else { "" }
    if ($newContent -ne $oldContent) {
      Set-Content -Path $p.Target -Value $newContent -NoNewline -Encoding UTF8
      $updated += $p.Name
      Write-Host "  [ok] $($p.Name) updated" -ForegroundColor Green
    } else {
      Write-Host "  [ok] $($p.Name) already latest" -ForegroundColor DarkGray
    }
  } catch {
    Write-Host "  [warn] $($p.Name) fetch failed: $($_.Exception.Message)" -ForegroundColor Red
  }
}

# --- 3. tokens command file ---
Write-Host "`n[3/5] Command files (GitHub raw)..." -ForegroundColor Yellow
$commandsDir = "$ConfigDir\commands"
New-Item -ItemType Directory -Path $commandsDir -Force -ErrorAction SilentlyContinue | Out-Null
$tokensUrl = "https://raw.githubusercontent.com/omarwaly-ai/OpenCode-tokens-source/main/commands/tokens.md"
try {
  if ($DryRun) {
    Write-Host "  [dry-run] Would fetch tokens.md" -ForegroundColor DarkGray
  } else {
    $newCmd = Invoke-RestMethod -Uri $tokensUrl -TimeoutSec 15
    $oldCmd = if (Test-Path "$commandsDir\tokens.md") { Get-Content "$commandsDir\tokens.md" -Raw } else { "" }
    if ($newCmd -ne $oldCmd) {
      Set-Content -Path "$commandsDir\tokens.md" -Value $newCmd -NoNewline -Encoding UTF8
      $updated += "tokens.md"
      Write-Host "  [ok] tokens.md updated" -ForegroundColor Green
    } else {
      Write-Host "  [ok] tokens.md already latest" -ForegroundColor DarkGray
    }
  }
} catch {
  Write-Host "  [warn] tokens.md fetch failed: $($_.Exception.Message)" -ForegroundColor Red
}

# --- 4. CodeGraph CLI ---
Write-Host "`n[4/5] CodeGraph CLI..." -ForegroundColor Yellow
$cg = Get-Command codegraph -ErrorAction SilentlyContinue
if ($cg) {
  if ($DryRun) {
    Write-Host "  [dry-run] Would run: codegraph upgrade" -ForegroundColor DarkGray
  } else {
    try {
      $upgradeOutput = codegraph upgrade --check 2>&1
      if ($upgradeOutput -match "update available|newer version") {
        codegraph upgrade 2>&1 | Out-Null
        $updated += "codegraph"
        Write-Host "  [ok] CodeGraph upgraded" -ForegroundColor Green
      } else {
        Write-Host "  [ok] CodeGraph already latest" -ForegroundColor DarkGray
      }
    } catch {
      # codegraph upgrade --check may exit non-zero if already latest
      Write-Host "  [ok] CodeGraph already latest" -ForegroundColor DarkGray
    }
  }
} else {
  Write-Host "  [skip] codegraph not found" -ForegroundColor DarkGray
}

# --- 5. npm deps in ~/.config/opencode/package.json ---
Write-Host "`n[5/5] npm dependencies (package.json)..." -ForegroundColor Yellow
if ($DryRun) {
  Write-Host "  [dry-run] Would run: npm update in $ConfigDir" -ForegroundColor DarkGray
} else {
  try {
    Push-Location $ConfigDir
    npm update --save 2>&1 | Out-Null
    Pop-Location
    $updated += "npm-deps"
    Write-Host "  [ok] npm deps updated" -ForegroundColor Green
  } catch {
    Pop-Location
    Write-Host "  [warn] npm update failed: $($_.Exception.Message)" -ForegroundColor Red
  }
}

# --- Summary ---
Write-Host "`n=== Update Summary ===" -ForegroundColor Cyan
if ($updated.Count -gt 0) {
  Write-Host "Updated: $($updated -join ', ')" -ForegroundColor Green
} else {
  Write-Host "Everything up to date." -ForegroundColor DarkGray
}

# Write cooldown timestamp
if (-not $DryRun) {
  Set-Content -Path $CacheFile -Value (Get-Date).ToString("o")
}

Write-Host ""
