# Upstream Issue Templates

This document contains ready-to-copy GitHub Issue descriptions corresponding to the pull requests detailed in [PR.md](file:///C:/Users/bacnt/opencode-dotfiles/docs/PR.md). Use these to open tracking issues in the respective upstream repositories.

---

## 1. Issue: `@mem0/opencode-plugin` crashes on Node.js due to Bun-specific bundle format

> [!IMPORTANT]
> **Upstream Repository:** `mem0ai/mem0` (OpenCode plugin sub-package)  
> **Topic:** Runtime Compatibility

### Title
`bug: @mem0/opencode-plugin throws TypeError: __require is not a function in Node.js environments`

### Description
When installing and running the official `@mem0/opencode-plugin` in OpenCode sessions that run under a Node.js runtime (such as CLI subagent executions or Node-based wrapper processes), the module fails to import. 

```
TypeError: __require is not a function
    at .../node_modules/@mem0/opencode-plugin/dist/index.js:1:10
```

### Root Cause
The compiled plugin in `dist/index.js` was built targeting only the Bun runtime, injecting Bun-specific code bundling helpers like `__require`. When Node.js loads this file as an ES module or via common Node module resolution, it crashes at the top level, preventing any of the plugin's memory tools (`add_memory`, `search_memories`, etc.) from being registered.

### Proposed Solution
Modify the build script in `integrations/mem0-plugin/.opencode-plugin/package.json` to bundle using a tool like `tsup` or `esbuild` targeting Node.js compatibility (exporting both ESM and CJS formats), ensuring `__require` is compiled away into standard module-resolution syntax.

---

## 2. Issue: Self-hosted Mem0 API fails silently when client sends `app_id` or `scope`

> [!WARNING]
> **Upstream Repository:** `mem0ai/mem0` (Mem0 Server)  
> **Topic:** API Validation / Self-Host Compatibility

### Title
`bug: self-hosted memories creation fails silently when app_id or scope fields are present in request`

### Description
When using the official OpenCode plugin (which automatically includes metadata fields like `app_id` or `scope` in its payload) against a self-hosted Mem0 instance, memory creation requests return `{ results: [] }` and no memories are stored. No error is raised by the plugin, but the data is silently lost.

### Root Cause
The self-hosted Python FastAPI server validates incoming JSON requests using Pydantic models (such as `MemoryCreate` in `server/main.py`). By default, these models fail validation or skip records when receiving unrecognized fields. Since `app_id` and `scope` are cloud-specific metadata fields not represented in the self-hosted database schema, the endpoint silently rejects or skips processing the request.

### Proposed Solution
Update the Pydantic schemas in `server/main.py` to ignore unrecognized extra fields rather than failing validation. This can be done by adding `model_config = ConfigDict(extra="ignore")` to the base Pydantic models.

---

## 3. Issue: `@mem0/opencode-plugin` lacks endpoint translation for self-hosted instances

> [!TIP]
> **Upstream Repository:** `mem0ai/mem0` (OpenCode plugin)  
> **Topic:** Feature Request / Self-Host Routing

### Title
`feat: Add self-hosted API endpoint translation and message payload mapping`

### Description
The official `@mem0/opencode-plugin` hardcodes cloud-only routes and payload formats (such as `/v3/memories/add/` with a `{ text }` body). Self-hosted Mem0 instances run a simplified REST API (`/memories` and `/search` directly) and expect a `{ messages: [{role: "user", content: text}] }` structure. Additionally, self-hosted instances do not support organization, project, or asynchronous event status routes.

### Root Cause
The plugin assumes it is always communicating with the Mem0 Cloud API and does not perform route rewriting or body translation when a custom host (like a self-hosted VPS) is specified via `MEM0_HOST` / `MEM0_BASE_URL`.

### Proposed Solution
Introduce a `selfHosted: true` or `host` setting in the plugin configuration. If a self-hosted host is detected:
1. Translate `POST /v3/memories/add/` -> `POST /memories` (and convert `{ text }` to the message array format).
2. Translate `POST /v3/memories/search/` -> `POST /search`.
3. Mock or bypass organization/project metadata lookups and asynchronous event polling (since self-hosted creations are synchronous).

---

## 4. Issue: Self-hosted DELETE memories endpoint returns HTTP 502 on non-existent records

> [!CAUTION]
> **Upstream Repository:** `mem0ai/mem0` (Mem0 Server)  
> **Topic:** Server Stability / API Spec

### Title
`bug: DELETE /memories/{memory_id} returns HTTP 502 Bad Gateway if memory does not exist`

### Description
When sending a `DELETE` request for a memory ID that does not exist in the database (or has already been deleted), the self-hosted FastAPI server crashes internally and returns an HTTP `502 Bad Gateway` or `500 Internal Server Error` instead of a clean HTTP `404 Not Found` response.

### Root Cause
The route handler in the FastAPI application does not catch database or vector store lookup exceptions during deletes. When a non-existent ID is passed, the database adapter throws an unhandled exception that propagates up, causing the server gateway to return a 502.

### Proposed Solution
In the DELETE route handler, catch database/vector store lookup errors and raise a clean `HTTPException(status_code=404, detail="Memory not found")`.

---

## 5. Issue: Models-Discovery plugin marks discovered models as text-only by default

> [!NOTE]
> **Upstream Repository:** `opencode-ai/plugin` (or models-discovery repository)  
> **Topic:** Model Discovery

### Title
`bug: models-discovery defaults custom/discovered models to text-only when capabilities metadata is missing`

### Description
When discovering models from a custom proxy provider (such as 9router), the models are registered without `modalities` metadata if the proxy's `/v1/models` endpoint does not return explicit capabilities. OpenCode defaults these models to text-only, throwing the following error when trying to process images:
```
Cannot read image.png (this model does not support image input)
```

### Root Cause
In `models-discovery.js`, the code assumes that models are text-only if no `capabilities.vision` boolean is provided by the API endpoint response:
```javascript
if (caps.vision === true) {
  entry.modalities = { input: ["text", "image"], output: ["text"] };
} else {
  // Defaults to text-only if caps.vision is undefined
}
```

### Proposed Solution
Default discovered/custom models to multimodal (`text + image` inputs) unless they explicitly advertise `vision: false` or their model ID matches a text-only classifier. This matches standard agent expectations for custom endpoints.

---

## 6. Issue: `lazy-load.ts` tool filtering strips late-registered and MCP tools

> [!IMPORTANT]
> **Upstream Repository:** `omarwaly-ai/opencode-lazy-loading`  
> **Topic:** Tool Execution / Schema Blinding

### Title
`bug: lazy-load.ts strips schemas of late-registered and MCP tools, making them unusable`

### Description
When using `lazy-load.ts` alongside other plugins that register tools late (such as `@mem0/opencode-plugin`) or when using MCP servers, the schemas for those tools are stripped from the LLM request. When the LLM subsequently loads and executes them, they crash or are called with missing parameters because the schema was not preserved.

### Root Cause
The plugin splits tools into two separate map instances: `originals` (for built-in tools) and `mcpOriginals` (for MCP tools). When `lazy-load.ts` intercepts the request body, it validates the tools against `originals`. For any tool not in `originals` (such as MCP tools or late-registered plugin tools), it strips the schema. Because it doesn't merge them properly into the primary lookups, these tools cannot retrieve their definitions.

### Proposed Solution
Merge `originals` and `mcpOriginals` into a single unified map system, and capture definitions and schemas dynamically for all tools present in `body.tools` during the intercept phase.

---

## 7. Issue: Duplicate loading errors when plugins are imported multiple times

> [!WARNING]
> **Upstream Repositories:** `omarwaly-ai/opencode-lazy-loading` & `omarwaly-ai/OpenCode-tokens-source`  
> **Topic:** Module Initialization

### Title
`bug: Duplicate tool/hook registration errors when loading plugins multiple times`

### Description
In OpenCode, auto-discovered plugins in the `plugins/` directory can also be manually imported in config files or loaded by other orchestration scripts. When this happens, both `lazy-load.ts` and `0-tokens-source.ts` wrap the `fetch` API multiple times recursively and fail with registration errors because the tools/hooks are registered twice.

### Root Cause
The plugins lack load guards at their module entry points, allowing the registration logic to run multiple times in the same process context.

### Proposed Solution
Add a global sentinel check (e.g. `globalThis.__lazy_load_loaded__` and `globalThis.__tokens_source_loaded__`) at the top of the plugin export functions to immediately exit if the plugin has already been initialized.

