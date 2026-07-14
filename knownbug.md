# OpenCode Known Problems and Fixes

Use this page when the setup starts but behaves incorrectly. Find the matching symptom, run its safe check, then apply only the listed fix. For installation use [setup.md](setup.md); for plugin source changes use [pr.md](pr.md).

## Headroom provider missing or proxy does nothing

**Symptom:** `opencode models headroom` says provider not found, port 8787 is closed, or starting normal OpenCode produces no Headroom traffic.

**Cause:** old setup added an empty persistent `headroom` provider but did not start proxy or build native transport plugin. Normal OpenCode is intentionally not intercepted now.

**Fix:** run `scripts/install-headroom-plugin.ps1`, then use `scripts/start-opencode-headroom.ps1`. Keep original provider/model selection inside launched session. Do not add persistent provider entry or fixed upstream. Check `$env:TEMP\opencode-headroom\requests.jsonl` to confirm traffic reached Headroom.

**Isolation check:** after launcher exits, port 8787 has no listener unless healthy proxy existed before launch. Hashes of active `opencode.jsonc`, `tui.json`, and `AGENTS.md` must remain unchanged.

## `/goal` appears but does not create a goal

**Symptom:** TUI accepts `/goal`, but model receives only objective text, goal sidebar stays empty, or plugin list settles at eight entries.

**Cause:** package `0.1.24` exports its server entrypoint as `{ id, server }`, while OpenCode `1.17.x` server loading expects a callable export. The failed npm server entry disappears from loaded plugins. Old config then masks failure with `"template": "$ARGUMENTS"`, which sends raw text without goal-tool instructions.

**Fix:** keep package as dependency and TUI entrypoint, but load server half through auto-discovered `plugins/goal.ts`. Remove explicit `@prevalentware/opencode-goal-plugin/server` from `opencode.jsonc`. Do not define raw `$ARGUMENTS` goal command; adapter lets upstream server hook register full template.

**Check:** `opencode debug config` must show nine server plugins, including `plugins/goal.ts`, no `/server` npm origin, and `command.goal.template` containing `create_goal`. A live `/goal test objective` must create matching entry in `%APPDATA%\opencode-goal-plugin\goals.json`.

`tui.json` remains plugin-only:

```json
{
  "plugin": [
    "oh-my-opencode-slim@2.2.1",
    "@prevalentware/opencode-goal-plugin/tui@0.1.24"
  ]
}
```

## CodeGraph error outside indexed projects

**Symptom:** OpenCode shows `[ERR] CodeGraph not initialized in <folder>` and TUI freezes or exits when started in a folder without `.codegraph/`.

**Cause:** CodeGraph is installed as a global MCP entry. User home may contain `.codegraph/` daemon and telemetry files without a project database. Directory existence alone does not mean project is initialized.

**Fix:** `codegraph-helper.ts` disables that MCP entry when `.codegraph/codegraph.db` is absent. Do not remove global CodeGraph config: indexed workspaces still use it. If error returns, confirm active helper matches repository copy and restart OpenCode.

## Local Plugin Duplication

**Symptom:** hook executes twice, `fetch` wrappers nest, Desktop startup differs from TUI, or tool definitions disappear unpredictably.

**Cause:** same local plugin is auto-discovered from `~/.config/opencode/plugins/` and also listed in `opencode.jsonc` or `tui.json`.

**Rule:** explicit plugin arrays contain pinned npm packages only. Local files exist only in plugin directory.

**Detection:**

```powershell
$config = (opencode debug config | Out-String) | ConvertFrom-Json
$config.plugin_origins | ForEach-Object { $_.spec }
```

Expected: nine origins; every local file once. Eight means goal server adapter is missing.

**Recovery:** remove explicit file entries, run bootstrap to restore active plugin directory and pinned npm entries, restart all OpenCode processes.

## Desktop Plugin List Hidden by Project Override

**Symptom:** Desktop status opens with eight plugins, may briefly show nine during reload, settles at eight, then later displays only `Plugins configured in opencode.json`. Tool calls can still work because plugin origins remain loaded.

**Cause:** project-scoped `.opencode/opencode.json` contains `"plugin": []`. In OpenCode `1.17.18`, runtime loading uses resolved `plugin_origins`, while Desktop status reads resolved `plugin`. Empty project array overwrites displayed list without unloading origins. This is a configuration-layer bug, not evidence that `load_tool`, local plugins, or Supermemory failed.

**Rule:** omit `plugin` entirely from project `.opencode/opencode.json`. Never use an empty array to mean “no project plugins.” Runtime npm plugin pins remain in user config; local plugins remain auto-discovered from plugin directory.

