# Setup

Purpose: install this repository on a new machine, restore private credentials, and verify runtime behavior. Windows is primary. Linux differences are documented last.

## 1. Prerequisites

Install Git, PowerShell 7, Node.js, npm, Bun, Python `uv`, and ripgrep. Keep user binary directory on `PATH`:

```powershell
$bin = "$HOME\.local\bin"
[Environment]::SetEnvironmentVariable("PATH", "$bin;$([Environment]::GetEnvironmentVariable('PATH','User'))", "User")
$env:PATH = "$bin;$env:PATH"
```

Restart terminal. Confirm:

```powershell
git --version
pwsh --version
node --version
npm --version
bun --version
uv --version
rg --version
```

## 2. Clone and install

```powershell
git clone YOUR_REPOSITORY_URL "$HOME\opencode-dotfiles"
Set-Location "$HOME\opencode-dotfiles"
pwsh ./setup.ps1
```

Optional skips:

```powershell
pwsh ./setup.ps1 -SkipRtk
pwsh ./setup.ps1 -SkipCodeGraph
pwsh ./setup.ps1 -SkipTests
pwsh ./setup.ps1 -SkipEnvironment
```

`setup.ps1` copies repository-controlled files, deploys `config/AGENTS.md` as global policy while leaving root `AGENTS.md` repository-only, installs manifest-approved components, applies package patches, configures CodeGraph/RTK, skips skills already discovered under `~/.agents` or `~/.claude`, and runs verification. Existing `opencode.jsonc` and `supermemory.jsonc` credentials are preserved.

Optional components such as Headroom are not installed by default.

## 3. Private credentials

Create an ignored private JSON file:

```json
{
  "router_api_key": "",
  "router_base_url": "",
  "supermemory_api_key": "",
  "supermemory_base_url": "",
  "openrouter_api_key": ""
}
```

Restore it after setup:

```powershell
pwsh ./scripts/set-credentials.ps1 -CredentialsFile "$HOME\.config\opencode\credentials.json"
```

Required fields are `router_api_key`, `router_base_url`, `supermemory_api_key`, and `supermemory_base_url`; `openrouter_api_key` is optional. Script updates only 9router options, Supermemory config, optional OpenRouter auth, and these user variables:

```text
SUPERMEMORY_API_KEY
SUPERMEMORY_BASE_URL
OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS
```

Restart terminals and OpenCode after persistent environment changes. To set only current shell:

```powershell
$env:OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS = "true"
```

Files remain ignored and machine-local:

```text
~/.config/opencode/opencode.jsonc
~/.config/opencode/supermemory.jsonc
~/.local/share/opencode/auth.json
```

Never commit keys. Restrict credential file permissions to current user.

## 4. Normal verification

```powershell
pwsh ./maintain.ps1 verify
opencode debug config
npm --prefix "$HOME\.config\opencode" ls --depth=0
```

Expected: manifest-approved packages, configured plugin count equal to manifest, and no duplicate local plugin origins.

Live smoke tests:

1. Start TUI and App. Open status/plugin panels.
2. Confirm Goal plugin and `/goal` command are absent. They remain disabled while OpenCode integration is broken.
3. Run `/tokens` after model request.
4. Run `ping all agents` and one bounded child-agent task.
5. In indexed project, use CodeGraph; outside indexed project, confirm no startup error.
6. Add/search/list/forget disposable Supermemory marker.
   Automated verifier: `bun ./scripts/verify-supermemory.ts "$HOME/.config/opencode"`.
7. Run RTK rewrite: `rtk rewrite "git status"`.

RTK installer extracts approved binary under `~/.local/bin`; it does not replace another `rtk.exe` already present in System32 or another PATH directory. Executable cleanup and replacement remain user-managed. Diagnose precedence with:

```powershell
Get-Command rtk -All | Select-Object Source
rtk --version
```

## 5. Updates

```powershell
pwsh ./maintain.ps1 check
pwsh ./maintain.ps1 plan
```

Review `.state/update-plan.md`. To approve target, edit only matching `target` in `config/components.json`, review upstream diff and [PATCHES.md](PATCHES.md), then:

Latest versions are reported, never auto-approved. Targets remain exact because package patches, copied forks, and runtime contracts require review before each version change; automatic `latest` resolution would bypass that safety boundary.

On Windows, OpenCode cannot replace its running `opencode.exe`; built-in npm upgrade fails with `EBUSY` (shown as exit code 14). Queue update, then close all OpenCode windows:

```powershell
pwsh ./scripts/update-opencode.ps1 -Version 1.18.1
```

Detached helper waits for OpenCode processes to exit, then runs exact global npm install.

```powershell
pwsh ./maintain.ps1 apply -Component COMPONENT_ID
pwsh ./maintain.ps1 verify
```

Use `-All` only after every target in manifest has been reviewed. Maintainer stops rather than overwriting copied upstream forks.

