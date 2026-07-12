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

**Fix:** A thin interceptor `mem0-selfhost-patch.ts` is loaded explicitly in `opencode.jsonc` before `@mem0/opencode-plugin`. It monkey-patches `globalThis.fetch` to:
- Redirect Mem0 Cloud routes to self-hosted FastAPI routes
- Inject `X-API-Key` headers
- Mock project-level metadata endpoints

This allows running the unmodified official `@mem0/opencode-plugin` from npm, supporting automatic updates without manual re-patching.

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

**Root cause:** The plugin's `shell.env` hook relies on the official plugin loading successfully. If it fails (Bun/Node mismatch), no env vars are injected.

**Workaround:** The `shell.env` hook in `mem0-selfhost-patch.ts` provides fallback values. No longer needed since fallback tools resolve identity via `process.env.USER`.

---

## oh-my-opencode-slim installer overwrites

**Symptom:** Running `bunx oh-my-opencode-slim@latest install` may reorder the `plugin` array in `opencode.jsonc` and overwrite `oh-my-opencode-slim.json`.

**Workaround:** The `bootstrap.ps1` restores the preset config after running the installer. The `update-plugins.ps1` script also runs the installer but your custom preset is preserved because omo-slim only writes defaults if the config file doesn't exist.
