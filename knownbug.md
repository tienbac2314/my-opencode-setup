# OpenCode Known Bugs and Operational Boundaries

## Local Plugin Duplication

**Symptom:** hook executes twice, `fetch` wrappers nest, Desktop startup differs from TUI, or tool definitions disappear unpredictably.

**Cause:** same local plugin is auto-discovered from `~/.config/opencode/plugins/` and also listed in `opencode.jsonc` or `tui.json`.

**Rule:** explicit plugin arrays contain pinned npm packages only. Local files exist only in plugin directory.

**Detection:**

```powershell
$config = (opencode debug config | Out-String) | ConvertFrom-Json
$config.plugin_origins | ForEach-Object { $_.spec }
```

Expected: eight origins; every local file once.

**Recovery:** remove explicit file entries, run bootstrap to restore active plugin directory and pinned npm entries, restart all OpenCode processes.

## Desktop Plugin List Hidden by Project Override

**Symptom:** Desktop status opens with eight plugins, may briefly show nine during reload, settles at eight, then later displays only `Plugins configured in opencode.json`. Tool calls can still work because plugin origins remain loaded.

**Cause:** project-scoped `.opencode/opencode.json` contains `"plugin": []`. In OpenCode `1.17.18`, runtime loading uses resolved `plugin_origins`, while Desktop status reads resolved `plugin`. Empty project array overwrites displayed list without unloading eight origins. This is a configuration-layer bug, not evidence that `load_tool`, local plugins, or Supermemory failed.

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

Expected: `Plugins = 8`, `Origins = 8`, with two npm and six local origins listed once each. `Plugins = 0`, `Origins = 8` fingerprints project override; do not change lazy-load code.

**Recovery:** remove only project `plugin` property, preserve `$schema`, then fully reload Desktop with `Ctrl+R` or start a new process. Open status Plugins tab at least three times and confirm count stays eight. Run one `load_tool` shell marker afterward; plugin display and tool execution are independent checks.

**Regression guard:** `tests/bootstrap.test.ts` asserts `.opencode/opencode.json` has no `plugin` property. Run `rtk bun test` before committing or after changing project configuration.

**Log attribution:** one Desktop `run=` log can contain events from multiple workspaces. Associate plugin errors with nearest surrounding `directory=` record before treating them as this repository's failure.

**Fresh-agent order:** check project override, compare safe counts, reload App, verify repeated status, then test `load_tool`. Investigate plugin implementation only if counts or tool execution still fail. This order prevents needless rollback of working lazy-load and Supermemory migration code.

## Desktop Plugin Module Shape

**Symptom:** TUI loads plugin; Desktop reports missing default export, unavailable tool, or `input.$ is not a function`.

**Cause:** Electron runtime exercises stricter ESM discovery and can initialize plugins without Bun shell injection.

**Rule:** local module must expose an OpenCode-compatible plugin function, either directly as a named export or through default `{ id, server }` metadata when an adapter is required. Shell-dependent plugin validates `input.$` before setting load guard or invoking tagged template.

**Detection:** bundle each local plugin; inspect Desktop logs; run null-shell initialization test for RTK.

**Recovery:** restore repository plugin copies through bootstrap, verify repository-active SHA-256 matches, restart Desktop process.

## OpenCode Free-Tier Exhaustion

**Symptom:** `Free usage exceeded, subscribe to Go` with long retry timer before any tool call.

**Cause:** session selected OpenCode Zen free model, not 9router result with same display name.

**Rule:** select provider `9router`, model `oc/deepseek-v4-flash-free` for validation.

**Detection:** model selector result group or CLI `--model` value.

**Recovery:** stop retry, create fresh session, select explicit 9router result, resubmit smoke prompt. Quota error does not indicate plugin failure.

## DeepSeek DSML After Compaction

**Symptom:** model emits `<｜｜DSML｜｜tool_calls>` markup as text instead of standard `delta.tool_calls`.

**Cause:** some DeepSeek-compatible responses use DSML format, especially after long-context compaction or format drift.

**Rule:** lazy-load text transformer buffers partial DSML start/end markers across SSE chunks, converts complete calls, and preserves surrounding content/reasoning.

**Detection:** run focused split-DSML regression and inspect raw provider stream only with credentials redacted.

**Recovery:** restore repository `lazy-load.ts`, keep `compaction.reserved` at `20000`, use stable compaction model, restart process.

## Lazy-Load Turn-State Invariant

**Symptom:** newly loaded tool is blocked in same turn, next turn can call tool without loading, or session ends with unknown finish.

**Cause:** loaded set was cleared too early, retained after terminal finish, or finish delta was dropped.

**Rule:** loaded set persists across tool-loop requests within one user turn and clears only on terminal `finish_reason: "stop"`.

**Detection:** `rtk bun test tests/lazy-load.test.ts`; inspect standard finish/reset test.

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

**Symptom:** Desktop logs `input.$ is not a function`, RTK stays disabled after later valid load, or rewritten command changes semantics.

**Cause:** generated plugin assumes Bun shell exists, sets guard before validation, or replaces command after failed rewrite.

**Rule:** validate shell, validate binary, then set guard. Rewrite exceptions preserve original command.

**Detection:** null-shell and rewrite-equivalence lifecycle; compare repository-active plugin hash.

**Recovery:** rerun bootstrap after `rtk init`; bootstrap restores audited repository file.

## Plugin Updater Can Erode Pins

**Symptom:** package versions or plugin origins change after `update-plugins.ps1`; OMO Slim entry becomes unpinned; active files differ from repository.

**Cause:** current updater runs `bunx oh-my-opencode-slim@latest install --yes` and `npm update --save`. Updater predates bootstrap pin-restoration safeguards.

**Rule:** use `update-plugins.ps1 -DryRun -Force` for inventory. Real update requires immediate bootstrap and full upgrade matrix.

**Detection:** compare `bun pm ls`, `plugin_origins`, `tui.json`, root plugin array, and six local SHA-256 values.

**Recovery:** rerun `bootstrap.ps1`, verify exact pins, restart OpenCode, run tests and all affected lifecycles.

## Preserved Config Can Generate Latest Dependency

**Symptom:** fresh repository succeeds, but bootstrap over existing configuration installs newer OMO Slim or another npm plugin despite later pinned `plugin_origins`.

**Cause:** bootstrap preserves existing `opencode.jsonc`. During package generation, any unpinned root plugin entry maps to `latest`; root config pin repair occurs after `npm install` and does not rewrite generated package.

**Rule:** inspect `bun pm ls` after bootstrap. Exact package versions and pinned origins are separate checks.

**Detection:** compare five versions under [setup dependency pins](setup.md#dependency-pins) with active package list.

**Recovery:** run setup guide's exact `npm install --save-exact` normalization command, rerun `bun pm ls`, then restart OpenCode.

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