**Safe detection:** inspect only counts and origin specs. Do not print full resolved config because it contains provider and plugin credentials.

```powershell
$config = (opencode debug config | Out-String) | ConvertFrom-Json
[pscustomobject]@{
  Plugins = @($config.plugin).Count
  Origins = @($config.plugin_origins).Count
}
$config.plugin_origins | ForEach-Object { $_.spec }
```

Expected: `Plugins = 9`, `Origins = 9`, with two npm and seven local origins listed once each. `Plugins = 0`, `Origins = 9` fingerprints project override; do not change lazy-load code. `Plugins = 8`, `Origins = 8` means goal server adapter is missing.

**Recovery:** remove only project `plugin` property, preserve `$schema`, then fully reload Desktop with `Ctrl+R` or start a new process. Open status Plugins tab at least three times and confirm count stays eight. Run one `load_tool` shell marker afterward; plugin display and tool execution are independent checks.

**Regression guard:** `tests/bootstrap.test.ts` asserts `.opencode/opencode.json` has no `plugin` property. Run `rtk proxy bun test` before committing or after changing project configuration.

**Log attribution:** one Desktop `run=` log can contain events from multiple workspaces. Associate plugin errors with nearest surrounding `directory=` record before treating them as this repository's failure.

**Fresh-agent order:** check project override, compare safe counts, reload App, verify repeated status, then test `load_tool`. Investigate plugin implementation only if counts or tool execution still fail. This order prevents needless rollback of working lazy-load and Supermemory migration code.

## Desktop Plugin Module Shape

**Symptom:** TUI loads plugin; Desktop reports missing default export, unavailable tool, or `input.$ is not a function`.

**Cause:** Electron runtime exercises stricter ESM discovery and can initialize plugins without Bun shell injection.

**Rule:** local module must expose an OpenCode-compatible plugin function, either directly as a named export or through default `{ id, server }` metadata when an adapter is required. Shell-dependent plugin must support Desktop input without injected `$` and repeated initialization.

**Detection:** bundle each local plugin; inspect Desktop logs; run null-shell initialization test for RTK.

**Recovery:** restore repository plugin copies through bootstrap, verify repository-active SHA-256 matches, restart Desktop process.

## OpenCode Free-Tier Exhaustion

**Symptom:** `Free usage exceeded, subscribe to Go` with long retry timer before any tool call.

**Cause:** session selected OpenCode Zen free model, not 9router result with same display name.

**Rule:** select provider `9router`, model `oc/deepseek-v4-flash-free` for validation.

**Detection:** model selector result group or CLI `--model` value.

**Recovery:** stop retry, create fresh session, select explicit 9router result, resubmit smoke prompt. Quota error does not indicate plugin failure.

## Intermittent OMO Model Invalid at Startup

**Symptom:** TUI or CLI reports a configured 9router model is not valid, often only once. Desktop may still show full 9router model list.

**Cause:** custom `models-discovery.js` timed out while calling 9router `/models`. Old fallback registered only six hardcoded `oc/*` models, so OMO validated its configured model against partial startup catalog. Later process or Desktop request could succeed and hide failure.

**Rule:** discovery fallback must include every 9router model referenced by static agent configuration. OMO uses injected `oc/deepseek-v4-flash-free`; compaction requires `ag/claude-opus-4-6-thinking`.

**Safe detection:** run `rtk proxy opencode models 9router`. Catalog containing only hardcoded `9router/oc/*` entries indicates discovery failure. Do not print full resolved config because it contains provider credentials.

**Recovery:** restore repository `models-discovery.js`, copy it to active plugin directory, then restart affected OpenCode process. Full provider catalog remains dynamic; required configured models remain valid during temporary discovery failure.

## AG model narrates and stops mid-response

**Symptom:** `ag/gemini-*` prints “Wait”, “let's inspect”, and other scratch narration, then sometimes stops without completing a tool call or answer.

**Cause:** 9router AG responses place scratch narration in normal `content`, not a separate reasoning field. Affected stored turns ended with `finish: unknown`, showing stream closure rather than OpenCode output-token exhaustion.

**Rule:** do not use AG Gemini models for OMO roles. Current OMO model is native `opencode/deepseek-v4-flash-free`. Keep AG Claude only for compaction until gateway behavior is rechecked.

## Bash opens WSL error on native Windows

**Symptom:** a skill runs `bash <skill>\scripts\task-brief ...`, then Windows shows WSL installation text.

**Cause:** upstream helper is a Bash script. Native Windows resolves `bash.exe` to the WSL launcher even when WSL is not installed.

