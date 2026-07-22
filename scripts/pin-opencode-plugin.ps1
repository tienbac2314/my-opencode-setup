[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$Path,

  [Parameter(Mandatory)]
  [string]$Name,

  [string]$Version,

  [switch]$Remove,

  [switch]$Add
)

if (-not $Remove -and -not $Version) {
  throw "-Version is required unless -Remove is used"
}

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
$matches = [Collections.Generic.List[object]]::new()
$arrayEnd = $null
$arrayHasEntries = $false
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
    if ($token.Kind -eq 'Symbol' -and $token.Text -in '[', '{') {
      if ($depth -eq 1 -and $token.Text -eq '[') { $arrayHasEntries = $true }
      $depth++
    }
    elseif ($token.Kind -eq 'Symbol' -and $token.Text -in ']', '}') {
      $depth--
      if ($depth -eq 0) { $arrayEnd = $token; break }
    }
    elseif ($token.Kind -eq 'String' -and
      ($depth -eq 1 -or ($depth -eq 2 -and $tokens[$cursor - 1].Text -eq '[')) -and
      ($token.Text -eq $Name -or $token.Text.StartsWith("$Name@"))) {
      $matches.Add([pscustomobject]@{ Token = $token; IsTuple = ($depth -eq 2) })
      $arrayHasEntries = $true
    } elseif ($depth -eq 1 -and $token.Kind -eq 'String') {
      $arrayHasEntries = $true
    }
  }
  break
}

if ($matches.Count -gt 0) {
  $selected = $matches | Where-Object IsTuple | Select-Object -First 1
  if (-not $selected) { $selected = $matches[0] }
  $target = $selected.Token
}

$updated = $content
if ($null -ne $target) {
  if ($Remove) {
    $start = $target.Start
    $end = $target.End
    while ($end -lt $content.Length -and [char]::IsWhiteSpace($content[$end])) { $end++ }
    if ($end -lt $content.Length -and $content[$end] -eq ',') {
      $end++
    } else {
      while ($start -gt 0 -and [char]::IsWhiteSpace($content[$start - 1])) { $start-- }
      if ($start -gt 0 -and $content[$start - 1] -eq ',') { $start-- }
    }
    $updated = $content.Substring(0, $start) + $content.Substring($end)
  } else {
    $replacement = '"' + $Name + '@' + $Version + '"'
    $edits = @([pscustomobject]@{ Start = $target.Start; End = $target.End; Text = $replacement })
    foreach ($match in $matches) {
      if ($match.Token.Start -eq $target.Start) { continue }
      $start = $match.Token.Start
      $end = $match.Token.End
      while ($end -lt $content.Length -and [char]::IsWhiteSpace($content[$end])) { $end++ }
      if ($end -lt $content.Length -and $content[$end] -eq ',') {
        $end++
      } else {
        while ($start -gt 0 -and [char]::IsWhiteSpace($content[$start - 1])) { $start-- }
        if ($start -gt 0 -and $content[$start - 1] -eq ',') { $start-- }
      }
      $edits += [pscustomobject]@{ Start = $start; End = $end; Text = '' }
    }
    foreach ($edit in $edits | Sort-Object Start -Descending) {
      $updated = $updated.Substring(0, $edit.Start) + $edit.Text + $updated.Substring($edit.End)
    }
  }
} elseif ($Add -and $null -ne $arrayEnd) {
  $entry = '"' + $Name + '@' + $Version + '"'
  if (-not $arrayHasEntries) {
    $updated = $content.Substring(0, $arrayEnd.Start) + $entry + $content.Substring($arrayEnd.Start)
  } else {
    $trailingStart = $arrayEnd.Start
    while ($trailingStart -gt 0 -and [char]::IsWhiteSpace($content[$trailingStart - 1])) { $trailingStart-- }
    $trailing = $content.Substring($trailingStart, $arrayEnd.Start - $trailingStart)
    $newline = [regex]::Match($trailing, '(\r?\n)([ \t]*)$')
    if ($newline.Success) {
      $insertion = ',' + $newline.Groups[1].Value + $newline.Groups[2].Value + '  ' + $entry + $trailing
    } else {
      $insertion = ', ' + $entry + $trailing
    }
    $updated = $content.Substring(0, $trailingStart) + $insertion + $content.Substring($arrayEnd.Start)
  }
}

if ($updated -ne $content) {
  [IO.File]::WriteAllText($resolvedPath, $updated, [Text.UTF8Encoding]::new($false))
}
