# Local Patches

Purpose: record only differences this repository must preserve. Versions and source commits live in `config/components.json`.

| Component | Local change | Why | Verification | Remove when |
|---|---|---|---|---|
| Lazy loading | `tienbac2314/opencode-lazy-loading` base plus MCP-name discovery in `plugins/opencode-lazy-load.ts` | Request-local namespaced gateway, safe SSE/DSML conversion, schema-guided arguments, and exact runtime MCP names without eager schemas | 38 cases in `tests/opencode-lazy-load.test.ts` plus App/TUI tool calls | Maintained fork exposes MCP runtime names and passes every regression |
| OMO Slim | Remove test helper from package exports in installed, exact-cache, and runtime-channel copies | OpenCode invokes every exported function as a plugin; 2.2.6 exports `minimumExpectedToolCount` beside default | export-shape test, package-patch check, fresh health log | OMO exports only plugin entries or OpenCode filters non-plugin exports |
| Token source | `0-` filename prefix and `export const` TokensSourcePlugin | Must load before lazy loader for correct fetch wrapping order; named export for repeated-init test | `/tokens`, repeated-init test | Upstream preserves sort-order contract or provides equivalent init-order guarantee |
| RTK | Child-process fallback | Desktop may omit injected shell | bootstrap RTK tests, live rewrite | Upstream generated hook supports Desktop input without injected shell |
| Models discovery | Custom local plugin | 9router inventory, response-shape normalization, OpenCode capability mapping, manual override precedence, and fallback models | `tests/models-discovery.test.ts` | Replaced by supported provider discovery with equivalent metadata coverage |
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
