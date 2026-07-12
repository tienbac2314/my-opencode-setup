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
Because `@mem0/opencode-plugin` performs startup initialization (e.g. calls to `/v1/ping/`), `mem0-selfhost-patch.ts` must load *before* it to successfully rewrite those requests.
To solve this, we place `mem0-selfhost-patch.ts` in the root of `~/.config/opencode/` (so it is not auto-loaded out of order) and list it explicitly at the very beginning of the `plugin` array in `opencode.jsonc` and `tui.json`.

Plugin load order is now:
1. `./mem0-selfhost-patch.ts` (loaded first explicitly, patches fetch globally)
2. `opencode-update-notifier`
3. `@mem0/opencode-plugin` (loads third, uses patched fetch)
4. `oh-my-opencode-slim`
5. Auto-discovered plugins (`0-tokens-source.ts`, `lazy-load.ts`, `models-discovery.js`) load alphabetically after the config array. Since `mem0-selfhost-patch.ts` already patched fetch at the root, the later wrappers chain on top cleanly.

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

