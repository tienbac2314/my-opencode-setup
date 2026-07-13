# Mem0 Self-Hosted Integration — Full Architecture & Session Log

**Date:** 2026-07-12 to 2026-07-13
**Author:** tienbac2314 + OpenCode agent
**Context:** Integrating `@mem0/opencode-plugin` with a self-hosted Mem0 instance on `mem0.tienbac.dpdns.org`. This is the canonical reference for the full journey — the 10 bugs found, the architectural decisions, the fix rationale, and the upstream PRs needed.

---

## 1. Timeline

| Time | Event |
|------|-------|
| **Phase 0 (2026-07-12)** | Original state: forked `@mem0/opencode-plugin` in `integrations/mem0-plugin/` — manually patched `dist/index.js` |
| **Phase 1** | Discovered the fork was painful to maintain (every npm update required re-patching). Replaced with **fetch interceptor** (`mem0-selfhost-patch.ts`) |
| **Phase 2** | Systematic REST API testing with `curl` revealed **10 distinct bugs** in the official plugin against self-hosted Mem0 |
| **Phase 3** | Refactored patch to **dynamic import** (`await import(...)` in `try/catch`) — official plugin is now optional |
| **Phase 4** | Registered **11 fallback tools** via `tool()` from `@opencode-ai/plugin` — always available, never a "tool not found" error |
| **Phase 5** | Documented all bugs in `opencode-bugs-known.md` + comprehensive session log (this file) |
| **Final** | `b69bb62` (bugs ref) + `c37c7fe` (this doc) |

## 2. The 10 Bugs (with actual evidence)

### Bug 1: `text` field unsupported (HTTP 422)

**Symptom:** `add_memory` tool fails with HTTP 422: `Field required: messages`. Memory never stored.

**Test:**
```bash
curl -X POST "$MEM0_HOST/memories" \
  -H "X-API-Key: $MEM0_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":"user likes Rust","user_id":"bug_test_v3"}'
```

**Response (HTTP 422):**
```json
{"detail":[{"type":"missing","loc":["body","messages"],"msg":"Field required",
  "input":{"text":"user likes Rust","user_id":"bug_test_v3"}}]}
```

**Root cause:** Self-hosted Mem0's `MemoryCreate` schema requires `messages: [{role, content}]` array. The official plugin sends `text: "string"` (Cloud API format).

**Fix in `mem0-selfhost-patch.ts:80`:**
```typescript
if (bodyObj.text) {
  bodyObj.messages = [{ role: "user", content: bodyObj.text }];
  delete bodyObj.text;
}
```

**Upstream PR:** Self-hosted Mem0 should accept `text` as a shortcut for `messages`. File: `server/main.py` — extend `MemoryCreate` validator.

---

### Bug 2: `app_id` field silently dropped (silent memory loss)

**Symptom:** `add_memory` returns `{ results: [] }` — NO error, but memory is NOT stored. Silent data loss.

**Test (with app_id):**
```bash
curl -X POST "$MEM0_HOST/memories" \
  -H "X-API-Key: $MEM0_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hi"}],"user_id":"bug_test_v4","app_id":"opencode"}'
```

**Response (HTTP 200 — BUT no memory created):**
```json
{"results":[]}
```

**Root cause:** Self-hosted Mem0's pydantic `MemoryCreate` model uses default `extra = "forbid"`. Unknown fields (`app_id`) cause validation to skip the record instead of erroring. The official plugin always sends `app_id` (project identifier from git remote).

**Fix in `mem0-selfhost-patch.ts:81`:**
```typescript
delete bodyObj.app_id;
delete bodyObj.scope;
```

**Upstream PR:** Add `model_config = {"extra": "ignore"}` to `MemoryCreate`. File: `server/main.py`.

---

### Bug 3: `scope` field silently dropped (silent memory loss)

**Symptom:** Same as Bug 2 but with `scope: "project"` field. Memory silently not stored.

**Test:**
```bash
curl -X POST "$MEM0_HOST/memories" \
  -H "X-API-Key: $MEM0_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hi"}],"user_id":"bug_test_v5","scope":"project"}'
```

**Response (HTTP 200, empty results):**
```json
{"results":[]}
```

**Root cause:** Same as Bug 2 — `scope` is a Cloud-only concept. Self-hosted doesn't have org/project scoping (it's all flat per-user/per-agent).

**Fix:** Same as Bug 2 — strip `scope`.

**Upstream PR:** Same as Bug 2.

---

### Bug 4: `get_event_status` calls non-existent endpoint (HTTP 404)

**Symptom:** `get_event_status` tool always fails. The plugin polls `/v1/event/{id}/` waiting for async completion.

