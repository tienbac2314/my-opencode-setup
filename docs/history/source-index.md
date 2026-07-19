# Historical Source Index

Purpose: make complete repository archaeology reproducible. Inventory covers all 104 unique commits reachable from local and remote refs on 2026-07-16. Subjects point to evidence; intermediate trees may be broken or superseded.

## Refs and boundaries

| Ref or boundary | Commit | Meaning |
|---|---|---|
| Active tip at reconstruction | `48f55648515a1d28cd1459c82463741ed5b7878a` | Structured docs before full-history reconstruction |
| Merged main (named master at reconstruction) | `a2d3ae4b74cccd45871b883555b3d696b129c429` | PR #2 merge |
| Trusted pre-recovery baseline | `d8fa757af2f97a640610fb00e32d4d811a255fab` | Stable provider/CodeGraph boundary |
| Broken archive tip | `c286bb890666528fbdfed486f1851b1226a075b6` | Useful but unsafe migration lineage |
| Restored lifecycle tip | `03db0fda4f03580217bb2f5ac5d467af8ac6e83a` | Recovery sequence completion |
| OpenViking research tip | `bf57a319b40b9fd5bd0bc2828c245ada3d8b1781` | Pilot recommendation, no runtime cutover |

## Complete reachable commit inventory

### 2026-07-08

| Commit | Subject |
|---|---|
| `22417d4` | Add RTK wrapper instruction to AGENTS.md with cleanup note for fresh agents |
| `5669871` | Purge opencode-triage: remove plugin, docs, commands; sync AGENTS.md |
| `71dbefb` | Add slash commands: /brainstorm, /docs, /browser, /debug |
| `8eccc14` | Trim RTK line from AGENTS.md (hook handles it); remove redundant agents doc |
| `8f39e5f` | Fix infinite subagent recursion: deny task on explorer, remove global task:allow |
| `91faf7c` | Inline RTK line in AGENTS.md (no section 6); cleanup note in bootstrap |
| `a96e704` | Update AGENTS.md with caveman style + triage; add RTK docs |
| `abd8b9e` | Revert: remove custom slash commands, keep only /triage |
| `b365f76` | Add bootstrap.ps1: fresh-agent setup with npm installs; fix RTK download URL; correct plugin sources |
| `bccb45f` | Initial: OpenCode dotfiles with triage + lazy-loader setup |
| `c3d92e7` | Remove custom explorer agent; use defaults |

### 2026-07-10

| Commit | Subject |
|---|---|
| `9373f5e` | docs: add scout subagent findings (experimental flag) |

### 2026-07-11

| Commit | Subject |
|---|---|
| `1e84b99` | fix(caveman): caveman commits, scope language to vi/en |
| `29a2aff` | docs: compress caveman mode, add cross-model research |
| `3659369` | docs: document primary_tools subagent bug and fix |
| `38d565d` | Fix models-discovery: block config hook with 3s timeout + 2 retries, preserve existing models on failure |
| `3980648` | Add models-discovery plugin to dotfiles repo; update bootstrap |
| `48d5e9f` | Merge remote-tracking branch 'origin/master' |
| `5a14547` | refactor: optimize configuration, drop NPM, fix Windows paths |
| `747a00e` | chore: drop scout section, drop language line |
| `75aa805` | feat: enhance skills and agents |

### 2026-07-12

| Commit | Subject |
|---|---|
| `256f2de` | fix(mem0): Integrate self-hosted Mem0 using runtime fetch interceptor patch |
| `3f88369` | feat(agents): Set 'build' as default, hide web-search modules |
| `7b46794` | refactor(mem0): Replace patched fork with fetch interceptor |
| `c3734ea` | refactor: Switch to omarwaly-ai plugins (lazy-loading and tokens-source) |
| `d7b7848` | feat: Complete setup overhaul - omo-slim, codegraph, mem0, auto-updater |

### 2026-07-13

