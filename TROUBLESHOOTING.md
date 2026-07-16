# Troubleshooting

Purpose: map current symptoms to safe checks and recovery. Do not print full resolved configuration because provider/plugin credentials may be present.

## First checks

```powershell
pwsh ./maintain.ps1 check -Offline
pwsh ./maintain.ps1 verify -Offline
$config = ((opencode debug config 2>$null) -join "`n") | ConvertFrom-Json
[pscustomobject]@{ Plugins = @($config.plugin).Count; Origins = @($config.plugin_origins).Count }
```

Expected plugin/origin count comes from `config/components.json.expectedServerPlugins`. Compare `npm --prefix "$HOME\.config\opencode" ls --depth=0` with manifest. Never use `npm audit fix --force`.

## Goal still appears

Goal is disabled. Active config must not contain Goal npm pin or `/goal`; setup also retires old package dependency. Rerun setup, restart OpenCode, then inspect counts. Dormant command, patch, and verifier remain only as investigation evidence.

## RTK version drift

Setup installs RTK under `~/.local/bin` but does not replace another `rtk.exe` elsewhere. User owns executable cleanup/update.

```powershell
Get-Command rtk -All | Select-Object Source
& "$HOME\.local\bin\rtk.exe" --version
rtk --version
```

If another directory wins PATH, update/remove that copy yourself or prepend `~/.local/bin`; repository scripts must not mutate System32.

## Headroom install or build fails

Windows `headroom-ai[all]` native dependencies require Visual Studio 2022 Build Tools, C++ workload, and Windows SDK. Install command lives in [setup.md](setup.md#6-headroom-official-wrapper-optional). Restart terminal, install pinned Python tool, then build pinned transport.

Use `headroom wrap opencode`, not the retired repository launcher. If custom-provider traffic bypasses Headroom, verify `HEADROOM_OPENCODE_PLUGIN_PATH` points to `~/.cache/opencode-headroom/source/plugins/opencode/dist/entry.opencode.js`. The 0.31.0 wheel can route built-in providers without that file but does not ship transparent transport for 9router and other custom providers.

## CodeGraph error outside indexed project

CodeGraph helper enables MCP only when `.codegraph/codegraph.db` exists. Restore tracked helper into active plugins and restart OpenCode. Do not remove global CodeGraph config because indexed projects need it.

## Plugin executes twice or tools disappear

Local plugins are auto-discovered. Never list local file paths in global/project plugin arrays, and never set project `"plugin": []`. Compare `plugin_origins`; every local file should appear once. Rerun setup to restore tracked plugin directory.

## Desktop differs from TUI

Desktop may initialize plugins without injected Bun shell and may retain stale package/status state. Close Desktop fully, restart, wait for sidecar, create new session, then compare safe counts and origin specs. Plugin display and tool execution are separate checks.

## `load_tool` missing or DSML appears as text

Restore `plugins/lazy-load.ts`, restart process, and run `bun test tests/lazy-load.test.ts`. Loaded-tool state persists through one tool loop and clears on terminal stop. Repeated plugin initialization must return hooks every time; only fetch wrapping is idempotent.

## 9router model invalid or polluted namespace

Run `opencode models 9router`. Required configured fallback models must remain available during discovery failure, and `9router/opencode/*` entries must be absent. Restore `plugins/models-discovery.js` and restart affected process.

## Supermemory tool missing or HTTP 405 appears

Wrapper adapts named package export. Package patch skips cloud settings update for custom base URL. Rerun setup, verify package pin/patch, restart OpenCode, then run disposable add/search/list/forget lifecycle. Correlate logs by timestamp; do not expose credentials.

## Duplicate or obsolete skills

Setup avoids repository/external skill-name duplication and removes retired browser automation, DevTools debugger, and docs-fetcher MCP skills from active config. It does not delete user-owned skill roots. Remove stale copies only after confirming ownership.

## OpenCode npm update fails with exit code 14

Windows holds `opencode.exe` open. Use exact approved version:

```powershell
pwsh ./scripts/update-opencode.ps1 -Version 1.18.1
```

Close all OpenCode processes; hidden helper updates after locks release.

## npm reports blocked install scripts or vulnerabilities

npm 11 can report unapproved lifecycle scripts for pinned packages. Inspect first with `npm install-scripts ls`; approve only exact reviewed packages when missing native behavior proves script is required. Do not grant broad script approval.

`maintain.ps1 verify` fails on high/critical production vulnerabilities. Low/moderate transitive findings require upstream review; never run `npm audit fix --force` because it can replace approved package versions and break local patches.

## Historical retrieval

Removed debug notes and Mem0 archive are historical, not deployable. Read without checkout:

```powershell
git show master:knownbug.md
git show master:docs/opencode-agents.md
git show archive/broken-docs-reference:docs/opencode-bugs-known.md
```

Current behavior remains governed by [README.md](README.md), [setup.md](setup.md), [PATCHES.md](PATCHES.md), `config/components.json`, tests, and active source.
