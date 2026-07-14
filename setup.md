# OpenCode Setup

Use this guide to install this repository on a Windows PC, add private credentials, start OpenCode, and prove every part works. For plugin source changes and updates, use [pr.md](pr.md).

## Supported Environment

Verified host:

- Windows 11 x64
- PowerShell 7 (`pwsh.exe`), not Windows PowerShell 5.1
- OpenCode CLI/TUI `1.17.18`
- OpenCode Desktop App Windows x64
- User configuration root: `$HOME\.config\opencode`
- Repository checkout: `$HOME\opencode-dotfiles`
- 9router OpenAI-compatible provider
- Optional Oracle VPS entry named `Oracle VPS` in VibeShell

Use native Windows paths. WSL can run OpenCode, but this repository's bootstrap and Desktop validation target native Windows.

## Required Software

Install Git, PowerShell 7, and Node.js LTS from an elevated terminal when machine policy requires elevation:

```powershell
winget install --id Git.Git -e
winget install --id Microsoft.PowerShell -e
winget install --id OpenJS.NodeJS.LTS -e
```

Install Bun from official Windows installer:

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Open new PowerShell 7 terminal, then verify:

```powershell
git --version
pwsh --version
node --version
npm --version
bun --version
```

Install tested OpenCode version:

```powershell
npm install -g opencode-ai@1.17.18
opencode --version
```

Install Desktop App from `https://opencode.ai/download`. Tested executable path:

```powershell
$desktop = "$env:LOCALAPPDATA\Programs\@opencode-aidesktop\OpenCode.exe"
Test-Path -LiteralPath $desktop
```

Install CodeGraph. Bootstrap can perform npm installation, but standalone install is valid without Node:

```powershell
irm https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.ps1 | iex
codegraph --version
```

Official alternative:

```powershell
npm install -g @colbymchenry/codegraph
```

Install RTK from Windows x64 release at `https://github.com/rtk-ai/rtk/releases`. Extract `rtk.exe` into a directory present in user `PATH`, then verify:

```powershell
rtk --version
rtk gain
```

Wrong crates.io package may share `rtk` name. Correct binary supports `rtk gain`, `rtk rewrite`, and `rtk init -g --opencode`.

VibeShell is optional and required only for Oracle VPS checks. Verify configured server after VibeShell installation and login:

```powershell
vshell version
vshell servers
```

## Clone and Bootstrap

```powershell
git clone https://github.com/tienbac2314/my-opencode-setup "$HOME\opencode-dotfiles"
Set-Location "$HOME\opencode-dotfiles"
.\bootstrap.ps1
```

Bootstrap performs these mutations under `$HOME\.config\opencode`:

1. Creates configuration root.
2. Creates `opencode.jsonc` from tracked example only when missing.
3. Copies `AGENTS.md`, `tui.json`, skills, agents, and data.
4. removes legacy duplicate plugins and Mem0 runtime artifacts.
5. Copies six repository plugins into auto-discovery directory.
6. Creates `supermemory.jsonc` from example only when missing.
7. Downloads `/tokens` command definition when network permits.
8. Generates `package.json` and runs `npm install`.
9. Runs pinned OMO Slim installer, then restores repository preset and plugin pins.
10. Installs/configures CodeGraph unless skipped.
11. Sets `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true` at user scope.
12. Links unique `$HOME\.agents\skills` entries without deleting user-owned skills.
13. Runs RTK OpenCode initializer unless skipped, then restores audited RTK plugin.

Bootstrap preserves existing provider and Supermemory credential files. It overwrites repository-controlled local plugins, agents, skills, data, TUI config, and OMO Slim preset.

## Bootstrap Parameters

```powershell
.\bootstrap.ps1 -SkipRtk
.\bootstrap.ps1 -SkipCodeGraph
.\bootstrap.ps1 -SkipRtk -SkipCodeGraph
```

- `-SkipRtk`: skip `rtk init -g --opencode`.
- `-SkipCodeGraph`: skip CodeGraph installation and agent wiring.
- `-UpdateOnly -Component OmoSlim`: update only OMO Slim, then restore tailored OMO/TUI/global configuration and six audited local plugins.
- `-VersionsFile PATH`: use alternate private version file. Normal path is `$HOME\.config\opencode\versions.env`.

