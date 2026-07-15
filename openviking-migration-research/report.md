# OpenViking Migration Deep Research

Generated from validated structured records. Current official sources are weighted above community claims.

## Contents

- [Hermes Agent OpenViking Integration](#hermes-agent-openviking-integration) — Installed official Hermes Agent v2026.7.7 at commit f9eca7e15f1c2bfe5194aae5aa489af53c0a1a23; bundled OpenViking provider metadata version 2.0.0.
- [Mem0](#mem0) — PyPI mem0ai 2.0.12; npm mem0ai 3.1.0 metadata checked; repository active July 2026.
- [OpenViking Core](#openviking-core) — Core release and PyPI version 0.4.9; latest GitHub release v0.4.9 published 2026-07-13.
- [OpenViking OpenCode Plugin](#openviking-opencode-plugin) — @openviking/opencode-plugin 0.2.2, published 2026-07-13; package source is examples/opencode-plugin on OpenViking main.
- [Supermemory](#supermemory) — OpenCode plugin 2.0.8. Core repository active in July 2026; current local self-host binary documentation is newer than the legacy 0.0.5 server previously used by this setup.

## Hermes Agent OpenViking Integration

### Identity and provenance

### Name

Hermes Agent OpenViking Integration

### Official Ownership

Bundled in the official NousResearch/hermes-agent repository under plugins/memory/openviking. The installed Hermes checkout points to that repository and includes provider code, plugin metadata, CLI setup, docs, and dedicated tests.

### Official Sources

- type: repository | url: https://github.com/NousResearch/hermes-agent | accessed: 2026-07-15
- type: provider source | url: https://github.com/NousResearch/hermes-agent/tree/main/plugins/memory/openviking | accessed: 2026-07-15
- type: Hermes docs | url: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/memory-providers.md | accessed: 2026-07-15
- type: local verified checkout | url: file:~/.hermes/hermes-agent | accessed: 2026-07-15

### Current Version Or Commit

Installed official Hermes Agent v2026.7.7 at commit f9eca7e15f1c2bfe5194aae5aa489af53c0a1a23; bundled OpenViking provider metadata version 2.0.0.

### License

Hermes Agent repository reports MIT. OpenViking server remains governed by its own AGPL-3.0 core license.

### Maturity Signals

Hermes repository has a large active user base and frequent releases. OpenViking provider has setup tests, provider unit tests, integration behavior tests, backup handling, and active fixes through July 2026 for recall, writes, shutdown draining, credential guards, and deletion.

### Architecture and data

### Product Focus

Native Hermes external memory provider connecting Hermes sessions and tools to a self-hosted or authenticated OpenViking server.

### Deployment Model

Provider is bundled with Hermes; user installs/runs OpenViking server separately. `hermes memory setup` selects openviking and can link to existing ovcli.conf. Environment/config lives in Hermes profile and OpenViking files.

### Memory And Retrieval Model

Implements full bidirectional MemoryProvider behavior: semantic search, tiered viking:// reads, browsing, explicit remember/forget, resource ingestion, automatic recall prefetch, session-managed extraction, and mirroring of successful Hermes memory additions.

### Storage And Model Dependencies

Hermes provider stores little durable data itself and delegates to OpenViking HTTP server. Server requires configured storage, embedding, and VLM/extraction models. Hermes backup code explicitly accounts for memory-provider state outside HERMES_HOME.

### Api And Tool Surface

Tools include viking_search, viking_read, viking_browse, viking_remember, viking_forget, and viking_add_resource. Provider uses HTTP endpoints, lifecycle hook on_session_end, memory sync, recall prefetch, and Hermes memory setup/config commands.

### Identity And Isolation

OPENVIKING_ACCOUNT and OPENVIKING_USER support trusted-mode tenant identity; OPENVIKING_AGENT defaults to hermes and is used as peer ID for peer-scoped memories. API-key mode lets server derive account/user while peer remains explicit.

### Security And Privacy

Provider handles API keys through Hermes environment/config, restricts env-file permissions in tests, guards local uploads against credential reads, narrows deletion to exact memory-file URIs, and validates reachability/auth/root access during setup.

### Integrations

### Opencode Integration

Not applicable inside Hermes, but can share one OpenViking server with official OpenCode plugin. Peer identity must differ unless deliberate shared recall is wanted.

### Hermes Integration

Native and first-party in Hermes Agent. Fact checked in official repository and installed source. Setup command is `hermes memory setup` with provider `openviking`.

### Automatic Capture And Recall

Supports session-managed extraction and automatic recall prefetch. Hermes built-in memory add is mirrored asynchronously after local success. Replace/remove are not mirrored because Hermes native entries lack stable OpenViking URI mapping.

### Repository And Knowledge Support

Provider can ingest resources and browse/search viking:// hierarchy. It does not itself index the current repository automatically; OpenViking resources or OpenCode plugin repo context can supply that capability.

### Operations

### Installation And Configuration

Requires OpenViking Python package/server and embedding plus VLM config. Run `hermes memory setup`, select openviking, and set endpoint/key/account/user/agent as appropriate. Default endpoint is http://127.0.0.1:1933.

### Backup Restore And Portability

Hermes backup code includes external memory-provider state, but OpenViking server data still requires OVPack/workspace backup. Hermes explicit memories should be verified in restored OpenViking deployment, not assumed covered by Hermes profile backup alone.

### Observability And Recovery

Hermes doctor/setup checks provider reachability and auth; provider has sync tracing, circuit/error handling, write-result validation, shutdown worker draining, and broad test coverage. Server health remains separately observable through OpenViking.

### Resource And Cost Profile

Hermes client overhead is HTTP calls and recall context. Main compute/cost remains OpenViking embedding/VLM/storage. Shared server amortizes operation across Hermes and OpenCode but increases contention and isolation importance.

### Migration assessment

### Strengths For This Repository

This is the strongest OpenViking argument: the user already runs Hermes and gets native support without custom repository code. A single server can become shared context infrastructure while each harness uses its official integration.

### Risks And Unknowns

Hermes and OpenCode plugins implement capture differently and can duplicate the same interaction if identities overlap. Hermes add mirroring does not mirror replace/remove. Backup boundaries span Hermes profile plus OpenViking server. Provider and server release compatibility must be tested.

### Data Migration Path

No Supermemory import is provided by Hermes. Configure Hermes against empty pilot account/user/peer first, validate, then import curated source memories server-side. Keep current Hermes provider unchanged until shared OpenViking server passes recovery tests.

### Acceptance Tests

- `hermes memory setup` recognizes openviking and writes secure config.
- viking_remember/search/read/browse/forget pass against pilot server.
- Hermes memory add mirrors exactly once.
- Hermes replace/remove limitation is documented and does not silently corrupt OpenViking.
- Hermes peer cannot recall OpenCode-only actor memories under actor scope.
- Hermes shutdown drains pending mirror writes.
- Hermes backup plus OVPack restore recovers usable memories.

### Recommendation

Use Hermes as an early pilot client after the OpenViking server itself is validated. Native support materially lowers integration risk, but use a dedicated hermes peer and actor-scoped recall.

### Confidence

High. Native support is confirmed in official and installed source, documentation, CLI configuration, plugin metadata, and tests.

### Evidence quality

### Source Quality Notes

Primary evidence is official Hermes source and installed checkout. No reliance on third-party integration claims.

### Uncertain fields

- exact compatibility matrix between Hermes provider 2.0.0 and future OpenViking server releases


## Mem0

### Identity and provenance

### Name

Mem0

### Official Ownership

Official mem0ai/mem0 repository, PyPI mem0ai package, npm mem0ai package, and official OpenCode plugin source under integrations/mem0-plugin.

### Official Sources

- type: repository | url: https://github.com/mem0ai/mem0 | accessed: 2026-07-15
- type: OSS docs | url: https://docs.mem0.ai/open-source/overview | accessed: 2026-07-15
- type: OpenCode docs | url: https://docs.mem0.ai/integrations/opencode | accessed: 2026-07-15
- type: OpenCode source | url: https://github.com/mem0ai/mem0/tree/main/integrations/mem0-plugin/.opencode-plugin | accessed: 2026-07-15
- type: package | url: https://pypi.org/project/mem0ai/ | accessed: 2026-07-15

### Current Version Or Commit

PyPI mem0ai 2.0.12; npm mem0ai 3.1.0 metadata checked; repository active July 2026.

### License

Core repository and official integration report Apache-2.0.

### Maturity Signals

Repository created 2023-06 with about 60.9k stars and 7.1k forks. Broad SDK/provider ecosystem, active 2026 releases, documented OSS/server/cloud modes, benchmarks, migration guides, and official OpenCode integration. Managed-platform benchmark results explicitly include proprietary optimizations not fully available in OSS.

### Architecture and data

### Product Focus

Personalized memory layer with extraction, semantic/BM25/entity retrieval, user/agent/app/run scoping, OSS library/server, and managed platform. Commercial cloud remains prominent, but self-hosting is real and documented.

### Deployment Model

In-process Python/TypeScript OSS library, Docker self-hosted server/dashboard with Postgres+pgvector, or managed platform. Hermes additionally supports platform, self-hosted server, and in-process OSS modes.

### Memory And Retrieval Model

ADD-oriented extraction, hash deduplication, vector/entity storage, semantic plus BM25 plus entity fusion, optional reranking, explicit update/delete, categories, metadata, and temporal attributes. User/agent/app/run dimensions provide scoping.

### Storage And Model Dependencies

OSS library defaults to OpenAI LLM/embeddings, local Qdrant, and SQLite history but supports many LLM/embedder/vector providers. Self-hosted server defaults to Postgres+pgvector. Local operation still requires configured model and embedding providers unless local equivalents are selected.

### Api And Tool Surface

Python/TypeScript SDKs, CLI, REST server, hosted MCP, official OpenCode plugin with nine native tools, lifecycle hooks, skills, automatic capture, project scope, consolidation/dream features, and export/import skills.

### Identity And Isolation

Platform and plugin use user_id, agent_id, app_id, and run_id. OpenCode defaults to project scope derived from git remote/root and supports session/global scope. Implicit-null filter semantics reduce accidental cross-scope results but require careful OR/wildcard use.

### Security And Privacy

Self-host server auth is enabled by default in current docs and supports API keys/audit logs. OSS mode keeps data under chosen stores. Managed integrations send data to Mem0 platform. Plugin requires persistent MEM0_API_KEY for platform mode.

### Integrations

### Opencode Integration

Official full OpenCode plugin exists with native SDK tools, hooks, and skills. However official OpenCode setup is platform/API-key centered; self-host compatibility of the full plugin needs source-level verification before use.

### Hermes Integration

Official Hermes Agent bundles Mem0 provider with platform, self-hosted HTTP server, and in-process OSS modes plus setup flags and explicit tools.

### Automatic Capture And Recall

Official OpenCode plugin searches at session start/before prompts, periodically captures learnings, injects context, captures errors/compaction state, and can auto-consolidate memories. Hermes provider supports provider-specific sync and tools.

### Repository And Knowledge Support

OpenCode plugin derives project app_id, imports project guidance, has coding categories, and captures tool/file context. It is not a unified resource filesystem and code retrieval database like OpenViking.

### Operations

### Installation And Configuration

OpenCode full plugin installs as @mem0/opencode-plugin and expects MEM0_API_KEY for platform. Self-host server uses Docker bootstrap. Hermes supports `hermes memory setup mem0` with platform/selfhosted/oss choices.

### Backup Restore And Portability

Managed platform offers export APIs/skills. Official plugin includes portable Markdown export/import. OSS/server storage can be backed up at database/vector-store level. Migration guides exist between Mem0 versions and OSS/platform, but no official OpenViking importer exists.

### Observability And Recovery

Self-host server includes dashboard, API keys, request audit log; plugin exposes health/stats skills and lifecycle diagnostics; async platform processing supports event status/webhooks. Operational burden depends on library, server, or cloud mode.

### Resource And Cost Profile

More configurable and potentially heavier than Supermemory local because user chooses LLM/embedder/vector components; server stack includes Postgres+pgvector. Platform removes operations at subscription cost. OSS quality may differ from proprietary managed benchmark stack.

### Migration assessment

### Strengths For This Repository

Mature ecosystem, Apache license, official OpenCode plugin, native Hermes provider, strong scoping, portable export/import skills, and multiple self-host modes. It is a credible alternative and should not be dismissed as cloud-only.

### Risks And Unknowns

Official OpenCode plugin appears platform-first; its large hook/skill surface can overlap current lazy loader and retired MCP-skill policy. Past repository Mem0 integration was complex and removed. OSS/server and platform behavior differ. Reintroducing it risks restoring old operational complexity.

### Data Migration Path

Mem0 has export/import tooling, but current source is Supermemory. Use Supermemory logical export, normalize to portable JSON/Markdown, and import either via Mem0 raw mode or OpenViking explicit writes. No direct reason to route through Mem0 for an OpenViking migration.

### Acceptance Tests

- Verify full OpenCode plugin against self-host endpoint rather than platform only.
- Confirm no duplicate skill/MCP registrations with current setup.
- Validate project/session/global isolation and dangerous bulk-delete guard.
- Compare OSS and platform recall quality without using vendor-only benchmark claims.
- Test Hermes platform, self-host server, and OSS mode separately.

### Recommendation

Do not reintroduce for this migration. Keep as benchmark comparator. OpenViking better matches shared context-database goal; Supermemory is safer current rollback. Mem0 remains a strong option if mature memory-only ecosystem and Apache licensing outweigh prior integration complexity.

### Confidence

High for official ecosystem and deployment modes; medium for full OpenCode plugin self-host support; high that Hermes support is native.

### Evidence quality

### Source Quality Notes

Official repository/docs/source were used. Managed benchmark numbers explicitly do not represent OSS identically. No demographic assumptions were used.

### Uncertain fields

- comparative OSS recall quality
- full OpenCode plugin self-host endpoint support


## OpenViking Core

### Identity and provenance

### Name

OpenViking Core

### Official Ownership

Owned in the official GitHub repository volcengine/OpenViking. Repository, PyPI openviking package, website, and docs all identify OpenViking as a Volcengine project.

### Official Sources

- type: repository | url: https://github.com/volcengine/OpenViking | accessed: 2026-07-15
- type: website | url: https://www.openviking.ai/ | accessed: 2026-07-15
- type: documentation | url: https://docs.openviking.ai/ | accessed: 2026-07-15
- type: architecture | url: https://github.com/volcengine/OpenViking/blob/main/docs/en/concepts/01-architecture.md | accessed: 2026-07-15
- type: deployment | url: https://github.com/volcengine/OpenViking/blob/main/docs/en/guides/03-deployment.md | accessed: 2026-07-15
- type: authentication | url: https://github.com/volcengine/OpenViking/blob/main/docs/en/guides/04-authentication.md | accessed: 2026-07-15
- type: package | url: https://pypi.org/project/openviking/ | accessed: 2026-07-15

### Current Version Or Commit

Core release and PyPI version 0.4.9; latest GitHub release v0.4.9 published 2026-07-13.

### License

Core repository reports AGPL-3.0. Individual integration packages can declare different licenses; redistribution and service obligations must be reviewed per artifact.

### Maturity Signals

Repository created 2026-01-05, about six months old at research time. Approximately 26.8k GitHub stars, 2.1k forks, 313 open issues, frequent July 2026 updates, version 0.4.9, official Docker/Helm/systemd guidance, benchmarks, and extensive docs. High activity but early API/data-model evolution is evidenced by the 0.3-to-0.4 migration guide.

### Architecture and data

### Product Focus

Agent-native context database that unifies memory, resources, skills, sessions, repository context, and semantic retrieval. Open source self-hosting and HTTP/embedded operation are first-class; a commercial hosted OpenViking Personal offering also exists.

### Deployment Model

Embedded Python mode for single-process local use and standalone HTTP server for shared clients. Official deployment includes local process, systemd, Docker/Compose, Kubernetes/Helm, local or S3 content storage, and several vector backends. Public/non-loopback deployment requires authentication.

### Memory And Retrieval Model

Filesystem-style viking:// hierarchy with L0 abstract, L1 overview, and L2 content. Session commits archive conversation state and extract category-based memories. Retrieval combines intent analysis, hierarchical vector search, optional reranking, relations, exact grep/glob, and progressive reads.

### Storage And Model Dependencies

Content and index are separated: RAGFS/AGFS stores source content while vector backends store URI/vector metadata. Localfs, S3, local vector index, Qdrant, openGauss, cuVS, HTTP, and VikingDB paths are documented. Dense embedding is required for semantic retrieval; VLM powers semantic summaries and memory extraction. Local/Ollama/OpenAI-compatible and hosted providers are supported, but model operation remains an infrastructure and cost dependency.

### Api And Tool Surface

Python embedded/HTTP SDKs, Go and TypeScript HTTP SDKs, REST API, ov/openviking CLI, MCP endpoint/proxy, WebDAV, snapshots, sessions, resources, skills, search/find/grep/glob, task tracking, metrics, and OVPack export/import/backup/restore.

### Identity And Isolation

0.4 model separates account, user, peer, session, resource, memory, and skill. API-key mode derives account/user from user keys. Trusted mode accepts account/user headers only behind a trusted boundary. Actor peer headers and message peer_id support agent/workspace attribution. ROOT is not a tenant identity for ordinary data access.

### Security And Privacy

Supports API-key, trusted, and localhost-only dev auth; custom auth plugins; ROOT/ADMIN/USER roles; optional at-rest encryption with local key, Vault, or Volcengine KMS; API-key hashing; private-network ingestion guards; health/readiness endpoints; and optional Prometheus/diagnostics. Default dev mode is safe only on loopback, and Docker non-loopback startup requires a root key.

### Integrations

### Opencode Integration

Official integration exists in the same repository and is published separately as @openviking/opencode-plugin. Core server exposes APIs and MCP tools consumed by the plugin.

### Hermes Integration

Hermes Agent implements its own bundled OpenViking MemoryProvider against the official HTTP API. This is native Hermes support rather than a core OpenViking package.

### Automatic Capture And Recall

Core session API records messages and commits sessions for memory extraction. Exact automatic capture and recall behavior is controlled by each client integration, not forced globally by the server.

### Repository And Knowledge Support

Resources, code repositories, URLs, documents, images, skills, memories, and sessions share the viking:// namespace. Code parsing supports AST mode for major languages; semantic summaries, code search, outlines, and resource watches can overlap with CodeGraph's code-discovery role.

### Operations

### Installation And Configuration

Requires Python >=3.10. Recommended first run is openviking-server init followed by doctor. Server config is ~/.openviking/ov.conf; clients use ~/.openviking/ovcli.conf. A usable deployment needs storage, embedding, optional VLM/query planner/reranker, auth, and service lifecycle configuration.

### Backup Restore And Portability

PackService and API provide OVPack export/import and privileged backup/restore. Snapshots can commit and restore account trees. S3 multi-write backups are documented. Backups should include ov.conf, ovcli.conf where appropriate, workspace data, encryption keys, and tested OVPack restore.

### Observability And Recovery

Provides /health, /ready, /metrics, observer/debug/system endpoints, persistent background task records, queue recovery, process locks, transaction lock expiry, logs, doctor command, vector consistency checks, reindexing, snapshots, and OVPack restore.

### Resource And Cost Profile

Local storage can be lightweight, but semantic operation requires embedding and often VLM calls. Local models reduce subscription dependence at the cost of RAM/GPU/CPU and operations. Hosted APIs reduce infrastructure but add recurring model costs. Repository indexing and automatic extraction increase ingestion work compared with memory-only systems.

### Migration assessment

### Strengths For This Repository

One self-hosted server can serve both OpenCode and Hermes through official integrations; hierarchical memory/resources fit cross-project work; actor peers can separate opencode and hermes; official MCP tools can flow through lazy loading; OVPack offers a stronger backup primitive than the current plugin-specific setup.

### Risks And Unknowns

Core is young and recently changed identity model. Default integration settings can broaden recall across peers. AGPL core licensing needs review for intended deployment/redistribution. Model and storage operations are more complex than Supermemory local. No official Supermemory-to-OpenViking importer was found.

### Data Migration Path

No direct importer from Supermemory or Mem0 was found. Safe path is export/list source memories to immutable JSON, transform each item to explicit peer-scoped viking:// memory files or session messages, preserve source metadata, validate counts/content/search, then retain source system read-only until rollback window ends.

### Acceptance Tests

- Health and readiness survive restart.
- OVPack backup restores into an isolated empty deployment.
- OpenCode and Hermes write/read their own peer-scoped memories.
- actor-only recall prevents cross-workspace and cross-peer leakage.
- Embedding/VLM outage queues or fails safely without losing captured messages.
- CodeGraph and OpenViking repository retrieval do not duplicate or overwhelm context.
- Memory deletion, resource deletion, and reindex consistency are verified.
- Token and latency budgets are measured with automatic features off and on.

### Recommendation

Pilot. OpenViking is the strongest strategic fit for a shared self-hosted OpenCode plus Hermes context service, but do not replace Supermemory until isolation, backup/restore, data import, lazy-load compatibility, and operating cost are proven.

### Confidence

High for official architecture, deployment, auth, and current release facts; medium for production maturity and comparative recall quality; low for source-data migration quality until prototyped.

### Evidence quality

### Source Quality Notes

Architecture and behavior claims come from official source/docs/package metadata. GitHub activity metrics are time-sensitive. Product-quality claims and benchmark claims are vendor-authored and should not be treated as independent evidence.

### Uncertain fields

- Supermemory import fidelity
- comparative recall quality
- long-term API stability


## OpenViking OpenCode Plugin

### Identity and provenance

### Name

OpenViking OpenCode Plugin

### Official Ownership

The package manifest at volcengine/OpenViking/examples/opencode-plugin names @openviking/opencode-plugin and points its repository directory back to the same official repository. npm metadata matches this identity.

### Official Sources

- type: source | url: https://github.com/volcengine/OpenViking/tree/main/examples/opencode-plugin | accessed: 2026-07-15
- type: official docs | url: https://github.com/volcengine/OpenViking/blob/main/docs/en/agent-integrations/10-opencode.md | accessed: 2026-07-15
- type: npm | url: https://www.npmjs.com/package/@openviking/opencode-plugin | accessed: 2026-07-15
- type: manifest | url: https://github.com/volcengine/OpenViking/blob/main/examples/opencode-plugin/package.json | accessed: 2026-07-15

### Current Version Or Commit

@openviking/opencode-plugin 0.2.2, published 2026-07-13; package source is examples/opencode-plugin on OpenViking main.

### License

Package manifest declares Apache-2.0 while parent core repository reports AGPL-3.0. Exact license scope of bundled/copied shared modules should be reviewed before redistribution.

### Maturity Signals

Version 0.2.2 is very early. Package has official release workflow, source tests, server/proxy tests, setup script, English/Chinese install docs, and is described upstream as the only maintained OpenCode plugin example.

### Architecture and data

### Product Focus

Unified OpenCode integration for long-term memory, indexed repository context, session capture, automatic recall, and OpenViking MCP tools.

### Deployment Model

npm package loaded by OpenCode, connecting to an already-running OpenViking HTTP server. Source install is also documented. Plugin launches a local Node stdio MCP proxy that forwards to the configured server.

### Memory And Retrieval Model

Maps OpenCode sessions to OpenViking sessions, captures message parts, commits at compaction/dispose/deletion boundaries, queues retryable failures, injects recalled memories as synthetic text, and can inject indexed repository context into system prompts.

### Storage And Model Dependencies

Plugin persists local session mapping, logs, and pending queue under ~/.config/opencode/openviking by default; durable memories/resources live on OpenViking server, inheriting server storage and model dependencies.

### Api And Tool Surface

OpenCode hooks include config, event, chat.message, tool.execute.before, experimental.chat.system.transform, experimental.session.compacting, and dispose. Injected MCP provides recall/search/find/read/list/grep/glob/remember/forget/resource/code/health tools.

### Identity And Isolation

Credentials resolve from env or ovcli.conf. Workspace-derived peer is enabled by default. recallPeerScope defaults to all, allowing global/current/other workspace memories with penalties; actor mode limits recall to global plus current workspace. Explicit OPENVIKING_PEER_ID overrides derivation.

### Security And Privacy

Sends API key as Bearer token. Trusted account/user headers are optional only for trusted deployments. Captures user and assistant text and limited tool content when autoCapture is enabled. Local filesystem tools are blocked from viking:// URIs and redirected to MCP tools.

### Integrations

### Opencode Integration

First-party official plugin. Installs through OpenCode package plugin mechanism and injects its own MCP config without requiring a skill.

### Hermes Integration

Shares the same OpenViking server with Hermes but not the same client code. Peer and user identity must be designed consistently across both integrations.

### Automatic Capture And Recall

Defaults are autoCapture=true, captureAssistantTurns=true, autoRecall.enabled=true, tokenBudget=2000, repoContext.enabled=true, workspacePeer=true, and recallPeerScope=all. These defaults are too permissive for first pilot and should be explicitly overridden.

### Repository And Knowledge Support

Injects indexed repository resources into system prompt and exposes code search/outline/expand MCP tools. This may duplicate CodeGraph and increase context unless repoContext is disabled initially.

### Operations

### Installation And Configuration

Pin exact npm version in manifest; use ovcli.conf or OPENVIKING_* env vars for credentials; use ~/.config/opencode/openviking-config.json for behavior. Node.js 18+ and reachable OpenViking server are required.

### Backup Restore And Portability

Local plugin state is JSON/log/queue data and can be backed up separately. Durable data backup is server-side OVPack/snapshot. Plugin has a legacy session-map migration but no Supermemory importer.

### Observability And Recovery

Writes openviking-memory.log and openviking-session-state.json; checks /health; queues retryable capture/commit failures; replays pending work when healthy; preserves corrupted state file by renaming; emits OpenCode toasts for setup issues.

### Resource And Cost Profile

Adds health/recall calls and synthetic context to turns; capture and commit produce server VLM/embedding work; repository context can add prompt tokens. Defaults should be benchmarked against current token-source reports.

### Migration assessment

### Strengths For This Repository

Official package, no local wrapper expected, shared server with Hermes, native MCP injection, compaction-aware commits, retry queue, explicit token budgets, peer routing, and repository context controls.

### Risks And Unknowns

Early 0.2.x plugin, broad recall default, automatic capture default, MCP tool interaction with lazy loader unproven, repo context overlap with CodeGraph, no direct source-memory importer, and possible duplicate memory ingestion if Hermes/OpenCode share peer identities.

### Data Migration Path

Plugin does not migrate Supermemory. Migration should be a separate import utility using source list/export and OpenViking content/session APIs, with plugin disabled or autoCapture off during import.

### Acceptance Tests

- Exact package pin appears once in plugin origins.
- OpenViking MCP tools are captured and gated correctly by lazy-load.
- autoCapture=false and autoRecall=false produce no writes/injection in observation phase.
- actor recall scope excludes other workspace peer memories.
- Pending capture survives server outage and replays once.
- Compaction and process disposal commit once without duplicate messages.
- Token-source report quantifies recall and repo-context overhead.
- Uninstall removes package/MCP origin while preserving server data.

### Recommendation

Use in a staged pilot pinned to 0.2.2. Start with repoContext, autoCapture, and autoRecall disabled; validate explicit MCP tools first, then enable actor-scoped recall, then capture. Do not run alongside active Supermemory automatic injection in normal sessions.

### Confidence

High for package identity and source behavior; medium for OpenCode host compatibility at current versions; low for production reliability until live lifecycle tests pass.

### Evidence quality

### Source Quality Notes

Behavior claims were read directly from official package source and official docs. npm package identity was cross-checked against the in-repository package manifest.

### Uncertain fields

- OpenCode 1.18.0 compatibility under all lifecycle events
- duplicate capture behavior across harnesses
- lazy-load MCP interaction


## Supermemory

### Identity and provenance

### Name

Supermemory

### Official Ownership

Official core repository supermemoryai/supermemory and OpenCode integration repository supermemoryai/opencode-supermemory; npm package opencode-supermemory 2.0.8 points to the latter.

### Official Sources

- type: core repository | url: https://github.com/supermemoryai/supermemory | accessed: 2026-07-15
- type: OpenCode repository | url: https://github.com/supermemoryai/opencode-supermemory | accessed: 2026-07-15
- type: self-host docs | url: https://supermemory.ai/docs/self-hosting/overview | accessed: 2026-07-15
- type: npm | url: https://www.npmjs.com/package/opencode-supermemory | accessed: 2026-07-15
- type: installed package | url: file:~/.config/opencode/node_modules/opencode-supermemory | accessed: 2026-07-15

### Current Version Or Commit

OpenCode plugin 2.0.8. Core repository active in July 2026; current local self-host binary documentation is newer than the legacy 0.0.5 server previously used by this setup.

### License

Core and OpenCode plugin repositories report MIT.

### Maturity Signals

Core repository created 2024-02 with about 28.4k stars; OpenCode plugin about 1.4k stars; active updates. Current self-host docs advertise a single binary and full API, but the repository's installed OpenCode plugin still needed a local export wrapper and custom-base settings patch in this setup.

### Architecture and data

### Product Focus

Memory API and graph engine with hosted platform and a newly prominent local single-binary self-host product. Hosted platform adds connectors, managed proprietary extraction models, organization controls, scaling, and MCP.

### Deployment Model

Self-hosted local binary on documented macOS/Linux platforms, single process, embedded graph engine, local embeddings, optional local/remote LLM. Hosted and enterprise platforms use same API with additional services. Existing user setup runs a remote self-hosted server.

### Memory And Retrieval Model

Graph-oriented memory extraction, profiles, document/memory ingestion, hybrid semantic search, project/user containers, and OpenCode session/compaction context injection.

### Storage And Model Dependencies

Current local product embeds its graph engine and local default embeddings in one data directory. User supplies extraction model or local OpenAI-compatible endpoint. Hosted platform uses proprietary models and managed infrastructure.

### Api And Tool Surface

HTTP Memory API, TypeScript/Python SDKs, OpenCode tools for add/search/profile/list/forget, conversation ingest, context injection, privacy tags, and compaction support. Hosted platform also offers MCP/connectors.

### Identity And Isolation

Local server is documented as one machine, one org, one API key. OpenCode plugin scopes user and project data by container tags. Hosted/enterprise provides richer organization and key controls.

### Security And Privacy

Can run fully offline with local embeddings and local LLM. Local data lives in .supermemory or configured data directory; installer saves env secrets separately. Current repository patch prevents a cloud account settings call against custom self-host base URLs.

### Integrations

### Opencode Integration

Official opencode-supermemory package, but version 2.0.8 exports named SupermemoryPlugin and required a local default module wrapper. This setup also applies a self-host custom-base patch.

### Hermes Integration

Official Hermes Agent bundles a native Supermemory provider, but its documented requirements focus on a Supermemory API key and platform-style integration. It supports automatic recall/capture and explicit tools.

### Automatic Capture And Recall

OpenCode plugin injects user profile and relevant project/user memories and ingests sessions. Hermes provider supports auto_recall, auto_capture, full-session ingest, and profile context.

### Repository And Knowledge Support

OpenCode plugin uses project container tags for codebase knowledge, but it is primarily memory/document API rather than a hierarchical repository filesystem. Hosted connectors are platform-only; self-host supports file ingestion but not managed connectors.

### Operations

### Installation And Configuration

Current local docs offer curl/npx/bunx and a single server binary, but officially list macOS/Linux binary support. Existing Windows client can continue to use remote server. OpenCode package and self-host server need API URL/key config.

### Backup Restore And Portability

Local docs state all durable state lives in one data directory, making filesystem backup possible. API can list memories/documents for logical export. No official OpenViking import path exists; profiles and container metadata require explicit mapping.

### Observability And Recovery

Local gives server logs and a single data directory; hosted platform offers dashboard/analytics. OpenCode plugin has explicit lifecycle verifier in this repository. Existing patch addresses delayed unhandled HTTP 405 in self-host mode.

### Resource And Cost Profile

Simpler single-process operation than OpenViking. Local embeddings reduce cost; extraction still needs a model. Hosted platform offers better model tuning/connectors at subscription cost. Current remote legacy service may need upgrade to benefit from new local product.

### Migration assessment

### Strengths For This Repository

Already deployed, patched, lifecycle-tested, simpler memory-only operational model, known data, and working OpenCode integration. Lowest short-term migration risk.

### Risks And Unknowns

Current setup depends on local wrapper/patch and an older self-host server lineage. Local product is single-tenant/single-machine. Hosted features remain stronger than local. Cross-harness shared context is less structurally explicit than OpenViking peers/resources.

### Data Migration Path

Export/list current user and project memories plus profile data into immutable JSON. Preserve container tag, source, project, IDs, timestamps when available. Transform only curated data into OpenViking; keep original server/data directory read-only for rollback.

### Acceptance Tests

- Export all user/project memories and profile with stable counts.
- Backup current server data directory and prove restore separately.
- Current add/search/profile/list/forget remains green during pilot.
- No automatic Supermemory and OpenViking context injection in same production session.
- Imported facts retain user/project provenance and deletion mapping.

### Recommendation

Keep as rollback source during OpenViking pilot. Do not remove until OpenViking restore, isolation, recall quality, and data import pass. Consider upgrading current self-host server independently if migration is deferred.

### Confidence

High for current integration and new official self-host docs; medium for compatibility between the user's older server and current local binary; medium for export completeness.

### Evidence quality

### Source Quality Notes

Official repositories/docs and installed package were used. Vendor quality comparisons between local and proprietary hosted models are marketing claims, not independent benchmarks.

### Uncertain fields

- compatibility of legacy server data with current local binary
- complete logical export of profile graph
