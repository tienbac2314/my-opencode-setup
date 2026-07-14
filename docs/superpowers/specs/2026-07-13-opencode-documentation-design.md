# OpenCode Documentation System Design

This historical design explains how the current documentation set was organized. Read [README.md](../../../README.md) to enter the live documentation.

## Goal

Replace fragmented recovery notes with one zero-context documentation system covering architecture, plugin patch invariants, installation, current defects, legacy evidence, and chronological recovery evidence.

## Scope

- Rewrite `README.md` as primary system map and onboarding index.
- Create canonical root documents: `setup.md`, `pr.md`, and `knownbug.md`.
- Create ordered recovery evidence under `docs/debug-journey/`.
- Convert `docs/opencode-bugs-known.md` and `docs/supermemory-setup.md` into compatibility stubs.
- Preserve broken documentation lineage on `archive/broken-docs-reference` at commit `c286bb890666528fbdfed486f1851b1226a075b6`.
- Index documentation-bearing legacy commits with exact SHA, content value, invalid runtime assumptions, and retrieval commands.
- Leave runtime source and configuration behavior unchanged.

## Canonical File Architecture

| File | Responsibility |
|---|---|
| `README.md` | Architecture, execution flow, repository map, active-plugin matrix, verified state, canonical navigation |
| `setup.md` | Prerequisites, bootstrap, credentials, pinned dependencies, TUI/App startup, lifecycle verification, recovery diagnostics |
| `pr.md` | Local plugin patch ledger: upstream assumption, local divergence, invariant, minimal patch form, regression gate |
| `knownbug.md` | Current edge cases, operational rules, diagnosis, recovery, and legacy branch index |
| `docs/debug-journey/README.md` | Ordered recovery reading map and final-state summary |
| `docs/debug-journey/01-tree-corruption.md` | Broken lineage, stable boundary, safety references, selective rebuild rationale |
| `docs/debug-journey/02-lazy-load-failure.md` | SSE/DSML failure mechanics and repaired control flow |
| `docs/debug-journey/03-baseline-comparison.md` | `workathome\.config` comparison method, facts, and rejected assumptions |
| `docs/debug-journey/04-recovery-validation.md` | Unit, bundle, CLI, TUI, Desktop, plugin lifecycle, model, and VPS evidence |
| `docs/opencode-bugs-known.md` | Compatibility link to `../knownbug.md` |
| `docs/supermemory-setup.md` | Compatibility link to `../setup.md` Supermemory section |

## Evidence Authority

Claims must follow this precedence:

1. Current `master` source and regression tests.
2. Effective OpenCode configuration and pinned installed package versions.
3. Verified CLI, TUI, Desktop App, plugin lifecycle, and Oracle VPS behavior.
4. `C:\Users\bacnt\Desktop\workathome\.config` as bare provider/configuration baseline.
5. Broken lineage only as historical evidence.

Legacy text must never override current source. Historical claims must identify their commit and state whether behavior remains valid, was replaced, or is archive-only.

## Active Architecture Contract

- OpenCode auto-discovers local plugin files from `~/.config/opencode/plugins/`.
- Explicit plugin arrays contain pinned npm plugins only: `opencode-update-notifier@0.3.3` and `oh-my-opencode-slim@2.1.1`.
- Local plugin duplication through explicit config is invalid because it changes hook and fetch-wrapper order.
- `0-tokens-source.ts` loads before `lazy-load.ts` by filename order and observes the final reduced request body.
- `lazy-load.ts` exposes `load_tool`, removes built-in schemas at the request boundary, preserves MCP tools, converts DSML tool calls, preserves standard streamed tool calls, and resets per-turn state on terminal finish.
- `supermemory.ts` adapts named `SupermemoryPlugin` export from `opencode-supermemory@2.0.8` to OpenCode's default `{ id, server }` plugin contract.
- `models-discovery.js` excludes provider IDs beginning with `opencode/` before prefixing results with `9router/`.
- Bootstrap restores pinned OMO Slim and audited RTK plugin files after their installers mutate active configuration.
- Mem0 files under `mem0-archive/` are historical and never deploy.

## Patch Ledger Contract

Each `pr.md` section must contain:

1. Component and pinned version.
2. Upstream behavior or installer mutation.
3. Observable failure.
4. Local invariant.
5. Exact repository file and structural patch.
6. Minimal code or diff excerpt when omission would make the patch ambiguous.
7. Regression or lifecycle command.
8. Upgrade gate defining evidence required before removing the patch.

## Setup Contract

`setup.md` must let a new Windows engineer complete these operations without undocumented knowledge:

1. Install Git, PowerShell 7+, Bun, Node.js/npm, OpenCode, CodeGraph, RTK, and Vshell when remote checks are required.
2. Clone repository and run `bootstrap.ps1` with documented switches.
3. Create ignored provider and Supermemory credential files from tracked examples without exposing secrets.
4. Verify exact npm dependency pins and effective plugin origins.
5. Start TUI and Desktop App with explicit 9router model selection.
6. Execute lazy-load, token, model, CodeGraph, OMO, RTK, notifier, and Supermemory lifecycle checks.
7. Diagnose missing tools, duplicate plugins, model pollution, Desktop module failures, and remote memory failures.

## Legacy Preservation Contract

- Create `archive/broken-docs-reference` without switching working tree.
- Point branch at full broken tip `c286bb890666528fbdfed486f1851b1226a075b6`; all documentation-bearing ancestors remain reachable.
- Keep existing `codex/pre-cleanup-c286bb8` safety branch.
- Record full SHAs for documentation-bearing commits including Supermemory migration, Mem0 archive, bug notes, and recovery boundary.
- Provide read-only retrieval commands using `git show`, `git log`, and `git diff`.
- Mark broken branch non-deployable.

## Writing Rules

- Dense factual prose; no greetings, process narration, generic reassurance, or future-tense filler.
- Zero-context definitions before project-specific invariants.
- Byte-exact command, path, package, tool, hook, and error names.
- Relative repository links only.
- No live credentials, tokens, encrypted configuration, or local secret values.
- No duplicate canonical prose in compatibility files.
- Current and historical behavior separated explicitly.

## Verification Design

- Check every tracked relative Markdown link resolves to a tracked file or valid section target.
- Check all referenced files and `archive/broken-docs-reference` exist.
- Prove each indexed SHA is reachable from archive branch.
- Compare documented package pins with active `package.json` and effective configuration.
- Compare documented plugin list with effective `plugin_origins`.
- Run existing Bun tests and plugin bundles to prevent documentation from describing stale behavior.
- Scan for placeholders, stale active-Mem0 claims, secret-shaped strings, and conversational filler.
- Review setup sequence as a fresh-reader checklist from clone through App/TUI smoke tests.
- Run independent link and formatting audit after core writing.

## Completion Criteria

- Canonical target files and all five debug-journey files exist and cross-link correctly.
- Archive branch points to exact broken tip and protects every indexed commit.
- Every active plugin has architecture, patch, setup, validation, and known-edge coverage where applicable.
- Commands, versions, hook names, file paths, and lifecycle claims match current repository and runtime evidence.
- Working tree contains documentation-only changes plus branch reference; runtime files remain unchanged.
