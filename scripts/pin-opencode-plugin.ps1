[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$Path,

  [Parameter(Mandatory)]
  [string]$Name,

  [Parameter(Mandatory)]
  [string]$Version
)

$resolvedPath = (Resolve-Path -LiteralPath $Path).Path
$content = [IO.File]::ReadAllText($resolvedPath)
$tokens = [Collections.Generic.List[object]]::new()

for ($index = 0; $index -lt $content.Length;) {
  $char = $content[$index]

  if ([char]::IsWhiteSpace($char)) {
    $index++
    continue
  }

  if ($char -eq '/' -and $index + 1 -lt $content.Length) {
    if ($content[$index + 1] -eq '/') {
      $index += 2
      while ($index -lt $content.Length -and $content[$index] -notin "`r", "`n") { $index++ }
      continue
    }
    if ($content[$index + 1] -eq '*') {
      $index += 2
      while ($index + 1 -lt $content.Length -and
        -not ($content[$index] -eq '*' -and $content[$index + 1] -eq '/')) { $index++ }
      $index = [Math]::Min($index + 2, $content.Length)
      continue
    }
  }

  if ($char -eq '"') {
    $start = $index
    $index++
    while ($index -lt $content.Length) {
      if ($content[$index] -eq '\') {
        $index += 2
        continue
      }
      if ($content[$index] -eq '"') {
        $index++
        break
      }
      $index++
    }
    $tokens.Add([pscustomobject]@{
      Kind = 'String'
      Text = $content.Substring($start + 1, $index - $start - 2)
      Start = $start
      End = $index
    })
    continue
  }

  if ('[]{}:,'.Contains([string]$char)) {
    $tokens.Add([pscustomobject]@{ Kind = 'Symbol'; Text = [string]$char; Start = $index; End = $index + 1 })
  }
  $index++
}

$target = $null
$containerDepth = 0
for ($index = 0; $index + 2 -lt $tokens.Count; $index++) {
  $current = $tokens[$index]
  if ($current.Kind -eq 'Symbol' -and $current.Text -in '[', '{') {
    $containerDepth++
    continue
  }
  if ($current.Kind -eq 'Symbol' -and $current.Text -in ']', '}') {
    $containerDepth--
    continue
  }
  if ($containerDepth -ne 1 -or $current.Kind -ne 'String' -or $current.Text -ne 'plugin' -or
    $tokens[$index + 1].Text -ne ':' -or $tokens[$index + 2].Text -ne '[') {
    continue
  }

  $depth = 0
  for ($cursor = $index + 2; $cursor -lt $tokens.Count; $cursor++) {
    $token = $tokens[$cursor]
    if ($token.Kind -eq 'Symbol' -and $token.Text -in '[', '{') { $depth++ }
    elseif ($token.Kind -eq 'Symbol' -and $token.Text -in ']', '}') {
      $depth--
      if ($depth -eq 0) { break }
    }
    elseif ($depth -eq 1 -and $token.Kind -eq 'String' -and $token.Text -eq $Name) {
      $target = $token
      break
    }
  }
  break
}

$updated = $content
if ($null -ne $target) {
  $replacement = '"' + $Name + '@' + $Version + '"'
  $updated = $content.Substring(0, $target.Start) + $replacement + $content.Substring($target.End)
}

if ($updated -ne $content) {
  [IO.File]::WriteAllText($resolvedPath, $updated, [Text.UTF8Encoding]::new($false))
}