| Commit | Subject |
|---|---|
| `03db0fd` | fix(config): preserve plugin lifecycle |
| `045b733` | docs(supermemory-setup): remove mem0 references, toggle script is deprecated |
| `058581c` | feat(9router): inject free models, sync config & docs |
| `18089e8` | docs: record opencode recovery plan |
| `18300f6` | fix(config): preserve desktop plugin list |
| `2518bda` | fix(bootstrap,sync): derive npm deps from opencode.jsonc plugin array |
| `264254e` | fix(plugins): wrap opencode-supermemory package in local ESM plugin to resolve missing default export |
| `28a0fcb` | docs: add full 10-bug evidence with curl traces and architectural decisions |
| `2f4d06f` | fix(config): normalize plugin loading |
| `490ed47` | chore(memory): archive legacy mem0 files, default configuration and bootstrap to supermemory |
| `4a88955` | revert: restore all plugins to pre-session originals |
| `5086f08` | feat(memory): support switching to SuperMemory client and server |
| `53c8e9e` | fix(models-discovery): add missing export default |
| `5b096b7` | fix(mem0): Guarantee tool registration, document upstream bugs |
| `751d216` | fix(compaction): raise keep.tokens, add compaction agent |
| `89c2736` | fix(bootstrap): add missing npm plugin deps to package.json |
| `913ac59` | fix(plugins): fix desktop app crashes and lazy-load tool calling on Electron |
| `9306d2f` | fix(discovery): skip models starting with opencode/ to prevent capture |
| `9994375` | docs: plan documentation rebuild |
| `a0a3191` | fix(plugins): protect codegraph-helper and rtk from null shell $ in Electron |
| `a1ad4c7` | chore: restore rtk.ts with load guard + sync configs |
| `a288e5a` | feat(config): add tui.json and update bootstrap |
| `b1c7433` | fix(codegraph-helper): rm tool.execute.before throw - crashes desktop app |
| `b22c5f2` | fix(codegraph-helper): add load guard, null-safe shell call |
| `b69bb62` | docs: document missing `tool` hook, lazy-load filtering bug, duplicate guards, update load order |
| `bd5c2a5` | fix(memory): use native .NET directory delete for safe junction removal |
| `c286bb8` | fix(lazy-load): enhance DSML parser with streaming boundary buffer and case-insensitive tool resolving |
| `c37c7fe` | docs: add full architecture doc for mem0 integration session |
| `c55ec58` | fix(plugins): critical native models capabilities patch |
| `c654121` | fix(lazy-load): preserve streamed tool calls |
| `c9af533` | fix(codegraph-helper): correct tool names for OpenCode v1.17.18 |
| `d70c083` | docs: document restored plugin system |
| `d8fa757` | feat(codegraph): enforce search & auto-update index via hooks |
| `da2d4e2` | fix(lazy-load): parse and convert raw DSML XML tool calls to standard JSON tool calls |
| `e72ff2c` | feat(config): rebuild plugin stack |
| `f11f98f` | chore: ignore local worktrees |
| `f153d95` | fix(codegraph-helper): return {} when no .codegraph - completely inert |
| `f6a5db8` | docs: design documentation system |
| `fc9ffcb` | feat: purge mem0, supermemory-only |

### 2026-07-14

| Commit | Subject |
|---|---|
| `04a1d7d` | docs: Document prevalentWare goal plugin and headroom isolated provider details |
| `1381b05` | docs(agents): Trim runtime guidance |
| `3c379a9` | docs: add plugin update and PR guide |
| `40c95a8` | fix(rtk): use user PATH on Windows |
| `4a31053` | fix(runtime): Avoid AG streams and WSL bash |
| `5498246` | fix(codegraph): Allow fallback searches |
| `576e894` | fix(goal): Restore TUI goal lifecycle |
| `5af2e08` | feat(goal): Add Goal plugin versioning and package dependency setup |
| `64d0f64` | fix(codegraph): Trust MCP file watcher |
| `7077428` | fix(goal): Resolve sub-export resolution for server and tui hook entrypoints |
| `88f5251` | docs(agents): Explain runtime plugins |
| `9e09a73` | docs: plan plugin maintenance guide |
| `9f36b82` | feat(omo): Update oh-my-opencode-slim to 2.2.1 and fix dependency parsing sub-exports |
| `a55c657` | fix(codegraph): Skip unindexed workspaces |
| `b1ed947` | docs: Record goal and Headroom fixes |
| `be3ef35` | feat(headroom): Add isolated interception |
| `bf0fb94` | feat(headroom): Add isolated Headroom provider config |
| `ddd1aa3` | feat(goal): Configure prevalentWare goal plugin and commands |
| `ed9ec16` | docs: Add detailed layout constraints and entrypoint notes for Goal plugin |
| `f64c0ff` | fix(models): Keep agent fallbacks valid |
| `fb75b25` | fix(config): add targeted plugin updates |

