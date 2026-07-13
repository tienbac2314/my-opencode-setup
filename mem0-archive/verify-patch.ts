/**
 * verify-patch.ts
 *
 * Self-host patch verification tool for OpenCode.
 *
 * Run this script to verify that `mem0-selfhost-patch.ts` successfully
 * intercepts Cloud API fetch requests and routes them to your self-hosted
 * VPS Mem0 server.
 *
 * Execution:
 *   bun verify-patch.ts
 */

import './mem0-selfhost-patch.ts';

const MEM0_HOST = process.env.MEM0_HOST || process.env.MEM0_BASE_URL;
const MEM0_API_KEY = process.env.MEM0_API_KEY;

if (!MEM0_HOST || !MEM0_API_KEY) {
  console.error("ERROR: MEM0_HOST and MEM0_API_KEY environment variables must be defined.");
  process.exit(1);
}

console.log("=== Mem0 Self-Host Fetch Interceptor Verification ===");
console.log("Target VPS Host:", MEM0_HOST);
console.log("");

async function run() {
  try {
    // 1. Verify /v1/ping/ mock routing
    console.log("1. Testing mocked endpoint: GET https://api.mem0.ai/v1/ping/");
    const pingRes = await fetch("https://api.mem0.ai/v1/ping/");
    const pingData = await pingRes.json();
    console.log("   Mocked Response:", JSON.stringify(pingData, null, 2));

    if (pingData.status !== "ok" || pingData.orgId !== "self-hosted") {
      throw new Error("Mocked /v1/ping/ response is incorrect.");
    }
    console.log("   -> /v1/ping/ mock OK.");
    console.log("");

    // 2. Verify /v1/organizations/.../projects/... mock routing
    console.log("2. Testing mocked endpoint: GET https://api.mem0.ai/v1/organizations/org/projects/proj/");
    const projRes = await fetch("https://api.mem0.ai/v1/organizations/org/projects/proj/");
    const projData = await projRes.json();
    console.log("   Mocked Response:", JSON.stringify(projData, null, 2));

    if (!Array.isArray(projData.customCategories)) {
      throw new Error("Mocked projects endpoint response is incorrect.");
    }
    console.log("   -> Projects endpoint mock OK.");
    console.log("");

    // 3. Verify POST /search request routing and VPS connectivity
    console.log("3. Testing rewritten search endpoint: POST https://api.mem0.ai/v3/memories/search/");
    const searchRes = await fetch("https://api.mem0.ai/v3/memories/search/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: "What coding languages do I like?",
        filters: { user_id: "verify_user_new" }
      })
    });
    
    if (!searchRes.ok) {
      const errorText = await searchRes.text();
      throw new Error(`Search request failed with status ${searchRes.status}: ${errorText}`);
    }

    const searchData = await searchRes.json();
    console.log("   Search Response from VPS:", JSON.stringify(searchData, null, 2));

    if (searchData.results) {
      console.log("   -> Search request routing and VPS connection OK.");
    } else {
      throw new Error("Search response from VPS did not contain a results array.");
    }
    console.log("");
    
    console.log("VERIFICATION SUCCESSFUL: Self-host patch works perfectly!");
    process.exit(0);
  } catch (error: any) {
    console.error("VERIFICATION FAILED:", error.message);
    process.exit(1);
  }
}

run();