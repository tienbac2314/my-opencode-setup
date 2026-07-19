# Architecture Evolution

Purpose: show how each subsystem reached current ownership boundaries. Historical mechanisms are descriptive, not instructions.

## Setup and updates

| Stage | Mechanism | Problem discovered | Durable outcome |
|---|---|---|---|
| Initial | Manual copies plus `bootstrap.ps1` | Repeated installers, mixed pins, Windows path issues | Setup must be idempotent |
| Expanded stack | Generated dependencies and updater plugin | Runtime updates, latest drift, broad rewrites | Updates must be operator-approved |
| Targeted scripts | `versions.env`, per-plugin scripts | Multiple authorities and duplicated logic | One manifest needed |
| Current | `setup.ps1`, `maintain.ps1`, `components.json` | No known boundary failure | Exact reviewed targets; check/plan/apply/verify separation |

## Plugin loading and lifecycle

Initial docs treated plugins as explicit config entries. Runtime investigation showed local files auto-discover, while explicit file entries duplicate hooks. Desktop can initialize a module repeatedly and can omit injected shell helpers.

Current invariants descend from July 13 recovery:

- local plugins exist only under active `plugins/`;
- npm plugins use exact config pins;
- every initialization returns hooks even when process-wide wrappers already exist;
- Desktop-shaped input cannot assume `input.$`;
- project config omits `plugin` instead of setting an empty array;
- origin count and repository/runtime hashes are verified separately.

## Lazy loading and token accounting

Repository moved from triage plus `opencode-lazy-loader` to Omar Waly's SSE-transforming lazy-load plugin. Failures accumulated around namespaced tool names, split arguments, raw DSML, terminal finish events, false gateway matches, and repeated initialization.

Archived `c286bb8` attempted DSML boundary buffering but could swallow standard SSE fragments. Recovery separated proven standard SSE, incomplete candidate data, and proven DSML. Later work added schema-guided normalization for model-produced strings without inventing keys.

Token source loads before lazy-load, wraps fetch once, and returns hooks on every initialization. MCP tools pass through unchanged.

## Models and providers

`models-discovery.js` began as 9router inventory discovery. It gained bounded retries, fallback preservation, namespace filtering, capability repair, module-shape fixes, and Headroom transport bypass for inventory calls.

Current rules:

- preserve configured OMO fallback models when discovery fails;
- reject polluted `9router/opencode/*` aliases;
- discover through original provider fetch, not Headroom chat transport;
- keep provider/model identity owned by OpenCode and 9router config.

## Agents, skills, and MCP ownership

Initial architecture embedded MCP definitions in browser, DevTools, and docs-fetcher skills and used triage to activate them. Custom Explorer caused recursive dispatch. Research strategy Markdown under agent paths appeared as selectable agents.

Current ownership:

- explicit OpenCode/OMO config owns MCP servers;
- skills do not hide independent MCP lifecycles;
- `agents/web-search.md` is real agent; strategies live under `data/`;
- Build remains default primary agent;
- OMO role permissions/models live in tracked OMO config;
- global runtime policy deploys from `config/AGENTS.md`; repository rules remain in root `AGENTS.md`.

## CodeGraph

CodeGraph started as globally enforced search plus edit reindex hooks. Desktop crashes and unindexed-folder errors drove narrowing:

- helper is inert without `.codegraph/codegraph.db`;
- broad search redirects only after indexed-workspace checks;
- exact file reads remain allowed;
- CodeGraph's MCP watcher owns updates;
- metadata-only `.codegraph/` does not count as an index.

## RTK

RTK policy oscillated between explicit agent instructions and hook ownership. Windows exposed path precedence and missing-shell issues. Current local plugin calls `rtk rewrite` using user `PATH` and supports Desktop input without injected shell.

Headroom's `Context Tool: rtk` label does not replace this hook. Upstream wrapper can install or instruct RTK; bare proxy reads `rtk gain` for statistics and does not compress tool results itself.

## Memory systems

### Mem0

Self-hosted Mem0 required a compatibility layer for ten cloud/self-host differences. Request rewriting and fallback tools demonstrated feasibility but created duplicate semantics and high maintenance cost.

### Supermemory

Migration first attempted dual backend, then established one-memory ownership. Local wrapper adapts missing default export; package patch suppresses cloud settings calls for custom self-host URLs. Server embedding configuration is retained separately.

### OpenViking research

OpenViking was evaluated as shared hierarchical context for OpenCode and Hermes. It offered first-party integrations, actor peers, `viking://` resources, and OVPack backup. Risks were maturity, operational complexity, automatic capture/recall defaults, CodeGraph overlap, and no direct Supermemory importer. Branch decision remains pilot-only.

### Current boundary

Supermemory alone owns persistent memory. Headroom memory/learning is disabled. OpenViking is not active.

## Headroom

Headroom passed through four designs:

1. Persistent `headroom` provider: simple but required special model namespace and did not own proxy lifecycle.
2. Isolated launcher: provider-neutral and config-safe, but CLI-only.
3. Official wrapper: upstream lifecycle, but synthetic providers/models, Headroom/Serena MCP state, and Desktop mismatch.
4. Shared hidden proxy plus auto-discovered bridge: current design; Desktop/TUI parity, fail-open, no config mutation.

## Goal

Goal integration exposed package-entrypoint, TUI rendering, persistence, and host-state problems. Root package spec was required; `/server` and `/tui` sub-specs could silently lose tools. TUI fixes covered timer reactivity, valid text rendering, persisted records, and hidden sidebar state. Live integration still failed reliability gates, so package and command remain dormant.

## Documentation

Documentation itself had three architectures:

1. numbered onboarding guides tied to triage;
2. debug journeys, plans, bug ledger, and archive trees during recovery;
3. minimal active docs plus Git-only history after cleanup.

Current structure adds normalized history: active instructions stay minimal, while timeline, architecture, incidents, decisions, and source index preserve why boundaries exist.
