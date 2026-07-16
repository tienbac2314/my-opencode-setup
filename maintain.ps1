<#
.SYNOPSIS
  Check, plan, apply, or verify manifest-managed OpenCode components.

.DESCRIPTION
  Uses config/components.json as the source of approved versions and component
  state. Check is read-only, plan writes machine and human reports, apply changes
  selected approved components and converges local files, and verify checks active
  package pins, plugin origins, local hashes, patches, tests, and production audit.

.EXAMPLE
  pwsh ./maintain.ps1 check -Offline

.EXAMPLE
  pwsh ./maintain.ps1 plan

.EXAMPLE
  pwsh ./maintain.ps1 apply -Component opencode,omo-slim

.EXAMPLE
  pwsh ./maintain.ps1 verify
#>
[CmdletBinding(SupportsShouldProcess)]
param(
  [Parameter(Position = 0)]
  [ValidateSet("check", "plan", "apply", "verify")]
  [string]$Action = "check",

  [string[]]$Component,
  [switch]$All,
  [switch]$Offline,
  [switch]$Json,
  [switch]$SkipTests,
  [string]$Manifest = [IO.Path]::Combine($PSScriptRoot, "config", "components.json"),
  [string]$ConfigDir = [IO.Path]::Combine($HOME, ".config", "opencode"),
  [string]$CacheDir = [IO.Path]::Combine($HOME, ".cache", "opencode"),
  [string]$OutputDir = [IO.Path]::Combine($PSScriptRoot, ".state")
)

$ErrorActionPreference = "Stop"
$RepoDir = $PSScriptRoot

function Read-Manifest {
  if (-not (Test-Path -LiteralPath $Manifest -PathType Leaf)) {
    throw "Component manifest not found: $Manifest"
  }
  $value = Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
  if ($value.schemaVersion -ne 1) { throw "Unsupported component manifest schema" }
  $ids = @($value.components | ForEach-Object id)
  if ($ids.Count -ne @($ids | Select-Object -Unique).Count) {
    throw "Component manifest contains duplicate IDs"
  }
  return $value
}

function Invoke-Text {
  param([string]$File, [string[]]$Arguments, [string]$WorkingDirectory)
  $command = Get-Command $File -CommandType Application,ExternalScript -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if (-not $command) { return $null }
  if ($WorkingDirectory) { Push-Location $WorkingDirectory }
  try {
    $output = & $command @Arguments 2>$null | Out-String
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { return $null }
    return $output.Trim()
  } finally {
    if ($WorkingDirectory) { Pop-Location }
  }
}

function Normalize-Version([string]$Value) {
  if (-not $Value) { return $null }
  $match = [regex]::Match($Value, 'v?\d+(?:\.\d+){1,3}(?:[-+][0-9A-Za-z.-]+)?')
  if ($match.Success) { return $match.Value.TrimStart('v') }
  return $Value.Trim()
}

function Get-RepositoryParts([string]$Repository) {
  $match = [regex]::Match($Repository, 'github\.com/([^/]+)/([^/#]+)')
  if (-not $match.Success) { return $null }
  return @{ owner = $match.Groups[1].Value; repo = $match.Groups[2].Value -replace '\.git$', '' }
}

function Get-InstalledVersion($Item) {
  switch ($Item.kind) {
    "npm-global" {
      $raw = Invoke-Text npm @("list", "-g", $Item.package, "--depth=0", "--json")
      if (-not $raw) { return $null }
      return ($raw | ConvertFrom-Json).dependencies.($Item.package).version
    }
    { $_ -in "npm-local", "omo" } {
      $packageFile = Join-Path $ConfigDir "package.json"
      if (-not (Test-Path -LiteralPath $packageFile)) { return $null }
      return (Get-Content -LiteralPath $packageFile -Raw | ConvertFrom-Json).dependencies.($Item.package)
    }
    "github-release" {
      return Normalize-Version (Invoke-Text $Item.command @("--version"))
    }
    "pypi" {
      return Normalize-Version (Invoke-Text $Item.command @("--version"))
    }
    "github-commit" {
      $cache = $Item.cache -replace '^~', $HOME
      if (-not (Test-Path -LiteralPath (Join-Path $cache ".git"))) { return $null }
      return Invoke-Text git @("-C", $cache, "rev-parse", "HEAD")
    }
    { $_ -in "github-file", "github-copy" } { return $Item.target }
    "local" { return "local" }
    default { return $null }
  }
}