**Test:**
```bash
curl "$MEM0_HOST/v1/event/abc123/" -H "X-API-Key: $MEM0_API_KEY"
```

**Response (HTTP 404):**
```json
{"detail":"Not Found"}
```

**Root cause:** Self-hosted Mem0 has no event/status endpoint because creates are synchronous. Cloud API supports async event polling; self-hosted returns the created memory directly in the POST response.

**Fix in `mem0-selfhost-patch.ts:37, 69-71`:**
```typescript
// Route rewrite
[/\/v1\/event\/([a-f0-9-]+)\/?$/, "/__event/$1"],

// Mock short-circuit
if (parsed.pathname.match(/\/__event\/([a-f0-9-]+)\/?$/)) {
  return new Response(JSON.stringify({
    id: parsed.pathname.match(/\/__event\/([a-f0-9-]+)\/?$/)?.[1] || "",
    status: "SUCCEEDED",
    result: { success: true },
    created_at: new Date().toISOString()
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}
```

**Upstream PR:** Self-hosted Mem0 should either implement a lightweight event endpoint OR document that creates are synchronous. The plugin should also detect self-hosted mode and skip event polling.

---

### Bug 5: `/v1/ping/` endpoint doesn't exist (HTTP 404)

**Symptom:** Plugin initialization fails when calling the Cloud-only health check endpoint.

**Test:**
```bash
curl "$MEM0_HOST/v1/ping/" -H "X-API-Key: $MEM0_API_KEY"
```

**Response (HTTP 404):**
```json
{"detail":"Not Found"}
```

**Root cause:** Cloud API uses `/v1/ping/` for health checks; self-hosted has `/configure` or `/docs` instead.

**Fix in `mem0-selfhost-patch.ts:55-57`:**
```typescript
if (parsed.pathname.match(/\/v1\/ping\/?$/)) {
  return new Response(JSON.stringify({
    status: "ok",
    orgId: "self-hosted",
    projectId: "self-hosted",
    userEmail: "self-hosted"
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}
```

**Upstream PR:** Add `/v1/ping/` to self-hosted API. File: `server/main.py` — `@app.get("/v1/ping/")`.

---

### Bug 6: `/v1/organizations/.../projects/...` doesn't exist (HTTP 404)

**Symptom:** Plugin fetches project metadata on startup. Self-hosted has no org/project hierarchy.

**Test:**
```bash
curl "$MEM0_HOST/v1/organizations/org-123/projects/proj-456/" -H "X-API-Key: $MEM0_API_KEY"
```

**Response (HTTP 404):**
```json
{"detail":"Not Found"}
```

**Root cause:** Cloud API has multi-tenant org/project structure; self-hosted is single-tenant.

**Fix in `mem0-selfhost-patch.ts:59-62`:**
```typescript
if (parsed.pathname.match(/\/v1\/organizations\/.+\/projects\//)) {
  const method = init?.method?.toUpperCase() || "GET";
  return new Response(JSON.stringify(
    method === "GET" ? { customCategories: [] } : { success: true }
  ), { status: 200, headers: { "Content-Type": "application/json" } });
}
```

**Upstream PR:** Plugin should detect self-hosted mode and skip org/project calls entirely.

---

### Bug 7: Search requires filter (HTTP 400)

**Symptom:** `search_memories` tool fails with HTTP 400 when called without `user_id`/`agent_id`/`run_id` filter.

**Test (no filter):**
```bash
curl -X POST "$MEM0_HOST/search" \
  -H "X-API-Key: $MEM0_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"hello","limit":5}'
```

**Response (HTTP 400):**
```json
{"detail":"filters must contain at least one of: user_id, agent_id, run_id.
  Example: filters={'user_id': 'u1'}"}
```

**Root cause:** Self-hosted search API requires at least one filter to scope the query. The official plugin sometimes calls search without filters (e.g. for "global" searches).

**Fix in `mem0-selfhost-patch.ts:140-146` (fallback tool):**
```typescript
search_memories: tool({
  args: { query, user_id?, agent_id?, limit? },
  async execute(args) {
    const filters: any = {};
    if (args.user_id) filters.user_id = args.user_id;
    else if (args.agent_id) filters.agent_id = args.agent_id;
    else filters.user_id = resolveUserId(args);  // always provide a filter
    return mem0Fetch("/search", { method: "POST", body: { query: args.query, filters, limit: args.limit ?? 10 } });
  }
})
```

**Upstream PR:** Plugin should always pass a filter, defaulting to `user_id = process.env.USER`.

---

### Bug 8: Auth required (HTTP 401)

**Symptom:** All API calls fail with HTTP 401 if `X-API-Key` header is missing.

