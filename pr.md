# OpenCode Plugin Patch Ledger

Local patches remain repository-controlled until upstream behavior passes OpenCode `1.17.18` CLI, TUI, Desktop App, combined-plugin, and lifecycle gates.

## Patch Removal Policy

Remove a patch only when all conditions hold:

1. Upstream release contains equivalent invariant.
2. Pinned dependency or copied source is upgraded in one isolated change.
3. Existing regression suite fails before local patch removal only because behavior is now duplicated, or new upstream-focused regression proves equivalence.
4. `bun test` passes.
5. Local plugin bundles pass under active `$HOME\.config\opencode` dependency context.
6. Effective `plugin_origins` contains each origin once.
7. CLI, TUI, and Desktop complete exact lazy-loaded shell command.
8. Affected plugin completes full lifecycle.

Version publication, clean import, or successful startup alone does not satisfy removal gate.

## lazy-load

**Component:** repository `plugins/lazy-load.ts`; upstream origin `omarwaly-ai/opencode-lazy-loading`.

**Failure:** broken tip `c286bb8` routed every event containing `choices[0].delta` through DSML branch, returned before standard `delta.tool_calls` handling, and dropped empty finish deltas. Standard streamed tool calls disappeared, finish became unknown, and per-turn loaded state survived. Desktop exposed separate repeated-initialization failure: global plugin guard returned `{}` on later initialization, removing `load_tool` and `tool.definition` while process remained alive.

**Required invariants:**

- Standard JSON tool calls survive split name/argument chunks.
- DSML conversion touches text deltas only.
- Ordinary `content` and `reasoning_content` survive semantically outside DSML markup.
- Direct unloaded built-in call rewrites to `load_tool`.
- Tool loaded earlier in same turn executes directly.
- MCP definitions enter same gateway; unloaded direct MCP calls rewrite to `load_tool`, then loaded same-turn calls pass.
- Finish event and `[DONE]` survive.
- `finish_reason: "stop"` clears session turn state.
- Every plugin initialization returns tool and hook; only `fetch` wrapping is idempotent.

**Structural patch:** classify text, tool-call, and finish data independently. Do not return from DSML processing before standard tool-call handling. Buffer tool calls by index until arguments form valid JSON. Remove global plugin-return guard.

```diff
- if (globalThis.__lazy_load_loaded__) return {}
- globalThis.__lazy_load_loaded__ = true
  wrapFetch()
  return {
    tool: { load_tool: ... },
    "tool.definition": ...
  }
```

```ts
if (delta) {
  for (const field of ["content", "reasoning_content"] as const) {
    if (typeof delta[field] === "string" && delta[field].length > 0) {
      processText(controller, parsed, field, delta[field])
      delete delta[field]
      hadText = true
    }
  }
}

const toolCalls = parsed?.choices?.[0]?.delta?.tool_calls
// Buffer and rewrite standard tool calls here.

const finish = parsed?.choices?.[0]?.finish_reason
if (finish === "stop") turnLoaded.delete(sessionID)
```

`wrapFetch()` retains module-level `_fetchWrapped` guard. This prevents recursive wrappers without suppressing later hook registration.

**Regression gate:**

```powershell
rtk bun test tests/lazy-load.test.ts
```

Expected: 9 pass, 0 fail covering repeated init, standard split call, namespaced call, direct rewrite, finish reset, response-transform passthrough for an uncaptured MCP call, false gateway names, content/reasoning, and split DSML. Live request capture still routes MCP definitions through `load_tool`.

**Live gate:**

```powershell
rtk opencode run --model 9router/oc/deepseek-v4-flash-free "Use load_tool to load bash, then use bash to run: Write-Output PATCH_LAZY_OK. Return exact command output."
```

CLI, TUI, and Desktop must show `load_tool`, shell command, and `PATCH_LAZY_OK`.

## Supermemory Export Adapter

**Component:** `opencode-supermemory@2.0.8`; repository `plugins/supermemory.ts`.

**Failure:** package exports `SupermemoryPlugin` by name. OpenCode file discovery expects default plugin object with `id` and `server`. Direct package exposure can initialize differently between TUI and Electron Desktop.

**Required invariant:** local file has default `{ id: "opencode-supermemory", server: SupermemoryPlugin }`; credentials remain in ignored `supermemory.jsonc`.

```ts
import type { Plugin } from "@opencode-ai/plugin"
import { SupermemoryPlugin } from "opencode-supermemory"

export default {
  id: "opencode-supermemory",
  server: SupermemoryPlugin as Plugin,
}
```

**Bundle gate:**

```powershell
Push-Location "$HOME\.config\opencode"
rtk bun build plugins/supermemory.ts --outfile "$env:TEMP\opencode-supermemory-verify.js"
Pop-Location
```