function Get-LatestVersion($Item) {
  if ($Offline -or $Item.kind -eq "local") { return $null }
  switch ($Item.kind) {
    { $_ -in "npm-global", "npm-local", "omo" } {
      return (Invoke-Text npm @("view", $Item.package, "version"))
    }
    "pypi" {
      return (Invoke-RestMethod -Uri "https://pypi.org/pypi/$($Item.package)/json" -TimeoutSec 20).info.version
    }
    "github-release" {
      $repo = Get-RepositoryParts $Item.repository
      if (-not $repo) { return $null }
      return (Invoke-RestMethod -Headers @{ "User-Agent" = "opencode-dotfiles-maintainer" } -Uri "https://api.github.com/repos/$($repo.owner)/$($repo.repo)/releases/latest" -TimeoutSec 20).tag_name
    }
    { $_ -in "github-commit", "github-file", "github-copy" } {
      $repo = Get-RepositoryParts $Item.repository
      if (-not $repo) { return $null }
      $branch = if ($Item.branch) { $Item.branch } else { "main" }
      return (Invoke-RestMethod -Headers @{ "User-Agent" = "opencode-dotfiles-maintainer" } -Uri "https://api.github.com/repos/$($repo.owner)/$($repo.repo)/commits/$branch" -TimeoutSec 20).sha
    }
    default { return $null }
  }
}

function Get-Report($ManifestValue) {
  foreach ($item in $ManifestValue.components) {
    if ($item.disabled) {
      [pscustomobject]@{
        id = $item.id
        name = $item.name
        kind = $item.kind
        installed = $null
        target = [string]$item.target
        latest = $null
        state = "disabled"
        reviewRequired = $false
        repository = $item.repository
        verify = $item.disabledReason
      }
      continue
    }
    $installed = Get-InstalledVersion $item
    try { $latest = Get-LatestVersion $item } catch { $latest = $null }
    $target = [string]$item.target
    $targetComparable = Normalize-Version $target
    $installedComparable = Normalize-Version $installed
    $latestComparable = Normalize-Version $latest
    $state = if ($item.kind -eq "local") {
      "local"
    } elseif (-not $installed) {
      "missing"
    } elseif ($installedComparable -ne $targetComparable) {
      "drift"
    } elseif ($latest -and $latestComparable -ne $targetComparable) {
      "update-available"
    } else {
      "current"
    }
    [pscustomobject]@{
      id = $item.id
      name = $item.name
      kind = $item.kind
      installed = $installed
      target = $target
      latest = $latest
      state = $state
      reviewRequired = [bool]($item.kind -in "github-file", "github-copy")
      repository = $item.repository
      verify = $item.verify
    }
  }
}

