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
 *
 * Place in ~/.config/opencode/plugins/ (auto-discovered, loads before npm plugins).
 * Then use the OFFICIAL npm package: "@mem0/opencode-plugin" in your plugin array.
 *
 * Required env vars:
 *   MEM0_HOST       - Your self-hosted Mem0 URL (e.g. https://mem0.tienbac.dpdns.org)
 *   MEM0_API_KEY    - Your self-hosted admin API key
 */

const MEM0_HOST = process.env.MEM0_HOST || process.env.MEM0_BASE_URL;
const MEM0_API_KEY = process.env.MEM0_API_KEY;
const MEM0_CLOUD = "https://api.mem0.ai";

// Route map: official cloud path prefix -> self-hosted path
// Official uses versioned paths (/v1/, /v3/), self-hosted uses flat paths
const ROUTE_REWRITES: [RegExp, string][] = [
  // POST /v3/memories/add/ -> POST /memories
  [/\/v3\/memories\/add\/?$/, "/memories"],
  // POST /v1/memories/search/ -> POST /search
  [/\/v1\/memories\/search\/?$/, "/search"],
  // GET|PUT|DELETE /v1/memories/{id}/ -> /memories/{id}
  [/\/v1\/memories\/([a-f0-9-]+)\/?$/, "/memories/$1"],
  // GET /v1/memories/{id}/history/ -> /memories/{id}/history
  [/\/v1\/memories\/([a-f0-9-]+)\/history\/?$/, "/memories/$1/history"],
  // GET|DELETE /v1/memories/ -> /memories
  [/\/v1\/memories\/?$/, "/memories"],
  // DELETE /entities/{type}/{name} -> /entities/{type}/{name}
  [/\/entities\/(.+)$/, "/entities/$1"],
];

if (MEM0_HOST && MEM0_API_KEY) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;

    // Only intercept requests to Mem0 Cloud or to our self-hosted host
    if (!url.includes(MEM0_CLOUD) && !url.includes(MEM0_HOST)) {
      return originalFetch(input, init);
    }

    // Parse the URL
    let targetUrl = url.replace(MEM0_CLOUD, MEM0_HOST);
    const parsed = new URL(targetUrl);

    // --- Mock: /v1/ping/ ---
    if (parsed.pathname.match(/\/v1\/ping\/?$/)) {
      return new Response(
        JSON.stringify({
          status: "ok",
          orgId: "self-hosted",
          projectId: "self-hosted",
          userEmail: "self-hosted",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // --- Mock: /v1/organizations/.../projects/... (getProject, updateProject) ---
    if (parsed.pathname.match(/\/v1\/organizations\/.+\/projects\//)) {
      const method = init?.method?.toUpperCase() || "GET";
      if (method === "GET") {
        return new Response(
          JSON.stringify({ customCategories: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      // PUT updateProject — just acknowledge
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // --- Rewrite API routes ---
    for (const [pattern, replacement] of ROUTE_REWRITES) {
      if (pattern.test(parsed.pathname)) {
        parsed.pathname = parsed.pathname.replace(pattern, replacement);
        break;
      }
    }

    targetUrl = parsed.toString();

    // Inject X-API-Key header (self-hosted auth)
    const headers = new Headers(init?.headers || {});
    headers.set("X-API-Key", MEM0_API_KEY);
    // Keep Authorization header too (official sets Token ${apiKey})

    return originalFetch(targetUrl, {
      ...init,
      headers,
    });
  };
}

// Export empty plugin — the patching happens at module load time via the fetch override
export default {};