**Test:**
```bash
curl -X POST "$MEM0_HOST/memories" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hi"}],"user_id":"x"}'
```

**Response (HTTP 401):**
```json
{"detail":"Authentication required. Provide a Bearer token or X-API-Key header."}
```

**Root cause:** Self-hosted Mem0 requires authentication (unlike pre-auth builds that allowed open access with empty `ADMIN_API_KEY`). The official plugin doesn't inject `X-API-Key` for self-hosted mode.

**Fix in `mem0-selfhost-patch.ts:73-74` (fetch interceptor):**
```typescript
const headers = new Headers(init?.headers || {});
headers.set("X-API-Key", MEM0_API_KEY);
```

**Upstream PR:** Plugin should read `MEM0_API_KEY` env var and inject `X-API-Key` header when `MEM0_HOST` is set.

---

### Bug 9: `__require` not defined under Node.js (TypeError)

**Symptom:** When OpenCode TUI spawns a subagent via Node.js (e.g. `bash` tool), the official plugin crashes with `TypeError: __require is not a function`. All tools disappear.

**Test:** Run `bash -c "node -e 'require(\"@mem0/opencode-plugin\")'"` — fails.

**Root cause:** `@mem0/opencode-plugin` v0.2.1 `dist/index.js` is built with Bun, which uses `__require` as a bundler pragma. Node.js doesn't recognize it.

**Fix in `mem0-selfhost-patch.ts:246-251` (dynamic import):**
```typescript
try {
  const mod = await import("@mem0/opencode-plugin");
  officialHooks = (await mod.default(ctx, options)) || {};
} catch (err: any) {
  // Log warning, fallback tools remain registered
}
```

**Upstream PR:** Build plugin for dual platform (Bun + Node). Add `"exports": { "require": "./dist/index.cjs", "import": "./dist/index.js" }`. File: `integrations/mem0-plugin/.opencode-plugin/package.json`.

---

### Bug 10: `shell.env` hook fails under Node.js

**Symptom:** `MEM0_USER_ID`, `MEM0_APP_ID`, `MEM0_SESSION_ID`, `MEM0_BRANCH` env vars are empty in shell sessions when official plugin fails.

**Root cause:** The `shell.env` hook only fires if the official plugin loads successfully. If it crashes (Bug 9), no env vars are injected.

**Fix:** Fallback tools resolve `userId` via `process.env.USER` when no `user_id` arg is passed. The patch no longer provides a fallback `shell.env` hook (was too autonomous, injected `MEM0_DREAM = "true"`).

**Upstream PR:** Plugin should decouple `shell.env` from the broken dist, or the patch should provide a fallback env injection.

---

## 3. Architecture Decisions

### Decision 1: Fetch interceptor instead of fork
**Why:** Forking `dist/index.js` requires re-patching every npm update. A fetch interceptor is stateless — it rewrites routes at runtime.  
**Tradeoff:** Slightly slower (route matching on every call) vs. zero maintenance burden.

### Decision 2: Dynamic import instead of static
**Why:** Static `import "@mem0/opencode-plugin"` at the top of the file crashes the entire plugin if it fails. Dynamic import inside `try/catch` is safe — the official plugin is optional.  
**Tradeoff:** No tree-shaking (minor), but module-level crash is impossible.

### Decision 3: Both official AND fallback tools
**Why:** The official plugin provides extra hooks (auto-memory, compaction, `shell.env`). Fallback tools provide the base CRUD. Both are merged: `...fallbackToolDefs, ...(officialHooks.tool || {})`.  
**Tradeoff:** Duplicate tool registration if both define the same tool — but `tool()` API is idempotent (merges by name).

### Decision 4: `shell.env` hook removed from fallback
**Why:** Removed after testing — it was too autonomous. The `mcpOriginals` split caused it to inject `MEM0_DREAM = "true"` without user consent.  
**Tradeoff:** No env var injection when official plugin fails. But `process.env.USER` is always available.

### Decision 5: Unified `originals` map in `lazy-load.ts`
**Why:** Original two-map split (`originals` + `mcpOriginals`) caused `lazy-load.ts` to strip mem0 tool schemas. Merging into one map fixes it.  
**Tradeoff:** Lose MCP-vs-OpenAI logical separation. But correctness > taxonomy.

### Decision 6: `globalThis.__...` guards
**Why:** `lazy-load.ts` and `0-tokens-source.ts` are auto-discovered from `plugins/` dir — they could be loaded twice if another plugin imports them.  
**Tradeoff:** Global state pollution vs. silent crash on second register.

