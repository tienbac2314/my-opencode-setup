# Local Patches

Purpose: record only differences this repository must preserve. Versions and source commits live in `config/components.json`.

| Component | Local change | Why | Verification | Remove when |
|---|---|---|---|---|
| Lazy loading | Exact `tienbac2314/opencode-lazy-loading` commit in `plugins/opencode-lazy-load.ts` | Request-local namespaced gateway, safe SSE/DSML conversion, schema-guided argument normalization, direct MCP routing, and Desktop reload behavior | 37 cases in `tests/opencode-lazy-load.test.ts` plus App/TUI tool calls | Original upstream includes the fork or passes every regression |
| Token source | `0-` filename prefix and `export const` TokensSourcePlugin | Must load before lazy loader for correct fetch wrapping order; named export for repeated-init test | `/tokens`, repeated-init test | Upstream preserves sort-order contract or provides equivalent init-order guarantee |
| RTK | Child-process fallback | Desktop may omit injected shell | bootstrap RTK tests, live rewrite | Upstream generated hook supports Desktop input without injected shell |
| Supermemory | Thin default module wrapper and self-host settings guard | Upstream exports named plugin only and calls cloud account settings endpoint on custom base URL | export-shape test, no-405 model call, CRUD lifecycle | Upstream exports default module and skips/catches settings update on custom base URL |
| Goal (disabled) | Dormant root package pin plus `patches/opencode-goal-plugin-0.1.24.patch` | OpenCode Goal tool and TUI integration remains broken after local fixes; setup no longer installs or loads plugin | manifest/config tests; historical renderer tests | Re-enable only after OpenCode integration passes live lifecycle checks |
| Models discovery | Custom local plugin | 9router inventory and fallback models | `tests/models-discovery.test.ts` | Replaced by supported provider discovery |
| CodeGraph helper | Custom local policy | Set MCP state bidirectionally from each workspace index and require CodeGraph-first search | `tests/codegraph-helper.test.ts` | Upstream offers equivalent workspace-aware integration |
| Headroom bridge and transport | Auto-discovered `plugins/headroom.ts`, hidden login proxy task, pinned source transport | `headroom-ai` 0.31.0 does not ship transparent transport for custom providers; official wrapper injects synthetic providers/models and persistent MCP entries | bridge fail-open tests, Desktop/CLI provider-model parity, service health, custom-provider live proof | Upstream ships a provider-neutral Desktop/CLI integration without config mutation |
| Deep Research | OpenCode metadata and strategy files outside agent discovery | Prevent strategy modules becoming fake `@` agents | research workflow and autocomplete check | Upstream supports OpenCode layout |

## Update rule

For copied upstream code:

1. Read base commit and target commit from manifest/update plan.
2. Compare upstream old→new and local→new.
3. Mark each local hunk as upstreamed, needed, or conflicting.
4. Never overwrite local file automatically.
5. Run focused test, then `pwsh ./maintain.ps1 verify`.

Package patches are applied by `scripts/apply-package-patches.ps1`. Verification fails when patch is missing or no longer matches installed package.
