# Tree corruption and recovery boundary

## Stable boundary

`d8fa757af2f97a640610fb00e32d4d811a255fab` was selected as last trusted tree. Later commits mixed valid migration intent with runtime regressions, incomplete repairs, generated artifacts, and documentation describing mutually incompatible states.

## Discarded lineage

Complete first-parent range from stable boundary to broken tip:

| Commit | Subject | Recovery assessment |
| --- | --- | --- |
| `5086f0803e1e5e2a8a0ffeda85957bab18908a01` | `feat(memory): support switching to SuperMemory client and server` | Useful migration intent; dual-backend state rejected |
| `bd5c2a57996f579d545096785ee5ac52aa0ce6d1` | `fix(memory): use native .NET directory delete for safe junction removal` | Useful Windows cleanup; coupled migration retained no runtime base |
| `490ed47467403ae1405a9d513dec80fd860721e1` | `chore(memory): archive legacy mem0 files, default configuration and bootstrap to supermemory` | Archive direction retained; intermediate loading rejected |
| `9306d2f57d943afd389543f528763076d51e267d` | `fix(discovery): skip models starting with opencode/ to prevent capture` | Valid model invariant reapplied |
| `89c2736fa384f8d87898f02d413299c4e6ee4d4f` | `fix(bootstrap): add missing npm plugin deps to package.json` | Dependency intent retained; later exact pins supersede |
| `2518bdaf8a21fa48d3b76c6a6763d2ca5935cf35` | `fix(bootstrap,sync): derive npm deps from opencode.jsonc plugin array` | Derivation idea retained with exact pin repair |
| `fc9ffcb84f9c77bcc5fb132debdfa3becf4e2ab1` | `feat: purge mem0, supermemory-only` | Single-memory rule retained; runtime not accepted wholesale |
| `b22c5f2b4cf22d764fca5feca61b3597b4ae3b7b` | `fix(codegraph-helper): add load guard, null-safe shell call` | Null-safety useful; global lifecycle guard unsafe pattern |
| `045b733afc6fc2c97ca6a1d5fe69ab6924c00125` | `docs(supermemory-setup): remove mem0 references, toggle script is deprecated` | Migration facts retained as history |
| `c9af533065e290c61e74ff047c18added1f32b36` | `fix(codegraph-helper): correct tool names for OpenCode v1.17.18` | Version-specific hook names retained |
| `b1c74333c99eb0398ce2743f5418989f31992bc1` | `fix(codegraph-helper): rm tool.execute.before throw — crashes desktop app` | Desktop non-crash invariant retained |
| `f153d95ec3ae3b71016e18cf4627db0896063d66` | `fix(codegraph-helper): return {} when no .codegraph — completely inert` | Indexed-repository gate retained |
| `a1ad4c7b1e87a58821ccb7eab345c81ee0c0f1ce` | `chore: restore rtk.ts with load guard + sync configs` | RTK restoration retained; guard ordering required more repair |
| `53c8e9e4f076299efb5a5f652649fa4d3ec7f971` | `fix(models-discovery): add missing export default` | Module-shape experiment superseded by verified named plugin contract |
| `4a889556b52400401b0ace48010fa3bedb84ea25` | `revert: restore all plugins to pre-session originals` | Broad revert discarded valid fixes and broke continuity |
| `c55ec586f447cd3937cfc2341cc86d3e629bdaa6` | `fix(plugins): critical native models capabilities patch` | Capability evidence retained; mixed plugin patch rejected |
| `913ac59b13f462a1942206568b122fbfbc02d6bf` | `fix(plugins): fix desktop app crashes and lazy-load tool calling on Electron` | Desktop cases retained; combined changes needed isolation |
| `a0a319111361ef9c71787bf97043b34845161442` | `fix(plugins): protect codegraph-helper and rtk from null shell $ in Electron` | Null-shell invariant retained |
| `264254ef12b06c2bdb7790e979053c9a57a44d08` | `fix(plugins): wrap opencode-supermemory package in local ESM plugin to resolve missing default export` | Supermemory adapter retained |
| `da2d4e27bbf7250225538889ac8504ced267f7cd` | `fix(lazy-load): parse and convert raw DSML XML tool calls to standard JSON tool calls` | DSML conversion retained; stream boundaries incomplete |
| `c286bb890666528fbdfed486f1851b1226a075b6` | `fix(lazy-load): enhance DSML parser with streaming boundary buffer and case-insensitive tool resolving` | Boundary work useful; standard SSE and finish path broken |

Useful intent existed in this range: Supermemory migration, Mem0 removal, lazy-load repairs, plugin configuration, and diagnostics. Combined tree was unsafe because load order, stream interception, lifecycle guards, and documentation had diverged.

## Recovery decision

Recovery rebuilt required behavior on stable boundary instead of reverting individual symptoms. This avoided hidden dependencies between corrupting commits. Useful history remains reachable without making broken files part of active branch.

## Archive

Archive branch points exactly at broken tip:

```powershell
git rev-parse archive/broken-docs-reference
# c286bb890666528fbdfed486f1851b1226a075b6
```

Inspect discarded file without switching branches:

```powershell
git show archive/broken-docs-reference:path/to/file
```

Do not merge archive branch into active tree. Cherry-pick only reviewed, isolated content.