**Lifecycle gate:** add unique marker, search, profile, list, forget by ID, then prove exact marker absent.

**Removal gate:** package publishes OpenCode-compatible default object and passes fresh TUI/Desktop discovery plus full self-hosted lifecycle without wrapper.

## Models Discovery Namespace Filter

**Component:** `plugins/models-discovery.js`; provider `9router`.

**Failure:** provider `/models` can return source IDs such as `opencode/deepseek-v4-flash-free`. OpenCode prefixes provider ID, producing invalid `9router/opencode/*` entries and confusing Desktop model selector.

**Required invariant:** exclude source IDs beginning `opencode/` before include/exclude filters and provider namespace construction. Inject exactly six curated `oc/*` free models when absent.

```diff
  const id = m.id || m.name
  if (!id) continue
+ if (id.startsWith('opencode/')) continue
  if (include && !include.test(id)) continue
```

**Regression gate:**

```powershell
$models = @(rtk opencode models 9router)
@($models | Where-Object { $_ -like '9router/oc/*' }).Count
@($models | Where-Object { $_ -like '9router/opencode/*' }).Count
```

Expected: first count 6; second count 0. Total inventory may change with provider.

**Removal gate:** upstream/provider guarantees no built-in namespace IDs and Desktop selector proves no double-prefixed entries.

## RTK Desktop Shell Guard

**Component:** repository `plugins/rtk.ts`; external RTK binary.

**Failure:** Electron plugin input may omit Bun shell `$`. Calling template shell immediately throws `input.$ is not a function`. Setting global load guard before validation permanently disables later valid initialization.

**Required invariant:** validate `input.$`, prove `rtk` exists, then set global guard. Rewrite failures leave original command unchanged.

```ts
if ((globalThis as any).__rtk_opencode_loaded__) return {}

const $ = input?.$
if (typeof $ !== "function") return {}

try {
  await $`where rtk`.quiet()
} catch {
  return {}
}

;(globalThis as any).__rtk_opencode_loaded__ = true
```

**Lifecycle gate:** null-shell initialization returns `{}` without poisoning later load; eligible bash/shell command rewrites; output matches original command semantics.

**Removal gate:** upstream RTK OpenCode generator emits equivalent guard order and preserves original command on rewrite errors in Windows Desktop.

## Bootstrap OMO Slim Pin Preservation

**Component:** `oh-my-opencode-slim@2.1.1`; `bootstrap.ps1`; `scripts/pin-opencode-plugin.ps1`; `tests/bootstrap.test.ts`.

**Failure:** installer rewrites TUI/global plugin entries to unpinned name. Broad string replacement can alter comments, credentials, nested plugin properties, or unrelated arrays. Compact JSONC and quoted comments invalidate line regex approaches.

**Required invariant:** run pinned installer, restore tracked TUI file, then pin only string item in root-object `plugin` array while preserving byte layout elsewhere.

```powershell
bunx oh-my-opencode-slim@2.1.1 install
Copy-Item "$RepoDir\config\tui.json" "$ConfigDir\tui.json" -Force
& "$RepoDir\scripts\pin-opencode-plugin.ps1" `
  -Path "$ConfigDir\opencode.jsonc" `
  -Name "oh-my-opencode-slim" `
  -Version "2.1.1"
