<#
.SYNOPSIS
  Remove Headroom-owned provider and MCP entries from OpenCode config.

.DESCRIPTION
  Removes only provider.headroom, mcp.headroom, and the exact Serena MCP shape
  installed by Headroom. Other providers, MCP servers, comments, credentials,
  and formatting remain unchanged.

  With no -ConfigFile, scrub both ~/.config/opencode/opencode.jsonc and the
  leftover ~/.config/opencode/opencode.json if present. Empty leftover
  opencode.json shells (schema plus empty provider/mcp only) are deleted so a
  stale dual-config merge cannot reintroduce Headroom/Serena MCP.

.EXAMPLE
  pwsh ./scripts/remove-headroom-opencode-pollution.ps1

.EXAMPLE
  pwsh ./scripts/remove-headroom-opencode-pollution.ps1 -ConfigFile $HOME/.config/opencode/opencode.json
#>
[CmdletBinding(SupportsShouldProcess)]
param(
  [string]$ConfigFile
)

$ErrorActionPreference = "Stop"

function Test-HeadroomProvider($entry) {
  return $entry -and $entry.name -eq "Headroom Proxy" -and
    [string]$entry.options.baseURL -match '^http://127\.0\.0\.1:\d+/v1/?$'
}

function Test-HeadroomMcp($entry) {
  $command = @($entry.command) -join " "
  return $command -match '(?i)headroom(?:\.exe)?\s+mcp\s+serve$'
}

function Test-HeadroomSerena($entry) {
  $command = @($entry.command) -join " "
  return $command -match 'git\+https://github\.com/oraios/serena' -and
    $command -match 'serena\s+start-mcp-server' -and
    $command -match '--context\s+agent' -and
    $command -match '--open-web-dashboard\s+False'
}

