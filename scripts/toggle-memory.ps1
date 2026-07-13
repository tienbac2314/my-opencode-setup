<#
.SYNOPSIS
    Toggles the active OpenCode memory provider between Mem0 and SuperMemory.
.DESCRIPTION
    This script automates switching the client-side OpenCode configuration between
    Mem0 and SuperMemory. It backs up existing configs, manages skill junctions,
    and updates settings files.
.PARAMETER Provider
    The memory provider to switch to. Must be 'mem0' or 'supermemory'.
.EXAMPLE
    .\scripts\toggle-memory.ps1 -Provider supermemory
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("mem0", "supermemory")]
    [string]$Provider
)

$configDir = "$env:USERPROFILE\.config\opencode"
$opencodeJsonc = "$configDir\opencode.jsonc"
$omoJson = "$configDir\oh-my-opencode-slim.json"
$supermemoryJsonc = "$configDir\supermemory.jsonc"
$dotfilesDir = Split-Path -Parent $PSScriptRoot

Write-Output "=== OpenCode Memory Provider Toggle ==="
Write-Output "Targeting Provider: $Provider"
Write-Output "Config Directory:   $configDir"
Write-Output ""

if (-not (Test-Path $configDir)) {
    Write-Error "OpenCode config directory not found at $configDir. Please run bootstrap.ps1 first."
    return
}

# ─── 1. Backup Configurations ────────────────────────────────────────────────
$backupDir = "$configDir\.backup_memory"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

Write-Output "[step 1/5] Backing up current configuration files..."
if (Test-Path $opencodeJsonc) {
    Copy-Item -Path $opencodeJsonc -Destination "$backupDir\opencode.jsonc.bak" -Force
}
if (Test-Path $omoJson) {
    Copy-Item -Path $omoJson -Destination "$backupDir\oh-my-opencode-slim.json.bak" -Force
}
Write-Output "Backup saved to: $backupDir"

# ─── 2. Update opencode.jsonc ────────────────────────────────────────────────
Write-Output "[step 2/5] Updating opencode.jsonc plugins..."
if (Test-Path $opencodeJsonc) {
    $content = Get-Content -Path $opencodeJsonc -Raw
    
    if ($Provider -eq "supermemory") {
        if ($content -match '"./mem0-selfhost-patch.ts"') {
            $content = $content -replace '"./mem0-selfhost-patch.ts"', '"opencode-supermemory"'
            Write-Output "Swapped Mem0 patch with 'opencode-supermemory' in opencode.jsonc."
        } elseif ($content -notmatch '"opencode-supermemory"') {
            $content = $content -replace '"plugin":\s*\[', '"plugin": [`n    "opencode-supermemory",'
            Write-Output "Added 'opencode-supermemory' to opencode.jsonc plugins."
        }
    } else {
        # Provider is mem0
        if ($content -match '"opencode-supermemory"') {
            $content = $content -replace '"opencode-supermemory"', '"./mem0-selfhost-patch.ts"'
            Write-Output "Swapped 'opencode-supermemory' with Mem0 patch in opencode.jsonc."
        } elseif ($content -notmatch '"./mem0-selfhost-patch.ts"') {
            $content = $content -replace '"plugin":\s*\[', '"plugin": [`n    "./mem0-selfhost-patch.ts",'
            Write-Output "Added Mem0 patch to opencode.jsonc plugins."
        }
    }
    Set-Content -Path $opencodeJsonc -Value $content -NoNewline
} else {
    Write-Warning "opencode.jsonc not found, skipping plugin registration."
}

# ─── 3. Manage File Patches and Local config ───────────────────────────────
Write-Output "[step 3/5] Managing memory-specific configuration files..."

$mem0PatchLocal = "$configDir\mem0-selfhost-patch.ts"
$mem0PatchDisabled = "$configDir\mem0-selfhost-patch.ts.disabled"

if ($Provider -eq "supermemory") {
    # Disable Mem0 patch file so it doesn't run if referenced elsewhere
    if (Test-Path $mem0PatchLocal) {
        Rename-Item -Path $mem0PatchLocal -NewName (Split-Path $mem0PatchDisabled -Leaf) -Force
        Write-Output "Disabled local mem0-selfhost-patch.ts."
    }
    
    # Setup supermemory.jsonc if missing
    if (-not (Test-Path $supermemoryJsonc)) {
        $exampleConfig = "$dotfilesDir\config\supermemory.jsonc.example"
        if (Test-Path $exampleConfig) {
            Copy-Item -Path $exampleConfig -Destination $supermemoryJsonc
            Write-Output "Created supermemory.jsonc from template. Please update your API key in: $supermemoryJsonc"
        } else {
            Write-Warning "supermemory.jsonc.example template not found in dotfiles."
        }
    }
} else {
    # Provider is mem0
    # Enable Mem0 patch file
    if (Test-Path $mem0PatchDisabled) {
        Rename-Item -Path $mem0PatchDisabled -NewName (Split-Path $mem0PatchLocal -Leaf) -Force
        Write-Output "Enabled local mem0-selfhost-patch.ts."
    }
    
    # Disable SuperMemory configuration
    if (Test-Path $supermemoryJsonc) {
        Remove-Item -Path $supermemoryJsonc -Force
        Write-Output "Removed supermemory.jsonc."
    }
}

