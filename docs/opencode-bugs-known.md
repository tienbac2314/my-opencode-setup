# OpenCode Known Bugs & Workarounds

Last updated: 2026-07-13

## `experimental.primary_tools` breaks subagent tool access

**Symptom:** Explore subagent claims it only has `webfetch`/`websearch`. Missing `read`, `glob`, `grep`, `task` tools.

**Root cause:** `experimental.primary_tools` list is inverted for subagents — they lose access to tools in that list.

**Fix:** Do NOT add `primary_tools` to `experimental` block. Keep it as:
```jsonc
"experimental": {
  "mcp_timeout": 60000
}
```

## Plugin load order

Auto-discovered plugins from `~/.config/opencode/plugins/` load by filename sort BEFORE config `plugin` array entries.
Config array plugins load in order.

`mem0-selfhost-patch.ts` is placed in the root of `~/.config/opencode/` (so it's not auto-loaded out of order) and listed explicitly at the very beginning of the `plugin` array.

Plugin load order:
1. `./mem0-selfhost-patch.ts` (patches fetch, always registers 11 fallback tools via `tool()` API)
2. `opencode-update-notifier`
3. `oh-my-opencode-slim`
4. Auto-discovered plugins (`0-tokens-source.ts`, `lazy-load.ts`, `models-discovery.js`) load alphabetically after the config array.

`@mem0/opencode-plugin` is NOT in the plugin array. It's dynamically imported inside `mem0-selfhost-patch.ts` via `await import("@mem0/opencode-plugin")` in a `try/catch`. If it loads (Bun), its tools merge on top. If it fails (Node.js), fallback tools remain registered. See "Missing `'tool'` hook" and "Bun-built dist" sections below.

## Desktop app plugin resolution

**Symptom:** `skill(name="...")` returns "Available skills: none" in Desktop app.

**Fix:** File-based `.ts` plugins in `plugins/` dir are auto-discovered by both Desktop and TUI. No bridge files needed.

## `.agents/skills/` not discovered

**Symptom:** Skills in `~/.agents/skills/` don't appear in `skill()` tool.

**Fix:** Create junctions into `~/.config/opencode/skills/`:
```powershell
New-Item -ItemType Junction -Path "$env:USERPROFILE\.config\opencode\skills\skill-name" -Target "$env:USERPROFILE\.agents\skills\skill-name"
```
The `bootstrap.ps1` script handles this automatically.

## 9router model modalities

**Symptom:** "Cannot read image.png (this model does not support image input)" with 9router models.

**Root cause:** Newly discovered models got `{ name: id }` with no `modalities`, so OpenCode assumed text-only.

**Fix:** `models-discovery.js` plugin now defaults to `text+image` input for all discovered models. It checks `capabilities.vision` from the API response and falls back to multimodal.

## Mem0 plugin self-hosted compatibility

**Symptom:** Official `@mem0/opencode-plugin` fails against self-hosted Mem0 (missing `/v1/` prefix, no org/project endpoints).

**Fix:** `mem0-selfhost-patch.ts` does three things:
1. Monkey-patches `globalThis.fetch` to rewrite Cloud API routes to self-hosted paths and inject `X-API-Key`
2. Dynamically imports official `@mem0/opencode-plugin` inside `try/catch` for its extra hooks (auto-memory, compaction)
3. **Always** registers its own fallback tools (`add_memory`, `search_memories`, etc.) via `tool()` from `@opencode-ai/plugin` — these call the self-hosted REST API directly

The official plugin is now optional. If it loads (under Bun), its tools merge on top of fallbacks. If it fails (Node), fallback tools are still registered.


## Mem0 plugin: `@mem0/opencode-plugin` built with Bun, fails under Node

**Symptom:** The official plugin's `dist/index.js` is Bun-bundled (uses `__require`). Under Node.js (e.g. `bash` tool in agent sessions), `import("@mem0/opencode-plugin")` throws `TypeError: __require is not a function`. This cascades: if the static top-level import fails, the entire plugin module crashes and NO tools (add_memory, search_memories...) get registered.

**Workaround in `mem0-selfhost-patch.ts`:**
- Import is now **dynamic** (`await import(...)`) inside `try/catch` — module-level crash is impossible
- **Fallback tools** are always registered via `tool()` from `@opencode-ai/plugin` (which resolves fine). They call the self-hosted REST API directly
- Even if the official plugin loads successfully, fallback tools fill any gaps

**Upstream PR needed:** The official `@mem0/opencode-plugin` dist should be built for dual platform (Bun + Node), or include a CJS wrapper. File: `integrations/mem0-plugin/.opencode-plugin/package.json` — add `"exports": { "require": "./dist/index.cjs", "import": "./dist/index.js" }` and build both formats.

---

## Mem0 plugin: `app_id` and `scope` fields cause silent memory loss

**Symptom:** `add_memory` creates return `{ results: [] }` and the memory is silently discarded. No error.

**Root cause:** Self-hosted Mem0 API's `MemoryCreate` schema does NOT accept `app_id` or `scope` fields. The official plugin sends both (resolved from project identity + user args). The self-hosted FastAPI treats unknown fields as invalid and skips the record.

**Workaround in `mem0-selfhost-patch.ts`:**
- Body translation converts `text` → `messages: [{role: "user", content: text}]` (self-hosted format)
- Strips `app_id` and `scope` before sending to self-hosted API

**Upstream PR needed:** Self-hosted Mem0 should ignore unknown fields in `MemoryCreate` rather than silently failing. File: `server/main.py` — add `model_config = {"extra": "ignore"}` to `MemoryCreate` pydantic model.

---

## Mem0 plugin: `get_event_status` calls non-existent endpoint

**Symptom:** `get_event_status` tool always fails.

**Root cause:** The plugin calls `GET /v1/event/{event_id}/` which is a Cloud-only API. Self-hosted Mem0 has no event/status endpoint because creates are synchronous.

**Workaround in `mem0-selfhost-patch.ts`:**
- Route rewrite maps `/v1/event/{id}/` → `/__event/{id}`
- Mock intercepts `/__event/{id}` and returns `{ status: "SUCCEEDED" }` immediately

**Upstream PR needed:** Self-hosted Mem0 should either implement a lightweight event status endpoint or the plugin should detect self-hosted mode and skip event polling.

---

## Mem0 plugin: `DELETE /memories/{non-existent}` returns 502

**Symptom:** Deleting a non-existent memory throws `error code: 502` instead of a clean 404.

**Workaround in `mem0-selfhost-patch.ts`:**
- Fetch interceptor catches HTTP 502 responses on DELETE `/memories/{id}` and converts them to 404.

**Upstream PR needed:** Self-hosted Mem0 API should return 404 for non-existent resources.

---

## Mem0 plugin: `shell.env` hook may not fire env vars

**Symptom:** `MEM0_USER_ID`, `MEM0_APP_ID`, `MEM0_SESSION_ID`, `MEM0_BRANCH` are empty in some sessions.

**Root cause:** The official plugin's `shell.env` hook only fires if the official plugin loads successfully. If it fails (Bun/Node mismatch), no env vars are injected.

**Status:** Not critical. Fallback tools in `mem0-selfhost-patch.ts` resolve userId via `process.env.USER` when no `user_id` arg is passed. The official hook still works when the plugin loads; the patch no longer provides a fallback `shell.env` hook (was too autonomous, injected `MEM0_DREAM = "true"`).

---

## Mem0 unavailable scenarios

| Scenario | What happens | Mitigation |
|----------|-------------|------------|
| Server down / unreachable | Tools registered but `mem0Fetch()` calls throw connection error | Error returned to LLM, operation fails gracefully |
| Official plugin fails (Node/Bun) | Dynamic import catches error, logs warning | Fallback tools take over — full CRUD via REST API |
| Both down | Tools registered, every call returns error | LLM can report error to user |
| `MEM0_HOST` or `MEM0_API_KEY` missing | `mem0Fetch()` throws "API error" | Clear error message |
| Storage reset (pgvector table dropped) | REST API returns empty results | Tools work normally, no data — same as fresh install |

No silent failures. Tools are always callable; they only fail at the network layer if the server is unreachable.

---

## Mem0 plugin: Missing `"tool"` hook in plugin descriptor

**Symptom:** Tools registered via `tool()` from `@mem0/opencode-plugin` don't show up in the tool list when loaded as a static plugin entry in `opencode.jsonc`.

**Root cause:** `@mem0/opencode-plugin` v0.2.1 `package.json` declares:
```json
"opencode": { "hooks": ["config", "shell.env"] }
```
`"tool"` is missing from the `hooks` array. OpenCode only processes `tool()` registrations from plugins that declare the `"tool"` hook in their descriptor. Without it, tools registered inside the plugin are silently ignored.

**Workaround in `mem0-selfhost-patch.ts`:**
- `mem0-selfhost-patch.ts` does NOT declare `"tool"` in its hook list either (it's a flat `.ts` file loaded via the `plugin` array, not a proper package). However, OpenCode processes `tool()` calls from ALL script plugins regardless of hook declarations — the hook requirement only applies to package plugins (`node_modules`).
- All 11 fallback tools are registered from a flat file, so they bypass the hook check entirely.

**Upstream PR needed:** Add `"tool"` to the hooks array in `@mem0/opencode-plugin/package.json`. File: `integrations/mem0-plugin/.opencode-plugin/package.json`:
```json
"opencode": { "hooks": ["config", "shell.env", "tool"] }
```

---

## lazy-load.ts: Tool filtering splits `originals` and `mcpOriginals`

**Symptom:** Mem0 tools disappear after `lazy-load.ts` processes them. Tools registered by later-loading plugins are missing but earlier ones work.

**Root cause:** `lazy-load.ts` originally maintained two maps: `originals` (tools for OpenAI provider endpoints) and `mcpOriginals` (tools for MCP endpoints). The `mcpOriginals` map captured ALL known tools at startup, including mem0 tools. When the tool schema filtering function checked `name in originals`, it returned `false` for mem0 tools (they lived in `mcpOriginals`), causing the filter to strip their schemas. Since `tool()` merges by name, stripped schemas didn't get re-added.

**Fix:** The two maps were merged into a single `originals` object. The filter now checks one map:
```typescript
const originals: Record<string, OriginalToolInfo> = { ...mcpOriginals, ...openAIOriginals };
```
This ensures tools from either source retain their full schemas.

**Why it matters:** Any plugin that registers tools late (after `lazy-load.ts` initializes its originals snapshot) can collide with the filtering. MCP-originated tools are especially vulnerable because they don't match OpenAI provider patterns.

---

## Duplicate loading guards

**Symptom:** After running `update-plugins.ps1` or `bootstrap.ps1`, tools appear twice in the UI or `tool()` throws "already registered" errors.

**Root cause:** `lazy-load.ts` and `0-tokens-source.ts` are auto-discovered from `plugins/` dir AND may also be manually loaded by other plugins. Without guards, they register their hooks/tools multiple times.

**Workaround:** Both files use `globalThis` sentinels:
```typescript
if (globalThis.__lazy_load_loaded__) return;
globalThis.__lazy_load_loaded__ = true;
```

```typescript
if (globalThis.__tokens_source_loaded__) return;
globalThis.__tokens_source_loaded__ = true;
```

These prevent re-registration on second load. The guards are safe because the registration is idempotent apart from the duplicate-error problem.

**Note:** The `bootstrap.ps1` no longer re-downloads these files from GitHub (see "Bootstrap / update scripts" section), so double-loading only happens if another plugin explicitly imports them.

---

## oh-my-opencode-slim installer overwrites

**Symptom:** Running `bunx oh-my-opencode-slim@latest install` may reorder the `plugin` array in `opencode.jsonc` and overwrite `oh-my-opencode-slim.json`.

**Workaround:** The `bootstrap.ps1` restores the preset config after running the installer. The `update-plugins.ps1` script also runs the installer but your custom preset is preserved because omo-slim only writes defaults if the config file doesn't exist.

---

## Bootstrap / update scripts overwrite local plugin patches

**Symptom:** After running `bootstrap.ps1` or `update-plugins.ps1`, custom patches in `lazy-load.ts` or `0-tokens-source.ts` are gone — replaced by upstream GitHub raw copies.

**Root cause:** Both scripts hardcode download URLs pointing to GitHub raw content for `lazy-load.ts` and `0-tokens-source.ts`. When run, they overwrite the local patched files in `~/.config/opencode/plugins/` with the unpatched upstream versions.

**Workaround:** The download steps in both scripts are now disabled. Scripts use local copies from the dotfiles repo instead. If re-enabling upstream downloads, ensure patches are re-applied afterward.

---

## DeepSeek XML tool-call regression after compaction

**Symptom:** After compaction, the agent outputs XML-style tool calls (`<｜｜DSML｜｜tool_calls> <｜｜DSML｜｜invoke name="skill">…`) instead of OpenAI JSON format. The agent becomes effectively dead — it cannot call any tools successfully.

**Root cause (two parts):**

1. `compaction.keep.tokens` was set to `4000` — roughly 2-3 turns. After compaction the rebuilt context was too thin. DeepSeek-class models revert to their base training format (XML tool calls) when they lack enough context to stay in "assistant mode".

2. The compaction summary itself was generated by the same DeepSeek free model. If the model was already in a degraded state, it produced a corrupt summary, making the next epoch start broken.

**Fix applied (`opencode.jsonc`):**
```jsonc
// Raise keep window so model retains 10-15 turns verbatim after compaction
"compaction": {
  "auto": true,
  "prune": true,
  "keep": { "tokens": 20000 },
  "buffer": 8000
},
// Dedicated compaction agent using a powerful model (Claude writes the summary)
"agent": {
  "compaction": { "model": "9router/ag/claude-opus-4-6-thinking" }
}
```

**Why it matters:** Even models with 128K context windows suffer from format regression when compacted context is too sparse. The compaction agent decouples summary generation from the working model — Gemini produces a coherent summary; DeepSeek receives it and continues normally.

## lazy-load.ts URL detection — NOTE (not a bug)

`lazy-load.ts`'s `isLLM` check looks for `/chat/completions` in the URL path. Since the AI SDK always appends `/chat/completions` to any OpenAI-compatible provider's `baseURL`, **all** OpenAI-compatible proxies (including `tienbac.dpdns.org`) are already matched by the first condition — no domain-specific entry needed.

The domain list (`api.openai.com`, `api.deepseek.com`, etc.) only matters for providers that use non-standard paths. For any standard `/chat/completions` endpoint, the plugin works out of the box.

---

## 9router missing free opencode models

**Symptom:** OpenCode cannot select or resolve `9router/oc/deepseek-v4-flash-free` or other free models under the `9router` provider because they are missing from the proxy's `/v1/models` endpoint list, preventing registration by the discovery plugin.

**Fix:** Modified `plugins/models-discovery.js` to explicitly inject these free models (`oc/big-pickle`, `oc/deepseek-v4-flash-free`, `oc/hy3-free`, `oc/mimo-v2.5-free`, `oc/north-mini-code-free`, and `oc/nemotron-3-ultra-free`) into the discovered models array when `providerId === '9router'`. This registers them with correct capabilities (vision for flash/hy3/mimo, reasoning for flash/hy3) and proper token limits (`context: 190000`, `output: 16384`) so OpenCode can route them through the `9router` proxy.

---

## Dynamic CodeGraph Enforcement & Auto-Index Updates

**Goal:** Force agents to use CodeGraph search tools in repositories that are indexed (to prevent token waste on raw grep/glob), while keeping standard grep/glob as a fallback for non-indexed repositories. Also, automatically keep the CodeGraph index updated when files are written or edited.

**Fix:** Created `plugins/codegraph-helper.ts` which uses two OpenCode hooks:
1. `tool.execute.before`: Intercepts `grep_search` and `glob_search` execution. If a `.codegraph` directory exists in the workspace, it blocks the tool run and throws a redirection error: *"This repository is indexed by CodeGraph. Standard grep/glob is blocked. Use codegraph_explore instead."*
2. `tool.execute.after`: Runs after file write/edit tools (`replace_file_content`, `write_to_file`, `multi_replace_file_content`) finish successfully. It triggers an asynchronous `codegraph index` update command in the background.

