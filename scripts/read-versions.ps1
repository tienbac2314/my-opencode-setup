param(
  [Parameter(Mandatory = $true)]
  [string]$Path
)

$ErrorActionPreference = "Stop"
$requiredKeys = @(
  "OPENCODE_VERSION",
  "OPENCODE_PLUGIN_VERSION",
  "AI_SDK_OPENAI_COMPATIBLE_VERSION",
  "OPENCODE_SUPERMEMORY_VERSION",
  "OPENCODE_UPDATE_NOTIFIER_VERSION",
  "OH_MY_OPENCODE_SLIM_VERSION"
)
$versions = [ordered]@{}

foreach ($line in Get-Content -LiteralPath $Path) {
  $trimmed = $line.Trim()
  if (-not $trimmed -or $trimmed.StartsWith("#")) {
    continue
  }

  $separator = $trimmed.IndexOf("=")
  if ($separator -lt 1) {
    throw "Invalid version line: $trimmed"
  }

  $key = $trimmed.Substring(0, $separator).Trim()
  $value = $trimmed.Substring($separator + 1).Trim()
  if ($key -notmatch '^[A-Z][A-Z0-9_]*$') {
    throw "Invalid version key: $key"
  }
  if ($value -notmatch '^[0-9A-Za-z][0-9A-Za-z.+-]*$') {
    throw "Invalid exact version for ${key}: $value"
  }

  $versions[$key] = $value
}

foreach ($key in $requiredKeys) {
  if (-not $versions.Contains($key)) {
    throw "Missing required version key: $key"
  }
}

$versions | ConvertTo-Json -Compress
