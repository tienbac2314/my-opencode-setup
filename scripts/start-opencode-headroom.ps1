param(
  [string]$PluginEntry = [IO.Path]::Combine($HOME, ".cache", "opencode-headroom", "source", "plugins", "opencode", "dist", "entry.opencode.js"),
  [int]$Port = 8787,
  [int]$StartupTimeoutSeconds = 30,
  [string]$OpenCodeArgsJson = "[]"
)

$ErrorActionPreference = "Stop"
$proxy = $null
$exitCode = 1
$proxyUrl = "http://127.0.0.1:$Port"
$logDir = Join-Path ([IO.Path]::GetTempPath()) "opencode-headroom"
$stdout = Join-Path $logDir "proxy.log"
$stderr = Join-Path $logDir "proxy-error.log"
$requestsLog = Join-Path $logDir "requests.jsonl"
$configRoot = [IO.Path]::Combine($HOME, ".config", "opencode")
$configFiles = @("opencode.jsonc", "tui.json", "AGENTS.md") | ForEach-Object { Join-Path $configRoot $_ }

try {
  $parsedArgs = $OpenCodeArgsJson | ConvertFrom-Json -NoEnumerate
} catch {
  throw "OpenCodeArgsJson must be a JSON array"
}
if ($parsedArgs -isnot [System.Array]) {
  throw "OpenCodeArgsJson must be a JSON array"
}
$OpenCodeArgs = [string[]]$parsedArgs

function Test-HeadroomHealth {
  try {
    Invoke-RestMethod -Uri "$proxyUrl/healthz" -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Test-TcpPort {
  $client = [Net.Sockets.TcpClient]::new()
  try {
    $task = $client.ConnectAsync("127.0.0.1", $Port)
    return $task.Wait(500) -and $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Get-ConfigHashes {
  $hashes = @{}
  foreach ($path in $configFiles) {
    if (Test-Path -LiteralPath $path -PathType Leaf) {
      $hashes[$path] = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash
    }
  }
  return $hashes
}

if (-not (Test-Path -LiteralPath $PluginEntry -PathType Leaf)) {
  throw "Headroom plugin entry not found: $PluginEntry. Run scripts\install-headroom-plugin.ps1 first."
}

$headroom = Get-Command headroom -ErrorAction SilentlyContinue
$opencode = Get-Command opencode -ErrorAction SilentlyContinue
if (-not $headroom) { throw "Required command not found on PATH: headroom" }
if (-not $opencode) { throw "Required command not found on PATH: opencode" }

$resolvedConfig = ((& $opencode.Source debug config 2>$null) -join "`n") | ConvertFrom-Json
$providerOverrides = @{}
foreach ($provider in $resolvedConfig.provider.PSObject.Properties) {
  $baseUrl = $provider.Value.options.baseURL
  if (-not $baseUrl) { continue }
  $upstream = [Uri]$baseUrl
  if ($upstream.IsLoopback) { continue }

  $headers = @{}
  foreach ($header in $provider.Value.options.headers.PSObject.Properties) {
    $headers[$header.Name] = $header.Value
  }
  $headers["x-headroom-base-url"] = $upstream.GetLeftPart([UriPartial]::Authority)
  $providerOverrides[$provider.Name] = @{
    options = @{
      baseURL = "$proxyUrl$($upstream.AbsolutePath.TrimEnd('/'))"
      headers = $headers
    }
  }
}

$beforeHashes = Get-ConfigHashes
$oldProxyUrl = $env:HEADROOM_PROXY_URL
$oldConfigContent = $env:OPENCODE_CONFIG_CONTENT

try {
  if (-not (Test-HeadroomHealth)) {
    if (Test-TcpPort) {
      throw "Port $Port is occupied by a service that is not a healthy Headroom proxy"
    }

    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $start = @{
      FilePath = $headroom.Source
      ArgumentList = @(
        "proxy", "--host", "127.0.0.1", "--port", "$Port",
        "--no-ccr", "--no-telemetry", "--log-file", $requestsLog
      )
      RedirectStandardOutput = $stdout
      RedirectStandardError = $stderr
      PassThru = $true
    }
    if ($IsWindows) { $start.WindowStyle = "Hidden" }
    $proxy = Start-Process @start

    $deadline = [DateTime]::UtcNow.AddSeconds($StartupTimeoutSeconds)
    while (-not (Test-HeadroomHealth)) {
      if ($proxy.HasExited) {
        throw "Headroom proxy exited during startup. See $stderr"
      }
      if ([DateTime]::UtcNow -ge $deadline) {
        throw "Headroom proxy health check timed out. See $stderr"
      }
      Start-Sleep -Milliseconds 250
    }
  }

  $content = @{}
  if ($oldConfigContent) {
    $content = $oldConfigContent | ConvertFrom-Json -AsHashtable
  }
  $plugins = @($content.plugin | Where-Object { $_ })
  if ($PluginEntry -notin $plugins) { $plugins += $PluginEntry }
  $content.plugin = $plugins
  if ($providerOverrides.Count -gt 0) { $content.provider = $providerOverrides }

  $env:HEADROOM_PROXY_URL = $proxyUrl
  $env:OPENCODE_CONFIG_CONTENT = $content | ConvertTo-Json -Compress -Depth 100
  & $opencode.Source @OpenCodeArgs
  $exitCode = $LASTEXITCODE
} finally {
  $env:HEADROOM_PROXY_URL = $oldProxyUrl
  $env:OPENCODE_CONFIG_CONTENT = $oldConfigContent
  if ($proxy -and -not $proxy.HasExited) {
    Stop-Process -Id $proxy.Id -ErrorAction SilentlyContinue
    $proxy.WaitForExit(5000) | Out-Null
  }

  $afterHashes = Get-ConfigHashes
  foreach ($path in $beforeHashes.Keys) {
    if ($afterHashes[$path] -ne $beforeHashes[$path]) {
      Write-Error "Headroom isolation failure: $path changed"
      $exitCode = 1
    }
  }
}

exit $exitCode
