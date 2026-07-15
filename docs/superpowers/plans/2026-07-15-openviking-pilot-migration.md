# OpenViking Pilot Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the official OpenViking server and OpenCode plugin as a safe shared memory backend for OpenCode and Hermes, then migrate curated Supermemory data and remove Supermemory only after all rollback gates pass.

**Architecture:** Keep normal OpenCode configuration and Supermemory unchanged during server and tool-only phases. Install exact OpenViking versions as optional manifest components, launch the official OpenCode package only through an isolated process-scoped config overlay, and use distinct actor peers for OpenCode and Hermes. Enable automatic recall and capture in separate phases; perform migration as export-transform-import with immutable source artifacts and an OVPack restore test before cutover.

**Tech Stack:** PowerShell 7, Bun/TypeScript, npm, Python `uv`, OpenViking `0.4.9`, `@openviking/opencode-plugin` `0.2.2`, OpenCode `1.18.0`, Hermes Agent native OpenViking provider, OpenViking HTTP API/MCP, Bun tests.

## Global Constraints

- Use only `https://github.com/volcengine/OpenViking` and official package `@openviking/opencode-plugin@0.2.2`.
- Pin OpenViking server to `openviking==0.4.9`; never use `latest`.
- Do not modify or remove current Supermemory package, wrapper, patch, credentials, or server until Task 9 acceptance gate passes.
- Do not enable `repoContext`, automatic recall, or automatic capture during tool-only pilot.
- Set `recallPeerScope` to `actor`; never accept default `all` in this deployment.
- Use separate peers: `hermes` for Hermes and workspace-derived `opencode-*` peers for OpenCode.
- Use API-key mode for remote/VPS deployment; never expose dev mode outside loopback.
- Keep CodeGraph active; OpenViking repository ingestion is a separate later evaluation.
- Preserve current lazy-load full-file fork under `plugins/lazy-load.ts`; it is not an npm package patch.
- Every task follows red-green TDD and ends in a focused commit.

---

## File structure

- `config/components.json`: optional exact OpenViking server/package components.
- `config/openviking-pilot.json`: non-secret safe behavior defaults for isolated OpenCode pilot.
- `maintain.ps1`: generic optional PyPI extras handling; no OpenViking-specific branching.
- `scripts/start-opencode-openviking.ps1`: process-isolated plugin launcher; preserves normal config and environment.
- `scripts/verify-openviking.ts`: HTTP and plugin lifecycle smoke verifier with disposable cleanup.
- `scripts/export-supermemory.ts`: immutable logical export from current Supermemory scopes.
- `scripts/import-openviking.ts`: validated dry-run/import mapping into peer-scoped OpenViking paths.
- `tests/openviking-pilot.test.ts`: manifest, launcher, safe defaults, lifecycle mocks, and migration mapping tests.
- `setup.md`, `README.md`, `PATCHES.md`, `TROUBLESHOOTING.md`: pilot and rollback operations.
- `docs/research/openviking-memory-platform-comparison.md`: decision evidence; update only when evidence changes.

### Task 1: Add optional exact OpenViking components

**Files:**
- Modify: `tests/maintain.test.ts`
- Modify: `config/components.json`
- Modify: `maintain.ps1`

**Interfaces:**
- Consumes: existing component manifest and `pypi` install branch.
- Produces: optional component IDs `openviking-server` and `openviking-opencode`; generic `extras`-aware PyPI package spec.

- [ ] **Step 1: Write failing manifest and installer tests**

Add assertions:

```ts
test("OpenViking pilot components use official exact artifacts", () => {
  const server = repositoryManifest.components.find((item: any) => item.id === "openviking-server")
  const plugin = repositoryManifest.components.find((item: any) => item.id === "openviking-opencode")
  expect(server).toMatchObject({ optional: true, kind: "pypi", package: "openviking", target: "0.4.9" })
  expect(plugin).toMatchObject({ optional: true, kind: "npm-local", package: "@openviking/opencode-plugin", target: "0.2.2" })
  expect(server.repository).toBe("https://github.com/volcengine/OpenViking")
  expect(plugin.repository).toBe("https://github.com/volcengine/OpenViking")
})

test("PyPI installer adds extras only when declared", () => {
  expect(maintainerSource).toContain('$extras = if ($item.extras)')
  expect(maintainerSource).toContain('$packageSpec = "$($item.package)$extras==$($item.target)"')
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `rtk bun test tests/maintain.test.ts`

Expected: FAIL because both components and generic extras handling are absent.

- [ ] **Step 3: Implement exact optional components and generic PyPI spec**

Add manifest entries:

```json
{
  "id": "openviking-server",
  "name": "OpenViking server",
  "kind": "pypi",
  "optional": true,
  "package": "openviking",
  "target": "0.4.9",
  "command": "openviking-server",
  "repository": "https://github.com/volcengine/OpenViking",
  "verify": "openviking-server doctor and OVPack restore"
},
{
  "id": "openviking-opencode",
  "name": "OpenViking OpenCode plugin",
  "kind": "npm-local",
  "optional": true,
  "package": "@openviking/opencode-plugin",
  "target": "0.2.2",
  "repository": "https://github.com/volcengine/OpenViking",
  "verify": "isolated explicit MCP lifecycle with automatic features disabled"
}
```

Replace hard-coded `[all]` logic in `pypi` branch:

```powershell
$extras = if ($item.extras) { "[$($item.extras)]" } else { "" }
$packageSpec = "$($item.package)$extras==$($item.target)"
& uv tool install --force $packageSpec
```

Add `"extras": "all"` to existing `headroom-python` component so its behavior remains unchanged.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `rtk bun test tests/maintain.test.ts`

Expected: PASS; normal setup still excludes both optional OpenViking components.

- [ ] **Step 5: Commit**

```bash
rtk git add config/components.json maintain.ps1 tests/maintain.test.ts
rtk git commit -m "feat(openviking): Add optional exact components" -m "Pin official OpenViking server and OpenCode package without changing normal setup. Generalize PyPI extras handling and preserve Headroom all-extra install."
```

### Task 2: Add safe tool-only pilot configuration

**Files:**
- Create: `config/openviking-pilot.json`
- Create: `tests/openviking-pilot.test.ts`

**Interfaces:**
- Produces: behavior-only JSON config read via `OPENVIKING_PLUGIN_CONFIG`; no credentials.

- [ ] **Step 1: Write failing safe-default test**

```ts
test("pilot config disables every automatic OpenViking path", () => {
  const config = JSON.parse(readFileSync(new URL("../config/openviking-pilot.json", import.meta.url), "utf8"))
  expect(config.enabled).toBe(true)
  expect(config.repoContext.enabled).toBe(false)
  expect(config.autoRecall.enabled).toBe(false)
  expect(config.autoCapture).toBe(false)
  expect(config.captureAssistantTurns).toBe(false)
  expect(config.recallPeerScope).toBe("actor")
  expect(config.noAutoInject).toBe(true)
  expect(config).not.toHaveProperty("apiKey")
  expect(config).not.toHaveProperty("endpoint")
})
```

- [ ] **Step 2: Run test and verify RED**

Run: `rtk bun test tests/openviking-pilot.test.ts`

Expected: FAIL with missing config file.

- [ ] **Step 3: Create behavior-only config**

```json
{
  "enabled": true,
  "timeoutMs": 30000,
  "repoContext": { "enabled": false, "cacheTtlMs": 60000 },
  "autoRecall": {
    "enabled": false,
    "limit": 6,
    "scoreThreshold": 0.35,
    "maxContentChars": 500,
    "preferAbstract": true,
    "tokenBudget": 1000,
    "minQueryLength": 3
  },
  "autoCapture": false,
  "captureAssistantTurns": false,
  "workspacePeer": true,
  "recallPeerScope": "actor",
  "noAutoInject": true,
  "debug": true
}
```

- [ ] **Step 4: Run test and verify GREEN**

Run: `rtk bun test tests/openviking-pilot.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add config/openviking-pilot.json tests/openviking-pilot.test.ts
rtk git commit -m "feat(openviking): Add safe pilot defaults" -m "Disable repository injection, automatic recall, automatic capture, and cross-peer recall for first activation."
```

### Task 3: Add isolated OpenCode pilot launcher

**Files:**
- Create: `scripts/start-opencode-openviking.ps1`
- Modify: `tests/openviking-pilot.test.ts`

**Interfaces:**
- Consumes: `OPENVIKING_API_KEY` or `~/.openviking/ovcli.conf`, pilot config, exact npm package.
- Produces: one OpenCode process with package appended through `OPENCODE_CONFIG_CONTENT`; restores prior environment.

- [ ] **Step 1: Write failing launcher-isolation test**

Test source and an isolated fake command invocation:

```ts
test("pilot launcher injects exact plugin without editing global config", () => {
  const source = readFileSync(new URL("../scripts/start-opencode-openviking.ps1", import.meta.url), "utf8")
  expect(source).toContain("@openviking/opencode-plugin@0.2.2")
  expect(source).toContain("OPENVIKING_PLUGIN_CONFIG")
  expect(source).toContain("OPENCODE_CONFIG_CONTENT")
  expect(source).toContain("Get-FileHash")
  expect(source).toContain("finally")
})
```

- [ ] **Step 2: Run test and verify RED**

Run: `rtk bun test tests/openviking-pilot.test.ts`

Expected: FAIL because launcher is absent.

- [ ] **Step 3: Implement process-isolated launcher**

Script requirements:

```powershell
[CmdletBinding()]
param(
  [string]$ConfigDir = [IO.Path]::Combine($HOME, ".config", "opencode"),
  [string]$PilotConfig = [IO.Path]::Combine($PSScriptRoot, "..", "config", "openviking-pilot.json"),
  [string]$OpenCodeArgsJson = "[]"
)