```

Helper tokenizes JSONC strings and structural symbols while skipping line/block comments. Candidate property is accepted only at root container depth 1. Target string is accepted only at plugin array depth 1.

**Regression gate:**

```powershell
rtk bun test tests/bootstrap.test.ts
```

Expected: 5 pass, 0 fail covering installer order, credential/comment preservation, RTK restore order, compact arrays, and nested property isolation.

**Removal gate:** installer accepts explicit version without rewriting either active plugin array or repository preset; adversarial JSONC tests remain green after helper removal.

## Bootstrap RTK Restoration

**Component:** `bootstrap.ps1`; repository `plugins/rtk.ts`.

**Failure:** `rtk init -g --opencode` overwrites audited RTK plugin with generated variant, discarding Desktop guard and fallback semantics.

**Required invariant:** restore repository plugin immediately after initializer.

```powershell
rtk init -g --opencode
Copy-Item "$RepoDir\plugins\rtk.ts" "$ConfigDir\plugins\rtk.ts" -Force
```

**Regression gate:** bootstrap test asserts restore statement appears after initializer; SHA-256 of repository and active `rtk.ts` must match.

**Removal gate:** generated upstream file is byte-equivalent in behavior and passes null-shell/rewrite lifecycle.

## tokens-source Wrapper Ordering

**Component:** repository `plugins/0-tokens-source.ts`.

**Failure:** token source loaded after lazy load becomes outer wrapper and can observe pre-reduction request, reporting tool schemas model never receives. Duplicate global registration recursively wraps fetch.

**Required invariant:** `0-` filename sorts before `lazy-load.ts`; token wrapper is idempotent; request body remains unchanged; tool map refreshes on each LLM request.

```ts
if (_tsFetchWrapped) return
_tsFetchWrapped = true
_tsOriginalFetch = globalThis.fetch
```

**Lifecycle gate:** complete model call, run `/tokens`, verify system/tool/message sections and actual usage. Tool section after lazy reduction must describe API body rather than all registered tools.

**Removal gate:** upstream exposes deterministic plugin ordering or shared request-observation hook that reports post-transform body in TUI and Desktop.

## CodeGraph Helper Desktop Safety

**Component:** repository `plugins/codegraph-helper.ts`; CodeGraph MCP/CLI.

**Failure history:** older broken commits used unsupported tool names, threw from after-hook, or evaluated unavailable shell runner outside protected path.

**Required invariant:** standard search block applies only when workspace contains `.codegraph/`; background index invocation occurs only after supported write tools and remains inside `try/catch`; no index means inert hooks.

**Lifecycle gate:**

```powershell
rtk codegraph status .
rtk codegraph explore "CodeGraphHelperPlugin"
```

Test hook with indexed and unindexed directories. Indexed grep/glob is redirected; index/status/explore/query complete; runner failure does not crash Desktop.

**Removal gate:** upstream OpenCode integration supplies equivalent indexed-repository policy and post-write sync behavior.

## npm Plugin Pinning

**Components:**

```text
@opencode-ai/plugin@1.17.18
@ai-sdk/openai-compatible@3.0.7
opencode-supermemory@2.0.8
opencode-update-notifier@0.3.3
oh-my-opencode-slim@2.1.1
```

**Failure:** unpinned package resolution changes module shape, plugin hooks, config schema, and installer output without repository review. Update notifier also needs installed version identity.

**Required invariant:** tracked config pins npm plugins. Fresh bootstrap writes exact base dependencies and derives exact versions from pinned root plugin array. Preserved unpinned config can produce `latest` in generated package before later config repair and requires explicit package normalization.

**Gate:** `bun pm ls` under active config must show exact versions; `plugin_origins` must show pinned npm specs. If package list differs, run setup guide's exact `npm install --save-exact` command.

**Removal gate:** none. Pins may move only through reviewed upgrade and full matrix.

## Plugin Updater Pin Erosion

**Component:** `update-plugins.ps1`.

Current updater intentionally skips overwriting patched file plugins but still runs:

```powershell
bunx oh-my-opencode-slim@latest install --yes
npm update --save
```

These operations can erode tested pins or rewrite active config. Treat `-DryRun -Force` as inventory only. After any real updater run, rerun bootstrap, verify package pins and origins, restore repository plugin hashes, and execute full regression/lifecycle matrix.

Patch proposal for future runtime task: make updater consume exact versions from tracked config, restore TUI/root pins through existing JSONC helper, and restore audited RTK file. This documentation task does not change updater behavior.

## Upgrade Verification Matrix

| Change | Minimum required verification |
|---|---|
| OpenCode or `@opencode-ai/plugin` | 14 tests, all bundles, effective origins, CLI/TUI/Desktop lazy load, every plugin lifecycle |
| `opencode-supermemory` | wrapper bundle, TUI/Desktop discovery, add/search/profile/list/forget/delete proof |
| OMO Slim | bootstrap 5 tests, pinned origins, agent/tool/MCP/command registration, bounded child-agent call |
| update notifier | pinned origin, read-only initialization, no package mutation |
| lazy-load upstream sync | 9 focused tests, CLI/TUI/Desktop shell marker, two-turn reset, MCP call |
| tokens-source upstream sync | combined wrapper order and `/tokens` body proof |
| models discovery | six curated models, zero double-prefix IDs, Desktop selector |
| RTK | null-shell initialization, rewrite equivalence, repository-active hash |
| CodeGraph | indexed/unindexed hook paths, sync, status, explore, query, Desktop non-crash |

## Historical Mem0 Patches

Mem0 fetch interceptor, fallback tools, missing `tool` hook, route translation, Pydantic compatibility, event emulation, and duplicate-guard proposals are archived under `mem0-archive/` and branch `archive/broken-docs-reference`. They are not requirements for current Supermemory runtime.

Do not reapply historical recommendation to add global guard returning `{}` in `lazy-load.ts`; Desktop repeated initialization proved that guard removes `load_tool`. Current idempotency belongs inside `wrapFetch()`, not plugin return path.

Legacy patch evidence and exact SHAs: [knownbug.md#broken-documentation-archive](knownbug.md#broken-documentation-archive).
