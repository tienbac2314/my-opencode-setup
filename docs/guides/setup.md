# Setup

Purpose: install this repository on a new machine, restore private credentials, and verify runtime behavior. Windows is primary. Linux differences are documented last.

## 1. Prerequisites

Install Git, PowerShell 7, Node.js, npm, Python `uv`, and ripgrep. `setup.ps1` automatically installs official Bun when vanilla OMO Slim cannot spawn `bun.exe`; npm-created `bun.ps1` or `bun.cmd` shims alone do not count. Keep user binary directory on `PATH`:

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

`setup.ps1` copies repository-controlled files, deploys `config/AGENTS.md` as global policy while leaving root `AGENTS.md` repository-only, installs manifest-approved components, applies package patches, configures CodeGraph/RTK, skips skills already discovered under `~/.agents` or `~/.claude`, and runs verification. Existing `opencode.jsonc` credentials are preserved.

Optional components such as Headroom are not installed by default.

## 3. Private credentials

### Export from an already configured Windows PC

The repository includes a safe inverse of the restore script. On the fully configured source PC:

```powershell
pwsh ./scripts/export-credentials.ps1
```

Export and restore share the default private file `~/.config/opencode/credentials.json`. The output is JSON rather than `.ps1` so secrets cannot be executed accidentally. It contains only the managed 9router and optional OpenRouter values. The script refuses to overwrite an existing file unless `-Force` is explicit, restricts the Windows ACL to the current user, and never prints credential values.

Copy that private file to the target PC through a trusted channel, restore it with `set-credentials.ps1`, verify the target, then remove unnecessary copies. Never place it inside this repository, cloud-synced Desktop storage, chat, or shell history.

### Restore on another PC

Create an ignored private JSON file:

```json
{
  "router_api_key": "",
  "router_base_url": "",
  "openrouter_api_key": ""
}
```

Restore it after setup:

```powershell
pwsh ./scripts/set-credentials.ps1
```

Required fields are `router_api_key` and `router_base_url`; `openrouter_api_key` is optional. Script updates only 9router options, optional OpenRouter auth, and this user variable:

```text
OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS
```

Restart terminals and OpenCode after persistent environment changes. To set only current shell:

```powershell
$env:OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS = "true"
```

Files remain ignored and machine-local:

```text
~/.config/opencode/opencode.jsonc
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
2. Run `/tokens` after model request.
3. Run `ping all agents` and one bounded child-agent task.
4. In an indexed project, use CodeGraph; elsewhere, use normal search.
5. Run RTK rewrite: `rtk rewrite "git status"`.
6. Select a vision-capable 9router model, attach a disposable image, and confirm the model analyzes it directly without injected `@observer` delegation text.

Tracked `config/oh-my-opencode-slim.json` sets `image_routing: direct`; setup deploys it to `~/.config/opencode/oh-my-opencode-slim.json`. This preserves original image parts for OpenCode/provider delivery. It does not add vision to text-only models, and explicit `@observer` delegation remains available. A project-local OMO config or global `oh-my-opencode-slim.jsonc` takes precedence and can override this managed JSON setting.

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

Review `.state/update-plan.md`. To approve a target, edit only its `target` in `config/components.json`, review the upstream diff and [local patches](../reference/patches.md), then apply that component.

Latest versions are reported, never auto-approved. Targets remain exact because package patches, copied forks, and runtime contracts require review before each version change. OMO Slim follows the same rule: fresh setups, Desktop, and TUI load the tested version from `config/components.json`. To update it, review the upstream diff, change that exact target, then run `apply` and `verify`.

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

## 6. Headroom Desktop and CLI proxy (optional)

Windows Python dependencies require Visual Studio 2022 Build Tools with C++ workload. Run from Administrator PowerShell, then restart terminal:

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools --silent --accept-package-agreements --accept-source-agreements --override "--add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.Component.Windows11SDK.22000 --includeRecommended --quiet --wait"
```

Install pinned Python proxy and build pinned OpenCode transport. The `headroom-ai` 0.31.0 wheel does not ship `entry.opencode.js`, so custom providers such as 9router still need the pinned source build:

```powershell
uv tool install --force "headroom-ai[all]==0.31.0"
pwsh ./scripts/install-headroom-plugin.ps1
pwsh ./scripts/remove-headroom-opencode-pollution.ps1
pwsh ./scripts/manage-headroom-proxy.ps1 install
pwsh ./scripts/manage-headroom-proxy.ps1 status
opencode models 9router
```

The manager installs a hidden current-user login task that keeps `headroom proxy` independent of OpenCode. The task uses `scripts/run-headroom-proxy.ps1` to suppress the console and write a two-file rolling log under `~/.local/state/opencode-headroom`. Auto-discovered `plugins/headroom.ts` gives both Desktop and CLI the same transport. It activates only when the login-task marker exists and `/livez` identifies a healthy Headroom service; otherwise four short health attempts fail open to direct provider traffic. Normal use is opening Desktop or running `opencode`—no wrapper command or profile function is required. Dashboard and statistics remain available while the service runs. Headroom memory and learning remain disabled so the proxy stays transport-only; RTK remains enabled for shell-output compression and Headroom only reads its savings counters.

Do not use `headroom wrap opencode` with this configuration. Headroom 0.31.0 adds synthetic `anthropic`, `openai`, and `headroom` providers, a hardcoded Claude/OpenAI model catalog, and persistent Headroom/Serena MCP entries. This can hide dynamically discovered 9router models in TUI and pollute App model lists. The cleanup script removes only those recognized Headroom-owned entries while preserving 9router credentials and unrelated config. Default cleanup targets both `opencode.jsonc` and leftover `opencode.json`, then deletes empty leftover JSON shells so dual-config merge cannot reintroduce Headroom/Serena MCP.

`scripts/start-opencode-headroom.ps1` remains a diagnostic fallback that starts a temporary proxy before launching CLI OpenCode. It is not needed for normal Desktop or CLI use.

## 7. Recovery

```powershell
pwsh ./setup.ps1
pwsh ./maintain.ps1 verify
```

Setup is safe to rerun. It restores tracked files, tested package baselines, and the OMO latest-channel exception without replacing private credential files.

Setup does not replace executables outside repository-managed install locations. Use [troubleshooting](troubleshooting.md) when `check` still reports executable drift.

## 8. Linux setup differences

Linux support uses same PowerShell scripts; do not maintain duplicate shell installers.

1. Install `pwsh`, Git, Node/npm, `uv`, `rg`, and distro build tools. Setup installs Bun through its official shell installer when missing; `bash` and `curl` must be available.
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
- Windows Headroom uses the current-user login task. On Linux, run `headroom proxy --port 8787` from the user service manager and set `HEADROOM_PROXY_URL` for the OpenCode process until equivalent service installation is implemented.
- Apply `chmod 600` to private credential files.
- App availability depends on OpenCode Linux desktop support; TUI and web are baseline.

Supported first target: current Ubuntu LTS. Verify same package targets, plugin origins, lazy loading, RTK, CodeGraph, OMO, and Headroom before claiming another distro supported.
