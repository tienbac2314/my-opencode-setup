<#
.SYNOPSIS
  Restore all credentials and environment variables for the full OpenCode setup.

.DESCRIPTION
  Reads credentials from a credentials.json file (stored separately, NOT in git)
  and applies them to the local environment.

  This script is the SAFE TEMPLATE. It expects a credentials.json file in
  ~/.config/opencode/credentials.json with this structure:

  {
    "router_api_key": "sk-...",
    "router_base_url": "https://...",
    "mem0_host": "https://...",
    "mem0_api_key": "sk_admin_...",
    "openrouter_api_key": "sk-or-v1-..."
  }

  To set up credentials for the first time:
    1. Copy this script to your Desktop as 'my-opencode-credentials.ps1'
    2. Edit the $Credentials variable below with your actual values
    3. Run it once: pwsh -File my-opencode-credentials.ps1
    4. Store the edited file in your password manager
    5. Never commit credentials.json or the edited script to git
#>

$ErrorActionPreference = "Stop"
$ConfigDir = "$env:USERPROFILE\.config\opencode"
$ConfigFile = "$ConfigDir\opencode.jsonc"
$CredsFile = "$ConfigDir\credentials.json"

# ─── Load credentials from JSON file ───
if (-not (Test-Path $CredsFile)) {
  Write-Output "[error] $CredsFile not found" -ForegroundColor Red
  Write-Output "Create it with your actual credentials. See template above."
  exit 1
}

$Credentials = Get-Content $CredsFile -Raw | ConvertFrom-Json

# ─── 1. 9router API key in opencode.jsonc ───
if (-not (Test-Path $ConfigDir)) {
  New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
}

if (Test-Path $ConfigFile) {
  $config = Get-Content $ConfigFile -Raw
  if ($config -match '9router') {
    $config = $config -replace '(?<=apiKey":\s*")[^"]+(?=")', $Credentials.router_api_key
    Set-Content $ConfigFile $config -NoNewline -Encoding UTF8
    Write-Output "[ok] 9router apiKey patched in $ConfigFile"
  } else {
    Write-Output "[skip] $ConfigFile has no 9router block — manual edit required"
  }
} else {
  Write-Output "[warn] $ConfigFile does not exist — run bootstrap.ps1 first"
}

# ─── 2. Mem0 env vars ───
[System.Environment]::SetEnvironmentVariable('MEM0_HOST', $Credentials.mem0_host, 'User')
Write-Output "[ok] MEM0_HOST set: $($Credentials.mem0_host)"
[System.Environment]::SetEnvironmentVariable('MEM0_API_KEY', $Credentials.mem0_api_key, 'User')
Write-Output "[ok] MEM0_API_KEY set"

# ─── 3. OpenCode experimental flag ───
[System.Environment]::SetEnvironmentVariable('OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS', 'true', 'User')
Write-Output "[ok] OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true"

# ─── 4. OpenRouter key (optional) ───
if ($Credentials.openrouter_api_key) {
  $authFile = "$env:USERPROFILE\.local\share\opencode\auth.json"
  New-Item -ItemType Directory -Path (Split-Path $authFile) -Force | Out-Null
  @{ openrouter = @{ type = "api"; key = $Credentials.openrouter_api_key } } |
    ConvertTo-Json -Depth 10 | Set-Content $authFile -Encoding UTF8
  Write-Output "[ok] OpenRouter key written to auth.json"
}

Write-Output ""
Write-Output "=== Credentials restored ===" -ForegroundColor Green
Write-Output "Restart any open terminals for env vars to take effect."