No dry-run or `-WhatIf` contract exists. Use isolated Windows account or disposable config root when testing bootstrap side effects.

## Private Version File

Use this file to change exact package targets without editing `bootstrap.ps1`:

```powershell
Copy-Item .\config\versions.env.example "$HOME\.config\opencode\versions.env"
notepad "$HOME\.config\opencode\versions.env"
```

Bootstrap creates file from tracked example when missing. File accepts `KEY=VERSION`, blank lines, and `#` comments. It contains versions only, no credentials. Keep machine file outside Git.

## Provider Credentials

Tracked template: `config/opencode.jsonc.example`. Active ignored file: `$HOME\.config\opencode\opencode.jsonc`.

Replace provider placeholder, then replace tracked user-specific skills path:

```json
{
  "provider": {
    "9router": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "https://tienbac.dpdns.org/v1",
        "apiKey": "YOUR_API_KEY_HERE",
        "modelsDiscovery": {
          "enabled": true
        }
      }
    }
  }
}
```

`skills.paths[0]` in tracked example is `C:\Users\bacnt\.config\opencode\skills`. Bootstrap copies that value verbatim. Change it to current user's absolute path, for example `C:\Users\YOUR_USER\.config\opencode\skills`; environment-variable syntax is not documented as supported in this field.

Do not copy local credential script into repository. Reference environment `C:\Users\bacnt\Desktop\workathome\.config` is diagnostic baseline only; bootstrap never reads it.

Tracked example defaults to OpenCode free model. OpenCode free-tier exhaustion is independent of 9router credentials. Use explicit 9router model for validation:

```powershell
opencode models 9router
```

Expected provider list includes `9router/oc/deepseek-v4-flash-free`.

## Supermemory Credentials and Endpoint

Tracked template: `config/supermemory.jsonc.example`. Active ignored file: `$HOME\.config\opencode\supermemory.jsonc`.

```json
{
  "apiKey": "sm_your_api_key_here",
  "baseUrl": "https://supermemory.tienbac.dpdns.org"
}
```

Rules:

- Real API key exists only in ignored active file or external secret manager.
- Base URL has no Markdown link syntax and no trailing API path.
- Restart TUI and Desktop after changing file.
- `plugins/supermemory.ts` imports named `SupermemoryPlugin` and exports default OpenCode plugin object.
- `mem0-archive/` is never copied to active config.

Oracle VPS verified deployment:

- systemd unit: `supermemory.service`
- executable: `/home/ubuntu/.supermemory/bin/supermemory-server`
- loopback listener: `127.0.0.1:6767`
- public tunnel owner: `cloudflared.service`
- public route: `https://supermemory.tienbac.dpdns.org`
- encrypted runtime configuration: `/home/ubuntu/.supermemory/`

Do not replace standalone server with Docker deployment during client setup. Server migration requires separate backup, rollback, and compatibility plan.

## Dependency Pins

Fresh bootstrap reads `$HOME\.config\opencode\versions.env` and generates `$HOME\.config\opencode\package.json`. Tracked example starts with:

| Package | Required version |
|---|---|
| `@opencode-ai/plugin` | `1.17.18` |
| `@ai-sdk/openai-compatible` | `3.0.7` |
| `opencode-supermemory` | `2.0.8` |
| `opencode-update-notifier` | `0.3.3` |
| `oh-my-opencode-slim` | `2.2.0` |

Verify:

```powershell
Push-Location "$HOME\.config\opencode"
bun pm ls
Pop-Location
```

Bootstrap preserves existing `opencode.jsonc`, then private version values win for tested npm plugins. Normalize any mismatch:

```powershell
Push-Location "$HOME\.config\opencode"
npm install --save-exact "@opencode-ai/plugin@1.17.18" "@ai-sdk/openai-compatible@3.0.7" "opencode-supermemory@2.0.8" "opencode-update-notifier@0.3.3" "oh-my-opencode-slim@2.2.0"
Pop-Location
```

Do not remove pins because newer registry versions have not passed this repository's tests and Desktop checks.

## Effective Plugin Origins

OpenCode may omit resolved `plugin` array from debug output and expose normalized entries under `plugin_origins`. Print only origins to avoid credential output:

```powershell
$raw = opencode debug config | Out-String
$config = $raw | ConvertFrom-Json
$config.plugin_origins | ForEach-Object { $_.spec }
```

