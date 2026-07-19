# Incident and Rejected-Approach Ledger

Purpose: preserve failures that shaped current contracts. This file is historical evidence, not current operating guidance.

| Incident or approach | Evidence | Resolution | Status |
|---|---|---|---|
| Triage-owned skill MCPs | `bccb45f` to `5669871` | Removed triage, commands, and numbered docs; MCP ownership moved to explicit config | Retired |
| Custom Explorer recursion | `8f39e5f`, `c3d92e7` | Denied recursive task calls, then removed custom Explorer | Fixed/retired |
| Unbounded model discovery | `3980648`, `38d565d` | Timeout, retries, preserve configured models | Fixed |
| Research modules exposed as agents | `75aa805`, later setup refactor | Move strategy files from agent discovery to `data/` | Fixed |
| Mem0 cloud/self-host API mismatch | `256f2de` through `28a0fcb` | Interceptor and fallback tools proved mismatch; later replaced by Supermemory | Retired |
| Mem0 silent writes from `app_id`/`scope` | `28a0fcb` | Strip cloud-only fields; migration away removed path | Retired |
| Dual memory ownership | `5086f08` through `fc9ffcb` | Establish Supermemory as sole persistent path | Fixed |
| CodeGraph crashes Desktop on missing shell/error throw | `b22c5f2`, `b1c7433`, `a0a3191` | Null-safe Desktop input; no throwing pre-hook | Fixed |
| CodeGraph starts outside indexed project | `f153d95`, `a55c657` | Require `.codegraph/codegraph.db` | Fixed |
| Broad revert erased useful fixes | `4a88955` | Rebuild from trusted baseline with isolated commits | Rejected approach |
| DSML buffering swallowed standard SSE | archive tip `c286bb8` | Classify after complete data; preserve finish/tool fragments | Fixed on active lineage |
| Process-global guard removed later session hooks | `c286bb8`, `03db0fd` | Separate one-time wrapping from per-init hook return | Fixed |
| Desktop plugin list hidden by project `plugin: []` | `18300f6` | Omit property; compare origins and configured list separately | Fixed |
| Supermemory package missing default export | `264254e` | Thin local ESM wrapper | Active patch boundary |
| Supermemory custom server receives cloud settings call | maintenance refactor patch | Restrict/catch cloud-only settings operation | Active patch boundary |
| Runtime update notifier erodes pins | targeted-update work, `3f91594` | Retire notifier; maintainer check/plan/apply | Fixed |
| OMO installer rewrites config or misses Bun | maintenance refactor | Temporary environment, restore tracked config, exact repin | Fixed locally |
| RTK resolves wrong Windows binary | `40c95a8` | Use user `PATH`; never probe/mutate System32 | Fixed |
| Goal sub-export silently loses tools | `7077428` and later investigation | Use root package spec; prove host exports | Underlying lesson retained |
| Goal TUI orphan text and stale state | `576e894`, `0e8b2e9` | Patch rendering, timer, persisted state | Package-level fixes; runtime disabled |
| Goal live lifecycle unreliable | `f6756a0` | Disable package/command until complete lifecycle passes | Intentionally disabled |
| Persistent Headroom provider requires synthetic namespace | `bf0fb94` to `be3ef35` | Replace with provider-neutral transport | Superseded |
| Isolated Headroom launcher excludes Desktop | `be3ef35` | Shared independent service and auto-discovered bridge | Superseded |
| Official Headroom wrapper mutates providers/models/MCP | `17389a2`, live findings before `5a24221` | Cleanup recognized state; stop using wrapper | Superseded |
| Scheduled Headroom console remains visible | `5a24221` | Hidden PowerShell host and redirected bounded logs | Fixed |
| Headroom and Supermemory both offer memory | `5a24221`, current decision record | Disable Headroom memory/context/tools/learning | Fixed ownership boundary |
| Headroom RTK label mistaken for proxy-side rewrite | upstream check, current record | Local RTK hook rewrites; proxy reads stats | Clarified |
| Cleanup deleted useful historical docs | `e661d8f` | Normalize deleted evidence into current history corpus | Fixed by reconstruction |
| OpenViking automatic defaults too broad | `0ab1042`, `bf57a31` | Tool-only isolated pilot proposed; no cutover | Research only |

## Recovery principles

1. Preserve provider/model identity across optional transports.
2. One subsystem owns each persistent concern: memory, MCP lifecycle, index watching, updates.
3. Repeated plugin initialization must remain functional.
4. Healthy CLI path does not prove Desktop behavior.
5. Exact version/source pins precede package patching.
6. Broken lineages remain readable through Git but never become active by convenience.
7. Migration requires rollback evidence, not only successful first use.
8. Historical docs label superseded commands so archaeology cannot become accidental operations.