function Select-Components($ManifestValue) {
  if ($All) { return @($ManifestValue.components | Where-Object { -not $_.disabled }) }
  if (-not $Component) { throw "apply requires -Component ID or -All" }
  $requested = @($Component | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  $disabled = @($ManifestValue.components | Where-Object { $_.id -in $requested -and $_.disabled })
  if ($disabled) { throw "Disabled component IDs: $($disabled.id -join ', ')" }
  $selected = @($ManifestValue.components | Where-Object { $_.id -in $requested -and -not $_.disabled })
  $missing = @($requested | Where-Object { $_ -notin $selected.id })
  if ($missing) { throw "Unknown component IDs: $($missing -join ', ')" }
  return $selected
}

function Install-NpmLocal($Items) {
  if (-not (Test-Path -LiteralPath $ConfigDir)) { New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null }
  $specs = @($Items | ForEach-Object { "$($_.package)@$($_.target)" })
  if (-not $specs) { return }
  if ($PSCmdlet.ShouldProcess($ConfigDir, "npm install --save-exact $($specs -join ' ')")) {
    Push-Location $ConfigDir
    try { & npm install --save-exact @specs; if ($LASTEXITCODE -ne 0) { throw "npm install failed" } } finally { Pop-Location }
  }
}

function Test-TargetCurrent($Item) {
  $installed = Get-InstalledVersion $Item
  if (-not $installed) { return $false }
  return (Normalize-Version $installed) -eq (Normalize-Version ([string]$Item.target))
}

function Sync-ConfigPins($ManifestValue) {
  $globalPath = Join-Path $ConfigDir "opencode.jsonc"
  $tuiPath = Join-Path $ConfigDir "tui.json"
  if (Test-Path -LiteralPath $globalPath) {
    & "$RepoDir\scripts\remove-legacy-goal-command.ps1" -Path $globalPath
    & "$RepoDir\scripts\pin-opencode-plugin.ps1" -Path $globalPath -Name "@prevalentware/opencode-goal-plugin/server" -Remove
  }
  if (Test-Path -LiteralPath $tuiPath) {
    & "$RepoDir\scripts\pin-opencode-plugin.ps1" -Path $tuiPath -Name "@prevalentware/opencode-goal-plugin/tui" -Remove
  }
  $pins = @(
    @{ id = "omo-slim"; path = $globalPath; name = "oh-my-opencode-slim" },
    @{ id = "goal"; path = $globalPath; name = "@prevalentware/opencode-goal-plugin"; add = $true },
    @{ id = "omo-slim"; path = $tuiPath; name = "oh-my-opencode-slim" },
    @{ id = "goal"; path = $tuiPath; name = "@prevalentware/opencode-goal-plugin"; add = $true }
  )
  foreach ($pin in $pins) {
    if (-not (Test-Path -LiteralPath $pin.path)) { continue }
    $item = $ManifestValue.components | Where-Object id -eq $pin.id
    if ($item -and -not $item.disabled) {
      & "$RepoDir\scripts\pin-opencode-plugin.ps1" -Path $pin.path -Name $pin.name -Version $item.target -Add:([bool]$pin.add)
    } elseif ($item.disabled) {
      & "$RepoDir\scripts\pin-opencode-plugin.ps1" -Path $pin.path -Name $pin.name -Remove
    }
  }
}

function Remove-Retired($ManifestValue) {
  $packageFile = Join-Path $ConfigDir "package.json"
  if (Test-Path -LiteralPath $packageFile) {
    $installed = Get-Content -LiteralPath $packageFile -Raw | ConvertFrom-Json
    $packages = @($ManifestValue.retired.npmLocal | Where-Object { $installed.dependencies.PSObject.Properties.Name -contains $_ })
    if ($packages -and $PSCmdlet.ShouldProcess($ConfigDir, "remove retired packages: $($packages -join ', ')")) {
      Push-Location $ConfigDir
      try { & npm uninstall @packages; if ($LASTEXITCODE -ne 0) { throw "npm uninstall failed" } } finally { Pop-Location }
    }
  }
  $globalPath = Join-Path $ConfigDir "opencode.jsonc"
  if (Test-Path -LiteralPath $globalPath) {
    foreach ($spec in @($ManifestValue.retired.pluginSpecs)) {
      & "$RepoDir\scripts\pin-opencode-plugin.ps1" -Path $globalPath -Name $spec -Remove
    }
  }
}

function Install-Rtk($Item) {
  $tag = [string]$Item.target
  $platform = if ($IsWindows) { "x86_64-pc-windows-msvc.zip" } elseif ([Runtime.InteropServices.RuntimeInformation]::OSArchitecture -eq "Arm64") { "aarch64-unknown-linux-gnu.tar.gz" } else { "x86_64-unknown-linux-musl.tar.gz" }
  $url = "$($Item.repository)/releases/download/$tag/rtk-$platform"
  $bin = Join-Path $HOME ".local\bin"
  if ($PSCmdlet.ShouldProcess($bin, "install RTK $tag")) {
    New-Item -ItemType Directory -Path $bin -Force | Out-Null
    $archive = Join-Path ([IO.Path]::GetTempPath()) "rtk-$platform"
    Invoke-WebRequest -Uri $url -OutFile $archive
    if ($IsWindows) {
      Expand-Archive -LiteralPath $archive -DestinationPath $bin -Force
    } else {
      & tar -xzf $archive -C $bin
      & chmod +x (Join-Path $bin "rtk")
    }
    Remove-Item -LiteralPath $archive -Force
  }
}

function Apply-Components($ManifestValue) {
  Remove-Retired $ManifestValue
  $selected = Select-Components $ManifestValue
  $installKinds = @("npm-global", "npm-local", "omo", "pypi", "github-release", "github-commit")
  $pending = @($selected | Where-Object { $_.kind -in $installKinds -and -not (Test-TargetCurrent $_) })
  foreach ($item in $selected | Where-Object { $_.kind -in $installKinds -and $_.id -notin $pending.id }) {
    Write-Output "CURRENT $($item.id): $($item.target) already installed."
  }
  $npmLocal = @($pending | Where-Object kind -in "npm-local", "omo")
  Install-NpmLocal $npmLocal

  foreach ($item in $selected | Where-Object { $_.kind -notin "npm-local", "omo" -and ($_.kind -notin $installKinds -or $_.id -in $pending.id) }) {
    switch ($item.kind) {
      "npm-global" {
        if ($PSCmdlet.ShouldProcess($item.package, "install global $($item.target)")) {
          & npm install -g "$($item.package)@$($item.target)"; if ($LASTEXITCODE -ne 0) { throw "Global npm install failed: $($item.id)" }
        }
      }
      "pypi" {
        if ($PSCmdlet.ShouldProcess($item.package, "install uv tool $($item.target)")) {
          & uv tool install --force "$($item.package)[all]==$($item.target)"; if ($LASTEXITCODE -ne 0) { throw "uv tool install failed" }
        }
      }
      "github-release" { Install-Rtk $item }
      "github-commit" {
        if ($item.id -eq "headroom-source") {
          if ($PSCmdlet.ShouldProcess($item.repository, "build commit $($item.target)")) {
            & "$RepoDir\scripts\install-headroom-plugin.ps1" -Commit $item.target
          }
        }
      }
      { $_ -in "github-file", "github-copy" } {
        Write-Output "REVIEW $($item.id): local changes are never overwritten automatically. Reconcile upstream, then update manifest target."
      }
      "local" { Write-Output "LOCAL $($item.id): repository source is authoritative." }
    }
  }

  $omo = $pending | Where-Object id -eq "omo-slim"
  if ($omo -and $PSCmdlet.ShouldProcess($omo.package, "run exact OMO installer and restore tailored files")) {
    $originalPath = $env:PATH
    $originalConfigDir = $env:OPENCODE_CONFIG_DIR
    try {
      $env:OPENCODE_CONFIG_DIR = $ConfigDir
      if ($IsWindows) {
        $bunShim = Get-Command bun -ErrorAction SilentlyContinue
        if ($bunShim) {
          $bunExecutable = Join-Path (Split-Path $bunShim.Source) "node_modules\bun\bin\bun.exe"
          if (Test-Path -LiteralPath $bunExecutable) {
            $env:PATH = "$(Split-Path $bunExecutable)$([IO.Path]::PathSeparator)$originalPath"
          }
        }
      }
      & bunx "$($omo.package)@$($omo.target)" install --yes
      if ($LASTEXITCODE -ne 0) { throw "OMO installer failed" }
    } finally {
      $env:PATH = $originalPath
      $env:OPENCODE_CONFIG_DIR = $originalConfigDir
    }
    Copy-Item "$RepoDir\config\oh-my-opencode-slim.json" "$ConfigDir\oh-my-opencode-slim.json" -Force
    Copy-Item "$RepoDir\config\tui.json" "$ConfigDir\tui.json" -Force
  }

  if ($PSCmdlet.ShouldProcess((Join-Path $ConfigDir "plugins"), "deploy repository local plugins")) {
    $activePlugins = Join-Path $ConfigDir "plugins"
    New-Item -ItemType Directory -Path $activePlugins -Force | Out-Null
    foreach ($legacy in @("goal.ts", "opencode-lazy-load.ts", "tokens-source.ts", "mem0-selfhost-patch.ts")) {
      Remove-Item (Join-Path $activePlugins $legacy) -Force -ErrorAction SilentlyContinue
    }
    Copy-Item "$RepoDir\plugins\*" $activePlugins -Force
  }
  if ($PSCmdlet.ShouldProcess((Join-Path $ConfigDir "commands"), "deploy repository commands")) {
    $activeCommands = Join-Path $ConfigDir "commands"
    New-Item -ItemType Directory -Path $activeCommands -Force | Out-Null
    Copy-Item "$RepoDir\commands\*" $activeCommands -Force
    if ($ManifestValue.components | Where-Object { $_.id -eq "goal" -and $_.disabled }) {
      Remove-Item (Join-Path $activeCommands "goal.md") -Force -ErrorAction SilentlyContinue
    }
  }
  $headroomUpdated = @($pending | Where-Object id -in "headroom-python", "headroom-source")
  if ($IsWindows -and $headroomUpdated -and (Get-ScheduledTask -TaskName "OpenCode Headroom Proxy" -ErrorAction SilentlyContinue)) {
    & "$RepoDir\scripts\manage-headroom-proxy.ps1" install -Manifest $Manifest
    if ($LASTEXITCODE -ne 0) { throw "Headroom proxy task convergence failed" }
  }
  & "$RepoDir\scripts\apply-package-patches.ps1" -ConfigDir $ConfigDir -CacheDir $CacheDir -Manifest $Manifest
  Sync-ConfigPins $ManifestValue
}

function Verify-State($ManifestValue) {
  $failures = [Collections.Generic.List[string]]::new()
  $packageFile = Join-Path $ConfigDir "package.json"
  $package = if (Test-Path -LiteralPath $packageFile) { Get-Content -LiteralPath $packageFile -Raw | ConvertFrom-Json } else { $null }
  $expectedTui = @(
    $omo = $ManifestValue.components | Where-Object id -eq "omo-slim"
    if ($omo) { "oh-my-opencode-slim@$($omo.target)" }
    $goal = $ManifestValue.components | Where-Object { $_.id -eq "goal" -and -not $_.disabled }
    if ($goal) { "@prevalentware/opencode-goal-plugin@$($goal.target)" }
  )

  foreach ($retired in @($ManifestValue.retired.npmLocal)) {
    if ($package.dependencies.PSObject.Properties.Name -contains $retired) { $failures.Add("retired package still installed: $retired") }
  }

  foreach ($item in $ManifestValue.components | Where-Object { -not $_.disabled -and $_.kind -in "npm-local", "omo" }) {
    $actual = $package.dependencies.($item.package)
    if ($actual -ne $item.target) { $failures.Add("$($item.id): package.json has '$actual', expected '$($item.target)'") }
  }
  $tuiPath = Join-Path $ConfigDir "tui.json"
  if ($expectedTui.Count -and -not (Test-Path -LiteralPath $tuiPath)) {
    $failures.Add("active tui.json is missing")
  } elseif ($expectedTui.Count) {
    try {
      $tui = Get-Content -LiteralPath $tuiPath -Raw | ConvertFrom-Json
      $actualTui = @($tui.plugin)
      foreach ($spec in $expectedTui) {
        if ($spec -notin $actualTui) { $failures.Add("active tui.json is missing exact plugin pin: $spec") }
      }
      if ($actualTui.Count -ne $expectedTui.Count) {
        $failures.Add("active tui.json has $($actualTui.Count) plugins, expected $($expectedTui.Count)")
      }
    } catch { $failures.Add("active tui.json is invalid: $($_.Exception.Message)") }
  }
  foreach ($item in $ManifestValue.components | Where-Object localFile) {
    $source = Join-Path $RepoDir $item.localFile
    $active = Join-Path $ConfigDir $item.localFile
    if (-not (Test-Path -LiteralPath $active)) { $failures.Add("$($item.id): active file missing") ; continue }
    if ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $active).Hash) {
      $failures.Add("$($item.id): active file differs from repository")
    }
  }
  try {
    & "$RepoDir\scripts\apply-package-patches.ps1" -ConfigDir $ConfigDir -CacheDir $CacheDir -Manifest $Manifest -Check | Out-Null
  } catch { $failures.Add($_.Exception.Message) }
  $resolved = Invoke-Text opencode @("debug", "config")
  if ($resolved) {
    $cfg = $resolved | ConvertFrom-Json
    if ($cfg.plugin.Count -ne $ManifestValue.expectedServerPlugins) { $failures.Add("resolved plugin count is $($cfg.plugin.Count), expected $($ManifestValue.expectedServerPlugins)") }
    if ($cfg.plugin_origins.Count -ne $ManifestValue.expectedServerPlugins) { $failures.Add("plugin origin count is $($cfg.plugin_origins.Count), expected $($ManifestValue.expectedServerPlugins)") }
    foreach ($spec in $expectedTui) {
      if ($spec -notin @($cfg.plugin)) { $failures.Add("resolved server config is missing exact plugin pin: $spec") }
    }
  } else { $failures.Add("opencode debug config failed") }

  if (-not $SkipTests) {
    & bun test
    if ($LASTEXITCODE -ne 0) { $failures.Add("bun test failed") }
  }
  if (-not $Offline -and (Get-Command npm -ErrorAction SilentlyContinue)) {
    Push-Location $ConfigDir
    try {
      & npm audit --omit=dev --audit-level=high | Out-Null
      if ($LASTEXITCODE -ne 0) { $failures.Add("npm audit reports high or critical production vulnerabilities") }
    } finally { Pop-Location }
  }
  if ($failures.Count) { throw "Verification failed:`n- $($failures -join "`n- ")" }
  Write-Output "Verified manifest targets, local plugin hashes, $($ManifestValue.expectedServerPlugins) plugin origins, and tests."
}

function Write-Plan($Report) {
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
  $jsonPath = Join-Path $OutputDir "update-plan.json"
  $mdPath = Join-Path $OutputDir "update-plan.md"
  ConvertTo-Json -InputObject @($Report) -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding utf8
  $lines = @(
    "# OpenCode Update Plan",
    "",
    "Generated: $([DateTimeOffset]::Now.ToString('o'))",
    "",
    "| Component | Installed | Approved | Latest | State |",
    "|---|---:|---:|---:|---|"
  )
  foreach ($row in $Report) {
    $lines += "| $($row.name) | $($row.installed ?? '-') | $($row.target) | $($row.latest ?? '-') | $($row.state) |"
  }
  $review = @($Report | Where-Object { $_.state -in "drift", "update-available", "missing" -or $_.reviewRequired })
  $lines += "", "## Agent brief", "", "Review only components listed below. Never overwrite local forks. Update one manifest target at a time, compare upstream against local file, run focused verification, then run `pwsh ./maintain.ps1 verify`.", ""
  foreach ($row in $review) { $lines += "- **$($row.id)**: $($row.state); source $($row.repository); verify: $($row.verify)" }
  $lines | Set-Content -LiteralPath $mdPath -Encoding utf8
  Write-Output $mdPath
  Write-Output $jsonPath
}

$manifestValue = Read-Manifest
switch ($Action) {
  "check" {
    $report = @(Get-Report $manifestValue)
    if ($Json) { ConvertTo-Json -InputObject $report -Depth 8 } else { $report | Format-Table id, installed, target, latest, state -AutoSize }
  }
  "plan" { Write-Plan @(Get-Report $manifestValue) }
  "apply" { Apply-Components $manifestValue }
  "verify" { Verify-State $manifestValue }
}
