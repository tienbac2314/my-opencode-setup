[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$Path
)

$ErrorActionPreference = "Stop"
$resolvedPath = (Resolve-Path -LiteralPath $Path).Path
$content = [IO.File]::ReadAllText($resolvedPath)
$parsed = $content | ConvertFrom-Json
if ($parsed.command.goal.template -ne '$ARGUMENTS') { return }

$tokens = [Collections.Generic.List[object]]::new()
for ($index = 0; $index -lt $content.Length;) {
  $char = $content[$index]
  if ([char]::IsWhiteSpace($char)) { $index++; continue }
  if ($char -eq '/' -and $index + 1 -lt $content.Length) {
    if ($content[$index + 1] -eq '/') {
      $index += 2
      while ($index -lt $content.Length -and $content[$index] -notin "`r", "`n") { $index++ }
      continue
    }
    if ($content[$index + 1] -eq '*') {
      $index += 2
      while ($index + 1 -lt $content.Length -and -not ($content[$index] -eq '*' -and $content[$index + 1] -eq '/')) { $index++ }
      $index = [Math]::Min($index + 2, $content.Length)
      continue
    }
  }
  if ($char -eq '"') {
    $start = $index++
    while ($index -lt $content.Length) {
      if ($content[$index] -eq '\') { $index += 2; continue }
      if ($content[$index] -eq '"') { $index++; break }
      $index++
    }
    $tokens.Add([pscustomobject]@{ Kind='String'; Text=$content.Substring($start + 1, $index - $start - 2); Start=$start; End=$index })
    continue
  }
  if ('[]{}:,'.Contains([string]$char)) { $tokens.Add([pscustomobject]@{ Kind='Symbol'; Text=[string]$char; Start=$index; End=$index + 1 }) }
  $index++
}

$commandOpen = -1
$depth = 0
for ($i = 0; $i + 2 -lt $tokens.Count; $i++) {
  $token = $tokens[$i]
  if ($token.Kind -eq 'Symbol' -and $token.Text -in '[','{') { $depth++; continue }
  if ($token.Kind -eq 'Symbol' -and $token.Text -in ']', '}') { $depth--; continue }
  if ($depth -eq 1 -and $token.Kind -eq 'String' -and $token.Text -eq 'command' -and $tokens[$i + 1].Text -eq ':' -and $tokens[$i + 2].Text -eq '{') {
    $commandOpen = $i + 2
    break
  }
}
if ($commandOpen -lt 0) { throw "Legacy goal command parsed but root command object was not found" }

$goalKey = -1
$goalEnd = -1
$relativeDepth = 0
for ($i = $commandOpen; $i -lt $tokens.Count; $i++) {
  $token = $tokens[$i]
  if ($token.Kind -eq 'Symbol' -and $token.Text -in '[','{') { $relativeDepth++ }
  elseif ($token.Kind -eq 'Symbol' -and $token.Text -in ']', '}') {
    $relativeDepth--
    if ($goalKey -ge 0 -and $relativeDepth -eq 1) { $goalEnd = $token.End; break }
    if ($relativeDepth -eq 0) { break }
  } elseif ($relativeDepth -eq 1 -and $token.Kind -eq 'String' -and $token.Text -eq 'goal' -and $tokens[$i + 1].Text -eq ':' -and $tokens[$i + 2].Text -eq '{') {
    $goalKey = $i
  }
}
if ($goalKey -lt 0 -or $goalEnd -lt 0) { throw "Legacy goal command object was not found" }

$start = $tokens[$goalKey].Start
$end = $goalEnd
while ($end -lt $content.Length -and [char]::IsWhiteSpace($content[$end])) { $end++ }
if ($end -lt $content.Length -and $content[$end] -eq ',') {
  $end++
} else {
  while ($start -gt 0 -and [char]::IsWhiteSpace($content[$start - 1])) { $start-- }
  if ($start -gt 0 -and $content[$start - 1] -eq ',') { $start-- }
}
$updated = $content.Substring(0, $start) + $content.Substring($end)
[IO.File]::WriteAllText($resolvedPath, $updated, [Text.UTF8Encoding]::new($false))
Write-Output "Removed legacy raw /goal command from $resolvedPath"