## 6. Headroom official wrapper (optional)

Windows Python dependencies require Visual Studio 2022 Build Tools with C++ workload. Run from Administrator PowerShell, then restart terminal:

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools --silent --accept-package-agreements --accept-source-agreements --override "--add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.Component.Windows11SDK.22000 --includeRecommended --quiet --wait"
```

Install pinned Python proxy and build pinned OpenCode transport. The `headroom-ai` 0.31.0 wheel does not ship `entry.opencode.js`, so custom providers such as 9router still need the pinned source build:

```powershell
uv tool install --force "headroom-ai[all]==0.31.0"
pwsh ./scripts/install-headroom-plugin.ps1
$env:HEADROOM_OPENCODE_PLUGIN_PATH = "$HOME\.cache\opencode-headroom\source\plugins\opencode\dist\entry.opencode.js"
headroom wrap opencode --no-context-tool -- run --model opencode/deepseek-v4-flash-free "Return exact text: HEADROOM_OK"
```

`headroom wrap opencode` is the maintained proxy/provider/process lifecycle. By default it configures its context tool, Headroom MCP, and Serena MCP; use its `--no-context-tool`, `--no-mcp`, or `--no-serena` flags when those integrations are unwanted. Wrapper manages a Headroom provider block and saves a pre-wrap backup; `headroom unwrap opencode` restores it.

To route every interactive PowerShell `opencode` call through Headroom, add this machine-local function to `$PROFILE.CurrentUserCurrentHost`:

```powershell
function opencode {
  $plugin = "$HOME\.cache\opencode-headroom\source\plugins\opencode\dist\entry.opencode.js"
  $previous = $env:HEADROOM_OPENCODE_PLUGIN_PATH
  if (-not (Test-Path -LiteralPath $plugin)) {
    throw "Headroom OpenCode transport missing: $plugin. Run scripts/install-headroom-plugin.ps1."
  }
  $binary = Get-Command opencode -CommandType Application,ExternalScript | Select-Object -First 1
  if (-not $binary) { throw "OpenCode executable not found on PATH" }
  $binaryBefore = $binary.Source
  $versionBefore = ((& $binary.Source --version) -join " ").Trim()
  $exitCode = 1
  try {
    $env:HEADROOM_OPENCODE_PLUGIN_PATH = $plugin
    & headroom wrap opencode --no-context-tool -- @args
    $exitCode = $LASTEXITCODE
  } finally {
    $env:HEADROOM_OPENCODE_PLUGIN_PATH = $previous
    $binaryAfter = Get-Command opencode -CommandType Application,ExternalScript | Select-Object -First 1
    $versionAfter = ((& $binaryAfter.Source --version) -join " ").Trim()
    if ($binaryAfter.Source -ne $binaryBefore -or $versionAfter -ne $versionBefore) {
      throw "Headroom changed OpenCode version or executable from $versionBefore ($binaryBefore) to $versionAfter ($($binaryAfter.Source))"
    }
  }
  $global:LASTEXITCODE = $exitCode
}
```

Headroom resolves the child `opencode` executable directly from PATH, so this PowerShell function does not recurse.

## 7. Recovery

```powershell
pwsh ./setup.ps1
pwsh ./maintain.ps1 verify
```

Setup is safe to rerun. It restores tracked files and exact targets without replacing private credential files.

Setup also removes retired npm packages and retired skill copies from active config. It does not replace executables outside repository-managed install locations. Use [TROUBLESHOOTING.md](TROUBLESHOOTING.md) when `check` still reports executable drift.

## 8. Linux setup differences

Linux support uses same PowerShell scripts; do not maintain duplicate shell installers.

1. Install `pwsh`, Git, Node/npm, Bun, `uv`, `rg`, and distro build tools.
2. Add `~/.local/bin` to `PATH` in `~/.profile` or shell config.
3. Run:

```bash
pwsh ./setup.ps1
pwsh ./maintain.ps1 verify
```

Differences:

- Config remains `~/.config/opencode`.
- Setup copies the same tracked config, command, agent, and skill files into `~/.config/opencode`.
- Background-agent environment is written to `~/.config/environment.d/opencode.conf`; export it in current shell or log in again.
- RTK uses Linux release archive and executable bit.
- Native Bash skill scripts work directly; PowerShell launchers remain available.
- Headroom uses its official `headroom wrap opencode` lifecycle. Export `HEADROOM_OPENCODE_PLUGIN_PATH` to the pinned source transport when wheel does not include it.
- Apply `chmod 600` to private credential files.
- App availability depends on OpenCode Linux desktop support; TUI and web are baseline.

Supported first target: current Ubuntu LTS. Verify same package targets, plugin origins, lazy loading, RTK, CodeGraph, Supermemory, OMO, and Headroom before claiming another distro supported.