Expected count: eight. Expected set:

```text
opencode-update-notifier@0.3.3
oh-my-opencode-slim@2.2.0
file:///.../plugins/supermemory.ts
file:///.../plugins/rtk.ts
file:///.../plugins/models-discovery.js
file:///.../plugins/lazy-load.ts
file:///.../plugins/codegraph-helper.ts
file:///.../plugins/0-tokens-source.ts
```

Each local file appears once. Duplicate local entry in `opencode.jsonc` or `tui.json` is configuration error.

## TUI Startup

Open project directory and force validated provider model:

```powershell
Set-Location "$HOME\opencode-dotfiles"
opencode --model 9router/oc/deepseek-v4-flash-free
```

Prompt:

```text
Use load_tool to load bash, then use bash to run: Write-Output TUI_LAZY_OK. Return exact command output.
```

Expected visible sequence:

```text
load_tool [name=bash]
Write-Output TUI_LAZY_OK
TUI_LAZY_OK
```

Exit with `Ctrl+C` after response completes.

## Desktop App Startup

```powershell
$desktop = "$env:LOCALAPPDATA\Programs\@opencode-aidesktop\OpenCode.exe"
& $desktop
```

In App:

1. Open repository `C:\Users\bacnt\opencode-dotfiles` or cloned equivalent.
2. Create new session.
3. Open model selector.
4. Search `deepseek-v4-flash-free`.
5. Select `9router` result `oc/deepseek-v4-flash-free`; do not select identically named OpenCode Zen free result.
6. Submit:

```text
Use load_tool to load bash, then use bash to run: Write-Output DESKTOP_LAZY_OK. Return exact command output.
```

Expected App trace contains `Called 'load_tool' bash`, shell command, shell output, and final `DESKTOP_LAZY_OK`.

Desktop can keep plugin details from an existing session after an update. Close App, wait for process to exit, reopen it, and create a new session before checking Status. Sidecar startup can briefly show `Could not reach Local Server`; wait about 15 seconds before treating it as a failure.

`Free usage exceeded, subscribe to Go` identifies OpenCode Zen provider quota. Select explicit 9router result and retry in fresh session.

## First-Run Lifecycle Checks

### Regression suite

```powershell
Set-Location "$HOME\opencode-dotfiles"
bun test
```

Expected: all tests pass. Exact count grows as regression cases are added.

### CLI lazy load

```powershell
opencode run --model 9router/oc/deepseek-v4-flash-free "Use load_tool to load bash, then use bash to run: Write-Output CLI_LAZY_OK. Return exact command output."
```

Expected: `CLI_LAZY_OK`.

### Models discovery

```powershell
$models = @(opencode models 9router)
"total=$($models.Count)"
"oc=$(@($models | Where-Object { $_ -like '9router/oc/*' }).Count)"
"polluted=$(@($models | Where-Object { $_ -like '9router/opencode/*' }).Count)"
```

Verified values: `total=52`, `oc=6`, `polluted=0`. Provider inventory can change; required result is six injected `9router/oc/*` models and zero `9router/opencode/*` IDs.

### CodeGraph

```powershell
codegraph init
codegraph status .
codegraph explore "LazyLoadPlugin createSSETransform"
```

Expected: `.codegraph/` exists, status reports current index, explore returns lazy-load source/call path. Repository ignore rules exclude database content.

### Token source

1. Complete one model request.
2. Run `/tokens` in same session.
3. Verify non-empty System Prompt, Tools, Messages, Estimated Total, and API Actual when provider reports usage.

### OMO Slim

Run `ping all agents`. Expected orchestration loads configured agents, tools, MCPs, and commands without missing-model or duplicate-plugin errors.

### RTK

```powershell
rtk rewrite "git status"
rtk git status --short
```

Expected rewrite produces supported RTK form and output remains equivalent. Desktop often omits injected shell `$` and `C:\Windows\System32` from child `PATH`; audited plugin uses child process and checks system directory directly, so RTK remains active.

### Update notifier

Start TUI and inspect logs/notifications. Initialization and registry comparison must not edit `$HOME\.config\opencode\package.json`.

### Supermemory

Use unique disposable marker:

1. `supermemory` mode `add` with marker.
2. mode `search` for exact marker.
3. mode `profile`.
4. mode `list` and locate marker.
5. mode `forget` with returned memory ID.
6. mode `search` again and prove marker absent.

