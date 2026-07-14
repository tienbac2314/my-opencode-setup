# Recovery validation

This historical note records the checks that proved the recovered repository worked. For commands that should be run today, use [setup.md](../../setup.md) and [pr.md](../../pr.md).

## Repository state

Active runtime is rebuilt from stable commit `d8fa757af2f97a640610fb00e32d4d811a255fab`. Broken tip remains reachable through `archive/broken-docs-reference`; it is not an ancestor of active runtime.

## Automated evidence

| Check | Result |
| --- | --- |
| Bun tests | 14 passed, 0 failed |
| Assertions | 42 |
| Lazy-load cases | 9 |
| Active plugin origins | 8 |
| Local plugin files | 6 |
| Repository-to-runtime plugin SHA-256 matches | 6 |
| Model inventory | 52 total |
| `9router/oc/*` models | 6 |
| Invalid `9router/opencode/*` models | 0 |
| Compaction reserve | 20,000 tokens |

Built local bundles were compared by hash before interface testing so TUI and Desktop loaded same restored plugin sources.

## Plugin lifecycle

| Component | Initialization | Execution | Completion evidence |
| --- | --- | --- | --- |
| Lazy load | Hook registered | Direct and streamed tool requests | Tool result returned; stream preserved |
| Supermemory | Adapter registered | Remote memory request | Response returned without Mem0 path |
| Model filter | Model transform registered | 9router inventory read | Only `9router/oc/*` aliases retained |
| RTK guard | Command hook registered | Wrapped command inspected | Allowed command completed |
| Tokens | Transform registered last | Context processed | Accounting retained after prior transforms |
| CodeGraph | Plugin available | Repository query executed | Symbol and call-path results returned |
| OMO Slim | Pinned package loaded | Agent/tool path invoked | Lifecycle completed |
| Update notifier | Pinned package loaded | Version check invoked | Non-blocking completion |

## Interfaces

CLI marker `CLI_LAZY_OK`, interactive TUI marker `TUI_LAZY_OK`, and Desktop marker `DESKTOP_LAZY_OK` each completed through `load_tool` followed by shell execution. Fresh-process launches verified plugin registration did not disappear after earlier initialization.

## Remote alignment

Oracle VPS checks verified `supermemory.service` and `cloudflared.service` active, Supermemory enabled, loopback HTTP 200, public HTTP 200, remote service reachability, and local endpoint configuration. Credentials remained outside tracked files.

## Adversarial review

Review probes covered split stream boundaries, empty terminal deltas, mixed-case tool names, malformed DSML, unknown tools, duplicate initialization, stale model aliases, updater pin erosion, and absent credentials.

## What Must Keep Working

- Standard provider streams are preserved.
- DSML rewrite occurs only after complete classification.
- Plugin lifecycle state is session-safe.
- Supermemory is sole memory path.
- Compatibility-sensitive packages stay pinned after bootstrap.
- Broken lineage remains inspectable but excluded from active tree.
