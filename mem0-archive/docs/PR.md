# Upstream Pull Request Guide

This document lists the recommended Pull Requests (PRs) that can be submitted to upstream projects (`mem0ai/mem0`, `@mem0/opencode-plugin`, and `opencode-ai/plugin` or related repos) to resolve the bugs and limitations that required local patches.

---

## 1. Fix Bun vs. Node.js Compatibility in `@mem0/opencode-plugin`

> [!IMPORTANT]
> **Upstream Repository:** `mem0ai/mem0` (or the `@mem0/opencode-plugin` package repo)  
> **Target File:** `integrations/mem0-plugin/.opencode-plugin/package.json` (and build script/configs)

### The Culprit
The official plugin's compiled output `dist/index.js` is bundled using Bun's bundler and includes Bun-specific runtime helper symbols like `__require`. When running under Node.js (which OpenCode uses to execute plugins, e.g., in subagents or scripts running in shell environments), importing the plugin fails with:
```
TypeError: __require is not a function
```
This module-level crash prevents the plugin from loading, resulting in **zero** memory tools (`add_memory`, `search_memories`, etc.) being registered.

### Proposed Code Changes
Configure the build system (e.g. using `tsup` or `esbuild`) to produce standard Node.js compatible CommonJS and ESM outputs instead of a Bun-dependent bundle, or compile to pure ES modules.

**Modify build scripts to target Node:**
```json
{
  "name": "@mem0/opencode-plugin",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "exports": {
    "import": "./dist/index.js",
    "require": "./dist/index.cjs"
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts --clean"
  }
}
```

---

## 2. Ignore Unknown Fields in Self-Hosted Mem0 API

> [!WARNING]
> **Upstream Repository:** `mem0ai/mem0` (Mem0 Server)  
> **Target File:** `server/main.py` (or Pydantic models schema definition)

### The Culprit
The official OpenCode plugin sends extra fields like `app_id` and `scope` during memory creation. The self-hosted Python FastAPI server uses Pydantic models for request validation. In self-hosted Mem0, unknown fields cause the model validation to fail or ignore the records silently, resulting in `{ results: [] }` and no memories actually stored.

### Proposed Code Changes
Set the Pydantic model configuration to ignore extra fields instead of failing or rejecting them.

**In the Pydantic schemas (e.g. `MemoryCreate`):**
```python
# Before (Strict or raising error)
class MemoryCreate(BaseModel):
    text: str
    user_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

# After (Ignore extra fields dynamically)
from pydantic import BaseModel, ConfigDict

class MemoryCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    text: str
    user_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
```

---

## 3. Handle Self-Hosted Route Mappings in Official `@mem0/opencode-plugin`

> [!TIP]
> **Upstream Repository:** `mem0ai/mem0` (OpenCode integration)  
> **Target File:** `@mem0/opencode-plugin/src/index.ts` (or equivalent source file)

### The Culprit
The official plugin hardcodes Cloud routes (e.g., `https://api.mem0.ai/v3/memories/add/`, `/v3/memories/search/`, etc.). Self-hosted instances running the FastAPI server use different API patterns (e.g., `/memories` and `/search` directly, with `{ messages: [{role: "user", content: text}] }` format instead of `{ text }`). In addition, self-hosted instances do not support organizations, project directories, or asynchronous event status routes.

### Proposed Code Changes
Allow the plugin to accept a `selfHosted: true` or `host` setting. If a custom host is configured, map paths and translate body parameters accordingly:

```typescript
const isSelfHosted = config.host && !config.host.includes("api.mem0.ai");

const getEndpoint = (action: string) => {
  if (isSelfHosted) {
    switch (action) {
      case "add": return "/memories";
      case "search": return "/search";
      case "delete": return "/memories";
      default: return `/${action}`;
    }
  }
  return `/v3/memories/${action}`;
};

// Translate parameters for self-hosted POST /memories
const prepareBody = (args: any) => {
  if (isSelfHosted) {
    return {
      messages: [{ role: "user", content: args.text }],
      user_id: args.user_id,
      metadata: args.metadata
    };
  }
  return {
    text: args.text,
    user_id: args.user_id,
    metadata: args.metadata,
    app_id: args.app_id
  };
};
```

---

## 4. Return Clean 404 for Non-Existent Memories on DELETE

> [!CAUTION]
> **Upstream Repository:** `mem0ai/mem0` (Mem0 Server)  
> **Target File:** `server/main.py` or vector database adapter