$tracked = @("opencode.jsonc", "tui.json", "AGENTS.md") | ForEach-Object { Join-Path $ConfigDir $_ }
$before = @{}; foreach ($path in $tracked) { $before[$path] = (Get-FileHash $path).Hash }
$resolved = ((& opencode debug config 2>$null) -join "`n") | ConvertFrom-Json
$resolved.plugin = @($resolved.plugin | Where-Object { $_ -notmatch '@openviking/opencode-plugin' }) + "@openviking/opencode-plugin@0.2.2"
$oldContent = $env:OPENCODE_CONFIG_CONTENT
$oldPluginConfig = $env:OPENVIKING_PLUGIN_CONFIG
try {
  $env:OPENVIKING_PLUGIN_CONFIG = (Resolve-Path $PilotConfig).Path
  $env:OPENCODE_CONFIG_CONTENT = $resolved | ConvertTo-Json -Compress -Depth 100
  $args = [string[]]($OpenCodeArgsJson | ConvertFrom-Json -NoEnumerate)
  & opencode @args
  exit $LASTEXITCODE
} finally {
  $env:OPENCODE_CONFIG_CONTENT = $oldContent
  $env:OPENVIKING_PLUGIN_CONFIG = $oldPluginConfig
  foreach ($path in $tracked) {
    if ((Get-FileHash $path).Hash -ne $before[$path]) { throw "Pilot changed tracked config: $path" }
  }
}
```

Also validate `OpenCodeArgsJson` is an array using same pattern as Headroom launcher.

- [ ] **Step 4: Run launcher tests and verify GREEN**

Run: `rtk bun test tests/openviking-pilot.test.ts tests/headroom-launcher.test.ts`

Expected: PASS; Headroom isolation remains unchanged.

- [ ] **Step 5: Commit**

```bash
rtk git add scripts/start-opencode-openviking.ps1 tests/openviking-pilot.test.ts
rtk git commit -m "feat(openviking): Add isolated pilot launcher" -m "Inject the exact official plugin for one process and prove global config hashes remain unchanged."
```

### Task 4: Prove server backup, auth, and explicit lifecycle

**Files:**
- Create: `scripts/verify-openviking.ts`
- Modify: `tests/openviking-pilot.test.ts`
- Modify: `setup.md`

**Interfaces:**
- Consumes: `OPENVIKING_ENDPOINT`, `OPENVIKING_API_KEY`; disposable actor peer.
- Produces: machine-readable lifecycle result and cleanup; no persistent production memory.

- [ ] **Step 1: Write failing verifier contract test**

```ts
test("OpenViking verifier covers health, memory, isolation, deletion, and backup", () => {
  const source = readFileSync(new URL("../scripts/verify-openviking.ts", import.meta.url), "utf8")
  for (const marker of ["/health", "/ready", "/api/v1/content/write", "/api/v1/search/find", "/api/v1/pack/backup", "/api/v1/pack/restore", "X-OpenViking-Actor-Peer"]) {
    expect(source).toContain(marker)
  }
  expect(source).toContain("finally")
})
```

- [ ] **Step 2: Run test and verify RED**

Run: `rtk bun test tests/openviking-pilot.test.ts`

Expected: FAIL because verifier is absent.

- [ ] **Step 3: Implement verifier with disposable marker and cleanup**

Use one `request(path, init)` helper that adds Bearer auth and actor peer. Sequence:

```ts
const marker = `ov-pilot-${Date.now()}-${crypto.randomUUID()}`
await request("/health")
await request("/ready")
await request("/api/v1/content/write", {
  method: "POST",
  body: JSON.stringify({ uri: `viking://user/memories/pilot/${marker}.md`, content: marker, mode: "create" }),
})
await request("/api/v1/search/find", {
  method: "POST",
  body: JSON.stringify({ query: marker, target_uri: "viking://user/memories/pilot" }),
})
```

In `finally`, delete exact URI. For backup/restore, use a disposable pilot subtree and isolated destination or separate test server; never restore over production tree. Exit nonzero on missing marker, cross-peer visibility, or failed cleanup.

- [ ] **Step 4: Document exact server pilot commands**

Add:

```powershell
pwsh ./maintain.ps1 apply -Component openviking-server,openviking-opencode
openviking-server init
openviking-server doctor
bun ./scripts/verify-openviking.ts
```

Document API-key mode, off-host OVPack backup, and that no normal setup installs optional components.

- [ ] **Step 5: Run mocked tests and live isolated server proof**

Run: `rtk bun test tests/openviking-pilot.test.ts`

Run after isolated server exists: `bun ./scripts/verify-openviking.ts`

Expected: tests PASS; live output confirms health, readiness, write, search, actor isolation, delete, backup, and isolated restore.

- [ ] **Step 6: Commit**

```bash
rtk git add scripts/verify-openviking.ts tests/openviking-pilot.test.ts setup.md
rtk git commit -m "test(openviking): Verify server lifecycle" -m "Cover health, auth, peer isolation, explicit memory lifecycle, cleanup, and isolated OVPack restore."
```

### Task 5: Prove native Hermes client against pilot server

**Files:**
- Create: `docs/openviking-hermes-pilot.md`
- Modify: `tests/openviking-pilot.test.ts`

**Interfaces:**
- Consumes: validated server from Task 4 and official Hermes provider.
- Produces: documented Hermes acceptance record with peer `hermes`.

- [ ] **Step 1: Write documentation contract test**

```ts
test("Hermes pilot uses native provider and isolated peer", () => {
  const doc = readFileSync(new URL("../docs/openviking-hermes-pilot.md", import.meta.url), "utf8")
  expect(doc).toContain("hermes memory setup")
  expect(doc).toContain("OPENVIKING_AGENT=hermes")
  expect(doc).toContain("viking_remember")
  expect(doc).toContain("viking_forget")
  expect(doc).toContain("OVPack")
})
```

- [ ] **Step 2: Run test and verify RED**

Run: `rtk bun test tests/openviking-pilot.test.ts`

Expected: FAIL because pilot guide is absent.

- [ ] **Step 3: Write exact Hermes pilot sequence**

Guide commands:

```powershell
hermes memory setup
hermes config set memory.provider openviking
```

Hermes profile environment must include endpoint, user/admin API key, and `OPENVIKING_AGENT=hermes`. Run explicit remember/search/read/browse/forget marker lifecycle. Verify an OpenCode actor peer cannot recall Hermes marker under actor scope. Record that Hermes native replace/remove are not mirrored and exact deletion uses `viking_forget`.

- [ ] **Step 4: Run test and live Hermes lifecycle**

Run: `rtk bun test tests/openviking-pilot.test.ts`

Run manually in disposable Hermes session and capture command/output summaries without secrets.

Expected: tools pass; no cross-peer recall.

- [ ] **Step 5: Commit**

```bash
rtk git add docs/openviking-hermes-pilot.md tests/openviking-pilot.test.ts
rtk git commit -m "docs(openviking): Add Hermes pilot gate" -m "Use Hermes native provider with dedicated peer and explicit lifecycle before OpenCode activation."
```

### Task 6: Prove OpenCode MCP through lazy loading

**Files:**
- Modify: `tests/lazy-load.test.ts`
- Modify: `tests/openviking-pilot.test.ts`
- Modify: `scripts/verify-openviking.ts`

**Interfaces:**
- Consumes: isolated launcher and server.
- Produces: exact tool-origin, lazy-load, Desktop reload, and token-overhead evidence.

- [ ] **Step 1: Add failing OpenViking MCP passthrough test**

```ts
test("passes OpenViking MCP tools without rewriting", async () => {
  const output = await transform("openviking-mcp", [toolCall("openviking_search", '{"query":"marker"}')])
  expect(emittedToolNames(output)).toEqual(["openviking_search"])
})
```

- [ ] **Step 2: Run focused test and verify behavior**

Run: `rtk bun test tests/lazy-load.test.ts`

Expected: PASS with current generic MCP policy. If it fails, fix only MCP classification; do not special-case OpenViking names.

- [ ] **Step 3: Extend live verifier for plugin/MCP lifecycle**

Verify exact package pin appears once, MCP origin appears once, and tools include health/search/read/remember/forget. Initialize plugin twice and prove MCP registration remains stable. Capture `/tokens` before and after tool-list activation.

- [ ] **Step 4: Run isolated CLI/TUI/Desktop proof**

Run launcher in CLI, TUI, and Desktop. Expected: explicit tools work, normal global config hashes unchanged, no automatic capture/recall, no duplicated MCP server, no missing `load_tool`.

- [ ] **Step 5: Commit**

```bash
rtk git add tests/lazy-load.test.ts tests/openviking-pilot.test.ts scripts/verify-openviking.ts
rtk git commit -m "test(openviking): Prove lazy-load compatibility" -m "Verify official MCP tools pass through unchanged and remain stable across OpenCode runtimes."
```

### Task 7: Enable actor-scoped recall, then disposable capture

**Files:**
- Create: `config/openviking-recall-pilot.json`
- Create: `config/openviking-capture-pilot.json`
- Modify: `tests/openviking-pilot.test.ts`
- Modify: `docs/openviking-hermes-pilot.md`

**Interfaces:**
- Produces: two explicit phase configs; no ambiguous toggle editing.

- [ ] **Step 1: Write failing phase-config tests**

```ts
test("recall and capture pilots enable one risk at a time", () => {
  const recall = JSON.parse(readFileSync(new URL("../config/openviking-recall-pilot.json", import.meta.url), "utf8"))
  const capture = JSON.parse(readFileSync(new URL("../config/openviking-capture-pilot.json", import.meta.url), "utf8"))
  expect(recall.autoRecall.enabled).toBe(true)
  expect(recall.autoCapture).toBe(false)
  expect(recall.recallPeerScope).toBe("actor")
  expect(capture.autoRecall.enabled).toBe(true)
  expect(capture.autoCapture).toBe(true)
  expect(capture.captureAssistantTurns).toBe(false)
  expect(capture.repoContext.enabled).toBe(false)
})
```

- [ ] **Step 2: Run test and verify RED**

Run: `rtk bun test tests/openviking-pilot.test.ts`

Expected: FAIL because phase configs are absent.

- [ ] **Step 3: Create explicit phase configs**

Copy tool-only config. Recall config changes only `autoRecall.enabled=true` and `noAutoInject=false`; keep 1000-token budget and actor scope. Capture config additionally sets `autoCapture=true`, `captureAssistantTurns=false`, `captureMode=semantic`, and keeps repository context off.

- [ ] **Step 4: Run controlled A/B sessions**

For each config, use same marker queries and record recall relevance, context tokens, latency, false positives, and cross-peer results. Capture phase must include server outage, queue persistence, restart replay, and duplicate-count check.

- [ ] **Step 5: Commit**

```bash
rtk git add config/openviking-recall-pilot.json config/openviking-capture-pilot.json tests/openviking-pilot.test.ts docs/openviking-hermes-pilot.md
rtk git commit -m "feat(openviking): Add gated automatic phases" -m "Separate actor-scoped recall from disposable capture so each risk has independent evidence."
```

### Task 8: Build immutable Supermemory export and OpenViking importer

**Files:**
- Create: `scripts/export-supermemory.ts`
- Create: `scripts/import-openviking.ts`
- Modify: `tests/openviking-pilot.test.ts`

**Interfaces:**
- Produces export schema version `1` with `source`, `scope`, `id`, `content`, `metadata`, `createdAt`, `containerTag`, checksum; importer defaults to dry-run.

- [ ] **Step 1: Write failing pure mapping tests**

```ts
test("migration mapping preserves provenance and quarantines ambiguous entries", async () => {
  const { mapMemory } = await import("../scripts/import-openviking")
  expect(mapMemory({ scope: "project", content: "architecture", id: "m1" }, "repo-peer")).toMatchObject({
    uri: expect.stringContaining("viking://user/peers/repo-peer/memories/project/"),
    source_id: "m1",
  })
  expect(mapMemory({ scope: "unknown", content: "x", id: "m2" }, "repo-peer").quarantine).toBe(true)
})
```

- [ ] **Step 2: Run test and verify RED**

Run: `rtk bun test tests/openviking-pilot.test.ts`

Expected: FAIL because mapping module is absent.

- [ ] **Step 3: Implement export with immutable checksum**

Export user profile, user memories, and project memories separately through current Supermemory client. Write JSON once with `createdAt`, source endpoint hash, counts, and SHA-256 sidecar. Never print credentials. Refuse overwrite unless `--force` is explicitly passed.

- [ ] **Step 4: Implement dry-run-first importer**

Default output is mapping report only. Require `--apply`, endpoint, API key, target user, and explicit peer. Preserve original ID/timestamp/container/scope under metadata. Quarantine empty, unknown-scope, duplicate, or oversized records. Use `content/write` with create mode and deterministic URI derived from source ID.

- [ ] **Step 5: Run unit tests and small rehearsal**

Run: `rtk bun test tests/openviking-pilot.test.ts`

Export current source, import ten curated disposable records into pilot peer, verify count/content/search/delete, then restore server from pre-import OVPack to prove rollback.

- [ ] **Step 6: Commit**

```bash
rtk git add scripts/export-supermemory.ts scripts/import-openviking.ts tests/openviking-pilot.test.ts
rtk git commit -m "feat(openviking): Add migration rehearsal tools" -m "Export immutable Supermemory records and require validated dry-run mapping before peer-scoped OpenViking import."
```

### Task 9: Conditional cutover and Supermemory retirement

**Files:**
- Modify: `config/components.json`
- Modify: `config/opencode.jsonc.example`
- Delete: `plugins/supermemory.ts`
- Delete: `patches/opencode-supermemory-2.0.8-selfhost.patch`
- Delete: `scripts/verify-supermemory.ts`
- Modify: `scripts/set-credentials.ps1`
- Modify: `README.md`
- Modify: `PATCHES.md`
- Modify: `TROUBLESHOOTING.md`
- Modify: `tests/maintain.test.ts`
- Modify: `tests/plugin-wrappers.test.ts`
- Modify: `tests/openviking-pilot.test.ts`

**Interfaces:**
- Consumes: signed acceptance record proving Tasks 4-8.
- Produces: normal setup loads exact OpenViking plugin and retires Supermemory while preserving export/rollback archive outside Git.

- [ ] **Step 1: Create cutover gate test before changing runtime**

```ts
test("normal runtime uses OpenViking only after cutover", () => {
  const manifest = JSON.parse(readFileSync(new URL("../config/components.json", import.meta.url), "utf8"))
  expect(manifest.components.some((item: any) => item.id === "supermemory")).toBe(false)
  expect(manifest.retired.npmLocal).toContain("opencode-supermemory")
  expect(manifest.components.find((item: any) => item.id === "openviking-opencode")).toMatchObject({ optional: false, target: "0.2.2" })
})
```

- [ ] **Step 2: Verify gate fails and review acceptance evidence**

Run: `rtk bun test tests/openviking-pilot.test.ts`

Expected: FAIL before cutover. Stop here unless every acceptance gate in research report has recorded PASS evidence and Supermemory export/backup has been restored successfully in isolation.

- [ ] **Step 3: Retire Supermemory and activate OpenViking**

Remove Supermemory component/wrapper/patch/verifier and add `opencode-supermemory` to retired npm packages. Make OpenViking plugin non-optional, add exact root package pin, increment expected server origins by one relative to pre-cutover runtime, deploy production behavior config with actor scope, and extend credential restore for OpenViking endpoint/key/peer without deleting archived Supermemory credentials.

- [ ] **Step 4: Run full verification and real setup**

Run:

```powershell
rtk bun test
pwsh ./setup.ps1 -SkipRtk -SkipCodeGraph
pwsh ./maintain.ps1 verify -Offline
opencode debug config
```

Expected: no Supermemory package/origin/wrapper/patch; exact OpenViking package once; expected plugin/origin count; all tests pass; credentials preserved.

- [ ] **Step 5: Run live OpenCode and Hermes acceptance again**

Repeat explicit tools, actor isolation, recall, capture, outage replay, token/latency measurement, backup, restore, and delete checks. Keep Supermemory server/data read-only through observation window.

- [ ] **Step 6: Commit**

```bash
rtk git add config/components.json config/opencode.jsonc.example scripts/set-credentials.ps1 README.md PATCHES.md TROUBLESHOOTING.md tests/maintain.test.ts tests/plugin-wrappers.test.ts tests/openviking-pilot.test.ts
rtk git add -u plugins/supermemory.ts patches/opencode-supermemory-2.0.8-selfhost.patch scripts/verify-supermemory.ts
rtk git commit -m "feat(memory): Cut over to OpenViking" -m "Activate the exact official plugin after backup, isolation, migration, recall, capture, and rollback gates pass. Retire Supermemory runtime artifacts while preserving external rollback data."
```

### Task 10: Final documentation and branch verification

**Files:**
- Modify: `docs/research/openviking-memory-platform-comparison.md`
- Modify: `docs/maintenance-refactor.md`
- Modify: `pr.md`
- Modify: `tests/maintain.test.ts`

**Interfaces:**
- Produces: dated evidence record, current source-of-truth links, and upstream issue routing.

- [ ] **Step 1: Add documentation consistency assertions**

Assert active docs contain exact OpenViking versions and no claim that migration is complete before Task 9. Include research and plan in broken-link checks.

- [ ] **Step 2: Update evidence with measured results**

Record server deployment mode, auth model, storage backend, embedding/VLM providers, backup checksum, restore result, peer isolation matrix, import counts, token deltas, latency deltas, and observation-window outcome. Do not include secrets.

- [ ] **Step 3: Run final repository and runtime gates**

Run:

```powershell
rtk bun test
pwsh ./maintain.ps1 verify -Offline
rtk git diff --check
rtk git status --short
```

Expected: all tests and verification pass; only intended documentation changes remain.

- [ ] **Step 4: Commit**

```bash
rtk git add docs/research/openviking-memory-platform-comparison.md docs/maintenance-refactor.md pr.md tests/maintain.test.ts
rtk git commit -m "docs(memory): Record OpenViking migration evidence" -m "Capture exact versions, deployment, isolation, migration, token, latency, backup, restore, and rollback results."
```

## Self-review result

- Spec coverage: official OpenViking identity, Hermes native support, Supermemory/Mem0 comparison, self-host operations, OpenCode/lazy-load/CodeGraph interaction, data migration, rollback, phased cutover, tests, docs, and exact versions are covered.
- Placeholder scan: no implementation placeholders remain; every task has exact files, interfaces, test commands, expected results, and commit commands.
- Type/interface consistency: component IDs, config paths, script names, peer policy, and migration schema are consistent across tasks.
- Scope boundary: Tasks 1-8 are reversible pilot work. Task 9 is explicitly conditional and must not execute without all prior evidence.