**Fix:** run `pwsh -File scripts/task-brief.ps1 PLAN_FILE N` on Windows. Repository skill instructions now select the PowerShell helper; macOS/Linux keep the shell script.

Installing WSL alone does not fix native OpenCode commands containing `C:\...` paths. Run OpenCode inside WSL so paths are Linux-native, or keep the PowerShell launcher for Windows TUI/Desktop sessions.

**Regression guard:** `rtk proxy bun test tests/models-discovery.test.ts` mocks failed `/models` request and verifies both configured fallback models remain registered.

## DeepSeek DSML After Compaction

**Symptom:** model emits `<｜｜DSML｜｜tool_calls>` markup as text instead of standard `delta.tool_calls`.

**Cause:** some DeepSeek-compatible responses use DSML format, especially after long-context compaction or format drift.

**Rule:** lazy-load text transformer buffers partial DSML start/end markers across SSE chunks, converts complete calls, and preserves surrounding content/reasoning.

**Detection:** run focused split-DSML regression and inspect raw provider stream only with credentials redacted.

**Recovery:** restore repository `lazy-load.ts`, keep `compaction.reserved` at `20000`, use stable compaction model, restart process.

## Lazy-Load State Between Tool Calls

**Symptom:** newly loaded tool is blocked in same turn, next turn can call tool without loading, or session ends with unknown finish.

**Cause:** loaded set was cleared too early, retained after terminal finish, or finish delta was dropped.

**Rule:** loaded set persists across tool-loop requests within one user turn and clears only on terminal `finish_reason: "stop"`.

**Detection:** `rtk proxy bun test tests/lazy-load.test.ts`; inspect standard finish/reset test.

**Recovery:** restore repository plugin and restart process. Do not add global tool-loaded state or delete empty finish deltas.

## Repeated Plugin Initialization

**Symptom:** fresh Desktop process works, later new session reports `Model tried to call unavailable tool 'load_tool'`.

**Cause:** plugin-level global guard returns `{}` during OpenCode reinitialization while process remains alive.

**Rule:** every `LazyLoadPlugin` call returns `load_tool` and `tool.definition`; only `wrapFetch()` is idempotent.

**Detection:** repeated-init regression in `tests/lazy-load.test.ts`.

**Recovery:** remove plugin-return guard, retain `_fetchWrapped` guard, restart Desktop.

## Supermemory Module Shape

**Symptom:** `opencode-supermemory` installs but tool is absent or Desktop discovery fails.

**Cause:** `opencode-supermemory@2.0.8` exports `SupermemoryPlugin` by name; local file discovery expects default OpenCode plugin object.

**Rule:** `plugins/supermemory.ts` adapts named export to default `{ id: "opencode-supermemory", server: SupermemoryPlugin }`.

**Detection:** bundle wrapper from active config dependency context and inspect effective local origin.

**Recovery:** rerun bootstrap, verify package pin `2.0.8`, restart OpenCode, run CRUD lifecycle.

## Supermemory Standalone Server Version

**Symptom:** health endpoint works but logs contain Better Auth magic-link advisory warnings; historical logs may contain old `401 Unauthorized` entries.

**Cause:** Oracle VPS runs standalone Supermemory server `0.0.5`, not current Docker self-hosting architecture.

**Rule:** correlate errors by timestamp; current lifecycle result outranks stale log lines. Do not replace deployment during client maintenance.

**Detection:** `systemctl` state, 30-minute journal window, local/public HTTP 200, complete plugin lifecycle.

**Recovery:** restart only managed `supermemory.service` after log/port inspection. Server upgrade requires backup and rollback plan. Do not run binary `--help`; it may start second listener.

## Skill Duplication Warnings

**Symptom:** startup reports same skill name from multiple discovery roots.

**Cause:** repository skills and `$HOME\.agents\skills` junctions overlap with another configured path.

**Rule:** bootstrap links only names absent from repository skill directory. It never deletes user-owned directories.

**Detection:** compare directory names under active `skills/` and `$HOME\.agents\skills`.

**Recovery:** remove only redundant junction after resolving target; preserve actual source directory.

## Models Discovery Namespace Pollution

**Symptom:** model selector contains `9router/opencode/*`; selecting entry fails or routes unexpectedly.

**Cause:** provider source returned `opencode/*`, then discovery added 9router provider prefix.

**Rule:** skip source IDs beginning `opencode/`; inject curated models as `oc/*`.

**Detection:**

```powershell
$models = @(opencode models 9router)
@($models | Where-Object { $_ -like '9router/opencode/*' }).Count
```

Expected: 0.

**Recovery:** restore repository `models-discovery.js`, restart process, re-list models.

## RTK Shell Injection

