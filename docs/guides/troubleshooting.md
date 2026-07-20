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

Windows `headroom-ai[all]` native dependencies require Visual Studio 2022 Build Tools, C++ workload, and Windows SDK. Install command lives in [setup](setup.md#6-headroom-desktop-and-cli-proxy-optional). Restart terminal, install pinned Python tool, then build pinned transport.

Run `pwsh ./scripts/manage-headroom-proxy.ps1 status`. Expected: installed task and healthy `http://127.0.0.1:8787/livez`. The auto-discovered bridge makes four short health attempts and then fails open when the proxy is unavailable, so OpenCode still works but traffic bypasses Headroom. Re-run `install` after changing the pinned Headroom executable. Combined proxy output rolls between `proxy.log` and `proxy.log.previous` under `~/.local/state/opencode-headroom`; a visible Headroom terminal means the task still uses the obsolete direct executable action and should be reinstalled.

`Context Tool: rtk` does not mean bare proxy rewrites OpenCode commands. `plugins/rtk.ts` owns OpenCode command rewriting; `headroom proxy` reads `rtk gain` for statistics. Headroom memory stays disabled because Supermemory owns persistent memory. See [Headroom integration](../integrations/headroom.md) for exact ownership boundaries.

Do not use `headroom wrap opencode`: the pinned release injects synthetic providers/models and persistent Headroom/Serena MCP entries. Run `pwsh ./scripts/remove-headroom-opencode-pollution.ps1` once after migrating. Default cleanup scrubs both `opencode.jsonc` and leftover `opencode.json`; empty leftover JSON shells are deleted. Restart every OpenCode session after cleanup, including IntelliJ terminals that loaded the old dual config.

## CodeGraph error outside indexed project

CodeGraph helper owns the MCP enabled flag for automatic project switching: enabled only when the current plugin instance has `.codegraph/codegraph.db`. The assignment must be bidirectional because Desktop can reuse resolved config after opening an unindexed workspace; a disable-only hook leaves CodeGraph off when an indexed workspace opens later. Restore tracked helper into active plugins and restart OpenCode. Do not remove global CodeGraph config because indexed projects need it.

## Plugin executes twice or tools disappear

Local plugins are auto-discovered. Never list local file paths in global/project plugin arrays, and never set project `"plugin": []`. Compare `plugin_origins`; every local file should appear once. Rerun setup to restore tracked plugin directory.

## Desktop differs from TUI

Desktop may initialize plugins without injected Bun shell and may retain stale package/status state. Close Desktop fully, restart, wait for sidecar, create new session, then compare safe counts and origin specs. Plugin display and tool execution are separate checks.

## `load_tool` missing or tool arguments have wrong types

Restore `plugins/opencode-lazy-load.ts`, restart process, and run `bun test tests/opencode-lazy-load.test.ts`. The response adapter normalizes string-encoded numbers, booleans, arrays, and objects against each tool's captured JSON Schema for both native and text-encoded calls. It does not invent missing keys or rename model-provided keys. Loaded-tool state persists through one tool loop and clears on terminal stop. Repeated plugin initialization must return hooks every time; only fetch wrapping is idempotent.

## 9router model invalid or polluted namespace

Run `opencode models 9router`. Required configured fallback models must remain available during discovery failure, and `9router/opencode/*` entries must be absent. Restore `plugins/models-discovery.js` and restart affected process.

## Vision model cannot see attached image

OMO Slim `auto` image routing intercepts attachments when Observer is enabled: it saves image data locally, strips binary image parts from the primary request, and appends delegation text for `@observer`. This prevents even a native-vision model from receiving the original payload through 9router.

Tracked policy uses `"image_routing": "direct"` in `config/oh-my-opencode-slim.json`, deployed as `~/.config/opencode/oh-my-opencode-slim.json`. Direct mode preserves the image parts; the selected provider/model must still support images. Explicit `@observer` delegation remains available.

If behavior still looks automatic, check for higher-precedence OMO config without printing credentials: project-local `.opencode/oh-my-opencode-slim.json` or global `~/.config/opencode/oh-my-opencode-slim.jsonc` can override the managed global JSON. Restart OpenCode after correcting config.

## OpenCode free-tier quota appears unexpectedly

If `Free usage exceeded` appears before a tool call, verify the selected model belongs to `9router`, not OpenCode Zen with a similar display name. Start a fresh session and select the explicit 9router entry before diagnosing plugins or Headroom.

## Native Windows opens a WSL installation prompt

An upstream skill likely launched a Bash helper through Windows `bash.exe`. Use the skill's PowerShell launcher on native Windows, such as `pwsh -File scripts/task-brief.ps1 ...`. Installing WSL does not translate native `C:\...` paths; run OpenCode inside WSL or keep the PowerShell path consistently.

## Supermemory tool missing or HTTP 405 appears

Wrapper adapts named package export. Package patch skips cloud settings update for custom base URL. Rerun setup, verify package pin/patch, restart OpenCode, then run disposable add/search/list/forget lifecycle. Correlate logs by timestamp; do not expose credentials.

## Supermemory add succeeds but search returns zero

Check server logs for embedding timeout, `all providers failed`, or `VectorDB upsert failed`. A document reaching `done` does not prove its vectors were stored. Current VPS contract uses local `Xenova/bge-base-en-v1.5` and `/home/ubuntu/.supermemory-local`; verify both before testing a unique add → search → forget lifecycle. A model/provider change requires a fresh data directory or full re-ingestion, even when dimensions match. See [Supermemory server embedding](../integrations/supermemory-server-embedding.md).

## Supermemory returns 401 after key rotation

Check equality without printing values across the Nginx edge, user `SUPERMEMORY_API_KEY`, and `~/.config/opencode/supermemory.jsonc`. If they match, fully exit and restart OpenCode plus launching terminal. Existing Desktop/TUI processes inherit the previous environment value and cannot observe a registry update. Test from a fresh process with `bun ./scripts/verify-supermemory.ts "$HOME/.config/opencode"`; do not weaken Nginx authentication to accommodate stale clients.

## Supermemory refuses to start after embedding change

Provider, model, and dimensions are locked to each data directory. Point `SUPERMEMORY_DATA_DIR` at a fresh path or restore the original embedding configuration. Never delete the old directory as the first recovery step. Preserve it for rollback, start the fresh store, rotate its generated API key, and re-ingest only after add → search → forget succeeds.

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
git show main:knownbug.md
git show main:docs/opencode-agents.md
git show archive/broken-docs-reference:docs/opencode-bugs-known.md
```

Current behavior remains governed by the repository [README](../../README.md), [setup](setup.md), [local patch reference](../reference/patches.md), `config/components.json`, tests, and active source.
