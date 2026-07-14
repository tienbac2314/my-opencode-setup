# Local Patches

Purpose: record only differences this repository must preserve. Versions and source commits live in `config/components.json`.

| Component | Local change | Why | Verification | Remove when |
|---|---|---|---|---|
| Lazy loading | Maintained fork in `plugins/lazy-load.ts` | Namespaced tools, SSE chunking, DSML, schema capture, Desktop reload behavior | `tests/lazy-load.test.ts` plus App/TUI/CLI tool call | Upstream passes every local regression |
| Token source | `0-` filename and idempotent fetch wrapper | Must load before lazy loader and return hooks on every plugin reload | `/tokens`, repeated-init test | Upstream returns hooks on reload and preserves ordering contract |
| RTK | User-bin resolver and child-process fallback | Desktop may omit injected shell; stale System32 binary must not win | bootstrap RTK tests, live rewrite | Upstream generated hook supports Windows/Desktop |
| Supermemory | Thin default module wrapper and self-host settings guard | Upstream exports named plugin only and calls cloud account settings endpoint on custom base URL | export-shape test, no-405 model call, CRUD lifecycle | Upstream exports default module and skips/catches settings update on custom base URL |
| Goal | Root package pin plus `patches/opencode-goal-plugin-0.1.24.patch` on config and TUI cache copies | OpenCode resolves target exports only from root spec; `/server@VERSION` silently lost tools. Active sidebar also created invalid nested OpenTUI text nodes | package/cache checks, empty+active renderer, create/get/update lifecycle | Upstream fixes active text rendering, timer/event rescan, and empty state |
| Models discovery | Custom local plugin | 9router inventory and fallback models | `tests/models-discovery.test.ts` | Replaced by supported provider discovery |
| CodeGraph helper | Custom local policy | Disable global MCP outside indexed workspaces and require CodeGraph-first search | `tests/codegraph-helper.test.ts` | Upstream offers equivalent workspace-aware integration |
| Headroom launcher | Local process isolation | Optional interception without changing normal providers/App/TUI | launcher tests and two-provider live proof | Upstream provides equivalent isolated launcher |
| Deep Research | OpenCode metadata and strategy files outside agent discovery | Prevent strategy modules becoming fake `@` agents | research workflow and autocomplete check | Upstream supports OpenCode layout |

## Update rule

For copied upstream code:

1. Read base commit and target commit from manifest/update plan.
2. Compare upstream old→new and local→new.
3. Mark each local hunk as upstreamed, needed, or conflicting.
4. Never overwrite local file automatically.
5. Run focused test, then `pwsh ./maintain.ps1 verify`.

Package patches are applied by `scripts/apply-package-patches.ps1`. Verification fails when patch is missing or no longer matches installed package.
