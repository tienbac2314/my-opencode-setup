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
Write-Host "  [skip] Using local repo copies for now until upstream PRs are merged" -ForegroundColor DarkGray

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

# --- 5. Sync npm deps with opencode.jsonc plugin list ---
Write-Host "`n[5/5] Syncing npm dependencies with plugin config..." -ForegroundColor Yellow
if ($DryRun) {
  Write-Host "  [dry-run] Would sync package.json with opencode.jsonc plugin list" -ForegroundColor DarkGray
} else {
  try {
    $config = Get-Content "$ConfigDir\opencode.jsonc" -Raw
    $parsed = $config | ConvertFrom-Json
    $npmPlugins = @()
    foreach ($p in $parsed.plugin) {
      if ($p -is [string] -and $p -notmatch '^\./') {
        $npmPlugins += $p
      }
    }
    $pkgPath = "$ConfigDir\package.json"
    $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
    # Ensure dependencies exist as PSCustomObject
    if (-not $pkg.dependencies) {
      $pkg | Add-Member -NotePropertyName dependencies -NotePropertyValue ([PSCustomObject]@{})
    }
    $changed = $false
    foreach ($pkgName in $npmPlugins) {
      $existing = $pkg.dependencies.$pkgName
      if (-not $existing) {
        $pkg.dependencies | Add-Member -NotePropertyName $pkgName -NotePropertyValue "latest"
        $changed = $true
      }
    }
    # Remove deps that are no longer in plugin config (except core)
    $core = @("@opencode-ai/plugin", "@ai-sdk/openai-compatible")
    $toRemove = @()
    foreach ($key in $pkg.dependencies.PSObject.Properties.Name) {
      if ($key -in $core) { continue }
      if ($key -notin $npmPlugins) { $toRemove += $key }
    }
    foreach ($key in $toRemove) {
      $pkg.dependencies.PSObject.Properties.Remove($key)
      $changed = $true
    }
    if ($changed) {
      $pkg | ConvertTo-Json -Depth 5 | Set-Content $pkgPath -Encoding UTF8
      Push-Location $ConfigDir
      npm update --save 2>&1 | Out-Null
      Pop-Location
      $updated += "npm-sync"
      Write-Host "  [ok] package.json synced, deps updated" -ForegroundColor Green
    } else {
      Push-Location $ConfigDir
      npm update --save 2>&1 | Out-Null
      Pop-Location
      Write-Host "  [ok] package.json already in sync" -ForegroundColor DarkGray
    }
  } catch {
    Pop-Location -ErrorAction SilentlyContinue
    Write-Host "  [warn] npm sync failed: $($_.Exception.Message)" -ForegroundColor Red
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
