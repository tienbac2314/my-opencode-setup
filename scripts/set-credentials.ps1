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
    "supermemory_base_url": "https://supermemory.example.com",
    "supermemory_api_key": "sm_...",
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

# ─── 2. Supermemory client config ───
if ($Credentials.supermemory_api_key -and $Credentials.supermemory_base_url) {
  @{
    apiKey = $Credentials.supermemory_api_key
    baseUrl = $Credentials.supermemory_base_url
  } | ConvertTo-Json | Set-Content "$ConfigDir\supermemory.jsonc" -Encoding UTF8
  Write-Output "[ok] Supermemory config written"
}

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