**Symptom:** Desktop logs `input.$ is not a function`, logs `rtk binary not found in PATH` even though RTK is installed, RTK stays disabled after later valid load, or rewritten command changes semantics.

**Cause:** generated plugin assumes injected Bun shell `$` exists, RTK is outside user `PATH`, uses global guard that drops hook on repeated initialization, or replaces command after failed rewrite. Desktop omits `$` and initializes plugins repeatedly.

**Rule:** install `rtk.exe` under `$HOME\.local\bin`, add directory to user `PATH`, use injected shell when present and Node child process otherwise, and return hook on every initialization. Never probe System32. Rewrite exceptions preserve original command.

**Detection:** Desktop-shaped no-`$` rewrite, injected-shell rewrite, and repeated-init lifecycles; compare repository-active plugin hash.

**Recovery:** fix user `PATH`, run `rtk init -g --auto-patch`, rerun bootstrap, then restart Desktop. Bootstrap restores audited repository file after RTK generator runs.

## Desktop Shows Old Plugin Version After Update

**Symptom:** package files and `opencode debug config` show new exact plugin version, but Status in an already-open Desktop session shows old version.

**Cause:** Desktop session keeps resolved plugin details from process/session startup. Sidecar startup can also briefly show `Could not reach Local Server` before it becomes ready.

**Rule:** close Desktop fully after plugin update, reopen it, wait about 15 seconds for sidecar, then create a new session before checking Status.

**Detection:** compare fresh-session Status with `plugin_origins`, generated `package.json`, and `npm ls --depth=0`. Current verified OMO Slim value is `2.2.1`. `bun pm ls` may omit npm-installed packages when Bun lock metadata is stale.

**Recovery:** restart Desktop and open new session. If value still differs, rerun targeted update and inspect newest Desktop server log.

## Old Broad Plugin Updater (Fixed)

**Old symptom:** package versions or plugin origins changed after `update-plugins.ps1`; OMO Slim entry became unpinned; active files differed from repository.

**Old cause:** updater ran unpinned OMO installer and broad npm update. It also trusted pin helper that matched only unpinned OMO entry, not an older exact pin.

**Current rule:** private `$HOME\.config\opencode\versions.env` holds exact target. Use `update-plugins.ps1 -Component OmoSlim -DryRun`, then `bootstrap.ps1 -UpdateOnly -Component OmoSlim`. Current updater delegates only selected exact OMO update and restores tailored config plus both plugin pins.

**Detection:** compare `npm ls --depth=0`, `plugin_origins`, `tui.json`, root plugin array, and seven local SHA-256 values.

**Recovery for old state:** run targeted OMO update, verify exact pins, restart OpenCode, then run OMO and Desktop lifecycle checks.

## Preserved Config Dependency Drift (Fixed)

**Symptom:** fresh repository succeeds, but bootstrap over existing configuration installs newer OMO Slim or another npm plugin despite later pinned `plugin_origins`.

**Old cause:** bootstrap preserved existing `opencode.jsonc`; unpinned plugin entry could map to `latest` before later pin repair.

**Current rule:** private version values override tested npm dependency versions during package generation. Exact package versions and pinned origins remain separate checks.

