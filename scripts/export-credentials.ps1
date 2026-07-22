<#
.SYNOPSIS
  Export populated OpenCode credentials to one private JSON file.

.DESCRIPTION
  Reads only the managed 9router and optional OpenRouter fields.
  Values are never written to stdout. Keep the output outside Git.

.EXAMPLE
  pwsh -File scripts/export-credentials.ps1

.EXAMPLE
  pwsh -File scripts/export-credentials.ps1 -OutputFile C:\private\my-opencode-credentials.json -Force
#>

param(
  [string]$OutputFile = "$env:USERPROFILE\.config\opencode\credentials.json",
  [string]$ConfigDir = "$env:USERPROFILE\.config\opencode",
  [string]$AuthFile = "$env:USERPROFILE\.local\share\opencode\auth.json",
  [switch]$Force,
  [switch]$SkipAcl
)

$ErrorActionPreference = "Stop"

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
        Raw = $Content.Substring($start, $index - $start)
        Text = $Content.Substring($start + 1, $index - $start - 2)
      })
      continue
    }
    if ('[]{}:,'.Contains([string]$char)) {
      $tokens.Add([pscustomobject]@{ Kind = "Symbol"; Text = [string]$char })
    }
    $index++
  }
  return $tokens
}

function Find-ObjectPropertyValueIndex($Tokens, [int]$ObjectIndex, [string]$Name) {
  if ($Tokens[$ObjectIndex].Text -ne '{') { throw "Expected JSONC object while reading $Name" }
  $depth = 0
  for ($index = $ObjectIndex; $index -lt $Tokens.Count; $index++) {
    $token = $Tokens[$index]
    if ($token.Kind -eq "Symbol" -and $token.Text -in '{', '[') { $depth++; continue }
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

function Get-JsoncString([string]$Path, [string[]]$PropertyPath) {
  if (-not (Test-Path -LiteralPath $Path)) { throw "Configuration file not found: $Path" }
  $tokens = @(Get-JsoncTokens (Get-Content -Raw -LiteralPath $Path))
  $index = 0
  foreach ($name in $PropertyPath) {
    $index = Find-ObjectPropertyValueIndex $tokens $index $name
  }
  if ($tokens[$index].Kind -ne "String") { throw "Credential must be a JSON string: $($PropertyPath -join '.')" }
  return [string]($tokens[$index].Raw | ConvertFrom-Json)
}

$configFile = Join-Path $ConfigDir "opencode.jsonc"
$credentials = [ordered]@{
  router_api_key = Get-JsoncString $configFile @("provider", "9router", "options", "apiKey")
  router_base_url = Get-JsoncString $configFile @("provider", "9router", "options", "baseURL")
  openrouter_api_key = ""
}

if (Test-Path -LiteralPath $AuthFile) {
  $auth = Get-Content -Raw -LiteralPath $AuthFile | ConvertFrom-Json
  if ($auth.openrouter.type -eq "api") { $credentials.openrouter_api_key = [string]$auth.openrouter.key }
}

foreach ($name in "router_api_key", "router_base_url") {
  if ([string]::IsNullOrWhiteSpace([string]$credentials[$name])) { throw "Credential is empty: $name" }
}
if ((Test-Path -LiteralPath $OutputFile) -and -not $Force) {
  throw "Output already exists; use -Force to replace it: $OutputFile"
}

$parent = Split-Path -Parent $OutputFile
if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
$credentials | ConvertTo-Json | Set-Content -LiteralPath $OutputFile -Encoding UTF8

if (-not $SkipAcl -and $IsWindows) {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  $account = [Security.Principal.NTAccount]::new($identity)
  $acl = [Security.AccessControl.FileSecurity]::new()
  $acl.SetOwner($account)
  $acl.SetAccessRuleProtection($true, $false)
  $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new(
    $identity,
    [Security.AccessControl.FileSystemRights]::FullControl,
    [Security.AccessControl.AccessControlType]::Allow
  ))
  Set-Acl -LiteralPath $OutputFile -AclObject $acl
}

Write-Output "[ok] Exported credentials to $OutputFile. Keep this file private and outside Git."