Health checks alone do not prove authentication, storage, retrieval, or deletion.

## Oracle VPS Health Checks

Run from trusted workstation with VibeShell server named `Oracle VPS`:

```powershell
vshell servers
vshell ssh "Oracle VPS" -- systemctl is-active supermemory
vshell ssh "Oracle VPS" -- systemctl is-enabled supermemory
vshell ssh "Oracle VPS" -- systemctl is-active cloudflared
vshell ssh "Oracle VPS" -- curl -fsS -o /dev/null -w "%{http_code}" http://127.0.0.1:6767/
vshell ssh "Oracle VPS" -- journalctl -u supermemory --since "30 minutes ago" --no-pager
```

Expected: both units active, Supermemory enabled, local HTTP 200, no restart loop or recent fatal errors. From local workstation:

```powershell
(Invoke-WebRequest -UseBasicParsing 'https://supermemory.tienbac.dpdns.org/').StatusCode
```

Expected: 200.

Do not execute standalone server binary with `--help`; current binary may start another listener instead of printing help.

## Upgrade Procedure

Use this section for package or plugin upgrades. Update one component at a time; [pr.md#safe-update-steps-for-changed-plugins](pr.md#safe-update-steps-for-changed-plugins) has exact comparison steps and a [copy-paste prompt for a future update agent](pr.md#prompt-for-a-future-update-agent).

1. Read [pr.md](pr.md), especially the plugin section and checks required before removing a local fix.
2. Change one target in private `$HOME\.config\opencode\versions.env` after reading release notes.
3. For OMO Slim, preview with `.\update-plugins.ps1 -Component OmoSlim -DryRun`.
4. Run `.\bootstrap.ps1 -UpdateOnly -Component OmoSlim`; full bootstrap is for first install or recovery.
5. For source-derived local files, compare upstream and reapply local fixes manually. Update notifier does not track wrappers or `file:` plugins.
6. Run full tests, plugin bundles, effective-origin check, CLI/TUI/Desktop lazy-load checks, and changed component's full test flow.
7. Commit only after active files hash-match repository copies where applicable.

## Recovery Diagnostics

| Symptom | Check | Required result |
|---|---|---|
| `Model tried to call unavailable tool 'load_tool'` | restart process; inspect repeated-init test | second plugin initialization returns tool and hook |
| TUI works, Desktop fails | inspect module export shape, missing `input.$`, and repeated initialization | compatible export; child-process fallback; every initialization returns hook |
| OMO package differs from private target | inspect preserved root plugin entry and `bun pm ls` | run exact normalization command under Dependency Pins |
| hooks run twice | inspect `plugin_origins` | each local plugin once |
| `finish: unknown` or stale tool next turn | run lazy-load tests | finish event preserved; turn state cleared |
| DSML text printed | split-DSML regression | DSML converted; surrounding text preserved |
| model list contains `9router/opencode/*` | inspect model filter | source `opencode/` IDs skipped |
| Supermemory tool missing | bundle wrapper from active config | named export resolves and default adapter loads |
| Supermemory HTTP works but CRUD fails | run full lifecycle | add/search/list/forget all succeed |
| RTK disabled or native `git status` appears | run repeated-init RTK test; inspect missing `$` fallback | second initialization returns hook; App trace shows `rtk git status` |
| CodeGraph blocks grep unexpectedly | inspect `.codegraph/` | block applies only in indexed repository |

## Security Rules

- Never commit active `opencode.jsonc`, `supermemory.jsonc`, credentials, logs, package cache, or `.codegraph` database.
- Never paste `opencode debug config` unfiltered into issues; provider keys may appear.
- Never store Oracle service tokens, Cloudflare credentials, or decrypted Supermemory config in repository.
- Use disposable unique markers for memory tests and delete them.
- Treat `archive/broken-docs-reference` as read-only evidence, not deployable configuration.
- Review `git diff --cached` and run secret-pattern scan before every documentation or configuration commit.

Official install references:

- OpenCode: `https://opencode.ai/docs/`
- Bun: `https://bun.sh/docs/installation`
- CodeGraph: `https://github.com/colbymchenry/codegraph`
- RTK: `https://github.com/rtk-ai/rtk`