### 2026-07-15

| Commit | Subject |
|---|---|
| `0ab1042` | docs(memory): Research OpenViking migration |
| `0e8b2e9` | fix(goal): Show persisted active state |
| `17389a2` | fix(headroom): Use official OpenCode wrapper |
| `2151afd` | Merge pull request #1 from tienbac2314/refactor/unified-maintenance |
| `380f2b9` | docs: Replace setup and patch guides |
| `3f91594` | refactor(setup): Unify component maintenance |
| `7874040` | docs: Record maintenance refactor journey |
| `7fdc544` | fix(setup): Restore guidance and retire skills |
| `968985a` | fix(plugins): Restore runtime lifecycles |
| `bf57a31` | docs(memory): Align OpenViking plan versions |
| `e661d8f` | chore: Remove obsolete archives |
| `f0cff2a` | fix(goal): Clean package patch |
| `f6756a0` | fix(setup): Disable Goal and defer updates |

### 2026-07-16

| Commit | Subject |
|---|---|
| `48f5564` | docs: Structure integration records |
| `5a24221` | fix(headroom): Add hidden shared proxy |
| `5ec7ec9` | fix(tools): Normalize model arguments |
| `a2d3ae4` | Merge pull request #2 from tienbac2314/refactor/unified-maintenance |
| `e1dcc06` | fix(setup): Split global agent policy |

## Deleted-document map

| Historical material | Best commit/path | Preserved context |
|---|---|---|
| Initial numbered guides | `bccb45f:docs/01-quickstart.md` through `docs/08-troubleshooting.md` | Triage, skill MCPs, original onboarding |
| Caveman research | `29a2aff:docs/caveman-research.md` | Cross-model communication-policy experiment |
| Early bug ledger | `3659369:docs/opencode-bugs-known.md` | Subagent and runtime findings |
| Mem0 architecture | `28a0fcb:docs/mem0-integration-architecture.md` | Ten API bugs, interceptor design, evidence |
| Supermemory setup | `490ed47:docs/supermemory-setup.md` | Initial self-host migration |
| Broken-tree recovery | `d70c083:docs/debug-journey/` | Trusted boundary, failure, rebuild, validation |
| Known-bug ledger | `d70c083:knownbug.md` | Operational boundary inventory |
| Documentation design | `f6a5db8:docs/superpowers/specs/2026-07-13-opencode-documentation-design.md` | Authority and evidence model |
| Desktop plugin runbook | `18300f6:docs/superpowers/plans/2026-07-13-desktop-plugin-status-runbook.md` | Empty project plugin-array regression |
| Targeted update plans | `fb75b25:docs/superpowers/` | Pre-manifest update architecture |
| Goal/Headroom first design | `ddd1aa3:docs/superpowers/specs/2026-07-14-goal-and-headroom-integration-design.md` | Persistent-provider proposal |
| Isolated Headroom launcher | `b1ed947:docs/superpowers/` | Provider-neutral CLI interception |
| OpenViking comparison | `0ab1042:docs/research/openviking-memory-platform-comparison.md` | Memory-platform decision evidence |
| OpenViking migration plan | `bf57a31:docs/superpowers/plans/2026-07-15-openviking-pilot-migration.md` | Gated pilot and conditional cutover |

## Safe retrieval

Read old material without checking out unsafe branches:

```powershell
git show 28a0fcb:docs/mem0-integration-architecture.md
git show d70c083:docs/debug-journey/01-tree-corruption.md
git show b1ed947:docs/superpowers/plans/2026-07-14-isolated-headroom-launcher.md
git show 0ab1042:docs/research/openviking-memory-platform-comparison.md
git log --all --date=short --format='%ad %h %s'
```

Never merge `archive/broken-docs-reference`; inspect it and selectively reimplement reviewed ideas.