## 4. The Plugin Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    opencode.jsonc plugin array                │
├─────────────────────────────────────────────────────────────┤
│ 1. ./mem0-selfhost-patch.ts     (root, loaded first)         │
│ 2. opencode-update-notifier                                  │
│ 3. oh-my-opencode-slim                                       │
│ 4. auto-discovered plugins (0-tokens-source.ts, lazy-load)   │
└─────────────────────────────────────────────────────────────┘

mem0-selfhost-patch.ts does:
┌─────────────────────────────────────────────────────────────┐
│ 1. Monkey-patches globalThis.fetch                           │
│    - Rewrites /v3/memories/add → /memories                  │
│    - Rewrites /v1/memories/{id} → /memories/{id}           │
│    - Rewrites /v1/event/{id} → /__event/{id}              │
│    - Injects X-API-Key header                               │
│    - Mocks /v1/ping/ → { status: "ok", self-hosted }      │
│    - Mocks /v1/organizations/.../projects/ → { empty }     │
│    - Converts 502 DELETE → 404 (non-existent memory)       │
│ 2. Dynamic import @mem0/opencode-plugin                     │
│    - If Bun: tools merge on top of fallbacks                │
│    - If Node: logs warning, falls back to own tools          │
│ 3. Registers 11 fallback tools via tool() API               │
│    - add_memory, search_memories, get_memories,             │
│    - get_memory, update_memory, delete_memory,              │
│    - delete_all_memories, list_entities, delete_entities,   │
│    - get_event_status                                        │
└─────────────────────────────────────────────────────────────┘
```

## 5. The Mem0 Self-Hosted API Contract

This is the contract the patch targets:

**Self-hosted Mem0 API:**
- Base: `https://mem0.tienbac.dpdns.org`
- Auth: `X-API-Key` header (required)
- Endpoints:
  - `POST /memories` — create (body: `{ messages, user_id?, agent_id?, metadata?, infer? }`)
  - `GET /memories` — list (query: `?user_id&agent_id&page&page_size`)
  - `GET /memories/{id}` — get
  - `POST /search` — search (body: `{ query, filters: {user_id|agent_id|run_id}, limit }`)
  - `PUT /memories/{id}` — update (body: `{ text?, metadata? }`)
  - `DELETE /memories/{id}` — delete (returns 404 for non-existent)
  - `DELETE /memories` — delete all (query: `?user_id&agent_id`)
  - `GET /entities` — list entities
  - `DELETE /entities/{type}/{id}` — delete entity

**NOT on the self-hosted API:**
- `POST /memories` with `app_id` or `scope` (silently dropped → HTTP 200 with empty results)
- `POST /memories` with `text` (HTTP 422 — must use `messages`)
- `GET /v1/event/{id}` — no events endpoint
- `GET /v1/organizations/.../projects/...` — no org/project hierarchy
- `GET /v1/ping/` — no health check endpoint

## 6. Verification

Run `bun verify-patch.ts` to verify the patch works against your VPS:
- `GET https://api.mem0.ai/v1/ping/` → mock returns `{ status: "ok", orgId: "self-hosted" }`
- `GET https://api.mem0.ai/v1/organizations/org/projects/proj/` → mock returns `{ customCategories: [] }`
- `POST https://api.mem0.ai/v3/memories/search/` → rewritten to `$MEM0_HOST/search`, returns real results from VPS

## 7. Upstream PRs Needed

| File | Change | Bug |
|------|--------|-----|
| `integrations/mem0-plugin/.opencode-plugin/package.json` | Add `"tool"` to `"opencode.hooks"` | Plugin-level bug |
| `integrations/mem0-plugin/.opencode-plugin/package.json` | Add `"exports"` for dual CJS/ESM | Bug 9 |
| `integrations/mem0-plugin/dist/index.js` | Build for both Bun+Node (avoid `__require`) | Bug 9 |
| `server/main.py` | Add `model_config = {"extra": "ignore"}` to `MemoryCreate` | Bugs 2, 3 |
| `server/main.py` | Add `GET /v1/ping/` endpoint | Bug 5 |
| `server/main.py` | Add `GET /v1/organizations/.../projects/...` endpoint OR plugin skips it | Bug 6 |
| `server/main.py` | Add `GET /__event/{id}` endpoint (even if synchronous) | Bug 4 |
| `server/main.py` | Accept `text` field in `MemoryCreate` (for compatibility) | Bug 1 |
| `server/main.py` | Return 404 instead of 502 for `DELETE /memories/{non-existent}` | Bug 8 (already fixed in current VPS) |

## 8. See Also

- `docs/opencode-bugs-known.md` — brief bug reference
- `README.md` — user-facing docs with setup guide
- `mem0-selfhost-patch.ts` — the actual plugin code
- `verify-patch.ts` — verification script