### The Culprit
When deleting a memory that does not exist in the database (or has already been deleted), the self-hosted FastAPI server throws an unhandled database exception that bubbles up to a `502 Bad Gateway` or `500 Internal Server Error` instead of returning a clean HTTP `404 Not Found`.

### Proposed Code Changes
Catch the database/vector store exception when deleting and return a clean 404 response.

```python
@app.delete("/memories/{memory_id}")
async def delete_memory(memory_id: str):
    try:
        deleted = memory_store.delete(memory_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Memory not found")
        return {"message": "Memory deleted successfully"}
    except MemoryNotFoundError:
        raise HTTPException(status_code=404, detail="Memory not found")
    except Exception as e:
        logger.error(f"Failed to delete memory: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
```

---

## 5. Enable Modality Auto-Fallback in OpenCode Models Discovery

> [!NOTE]
> **Upstream Repository:** `opencode-ai/plugin` or models-discovery plugin  
> **Target File:** `models-discovery.js` (or main OpenCode core)

### The Culprit
When discovering custom models (like those from a 9router proxy), OpenCode registers them with no modalities if the `/v1/models` API doesn't return explicit capabilities. OpenCode defaults these discovered models to text-only mode and blocks image inputs, throwing:
```
Cannot read image.png (this model does not support image input)
```

### Proposed Code Changes
Default all custom/discovered models to multimodal (`text + image` input) unless they explicitly report text-only capability or their model ID matches a text-only classifier.

```javascript
const entry = { name: id };
const caps = m.capabilities || {};

if (caps.vision === true) {
  entry.modalities = { input: ["text", "image"], output: ["text"] };
} else if (caps.vision === false) {
  entry.modalities = { input: ["text"], output: ["text"] };
} else {
  // Safe fallback: Default to multimodal instead of text-only
  entry.modalities = { input: ["text", "image"], output: ["text"] };
}
```

---

## 6. Merge `originals` and `mcpOriginals` in `lazy-load.ts`

> [!IMPORTANT]
> **Upstream Repository:** `omarwaly-ai/opencode-lazy-loading`  
> **Target File:** `plugins/opencode-lazy-load.ts`

### The Culprit
The plugin originally maintained two separate maps for tools: `originals` (for built-in/OpenAI tools) and `mcpOriginals` (for MCP tools). When checking if a tool's schema should be stripped from the LLM request body, it checked if the tool name was present in `originals`. For MCP tools or tools registered later by other plugins (such as Mem0 memory tools), this check returned `false`, causing the plugin to strip their schemas. Since schemas didn't get restored properly, these tools became unusable.

### Proposed Code Changes
Consolidate all tool descriptions and parameter schemas into the main `originals` and `originalSchemas` maps during the request body capture loop.

```typescript
// Replace the split originals/mcpOriginals checks with a unified capture:
const desc = fn?.description || t?.description || ""
const params = fn?.parameters || t?.parameters

if (desc && !originals.has(name)) {
  originals.set(name, desc)
}
if (params && !originalSchemas.has(name)) {
  originalSchemas.set(name, params)
}
```

---

## 7. Add Duplicate Loading Guards to `lazy-load.ts` and `tokens-source.ts`

> [!WARNING]
> **Upstream Repositories:** `omarwaly-ai/opencode-lazy-loading` & `omarwaly-ai/OpenCode-tokens-source`  
> **Target Files:** `plugins/opencode-lazy-load.ts` & `plugins/tokens-source.ts`

### The Culprit
In OpenCode environments, plugins can be loaded multiple times (e.g. automatically discovered from the `plugins/` directory and also imported or executed manually by other config scripts). Without loading guards, the plugins wrap `fetch` multiple times recursively and throw duplicate tool/hook registration errors.

### Proposed Code Changes
Add a `globalThis` sentinel guard at the very beginning of the plugin entry functions to ensure they only register once.

**In `lazy-load.ts`:**
```typescript
const LazyLoadPlugin: Plugin = async (_input, _options) => {
  if ((globalThis as any).__lazy_load_loaded__) {
    return {}
  }
  (globalThis as any).__lazy_load_loaded__ = true
  
  // Wrap fetch...
```

**In `tokens-source.ts`:**
```typescript
const TokensSourcePlugin: Plugin = async (input: PluginInput): Promise<Hooks> => {
  if ((globalThis as any).__tokens_source_loaded__) {
    return {}
  }
  (globalThis as any).__tokens_source_loaded__ = true
  
  // Wrap fetch...
```

```
