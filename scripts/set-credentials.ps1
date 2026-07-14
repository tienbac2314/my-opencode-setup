<#
.SYNOPSIS
  Restore OpenCode credentials from a private JSON file.

.DESCRIPTION
  Safe repository helper. It contains field names only, never real keys.
  Keep the JSON file outside Git. Run bootstrap before this script.

  Expected JSON:

  {
    "router_api_key": "",
    "router_base_url": "",
    "supermemory_api_key": "",
    "supermemory_base_url": "",
    "openrouter_api_key": ""
  }

  Example:
    pwsh -File scripts/set-credentials.ps1 -CredentialsFile C:\private\opencode-credentials.json
#>

param(
  [string]$CredentialsFile = "$env:USERPROFILE\.config\opencode\credentials.json",
  [string]$ConfigDir = "$env:USERPROFILE\.config\opencode",
  [string]$AuthFile = "$env:USERPROFILE\.local\share\opencode\auth.json",
  [switch]$SkipUserEnvironment
)

$ErrorActionPreference = "Stop"
$ConfigFile = Join-Path $ConfigDir "opencode.jsonc"
$SupermemoryFile = Join-Path $ConfigDir "supermemory.jsonc"

function Get-JsoncTokens([string]$Content) {
  $tokens = [Collections.Generic.List[object]]::new()

  for ($index = 0; $index -lt $Content.Length;) {
    $char = $Content[$index]
    if ([char]::IsWhiteSpace($char)) { $index++; continue }

    if ($char -eq '/' -and $index + 1 -lt $Content.Length) {
      if ($Content[$index + 1] -eq '/') {
        $index += 2
        while ($index -lt $Content.Length -and $Content[$index] -notin "`r", "`n") { $index++ }
        continue
      }
      if ($Content[$index + 1] -eq '*') {
        $index += 2
        while ($index + 1 -lt $Content.Length -and
          -not ($Content[$index] -eq '*' -and $Content[$index + 1] -eq '/')) { $index++ }
        $index = [Math]::Min($index + 2, $Content.Length)
        continue
      }
    }

    if ($char -eq '"') {
      $start = $index
      $index++
      while ($index -lt $Content.Length) {
        if ($Content[$index] -eq '\') { $index += 2; continue }
        if ($Content[$index] -eq '"') { $index++; break }
        $index++
      }
      $tokens.Add([pscustomobject]@{
        Kind = "String"
        Text = $Content.Substring($start + 1, $index - $start - 2)
        Start = $start
        End = $index
      })
      continue
    }

    if ('[]{}:,'.Contains([string]$char)) {
      $tokens.Add([pscustomobject]@{
        Kind = "Symbol"
        Text = [string]$char
        Start = $index
        End = $index + 1
      })
    }
    $index++
  }

  return $tokens
}

function Find-ObjectPropertyValueIndex($Tokens, [int]$ObjectIndex, [string]$Name) {
  if ($Tokens[$ObjectIndex].Text -ne '{') { throw "Expected JSONC object for $Name" }
  $depth = 0

  for ($index = $ObjectIndex; $index -lt $Tokens.Count; $index++) {
    $token = $Tokens[$index]
    if ($token.Kind -eq "Symbol" -and $token.Text -in '{', '[') {
      $depth++
      continue
    }
    if ($token.Kind -eq "Symbol" -and $token.Text -in '}', ']') {
      $depth--
      if ($depth -eq 0) { break }
      continue
    }
    if ($depth -eq 1 -and $token.Kind -eq "String" -and $token.Text -eq $Name -and
      $index + 2 -lt $Tokens.Count -and $Tokens[$index + 1].Text -eq ':') {
      return $index + 2
    }
  }

  throw "JSONC property not found: $Name"
}

if (-not (Test-Path -LiteralPath $CredentialsFile)) {
  throw "Private credential file not found: $CredentialsFile"
}

$Credentials = Get-Content -Raw -LiteralPath $CredentialsFile | ConvertFrom-Json
$required = @(
  "router_api_key",
  "router_base_url",
  "supermemory_api_key",
  "supermemory_base_url"
)

foreach ($name in $required) {
  $value = [string]$Credentials.$name
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing required credential field: $name"
  }
}

if (-not (Test-Path -LiteralPath $ConfigFile)) {
  throw "$ConfigFile not found. Run bootstrap.ps1 first."
}

$configText = Get-Content -Raw -LiteralPath $ConfigFile
$tokens = @(Get-JsoncTokens $configText)
$rootIndex = 0
$providerIndex = Find-ObjectPropertyValueIndex $tokens $rootIndex "provider"
$routerIndex = Find-ObjectPropertyValueIndex $tokens $providerIndex "9router"
$optionsIndex = Find-ObjectPropertyValueIndex $tokens $routerIndex "options"
$apiKeyIndex = Find-ObjectPropertyValueIndex $tokens $optionsIndex "apiKey"
$baseUrlIndex = Find-ObjectPropertyValueIndex $tokens $optionsIndex "baseURL"

$changes = @(
  [pscustomobject]@{ Token = $tokens[$apiKeyIndex]; Value = [string]$Credentials.router_api_key },
  [pscustomobject]@{ Token = $tokens[$baseUrlIndex]; Value = [string]$Credentials.router_base_url }
)
foreach ($change in $changes | Sort-Object { $_.Token.Start } -Descending) {
  if ($change.Token.Kind -ne "String") { throw "Credential target must be a JSON string" }
  $replacement = $change.Value | ConvertTo-Json -Compress
  $configText = $configText.Substring(0, $change.Token.Start) +
    $replacement + $configText.Substring($change.Token.End)
}
Set-Content -LiteralPath $ConfigFile -Value $configText -NoNewline -Encoding UTF8
Write-Output "[ok] Restored 9router config"

[ordered]@{
  apiKey = [string]$Credentials.supermemory_api_key
  baseUrl = [string]$Credentials.supermemory_base_url
} | ConvertTo-Json | Set-Content -LiteralPath $SupermemoryFile -Encoding UTF8
Write-Output "[ok] Restored Supermemory config"

$openrouterKey = [string]$Credentials.openrouter_api_key
if (-not [string]::IsNullOrWhiteSpace($openrouterKey)) {
  New-Item -ItemType Directory -Path (Split-Path $AuthFile) -Force | Out-Null
  $auth = if (Test-Path -LiteralPath $AuthFile) {
    Get-Content -Raw -LiteralPath $AuthFile | ConvertFrom-Json
  } else {
    [pscustomobject]@{}
  }
  $openrouter = [pscustomobject]@{ type = "api"; key = $openrouterKey }
  if ($auth.PSObject.Properties.Name -contains "openrouter") {
    $auth.openrouter = $openrouter
  } else {
    $auth | Add-Member -NotePropertyName "openrouter" -NotePropertyValue $openrouter
  }
  $auth | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $AuthFile -Encoding UTF8
  Write-Output "[ok] Restored OpenRouter auth"
}

if (-not $SkipUserEnvironment) {
  [Environment]::SetEnvironmentVariable(
    "SUPERMEMORY_API_KEY",
    [string]$Credentials.supermemory_api_key,
    "User"
  )
  [Environment]::SetEnvironmentVariable(
    "SUPERMEMORY_BASE_URL",
    [string]$Credentials.supermemory_base_url,
    "User"
  )
  [Environment]::SetEnvironmentVariable(
    "OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS",
    "true",
    "User"
  )
}

Write-Output "[ok] Credential restore complete. Restart OpenCode and terminals."
