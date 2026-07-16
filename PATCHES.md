# Local Patches

Purpose: record only differences this repository must preserve. Versions and source commits live in `config/components.json`.

| Component | Local change | Why | Verification | Remove when |
|---|---|---|---|---|
| Lazy loading | Maintained fork in `plugins/lazy-load.ts` | Namespaced tools, SSE chunking, DSML, schema capture, Desktop reload behavior | `tests/lazy-load.test.ts` plus App/TUI/CLI tool call | Upstream passes every local regression |
| Token source | `0-` filename prefix and `export const` TokensSourcePlugin | Must load before lazy loader for correct fetch wrapping order; named export for repeated-init test | `/tokens`, repeated-init test | Upstream preserves sort-order contract or provides equivalent init-order guarantee |
| RTK | Child-process fallback | Desktop may omit injected shell | bootstrap RTK tests, live rewrite | Upstream generated hook supports Desktop input without injected shell |
| Supermemory | Thin default module wrapper and self-host settings guard | Upstream exports named plugin only and calls cloud account settings endpoint on custom base URL | export-shape test, no-405 model call, CRUD lifecycle | Upstream exports default module and skips/catches settings update on custom base URL |
| Goal (disabled) | Dormant root package pin plus `patches/opencode-goal-plugin-0.1.24.patch` | OpenCode Goal tool and TUI integration remains broken after local fixes; setup no longer installs or loads plugin | manifest/config tests; historical renderer tests | Re-enable only after OpenCode integration passes live lifecycle checks |
| Models discovery | Custom local plugin | 9router inventory and fallback models | `tests/models-discovery.test.ts` | Replaced by supported provider discovery |
| CodeGraph helper | Custom local policy | Disable global MCP outside indexed workspaces and require CodeGraph-first search | `tests/codegraph-helper.test.ts` | Upstream offers equivalent workspace-aware integration |
| Headroom transport build | Pinned source build exported through `HEADROOM_OPENCODE_PLUGIN_PATH` | Official `headroom wrap opencode` owns lifecycle, but `headroom-ai` 0.31.0 wheel does not ship transparent OpenCode transport needed for custom providers | wrapper help/source inspection, cached plugin build, custom-provider live proof | Wheel ships OpenCode transport and official wrapper passes custom-provider tests without source checkout |
| Deep Research | OpenCode metadata and strategy files outside agent discovery | Prevent strategy modules becoming fake `@` agents | research workflow and autocomplete check | Upstream supports OpenCode layout |

## Update rule

For copied upstream code:

1. Read base commit and target commit from manifest/update plan.
2. Compare upstream old→new and local→new.
3. Mark each local hunk as upstreamed, needed, or conflicting.
4. Never overwrite local file automatically.
5. Run focused test, then `pwsh ./maintain.ps1 verify`.

Package patches are applied by `scripts/apply-package-patches.ps1`. Verification fails when patch is missing or no longer matches installed package.
