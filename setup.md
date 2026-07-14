# Setup

Purpose: install this repository on a new machine, restore private credentials, and verify runtime behavior. Windows is primary. Linux differences are documented last.

## 1. Prerequisites

Install Git, PowerShell 7, Node.js, npm, Bun, Python `uv`, and ripgrep. Keep user binary directory on `PATH`:

```powershell
$bin = "$HOME\.local\bin"
[Environment]::SetEnvironmentVariable("PATH", "$bin;$([Environment]::GetEnvironmentVariable('PATH','User'))", "User")
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

`setup.ps1` copies repository-controlled files, installs manifest-approved components, applies package patches, configures CodeGraph/RTK, skips skills already discovered under `~/.agents` or `~/.claude`, and runs verification. Existing `opencode.jsonc` and `supermemory.jsonc` credentials are preserved.

Optional components such as Headroom are not installed by default.

## 3. Private credentials

Use machine-local credential script or edit these ignored files:

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
2. Run `/goal <disposable objective>`, confirm Goal sidebar appears, then clear goal.
   Deterministic renderer check: `bun ./scripts/verify-goal-tui.ts "$HOME/.cache/opencode"`.
3. Run `/tokens` after model request.
4. Run `ping all agents` and one bounded child-agent task.
5. In indexed project, use CodeGraph; outside indexed project, confirm no startup error.
6. Add/search/list/forget disposable Supermemory marker.
   Automated verifier: `bun ./scripts/verify-supermemory.ts "$HOME/.config/opencode"`.
7. Run RTK rewrite: `& "$HOME\.local\bin\rtk.exe" rewrite "git status"`.

## 5. Updates

```powershell
pwsh ./maintain.ps1 check
pwsh ./maintain.ps1 plan
```

Review `.state/update-plan.md`. To approve target, edit only matching `target` in `config/components.json`, review upstream diff and [PATCHES.md](PATCHES.md), then:

```powershell
pwsh ./maintain.ps1 apply -Component COMPONENT_ID
pwsh ./maintain.ps1 verify
```

Use `-All` only after every target in manifest has been reviewed. Maintainer stops rather than overwriting copied upstream forks.

## 6. Headroom optional launcher

```powershell
pwsh ./scripts/install-headroom-plugin.ps1
pwsh ./scripts/start-opencode-headroom.ps1 -OpenCodeArgsJson '["run","--model","opencode/deepseek-v4-flash-free","Return exact text: HEADROOM_OK"]'
```

Metadata log: `$env:TEMP\opencode-headroom\requests.jsonl`. Prompts are not logged. Launcher does not edit OpenCode config and stops only proxy it started.

## 7. Recovery

```powershell
pwsh ./setup.ps1
pwsh ./maintain.ps1 verify
```

Setup is safe to rerun. It restores tracked files and exact targets without replacing private credential files.

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
- Headroom launcher uses cross-platform TCP probing and process cleanup. Run same PowerShell commands on Linux.
- Apply `chmod 600` to private credential files.
- App availability depends on OpenCode Linux desktop support; TUI and web are baseline.

Supported first target: current Ubuntu LTS. Verify same package targets, plugin origins, Goal/sidebar, lazy loading, RTK, CodeGraph, Supermemory, OMO, and Headroom before claiming another distro supported.
