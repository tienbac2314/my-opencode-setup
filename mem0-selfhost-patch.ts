/**
 * mem0-selfhost-patch.ts
 *
 * A thin OpenCode plugin that monkey-patches the official @mem0/opencode-plugin
 * at runtime so it works with a self-hosted Mem0 instance.
 *
 * Instead of maintaining a full fork of dist/index.js, this plugin:
 *   1. Intercepts fetch() calls to rewrite Mem0 Cloud API paths to self-hosted paths
 *   2. Injects X-API-Key header for self-hosted auth
 *   3. Short-circuits /v1/ping/ to return self-hosted identity
 *   4. Mocks /v1/organizations/.../projects/... endpoints
 *   5. Always registers fallback mem0 tools using the official Plugin API,
 *      so add_memory/search_memories/etc are ALWAYS available to the LLM.
 *
 * Place in ~/.config/opencode/ (root directory).
 * Required env vars:
 *   MEM0_HOST       - Self-hosted Mem0 URL
 *   MEM0_API_KEY    - Self-hosted admin API key
 */

import { tool } from "@opencode-ai/plugin";

const MEM0_HOST = process.env.MEM0_HOST || process.env.MEM0_BASE_URL;
const MEM0_API_KEY = process.env.MEM0_API_KEY;
const MEM0_CLOUD = "https://api.mem0.ai";

// Route map: official cloud path prefix -> self-hosted path
const ROUTE_REWRITES: [RegExp, string][] = [
  [/\/v3\/memories\/add\/?$/, "/memories"],
  [/\/v[13]\/memories\/search\/?$/, "/search"],
  [/\/v1\/memories\/([a-f0-9-]+)\/?$/, "/memories/$1"],
  [/\/v1\/memories\/([a-f0-9-]+)\/history\/?$/, "/memories/$1/history"],
  [/\/v1\/memories\/?$/, "/memories"],
  [/\/v1\/entities\/?$/, "/entities"],
  [/\/v1\/entities\/([^\/]+)\/([^\/]+)\/?$/, "/entities/$1/$2"],
  [/\/v2\/entities\/([^\/]+)\/([^\/]+)\/?$/, "/entities/$1/$2"],
  [/\/v1\/event\/([a-f0-9-]+)\/?$/, "/__event/$1"],
];

