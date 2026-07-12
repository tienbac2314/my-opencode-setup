# Mem0 Self-Hosted Integration — Full Architecture & Session Log

**Date:** 2026-07-12/13
**Context:** This document captures the full journey of integrating `@mem0/opencode-plugin` with a self-hosted Mem0 instance — the bugs found, the architectural decisions, and the fix rationale. It is the canonical reference for why things are the way they are.

---

## 1. Timeline

| Time | Event |
|------|-------|
| **Before** | Using a **forked** `@mem0/opencode-plugin` (`integrations/mem0-plugin/`) — manually patched `dist/index.js` to point at self-hosted paths |
| **Step 1** | Discovered the official plugin fails against self-hosted Mem0 (missing `/v1/` prefix, no org/project endpoints, `__require` under Node.js) |
| **Step 2** | Created `mem0-selfhost-patch.ts` — a **fetch interceptor** that rewrites Cloud API routes to self-hosted paths at runtime **without** forking the npm package |
| **Step 3** | Discovered 10 bugs via systematic REST API testing with `curl` |
| **Step 4** | Fixed `app_id`/`scope` stripping (silent memory loss), `get_event_status` route (mocked), DELETE 502→404 conversion |
| **Step 5** | Refactored to **dynamic import** — the official plugin is now optional, loaded inside `try/catch` |
| **Step 6** | Registered **fallback tools** via `tool()` from `@opencode-ai/plugin` — always available, never a "tool not found" error |
| **Step 7** | Documented all bugs in `opencode-bugs-known.md` |
| **Step 8** | Updated `README.md` + committed to `opencode-dotfiles` |
| **Final** | `b69bb62` — final docs commit |

## 2. The 10 Bugs

### Bug 1-2: `app_id` and `scope` fields cause silent memory loss
**Where:** Self-hosted Mem0 API's `MemoryCreate` schema — does NOT accept `app_id` or `scope`.  
**What happens:** `add_memory` returns `{ results: [] }` — no error, memory silently discarded.  
**Fix:** Strip `app_id` and `scope` from POST body before sending. Also convert `text`→`messages` format.

### Bug 3: `get_event_status` calls non-existent endpoint
**Where:** Route `/v1/event/{id}/` — Cloud-only API.  
**Fix:** Rewrite to `/__event/{id}` and mock return `{ status: "SUCCEEDED" }` immediately.

### Bug 4: `shell.env` hook may not fire env vars
**Where:** Only fires if official plugin loads successfully.  
**Status:** Not critical — fallback tools resolve `userId` via `process.env.USER`.

### Bug 5-6: Missing `~/.mem0/settings.json` and `~/.mem0/mem0-dream-state.json`
**Where:** Plugin settings files.  
**Fix:** Created with `default_scope: project`, `dream: true`.

### Bug 7: Search requires `user_id`/`agent_id`/`run_id` filter
**Where:** Self-hosted search API.  
**Fix:** Plugin SDK already handles this — user passes `user_id` or `agent_id` in search args.

### Bug 8: DELETE 502→404 conversion
**Where:** Deleting non-existent memory returns 502.  
**Fix:** Fetch interceptor catches 502 on DELETE and converts to 404.

### Bug 9: `delete_all` needs identifier
**Where:** `DELETE /memories` with no filter.  
**Fix:** Plugin SDK already passes `user_id`/`agent_id` — no change needed.

### Bug 10: `__require` under Node.js
**Where:** `@mem0/opencode-plugin` v0.2.1 is Bun-bundled.  
**Fix:** Dynamic import (`await import(...)`) inside `try/catch` — module-level crash is impossible.

## 3. Architecture Decisions

### Decision 1: Fetch interceptor instead of fork
**Why:** Forking `dist/index.js` requires re-patching every npm update. A fetch interceptor is stateless — it rewrites routes at runtime.  
**Tradeoff:** Slightly slower (route matching on every call) vs. no maintenance burden.

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
│    - get_event_status, delete_entities                       │
└─────────────────────────────────────────────────────────────┘
```

## 5. The Mem0 Self-Hosted API Contract

This is the contract the patch targets:

**Self-hosted Mem0 API:**
- Base: `https://mem0.tienbac.dpdns.org`
- Auth: `X-API-Key` header
- Endpoints:
  - `POST /memories` — create (body: `{ messages, user_id?, agent_id?, metadata?, infer? }`)
  - `GET /memories` — list (query: `?user_id&agent_id&page&page_size`)
  - `GET /memories/{id}` — get
  - `POST /search` — search (body: `{ query, filters, limit }`)
  - `PUT /memories/{id}` — update (body: `{ text?, metadata? }`)
  - `DELETE /memories/{id}` — delete
  - `DELETE /memories` — delete all (query: `?user_id&agent_id`)
  - `GET /entities` — list entities
  - `DELETE /entities/{type}/{id}` — delete entity

**NOT on the self-hosted API:**
- `POST /memories` with `app_id` or `scope`
- `POST /memories` with `text` (must use `messages`)
- `GET /v1/event/{id}` — no events endpoint
- `GET /v1/organizations/.../projects/...` — no org/project hierarchy

## 6. Verification

Tested with `verify-patch.ts` (Bun-based):
- `add_memory` — returns created memory with ID
- `search_memories` — returns matching memories
- `get_memories` — returns list with pagination
- `get_memory` — returns single memory by ID
- `update_memory` — updates content
- `delete_memory` — deletes and confirms
- `get_event_status` — returns SUCCEEDED (synchronous mock)
- `list_entities` — returns entity list
- `delete_entities` — deletes by type
- `delete_all_memories` — deletes all for user

All pass under both:
- **Bun** (official plugin loads, tools merge)
- **Node.js** (official plugin fails at `__require`, fallback tools take over)

## 7. Upstream PRs Needed

| File | Change |
|------|--------|
| `integrations/mem0-plugin/.opencode-plugin/package.json` | Add `"tool"` to `"opencode.hooks"` |
| `integrations/mem0-plugin/.opencode-plugin/package.json` | Add `"exports"` for dual CJS/ESM |
| `integrations/mem0-plugin/dist/index.js` | Build for both Bun+Node (avoid `__require`) |
| `server/main.py` | Add `model_config = {"extra": "ignore"}` to `MemoryCreate` |
| `server/main.py` | Add `GET /__event/{id}` endpoint (even if synchronous) |
| `server/main.py` | Return 404 instead of 502 for `DELETE /memories/{non-existent}` |
| `server/main.py` | Accept `text` field in `MemoryCreate` (for compatibility) |

## 8. See Also

- `docs/opencode-bugs-known.md` — brief bug reference (this doc is the expanded version)
- `README.md` — user-facing docs with setup guide
- `mem0-selfhost-patch.ts` — the actual plugin code