**Detection:** compare five versions under [setup dependency pins](setup.md#dependency-pins) with active package list.

**Recovery:** correct private version file, run selected update path, rerun `bun pm ls`, then restart OpenCode.

## Historical Mem0 Boundary

**Symptom:** documentation references `mem0-selfhost-patch.ts`, `@mem0/opencode-plugin`, `MEM0_HOST`, or `/mem0-*` commands as active runtime.

**Cause:** pre-Supermemory documentation remains in `mem0-archive/` and broken history.

**Rule:** Mem0 material is historical only. Active memory is `opencode-supermemory@2.0.8` through `plugins/supermemory.ts`.

**Detection:** effective origins contain Supermemory wrapper and no Mem0 file.

**Recovery:** remove active Mem0 artifacts, rerun bootstrap, retain archive files in repository for reference.

## Broken Documentation Archive

Branch `archive/broken-docs-reference` points to `c286bb890666528fbdfed486f1851b1226a075b6`. It preserves full broken lineage and documentation-bearing ancestors. Branch is non-deployable: tip drops standard tool calls and finish state despite containing useful DSML work.

Existing `codex/pre-cleanup-c286bb8` remains second safety reference to same tip.

### Commit Index

| Commit | Subject | Useful evidence | Invalid or superseded assumption | Retrieval |
|---|---|---|---|---|
| `256f2de90e7a16f04c288073e4c885e5e401c673` | `fix(mem0): Integrate self-hosted Mem0 using runtime fetch interceptor patch` | Initial self-hosted Mem0 integration and setup | Mem0 is active memory backend | `rtk git show 256f2de90e7a16f04c288073e4c885e5e401c673 -- "*.md"` |
| `5b096b70cdd17d8de6c038f020bf1b2188a9701a` | `fix(mem0): Guarantee tool registration, document upstream bugs` | Tool-registration investigation and upstream notes | Mem0 fixes apply to current Supermemory stack | `rtk git show 5b096b70cdd17d8de6c038f020bf1b2188a9701a -- README.md docs/opencode-bugs-known.md` |
| `751d216cfe4d0af4a6639d493b4659c0af62d6b5` | `fix(compaction): raise keep.tokens, add compaction agent` | Compaction observations and agent separation | Historical token values are current | `rtk git show 751d216cfe4d0af4a6639d493b4659c0af62d6b5 -- README.md docs/opencode-bugs-known.md` |
| `b69bb62a0c296e957f56a6baf2ea136674fdbc3b` | `docs: document missing tool hook, lazy-load filtering bug, duplicate guards, update load order` | Hook, filtering, registration, and order analysis | Global lazy-load guard returning `{}` is Desktop-safe | `rtk git show b69bb62a0c296e957f56a6baf2ea136674fdbc3b -- docs/opencode-bugs-known.md` |
| `c37c7fe95f386322aba3b225c85003c5defe818f` | `docs: add full architecture doc for mem0 integration session` | Mem0 architecture and chronology | Mem0 topology is current | `rtk git show c37c7fe95f386322aba3b225c85003c5defe818f:docs/mem0-integration-architecture.md` |
| `28a0fcb479b0a3384b9950e95261ab59240f5868` | `docs: add full 10-bug evidence with curl traces and architectural decisions` | Curl evidence and route contracts | Mem0 endpoints are production path | `rtk git show 28a0fcb479b0a3384b9950e95261ab59240f5868:docs/mem0-integration-architecture.md` |
| `058581c3c42d03d9a89e30f0f0ecb280232f8300` | `feat(9router): inject free models, sync config & docs` | Model injection and upstream templates | Archived patch docs remain current unchanged | `rtk git show 058581c3c42d03d9a89e30f0f0ecb280232f8300 -- docs/PR.md docs/issue.md docs/opencode-bugs-known.md` |
| `d8fa757af2f97a640610fb00e32d4d811a255fab` | `feat(codegraph): enforce search & auto-update index via hooks` | Stable boundary and CodeGraph policy | Current Supermemory/lazy load exists at baseline | `rtk git show d8fa757af2f97a640610fb00e32d4d811a255fab -- README.md docs/opencode-bugs-known.md` |
| `490ed47467403ae1405a9d513dec80fd860721e1` | `chore(memory): archive legacy mem0 files, default configuration and bootstrap to supermemory` | Archive move and migration direction | Intermediate loading is recovered final state | `rtk git show 490ed47467403ae1405a9d513dec80fd860721e1 -- README.md docs/supermemory-setup.md` |
| `fc9ffcb84f9c77bcc5fb132debdfa3becf4e2ab1` | `feat: purge mem0, supermemory-only` | Supermemory-only intent | Intermediate Desktop behavior is final | `rtk git show fc9ffcb84f9c77bcc5fb132debdfa3becf4e2ab1 -- README.md docs/opencode-bugs-known.md` |
| `045b733afc6fc2c97ca6a1d5fe69ab6924c00125` | `docs(supermemory-setup): remove mem0 references, toggle script is deprecated` | Clean deployment notes | Pre-final bootstrap remains authoritative | `rtk git show 045b733afc6fc2c97ca6a1d5fe69ab6924c00125:docs/supermemory-setup.md` |
| `c286bb890666528fbdfed486f1851b1226a075b6` | `fix(lazy-load): enhance DSML parser with streaming boundary buffer and case-insensitive tool resolving` | DSML boundary and name-resolution work | Tip preserves standard calls and finish deltas | `rtk git show c286bb890666528fbdfed486f1851b1226a075b6 -- plugins/lazy-load.ts` |

### Read-Only Retrieval

```powershell
rtk git log archive/broken-docs-reference --format="%H %s" --name-status -- "*.md"
rtk git show 28a0fcb479b0a3384b9950e95261ab59240f5868:docs/mem0-integration-architecture.md
rtk git diff d8fa757af2f97a640610fb00e32d4d811a255fab..c286bb890666528fbdfed486f1851b1226a075b6 -- "*.md"
```

Never checkout archive branch into active `$HOME\.config\opencode`; read files through `git show`.
