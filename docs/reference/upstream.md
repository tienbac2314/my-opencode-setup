# Upstream Issue and PR Targets

Purpose: route each real upstream problem to the repository that owns it. Personal policy and custom plugins stay in [local patches](patches.md).

## `omarwaly-ai/opencode-lazy-loading`

Maintained proposal: [`tienbac2314/opencode-lazy-loading`](https://github.com/tienbac2314/opencode-lazy-loading), branch `fix/tool-call-compatibility`, pinned by `config/components.json`.

Problem: original upstream plugin loses or rewrites tool calls under OpenCode-prefixed names, split SSE chunks, text-encoded tool calls, model-produced string values for typed fields, and Desktop reloads.

Minimal PR sequence:

1. Preserve active `load_tool` wire name and resolve tool names case-insensitively.
2. Buffer split tool arguments without dropping content/reasoning deltas or finish events.
3. Parse text-encoded tool calls split across stream events.
4. Normalize model-produced argument values against captured JSON Schema at the common response path; never invent missing keys or aliases.
5. Add tests equivalent to `tests/opencode-lazy-load.test.ts`.

Non-goal: provider-specific model logic.

## `omarwaly-ai/OpenCode-tokens-source`

Upstream commit `004e35f37` already has the `_tsFetchWrapped` idempotent wrapper guard and returns hooks on every plugin init. No upstream PR needed.

Local-only differences:
- `0-` filename prefix for sort ordering (load before lazy-load)
- `export const TokensSourcePlugin` (for repeated-init test in `tests/plugin-wrappers.test.ts`)

## `rtk-ai/rtk`

Problem: generated OpenCode hook assumes `input.$` exists; Desktop-shaped input can omit shell. Upstream uses `which rtk` (Unix-only) for binary detection.

Minimal PR: fallback to `execFile` when injected shell is missing. Use `where` / `--version` for cross-platform rtk detection. Add Windows/Desktop tests. Do not copy repository-specific config.

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
- Headroom pinned source transport until the wheel ships its OpenCode transport;
- manifest/maintainer/setup scripts.