# ─── 4. Update oh-my-opencode-slim.json Hooks ───────────────────────────────
Write-Output "[step 4/5] Aligning Oh My OpenCode hooks configuration..."
if (Test-Path $omoJson) {
    try {
        $omo = Get-Content -Path $omoJson | ConvertFrom-Json
        
        if ($Provider -eq "supermemory") {
            # Disable conflicting context window limit recovery hook
            if ($null -eq $omo.disabled_hooks) {
                $omo | Add-Member -MemberType NoteProperty -Name "disabled_hooks" -Value @("anthropic-context-window-limit-recovery") -Force
            } elseif ("anthropic-context-window-limit-recovery" -notin $omo.disabled_hooks) {
                $omo.disabled_hooks = $omo.disabled_hooks + "anthropic-context-window-limit-recovery"
            }
            Write-Output "Disabled context window recovery hook in oh-my-opencode-slim.json (conflict mitigation)."
        } else {
            # Re-enable the hook
            if ($null -ne $omo.disabled_hooks) {
                $omo.disabled_hooks = @($omo.disabled_hooks | Where-Object { $_ -ne "anthropic-context-window-limit-recovery" })
                if ($omo.disabled_hooks.Count -eq 0) {
                    $omo.PSObject.Properties.Remove("disabled_hooks")
                }
            }
            Write-Output "Re-enabled context window recovery hook in oh-my-opencode-slim.json."
        }
        
        $omo | ConvertTo-Json -Depth 10 | Set-Content -Path $omoJson
    } catch {
        Write-Error "Failed to update oh-my-opencode-slim.json: $_"
    }
} else {
    Write-Warning "oh-my-opencode-slim.json not found, skipping."
}

# ─── 5. Manage Mem0 Skills ───────────────────────────────────────────────────
Write-Output "[step 5/5] Configuring skill junctions..."

$skillsDir = "$configDir\skills"
$mem0Skills = @(
    "mem0-remember", "mem0-search", "mem0-forget", "mem0-dream", 
    "mem0-pin", "mem0-scope", "mem0-status", "mem0-tour", "mem0-context-loader"
)

if ($Provider -eq "supermemory") {
    # Remove Mem0 skills junctions
    foreach ($skill in $mem0Skills) {
        $targetSkill = "$skillsDir\$skill"
        if (Test-Path $targetSkill) {
            Remove-Item -Path $targetSkill -Force
            Write-Output "Removed Mem0 skill junction: $skill"
        }
    }
} else {
    # Re-create Mem0 skills junctions
    $sourceSkillsDir = "$dotfilesDir\mem0-plugin\opencode-skills"
    if (Test-Path $sourceSkillsDir) {
        if (-not (Test-Path $skillsDir)) {
            New-Item -ItemType Directory -Path $skillsDir -Force | Out-Null
        }
        foreach ($skillName in $mem0Skills) {
            $sourceSkill = "$sourceSkillsDir\$skillName"
            $targetSkill = "$skillsDir\$skillName"
            
            if (Test-Path $sourceSkill) {
                if (Test-Path $targetSkill) {
                    Remove-Item -Path $targetSkill -Force
                }
                New-Item -ItemType Junction -Path $targetSkill -Target $sourceSkill | Out-Null
                Write-Output "Created Mem0 skill junction: $skillName"
            } else {
                Write-Warning "Source skill folder not found: $sourceSkill"
            }
        }
    } else {
        Write-Warning "Source Mem0 skills folder not found at $sourceSkillsDir."
    }
}

Write-Output ""
Write-Output "SUCCESS: Successfully switched memory provider to: $Provider!"
if ($Provider -eq "supermemory") {
    Write-Output "--> IMPORTANT: Please set your API key and baseURL in: $supermemoryJsonc"
    Write-Output "--> Ensure you run 'bun install opencode-supermemory' or restart OpenCode to reload the plugin."
}
Write-Output "========================================"
