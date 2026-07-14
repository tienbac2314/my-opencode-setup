[CmdletBinding()]
param(
  [string]$ConfigDir = [IO.Path]::Combine($HOME, ".config", "opencode"),
  [string]$CacheDir = [IO.Path]::Combine($HOME, ".cache", "opencode"),
  [string]$Manifest = [IO.Path]::Combine($PSScriptRoot, "..", "config", "components.json"),
  [switch]$Check
)

$ErrorActionPreference = "Stop"
$repo = (Resolve-Path "$PSScriptRoot\..").Path
$components = (Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json).components

foreach ($item in $components | Where-Object patch) {
  if (-not $item.package) { throw "$($item.id): patched component requires package" }
  $patchFile = Join-Path $repo $item.patch
  if (-not (Test-Path -LiteralPath $patchFile -PathType Leaf)) { throw "$($item.id): patch missing: $patchFile" }

  $targets = [Collections.Generic.List[string]]::new()
  $targets.Add((Join-Path (Join-Path $ConfigDir "node_modules") $item.package))
  if ($item.tuiCache) {
    $cacheRoot = Join-Path (Join-Path $CacheDir "packages") "$($item.package)@$($item.target)"
    $cachePackage = Join-Path (Join-Path $cacheRoot "node_modules") $item.package
    if (-not (Test-Path -LiteralPath $cachePackage -PathType Container) -and -not $Check) {
      New-Item -ItemType Directory -Path $cacheRoot -Force | Out-Null
      if (-not (Test-Path -LiteralPath (Join-Path $cacheRoot "package.json"))) {
        @{ dependencies = @{ $item.package = $item.target } } | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $cacheRoot "package.json") -Encoding utf8
      }
      Push-Location $cacheRoot
      try { & npm install --save-exact "$($item.package)@$($item.target)"; if ($LASTEXITCODE -ne 0) { throw "$($item.id): TUI cache install failed" } } finally { Pop-Location }
    }
    $targets.Add($cachePackage)
  }

  foreach ($packageDir in $targets) {
    if (-not (Test-Path -LiteralPath $packageDir -PathType Container)) {
      if ($Check) { throw "$($item.id): package directory missing: $packageDir" }
      continue
    }
    & git -C $packageDir apply --reverse --check $patchFile 2>$null
    if ($LASTEXITCODE -eq 0) {
      Write-Output "$($item.id): patch applied at $packageDir"
      continue
    }
    if ($Check) { throw "$($item.id): patch is not applied or no longer matches $packageDir" }
    & git -C $packageDir apply --check $patchFile
    if ($LASTEXITCODE -ne 0) { throw "$($item.id): patch does not apply cleanly to $packageDir" }
    & git -C $packageDir apply $patchFile
    if ($LASTEXITCODE -ne 0) { throw "$($item.id): patch application failed at $packageDir" }
    Write-Output "$($item.id): patch installed at $packageDir"
  }
}
