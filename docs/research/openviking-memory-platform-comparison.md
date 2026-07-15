# OpenViking Memory Platform Comparison

Date: 2026-07-15

Purpose: decide whether this OpenCode setup should migrate from Supermemory to the official OpenViking stack, with Mem0 as a comparator and Hermes Agent compatibility treated as a first-class requirement.

## Decision

Pilot OpenViking, but do not cut over yet.

OpenViking is the strongest strategic fit for this repository because one self-hosted context server can serve both OpenCode and Hermes through first-party integrations while also managing memories, resources, skills, sessions, and indexed repositories. Its official OpenCode package is `@openviking/opencode-plugin@0.2.2` from [`volcengine/OpenViking/examples/opencode-plugin`](https://github.com/volcengine/OpenViking/tree/main/examples/opencode-plugin). Hermes support is native in [`NousResearch/hermes-agent/plugins/memory/openviking`](https://github.com/NousResearch/hermes-agent/tree/main/plugins/memory/openviking).

Do not remove Supermemory until OpenViking passes backup/restore, actor isolation, import fidelity, lazy-load MCP compatibility, token-budget, outage-replay, and dual-client tests. OpenViking core is active and feature-rich, but it began in January 2026 and is still at `0.4.9`; its official OpenCode plugin is only `0.2.2`.

Developer nationality is not a useful selection criterion. Repository ownership, license, self-host architecture, integration quality, data control, maturity, and operational fit are measurable and drive this recommendation.

## Identity lock

Only these OpenViking artifacts are in scope:

- Core repository: <https://github.com/volcengine/OpenViking>
- Product site: <https://www.openviking.ai/>
- Documentation: <https://docs.openviking.ai/>
- Python package: `openviking==0.4.9`
- Official OpenCode package: `@openviking/opencode-plugin@0.2.2`
- Official OpenCode source directory: `examples/opencode-plugin/`

The package manifest in the official repository and npm metadata both point to `volcengine/OpenViking`, directory `examples/opencode-plugin`. Do not substitute similarly named third-party packages such as `openviking-opencode`, `openviking-opencode-plugin`, or a generic memory adapter.

## Hermes fact check

Hermes Agent natively supports OpenViking.

Evidence from official and installed `NousResearch/hermes-agent` source:

- bundled provider: `plugins/memory/openviking/`
- provider metadata version: `2.0.0`
- CLI path: `hermes memory setup`, select `openviking`
- config keys: `OPENVIKING_ENDPOINT`, `OPENVIKING_API_KEY`, `OPENVIKING_ACCOUNT`, `OPENVIKING_USER`, `OPENVIKING_AGENT`
- tools: `viking_search`, `viking_read`, `viking_browse`, `viking_remember`, `viking_forget`, `viking_add_resource`
- lifecycle behavior: recall prefetch, session extraction, add mirroring, shutdown draining, narrow deletion safety
- tests: setup, auth, path normalization, recall, writes, deletion, backup boundaries, and provider behavior

Installed Hermes checkout was `v2026.7.7` at `f9eca7e15f1c2bfe5194aae5aa489af53c0a1a23`. Official provider commits continued through July 2026. This is not a third-party skill shim.

Important limitation: Hermes mirrors native memory `add`, but does not mirror native `replace` or `remove` because those entries lack stable OpenViking URIs. Explicit `viking_forget` handles exact OpenViking memory files.

## Comparison

| Dimension | OpenViking | Supermemory | Mem0 |
|---|---|---|---|
| Core version checked | `0.4.9` | current core repo; OpenCode plugin `2.0.8` | PyPI `2.0.12`; npm metadata `3.1.0` |
| Core license | AGPL-3.0 | MIT | Apache-2.0 |
| OpenCode integration | Official package in core repo, `0.2.2`; hooks + MCP proxy | Official plugin, but current package needs local export wrapper and custom-base patch here | Official full plugin with native tools/hooks/skills; platform-first docs |
| Hermes integration | Native bundled provider | Native bundled provider | Native bundled provider, including platform/server/OSS modes |
| Self-host posture | Core architecture: embedded or HTTP, Docker, systemd, Helm, local/S3/multiple vector backends | Real local single binary; embedded graph + local embeddings; hosted platform adds connectors/MCP/proprietary models | Real OSS library and Docker server; broad provider/vector-store matrix; managed platform also prominent |
| Data model | Hierarchical `viking://` filesystem for memory/resource/skill/session, L0/L1/L2 | Memory graph, profiles, documents, user/project containers | Memories scoped by user/agent/app/run, vector/entity retrieval, categories/metadata |
| Backup/restore | OVPack export/import/backup/restore, snapshots, optional multi-write S3 | Backup one local data directory; logical API listing/export needed for migration | Platform export/import skills/APIs; OSS/server database and vector-store backup |
| Multi-tenant isolation | API-key or trusted mode; account/user/peer/session; actor peer view | Local is one machine/one org/one key; hosted/enterprise has richer controls | User/agent/app/run dimensions; server API keys; configurable stores |
| Operations | Highest: storage + embedding + VLM + auth + backup + service lifecycle | Lowest local complexity: single binary, embedded graph, local embeddings, model needed | Medium/high: library or Docker stack, model/embedder/vector store choices |
| Shared OpenCode + Hermes fit | Best: both official integrations target same server and peer model | Possible but container/tag semantics differ between integrations | Possible; both have official support, but prior local integration was complex |
| Repository context | Native resources/code ingestion and code MCP tools; overlaps CodeGraph | Project memories/documents, not a full context filesystem | Project scoping and capture, but not unified context filesystem |
| Migration from current Supermemory | No official importer found | Source system | No reason to route through Mem0; requires transformation too |

## Corrections to earlier assumptions

### Supermemory is not cloud-only

Current official docs describe a real self-hosted single binary with embedded graph engine, local default embeddings, optional local LLM, full API, and one movable data directory. Hosted/enterprise still adds proprietary models, connectors, organization controls, observability, and scaling. The current setup's local patch problem belongs to `opencode-supermemory@2.0.8` and its custom-base behavior, not proof that Supermemory lacks self-hosting.

### Mem0 is not cloud-only

Mem0 provides an OSS library and a Docker self-hosted server with dashboard/auth/audit logs, plus a managed platform. Hermes natively supports all three modes. Mem0 also has an official OpenCode plugin. However, its OpenCode docs and plugin onboarding are platform/API-key oriented, and its broad hook/skill surface conflicts with this repository's prior experience and retired skill policy.

### OpenViking is not automatically cheaper

OpenViking can run fully self-hosted, but useful semantic operation requires embeddings and usually a VLM. Running those locally costs hardware and operations; using APIs costs money. Its advantage is data/control architecture and integration fit, not zero cost.

## OpenViking architecture relevant here

OpenViking separates source content from semantic index:

- RAGFS/AGFS stores files, relations, L0/L1/L2 content, memories, resources, skills, and sessions.
- Vector storage holds URI/vector metadata and supports local, HTTP, Qdrant, openGauss, cuVS, and VikingDB paths.
- Session commits archive conversation history and extract memories.
- Pack APIs support export/import/backup/restore; snapshots support version restore.
- Auth modes are API key, trusted gateway, or localhost-only development.
- Roles are ROOT, ADMIN, USER; root key is management authority, not a normal tenant identity.
- At-rest encryption can use a local key, Vault, or Volcengine KMS.

For a personal VPS pilot, use API-key mode, one account/user key for normal client operations, a separate root key for administration, local storage first, and an OVPack backup copied off-host.

## Official OpenCode plugin behavior

The plugin is not just MCP registration. It:

- injects an `openviking` stdio MCP proxy;
- derives OpenViking sessions from OpenCode sessions;
- captures user and assistant message parts;
- commits on compaction, deletion, and disposal;
- queues retryable writes and replays them after recovery;
- injects recalled memories as synthetic message text;
- injects indexed repository context into system prompts;
- blocks local filesystem tools from misreading `viking://` URIs.

Default behavior is too broad for first activation:

```json
{
  "repoContext": { "enabled": true },
  "autoRecall": { "enabled": true, "tokenBudget": 2000 },
  "autoCapture": true,
  "captureAssistantTurns": true,
  "workspacePeer": true,
  "recallPeerScope": "all"
}
```

Pilot must explicitly begin with:

```json
{
  "enabled": true,
  "repoContext": { "enabled": false, "cacheTtlMs": 60000 },
  "autoRecall": { "enabled": false, "limit": 6, "scoreThreshold": 0.35, "maxContentChars": 500, "preferAbstract": true, "tokenBudget": 1000, "minQueryLength": 3 },
  "autoCapture": false,
  "captureAssistantTurns": false,
  "workspacePeer": true,
  "recallPeerScope": "actor",
  "noAutoInject": true,
  "debug": true
}
```

This permits explicit MCP tool testing before any automatic write or prompt injection.

## Interaction with current plugins

### Lazy loading

OpenViking tools arrive as MCP tools and current lazy-load tests intentionally pass MCP calls through unchanged. Live validation is still required because the OpenViking plugin injects MCP configuration during config resolution and starts a local proxy process. Required tests:

- tools appear exactly once;
- `openviking_health`, `openviking_search`, `openviking_read`, `openviking_remember`, and `openviking_forget` execute;
- no tool schemas disappear after Desktop reinitialization;
- token-source reports MCP schema/context overhead;
- outage/reconnect does not duplicate tools or captures.

### CodeGraph

OpenViking can ingest repositories and exposes code search/outline/expand, which overlaps CodeGraph. Initial pilot keeps `repoContext.enabled=false` and does not ingest code. After memory validation, compare:

- indexed symbol/call-path accuracy;
- update latency;
- context size;
- exact grep behavior;
- cross-repository retrieval;
- operational cost.

Do not remove CodeGraph in the memory migration.

### Supermemory

Tool-only OpenViking can coexist temporarily with current Supermemory, but automatic recall/capture from both systems must not run together in normal sessions. Parallel automatic injection would confound quality and duplicate data.

## Isolation design

Recommended initial identity:

| Client | Account/user | Peer |
|---|---|---|
| OpenCode | dedicated pilot user key | workspace-derived peer or explicit `opencode-<workspace>` |
| Hermes | same user only if shared personal memory is intended | `hermes` |

Set OpenCode `recallPeerScope="actor"`. Use distinct peers. Store deliberately global personal facts under user-level memory only after explicit tests. Never use trusted account/user headers over an untrusted public boundary.

## Data migration

No official Supermemory-to-OpenViking importer was found. Treat migration as ETL:

1. Back up current Supermemory server/data directory.
2. Export/list user memories, project memories, profiles, IDs, container tags, timestamps, metadata, and source.
3. Save immutable source JSON and checksums.
4. Define mapping:
   - user profile/preference → user memory;
   - project architecture/decision → peer-scoped project memory or resource;
   - raw document/code knowledge → resource, not memory;
   - uncertain/stale entries → quarantine file, not automatic import.
5. Import into isolated pilot account/user/peer with explicit `content/write` or session APIs.
6. Verify counts, sampled content, search, deletion, and provenance.
7. Keep Supermemory read-only through rollback window.

Profile graph fidelity is uncertain; raw facts and source metadata are safer than trying to reproduce proprietary graph state.

## Phased recommendation

1. **Server proof:** deploy `openviking==0.4.9`, API-key auth, local storage, OVPack backup/restore, no production clients.
2. **Hermes proof:** native provider with dedicated `hermes` peer; explicit tools and isolation only.
3. **OpenCode tool-only proof:** pin `@openviking/opencode-plugin@0.2.2`; disable all automatic features; test MCP through lazy loader.
4. **Actor-scoped recall:** enable recall only, compare quality/token/latency with Supermemory in controlled sessions.
5. **Capture proof:** enable capture for disposable sessions, test outage queue and deduplication.
6. **Migration rehearsal:** import a small curated export, restore from backup, verify rollback.
7. **Cutover decision:** disable Supermemory automatic context, keep read-only rollback, then remove package/wrapper/patch only after acceptance gates pass.

## Acceptance gates

- API-key tenant identity and actor peers proven.
- No cross-workspace or cross-client leakage.
- OVPack backup restores into an empty isolated server.
- OpenCode and Hermes explicit tool lifecycles pass.
- Lazy-load and token-source behavior remains correct.
- Server outage queues/replays without duplicate memory.
- Recall quality equals or exceeds current Supermemory sample set.
- Recall and repo context stay within measured token/latency budgets.
- Data import preserves source/provenance and supports deletion.
- CodeGraph remains authoritative until separate replacement evaluation.
- Supermemory rollback remains available for agreed observation window.

## Sources

### OpenViking

- <https://github.com/volcengine/OpenViking>
- <https://www.openviking.ai/>
- <https://docs.openviking.ai/>
- <https://github.com/volcengine/OpenViking/blob/main/docs/en/concepts/01-architecture.md>
- <https://github.com/volcengine/OpenViking/blob/main/docs/en/concepts/05-storage.md>
- <https://github.com/volcengine/OpenViking/blob/main/docs/en/guides/01-configuration.md>
- <https://github.com/volcengine/OpenViking/blob/main/docs/en/guides/03-deployment.md>
- <https://github.com/volcengine/OpenViking/blob/main/docs/en/guides/04-authentication.md>
- <https://github.com/volcengine/OpenViking/blob/main/docs/en/migration/01-user-peer-model.md>
- <https://github.com/volcengine/OpenViking/blob/main/docs/en/agent-integrations/10-opencode.md>
- <https://github.com/volcengine/OpenViking/tree/main/examples/opencode-plugin>
- <https://pypi.org/project/openviking/>

### Hermes

- <https://github.com/NousResearch/hermes-agent>
- <https://github.com/NousResearch/hermes-agent/tree/main/plugins/memory/openviking>
- <https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/memory-providers.md>

### Supermemory

- <https://github.com/supermemoryai/supermemory>
- <https://github.com/supermemoryai/opencode-supermemory>
- <https://supermemory.ai/docs/self-hosting/overview>
- <https://supermemory.ai/docs/self-hosting/quickstart>
- <https://supermemory.ai/docs/self-hosting/local-vs-enterprise>

### Mem0

- <https://github.com/mem0ai/mem0>
- <https://docs.mem0.ai/open-source/overview>
- <https://docs.mem0.ai/integrations/opencode>
- <https://github.com/mem0ai/mem0/tree/main/integrations/mem0-plugin>
- <https://pypi.org/project/mem0ai/>

Detailed field-by-field records and uncertainty markers live under `openviking-migration-research/`.