if (MEM0_HOST && MEM0_API_KEY) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    if (!url.includes(MEM0_CLOUD) && !url.includes(MEM0_HOST)) {
      return originalFetch(input, init);
    }

    let targetUrl = url.replace(MEM0_CLOUD, MEM0_HOST);
    const parsed = new URL(targetUrl);

    if (parsed.pathname.match(/\/v1\/ping\/?$/)) {
      return new Response(JSON.stringify({ status: "ok", orgId: "self-hosted", projectId: "self-hosted", userEmail: "self-hosted" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (parsed.pathname.match(/\/v1\/organizations\/.+\/projects\//)) {
      const method = init?.method?.toUpperCase() || "GET";
      return new Response(JSON.stringify(method === "GET" ? { customCategories: [] } : { success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    for (const [pattern, replacement] of ROUTE_REWRITES) {
      if (pattern.test(parsed.pathname)) { parsed.pathname = parsed.pathname.replace(pattern, replacement); break; }
    }
    targetUrl = parsed.toString();

    if (parsed.pathname.match(/\/__event\/([a-f0-9-]+)\/?$/)) {
      return new Response(JSON.stringify({ id: parsed.pathname.match(/\/__event\/([a-f0-9-]+)\/?$/)?.[1] || "", status: "SUCCEEDED", result: { success: true }, created_at: new Date().toISOString() }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const headers = new Headers(init?.headers || {});
    headers.set("X-API-Key", MEM0_API_KEY);

    let newInit = { ...init, headers };
    if (parsed.pathname === "/memories" && newInit.method === "POST" && typeof newInit.body === "string") {
      try {
        const bodyObj = JSON.parse(newInit.body);
        if (bodyObj.text) { bodyObj.messages = [{ role: "user", content: bodyObj.text }]; delete bodyObj.text; }
        delete bodyObj.app_id; delete bodyObj.scope;
        newInit.body = JSON.stringify(bodyObj);
      } catch (e) { /* ignore parse errors */ }
    }
    if (parsed.pathname.match(/^\/memories\//) && newInit.method === "DELETE") {
      return originalFetch(targetUrl, newInit).then((res) => res.status === 502 ? new Response(JSON.stringify({ message: "Memory not found or already deleted" }), { status: 404, headers: { "Content-Type": "application/json" } }) : res);
    }

    return originalFetch(targetUrl, newInit);
  };
}

// ─── Self-hosted API helper ──────────────────────────────────────────────

async function mem0Fetch(path: string, opts?: { method?: string; body?: any; query?: Record<string, string> }): Promise<any> {
  const base = MEM0_HOST || "http://localhost:8080";
  const key = MEM0_API_KEY || "";
  const qs = opts?.query ? "?" + new URLSearchParams(opts.query).toString() : "";
  const res = await fetch(`${base}${path}${qs}`, {
    method: opts?.method || "GET",
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`mem0 API error ${res.status}: ${await res.text()}`);
  return res.json();
}

function resolveUserId(args: any): string {
  return args.user_id || process.env.MEM0_USER_ID || process.env.USER || process.env.USERNAME || "user";
}

// ─── Fallback tools (always registered) ──────────────────────────────────

const fallbackToolDefs: Record<string, any> = {
  add_memory: tool({
    description: "Add a new memory. Call when the user informs anything about themselves, their preferences, or anything relevant for future conversations. Set infer to false to store verbatim without LLM fact extraction.",
    args: {
      text: tool.schema.string().describe("Memory text content"),
      user_id: tool.schema.string().optional().describe("User ID"),
      agent_id: tool.schema.string().optional().describe("Agent ID"),
      metadata: tool.schema.record(tool.schema.string(), tool.schema.any()).optional().describe("Metadata key-value pairs"),
      infer: tool.schema.boolean().optional().describe("Set to false to store verbatim without extraction"),
    },
    async execute(args: any) {
      const body: any = { messages: [{ role: "user", content: args.text }], user_id: resolveUserId(args), infer: args.infer ?? true };
      if (args.agent_id) body.agent_id = args.agent_id;
      if (args.metadata) body.metadata = args.metadata;
      return JSON.stringify(await mem0Fetch("/memories", { method: "POST", body }));
    },
  }),

  search_memories: tool({
    description: "Search stored memories by semantic meaning. Use proactively before answering when the request may depend on the user's past work, preferences, or decisions.",
    args: {
      query: tool.schema.string().describe("Search query"),
      user_id: tool.schema.string().optional().describe("User ID"),
      agent_id: tool.schema.string().optional().describe("Agent ID"),
      limit: tool.schema.number().optional().describe("Max results (default 10)"),
    },
    async execute(args: any) {
      const filters: any = {};
      if (args.user_id) filters.user_id = args.user_id;
      else if (args.agent_id) filters.agent_id = args.agent_id;
      else filters.user_id = resolveUserId(args);
      return JSON.stringify(await mem0Fetch("/search", { method: "POST", body: { query: args.query, filters, limit: args.limit ?? 10 } }));
    },
  }),

  get_memories: tool({
    description: "List or browse stored memories without a search query — useful for auditing what is remembered or paging through everything in a scope.",
    args: {
      user_id: tool.schema.string().optional().describe("User ID"),
      agent_id: tool.schema.string().optional().describe("Agent ID"),
      page: tool.schema.number().optional().describe("Page number"),
      page_size: tool.schema.number().optional().describe("Page size"),
    },
    async execute(args: any) {
      const query: Record<string, string> = {};
      if (args.user_id) query.user_id = args.user_id;
      if (args.agent_id) query.agent_id = args.agent_id;
      if (args.page) query.page = String(args.page);
      if (args.page_size) query.page_size = String(args.page_size);
      if (!query.user_id && !query.agent_id) query.user_id = resolveUserId(args);
      return JSON.stringify(await mem0Fetch("/memories", { query }));
    },
  }),

  get_memory: tool({
    description: "Fetch one memory by its exact ID (e.g. an ID returned by search_memories or get_memories) to read its full content and metadata.",
    args: { id: tool.schema.string().describe("The ID of the memory to retrieve") },
    async execute(args: any) { return JSON.stringify(await mem0Fetch(`/memories/${args.id}`)); },
  }),

  update_memory: tool({
    description: "Update an existing memory in place when a stored fact has changed — requires the memory ID. Preserves the ID and history.",
    args: {
      id: tool.schema.string().describe("The ID of the memory to update"),
      text: tool.schema.string().optional().describe("New text content"),
      metadata: tool.schema.record(tool.schema.string(), tool.schema.any()).optional().describe("New metadata key-value pairs"),
    },
    async execute(args: any) {
      const body: any = {};
      if (args.text) body.text = args.text;
      if (args.metadata) body.metadata = args.metadata;
      return JSON.stringify(await mem0Fetch(`/memories/${args.id}`, { method: "PUT", body }));
    },
  }),

  delete_memory: tool({
    description: "Delete one or more memories by ID when they are wrong, obsolete, or the user asks to forget them. Irreversible — only delete what is clearly no longer wanted.",
    args: { id: tool.schema.string().describe("The ID of the memory to delete") },
    async execute(args: any) { return JSON.stringify(await mem0Fetch(`/memories/${args.id}`, { method: "DELETE" })); },
  }),

  delete_all_memories: tool({
    description: "Delete ALL memories for a given user or agent. Destructive and irreversible — only use when the user explicitly asks to wipe their memory. Never call speculatively.",
    args: {
      user_id: tool.schema.string().optional().describe("User ID whose memories to delete"),
      agent_id: tool.schema.string().optional().describe("Agent ID whose memories to delete"),
    },
    async execute(args: any) {
      const query: Record<string, string> = {};
      if (args.user_id) query.user_id = args.user_id;
      if (args.agent_id) query.agent_id = args.agent_id;
      if (!query.user_id && !query.agent_id) query.user_id = resolveUserId(args);
      return JSON.stringify(await mem0Fetch("/memories", { method: "DELETE", query }));
    },
  }),

  delete_entities: tool({
    description: "Delete entire user/agent entities and every memory attached to them. Irreversible — only on explicit user request.",
    args: {
      user_id: tool.schema.string().optional().describe("User ID"),
      agent_id: tool.schema.string().optional().describe("Agent ID"),
    },
    async execute(args: any) {
      if (args.user_id) return JSON.stringify(await mem0Fetch(`/entities/user/${args.user_id}`, { method: "DELETE" }));
      if (args.agent_id) return JSON.stringify(await mem0Fetch(`/entities/agent/${args.agent_id}`, { method: "DELETE" }));
      throw new Error("Either user_id or agent_id is required");
    },
  }),

  list_entities: tool({
    description: "List the user/agent/app/run entities that have memories. Use to discover which scopes exist before searching, listing, or deleting within a specific one.",
    args: {},
    async execute() { return JSON.stringify(await mem0Fetch("/entities")); },
  }),

  get_event_status: tool({
    description: "Check whether an asynchronous memory write (add/update/delete) finished, using the event_id that call returned. Self-hosted creates are synchronous, so this always returns SUCCEEDED.",
    args: { event_id: tool.schema.string().describe("The ID of the event/async operation to check") },
    async execute(args: any) { return JSON.stringify({ id: args.event_id, status: "SUCCEEDED", result: { success: true } }); },
  }),
};

// ─── Plugin export ────────────────────────────────────────────────────────

export default {
  id: "mem0-selfhost-patch",
  server: async (ctx: any, options: any) => {
    let officialHooks: Record<string, any> = {};

    // Try loading the official @mem0/opencode-plugin for its extra hooks
    // (chat.message, tool.execute.before/after, compaction, etc.)
    try {
      const mod = await import("@mem0/opencode-plugin");
      const mem0PluginExport: any = mod.default || mod;
      officialHooks = (await mem0PluginExport(ctx, options)) || {};
    } catch (err: any) {
      try { await ctx.client?.app?.log?.({ body: { service: "mem0-selfhost-patch", level: "warn", message: `Official plugin unavailable (${err.message}), using fallback tools only` } }); } catch {}
    }

    // Merge fallback tools with official tools (fallbacks fill any gap)
    officialHooks.tool = { ...fallbackToolDefs, ...(officialHooks.tool || {}) };

    try {
      await ctx.client?.app?.log?.({ body: { service: "mem0-selfhost-patch", level: "info", message: `Mem0 patch ready. Tools: ${Object.keys(officialHooks.tool).join(", ")}` } });
    } catch {}

    return officialHooks;
  },
};
