# Upstream Issue and PR Targets

Purpose: route each real upstream problem to repository that owns it. Personal policy and custom plugins stay in [PATCHES.md](PATCHES.md).

## `omarwaly-ai/opencode-lazy-loading`

Problem: upstream plugin loses or rewrites tool calls under OpenCode-prefixed names, split SSE chunks, DSML text tool calls, and Desktop reloads.

Minimal PR sequence:

1. Preserve active `load_tool` wire name and resolve tool names case-insensitively.
2. Buffer split tool arguments without dropping content/reasoning deltas or finish events.
3. Parse DSML tool calls split across stream events.
4. Add tests equivalent to `tests/lazy-load.test.ts`.

Non-goal: provider-specific model logic.

## `omarwaly-ai/OpenCode-tokens-source`

Problem: repeated plugin initialization can install duplicate fetch wrappers or lose command registration depending on host reload behavior.

Minimal PR: add idempotent wrapper registration while returning command/tool hooks on every initialization. Include repeated-init test. Keep filename ordering local.

## `rtk-ai/rtk`

Problem: generated OpenCode hook assumes `input.$` exists; Desktop-shaped input can omit shell.

Minimal PR: fallback to `execFile`, support `bash` and `shell`, and add Windows/Desktop tests. Do not copy repository-specific config.

## `supermemoryai/opencode-supermemory`

Problems:

1. Package exports named `SupermemoryPlugin` but no default OpenCode module/function, requiring local wrapper.
2. Client constructor calls `settings.update()` for every base URL without awaiting/catching it. Self-hosted APIs may not implement cloud account settings PATCH, causing unhandled HTTP 405 after successful model calls.

Minimal PR: default-export valid OpenCode plugin module or function while retaining named export. Only call cloud account settings on official base URL, or capability-detect and catch failure. Add package import and custom-base-url tests. Do not change memory CRUD behavior.

## `prevalentWare/opencode-goal-plugin`

Problems:

1. Active sidebar nests conditional fragments inside `<text>`, causing OpenTUI `Orphan text error` and hiding Goal UI.
2. Sidebar memo does not consume timer signal, so new goal tool parts may not trigger rescan.
3. TUI only scans loaded chat tool parts, while server-owned Goal state is stored separately.
4. Persisted server records omit display-only fields expected by the TUI snapshot validator, so strict validation discards valid goals.

Config note: server and TUI configs must use root package spec (`@prevalentware/opencode-goal-plugin@VERSION`). OpenCode resolves `./server` or `./tui` for each host. `/server@VERSION` silently loads no server tools.

Documentation PR: add a short troubleshooting note that OpenCode persists sidebar visibility. Tell users to press `Ctrl+X`, then `B`, use a top-level session in a terminal wider than 120 columns for automatic display, and open the built-in `Plugins` command to confirm `local.goal-mode.tui` is active. A fresh plugin install can still inherit hidden sidebar state, so reinstalling is not a reliable UI test.

Minimal PR:

```diff
 const state = createMemo(() => {
+  nowSeconds()
   return goalStateFromSession(...)
 })
```

Render optional active details as one valid text value. Poll or subscribe to the server-owned state, normalize persisted records before validation, request a host rerender, and show the Goal block only while a non-closed Goal exists. Test tool-backed active, persisted active, empty, and cleared states. Local exact patch demonstrates the change.

## `Weizhena/Deep-Research-skills`

Problem: reference strategy Markdown under active `agents/` appears as fake OpenCode `@` agents.

Minimal PR: place strategy modules in non-agent data directory, update prompt paths, add OpenCode metadata and autocomplete check. Personal model choice is not part of PR.

## `alvinunreal/oh-my-opencode-slim`

Problem: installer may rewrite unrelated config and lose exact pins.

Minimal issue/PR: preserve comments, unrelated root plugin entries, TUI entries, and exact invoked package version. Include compact/multiline JSONC fixtures. Local maintainer repins until upstream guarantees this.

## `anomalyco/opencode`

Potential App issue: plugin panel can display only config-level entries while runtime uses resolved origins. Reproduce with project/global config layering and compare panel against `plugin_origins`. Fix belongs in App/core display, not local plugins.

## Local-only work

No upstream PR target:

- `plugins/models-discovery.js` unless published as standalone project;
- `plugins/codegraph-helper.ts` unless proposed as new CodeGraph integration;
- Headroom process isolation policy;
- manifest/maintainer/setup scripts.