function Get-JsonTokens([string]$text) {
  $tokens = [Collections.Generic.List[object]]::new()
  for ($index = 0; $index -lt $text.Length;) {
    $char = $text[$index]
    if ([char]::IsWhiteSpace($char)) { $index++; continue }
    if ($char -eq '/' -and $index + 1 -lt $text.Length) {
      if ($text[$index + 1] -eq '/') {
        $index += 2
        while ($index -lt $text.Length -and $text[$index] -notin "`r", "`n") { $index++ }
        continue
      }
      if ($text[$index + 1] -eq '*') {
        $index += 2
        while ($index + 1 -lt $text.Length -and -not ($text[$index] -eq '*' -and $text[$index + 1] -eq '/')) { $index++ }
        $index = [Math]::Min($index + 2, $text.Length)
        continue
      }
    }
    if ($char -eq '"') {
      $start = $index++
      while ($index -lt $text.Length) {
        if ($text[$index] -eq '\') { $index += 2; continue }
        if ($text[$index] -eq '"') { $index++; break }
        $index++
      }
      $tokens.Add([pscustomobject]@{
        Kind = "String"; Text = $text.Substring($start + 1, $index - $start - 2)
        Start = $start; End = $index
      })
      continue
    }
    if ('[]{}:,'.Contains([string]$char)) {
      $tokens.Add([pscustomobject]@{ Kind = "Symbol"; Text = [string]$char; Start = $index; End = $index + 1 })
    }
    $index++
  }
  return $tokens
}

function Remove-NestedObjectProperty([string]$text, [string]$parentName, [string]$childName) {
  $tokens = @(Get-JsonTokens $text)
  $parentOpen = -1
  $depth = 0
  for ($index = 0; $index + 2 -lt $tokens.Count; $index++) {
    $token = $tokens[$index]
    if ($token.Kind -eq "Symbol" -and $token.Text -in '[', '{') { $depth++; continue }
    if ($token.Kind -eq "Symbol" -and $token.Text -in ']', '}') { $depth--; continue }
    if ($depth -eq 1 -and $token.Kind -eq "String" -and $token.Text -eq $parentName -and
      $tokens[$index + 1].Text -eq ':' -and $tokens[$index + 2].Text -eq '{') {
      $parentOpen = $index + 2
      break
    }
  }
  if ($parentOpen -lt 0) { return $text }

  $childIndex = -1
  $relativeDepth = 0
  for ($index = $parentOpen; $index + 2 -lt $tokens.Count; $index++) {
    $token = $tokens[$index]
    if ($token.Kind -eq "Symbol" -and $token.Text -in '[', '{') { $relativeDepth++; continue }
    if ($token.Kind -eq "Symbol" -and $token.Text -in ']', '}') {
      $relativeDepth--
      if ($relativeDepth -eq 0) { break }
      continue
    }
    if ($relativeDepth -eq 1 -and $token.Kind -eq "String" -and $token.Text -eq $childName -and
      $tokens[$index + 1].Text -eq ':') {
      $childIndex = $index
      break
    }
  }
  if ($childIndex -lt 0) { return $text }

  $valueIndex = $childIndex + 2
  $valueEnd = $tokens[$valueIndex].End
  if ($tokens[$valueIndex].Kind -eq "Symbol" -and $tokens[$valueIndex].Text -in '[', '{') {
    $valueDepth = 0
    for ($index = $valueIndex; $index -lt $tokens.Count; $index++) {
      $token = $tokens[$index]
      if ($token.Kind -eq "Symbol" -and $token.Text -in '[', '{') { $valueDepth++ }
      elseif ($token.Kind -eq "Symbol" -and $token.Text -in ']', '}') {
        $valueDepth--
        if ($valueDepth -eq 0) { $valueEnd = $token.End; break }
      }
    }
  }

  $start = $tokens[$childIndex].Start
  $end = $valueEnd
  while ($end -lt $text.Length -and [char]::IsWhiteSpace($text[$end])) { $end++ }
  if ($end -lt $text.Length -and $text[$end] -eq ',') {
    $end++
  } else {
    while ($start -gt 0 -and [char]::IsWhiteSpace($text[$start - 1])) { $start-- }
    if ($start -gt 0 -and $text[$start - 1] -eq ',') { $start-- }
  }
  return $text.Substring(0, $start) + $text.Substring($end)
}

function Test-EmptyOpenCodeShell($parsed) {
  $keys = @($parsed.PSObject.Properties | Where-Object {
    $_.Name -ne '$schema' -and -not (
      $_.Name -in @('provider', 'mcp') -and @($_.Value.PSObject.Properties).Count -eq 0
    )
  })
  return $keys.Count -eq 0
}

function Remove-HeadroomPollutionFromFile([string]$path) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return }
  $resolvedPath = (Resolve-Path -LiteralPath $path).Path
  $content = [IO.File]::ReadAllText($resolvedPath)
  $parsed = $content | ConvertFrom-Json

  $updated = $content
  if (Test-HeadroomProvider $parsed.provider.headroom) {
    $updated = Remove-NestedObjectProperty $updated "provider" "headroom"
  }
  if (Test-HeadroomMcp $parsed.mcp.headroom) {
    $updated = Remove-NestedObjectProperty $updated "mcp" "headroom"
  }
  if (Test-HeadroomSerena $parsed.mcp.serena) {
    $updated = Remove-NestedObjectProperty $updated "mcp" "serena"
  }

  if ($updated -ne $content -and $PSCmdlet.ShouldProcess($resolvedPath, "remove Headroom-owned OpenCode entries")) {
    [IO.File]::WriteAllText($resolvedPath, $updated, [Text.UTF8Encoding]::new($false))
    Write-Output "Removed Headroom-owned provider and MCP entries from $resolvedPath"
    $parsed = $updated | ConvertFrom-Json
  }

  $isLegacyJson = [IO.Path]::GetFileName($resolvedPath) -eq "opencode.json"
  if ($isLegacyJson -and (Test-EmptyOpenCodeShell $parsed) -and $PSCmdlet.ShouldProcess($resolvedPath, "remove empty leftover OpenCode JSON shell")) {
    Remove-Item -LiteralPath $resolvedPath -Force
    Write-Output "Removed empty leftover $resolvedPath"
  }
}

$configDir = [IO.Path]::Combine($HOME, ".config", "opencode")
$targets = if ($PSBoundParameters.ContainsKey("ConfigFile") -and $ConfigFile) {
  @($ConfigFile)
} else {
  @(
    [IO.Path]::Combine($configDir, "opencode.jsonc"),
    [IO.Path]::Combine($configDir, "opencode.json")
  )
}

foreach ($target in $targets) {
  Remove-HeadroomPollutionFromFile $target
}
