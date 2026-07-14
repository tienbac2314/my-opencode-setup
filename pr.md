# Plugin Fixes and Update Notes

Use this document when you need to understand where a plugin came from, what this repository changed, how to update it, or what to include in an upstream pull request. For normal installation, use [setup.md](setup.md). For current problems, use [knownbug.md](knownbug.md).

## Quick Source Map

| Component | Where it came from | What we own |
|---|---|---|
| `plugins/lazy-load.ts` | [opencode-lazy-loading](https://github.com/omarwaly-ai/opencode-lazy-loading) | Upstream file plus our streaming, DSML, tool-name, and Desktop fixes |
| `plugins/0-tokens-source.ts` | [OpenCode-tokens-source](https://github.com/omarwaly-ai/OpenCode-tokens-source) | Upstream file; local filename and five-line load guard |
| `plugins/models-discovery.js` | Made in this repository | Whole file |
| `plugins/codegraph-helper.ts` | Made in this repository | Whole file |
| `plugins/rtk.ts` | Generated from [RTK OpenCode hook](https://github.com/rtk-ai/rtk/tree/master/hooks/opencode) | Windows/Desktop checks and OpenCode file-plugin wrapper |
| `plugins/supermemory.ts` | Small wrapper around [opencode-supermemory](https://github.com/supermemoryai/opencode-supermemory) | Wrapper only; package owns memory behavior |
| `oh-my-opencode-slim` | [Upstream npm package](https://github.com/alvinunreal/oh-my-opencode-slim) | Version pins, installer cleanup, and 9router preset |
| `opencode-update-notifier` | [Upstream npm package](https://github.com/tim-hilde/opencode-update-notifier) | Version pin and setup only |

Comparison date: 2026-07-14. Compared upstream commits:

| Project | Commit |
|---|---|
| opencode-lazy-loading | `11ee1745e34235c90ce3fbe3167a344096afbb83` |
| OpenCode-tokens-source | `004e35f371a8bf23b22d02c63819fc91e44bc0ef` |
| opencode-supermemory | `dd7cf6273b1440a55a2e448a166de04db9e334d3` |
| RTK | `5d32d0736f686b69d1e8b9dc45c007d4eb77a0a2` |

## Before Removing Any Local Fix

Do not remove a fix only because upstream published a new version. First prove all of these:

1. Upstream now handles the same case.
2. Only one plugin is updated in the test change.
3. Local and upstream files are compared before copying.
4. `rtk bun test` passes.
5. Changed local plugins bundle under `$HOME\.config\opencode`.
6. Resolved `plugin` and `plugin_origins` both contain the expected eight entries once each.
7. CLI, TUI, and Desktop complete a real `load_tool` shell call.
8. The changed plugin completes its own tests below.

Successful import or startup is not enough.

## Lazy Loading

### Where it came from

Current file started from `plugins/opencode-lazy-load.ts` in [omarwaly-ai/opencode-lazy-loading](https://github.com/omarwaly-ai/opencode-lazy-loading).

### Already present upstream

Fresh comparison shows upstream already handles these parts:

- Captures normal built-in schemas from the final request body.
- Buffers standard streamed tool-call names and JSON arguments across chunks.
- Keeps finish events and clears loaded tools after `finish_reason: "stop"`.
- Returns plugin hooks on repeated initialization instead of using a global return guard.
- Detects MCP entries separately and passes their direct calls through.

Do not open upstream PRs for those items. They remain in our tests because old repository changes once broke them.

### Our local changes beyond upstream

- Supports OpenCode names such as `opencode_load_tool`, not only exact `load_tool`.
- Keeps the actual load-tool name used by OpenCode.
- Moves captured MCP descriptions and schemas into the same on-demand tool map and pointer list as built-in tools.
- Routes unloaded MCP calls through the loader instead of always passing them through.
- Converts DeepSeek DSML text blocks into normal tool calls.
- Handles DSML markers split across stream chunks.
- Keeps ordinary `content` and `reasoning_content` around DSML blocks.
- Matches tool names without case mistakes.
- Exports `createSSETransform` so focused tests can run without a live provider.

Repository history also contains two fixes that current upstream already has: standard stream/finish preservation and repeated Desktop initialization. Keep their tests, but do not present them as missing upstream work.

### Must keep working

- Split standard JSON calls survive.
- Split DSML calls become normal tool calls.
- Text and reasoning are not lost.
- A tool must be loaded before direct use in each new user turn.
- A loaded tool works through the rest of the same turn.
- MCP tools follow the same rule.
- Stop and `[DONE]` events survive.
- Later Desktop sessions still register `load_tool`.

### How to update

1. Clone or fetch `omarwaly-ai/opencode-lazy-loading` into a temp folder.
2. Compare its `plugins/opencode-lazy-load.ts` with `plugins/lazy-load.ts`.
3. Keep every item under **Our local changes beyond upstream** unless new upstream code and tests cover it.
4. Copy reviewed hunks only. Do not replace the whole file.
5. Run the focused and live tests below, then `rtk bun test`.

### Tests to run

```powershell
rtk bun test tests/lazy-load.test.ts
rtk opencode run --model 9router/oc/deepseek-v4-flash-free "Use load_tool to load bash, then use bash to run: Write-Output PATCH_LAZY_OK. Return exact command output."
```

Expected focused result: 9 tests pass. Run the shell marker in CLI, TUI, and Desktop.

### Upstream PR plan

This is the main upstream PR candidate. Check open issues first, then keep each PR reviewable:

1. First PR: add OpenCode-prefixed load-tool names, active-name preservation, and case-insensitive tool resolution.
2. Second PR: move MCP tools into the same on-demand loading path and add request-body tests.
3. Third PR: add DSML conversion, surrounding text/reasoning preservation, exported transform helper, and split-boundary tests.

Do not send the full repository file as one unexplained replacement. Link each change to a failing stream example and its test.

## Token Source

### Where it came from

`plugins/0-tokens-source.ts` comes from `plugins/tokens-source.ts` in [omarwaly-ai/OpenCode-tokens-source](https://github.com/omarwaly-ai/OpenCode-tokens-source).

### Exact current difference

Fresh comparison found only two local differences:

1. Filename has `0-` prefix so it loads before lazy loading.
2. Plugin function has this five-line guard:

```ts
if ((globalThis as any).__tokens_source_loaded__) {
  return {}
}
(globalThis as any).__tokens_source_loaded__ = true
```

Everything else, including final request-body capture and `/tokens` reporting, is already in current upstream.

### Important warning

The filename prefix is local deployment setup and does not belong in an upstream PR. The five-line guard prevents duplicate hook registration, but it may also remove `/tokens` hooks when Desktop initializes the plugin again. Do not propose or remove it until a repeated-initialization test proves which behavior is correct.

### How to update

1. Fetch `omarwaly-ai/OpenCode-tokens-source`.
2. Compare upstream `plugins/tokens-source.ts` with local `plugins/0-tokens-source.ts`.
3. Keep local filename `0-tokens-source.ts`; load order depends on it.
4. Review the five-line guard separately. Never assume it belongs in a new upstream file.
5. Copy reviewed upstream changes, then run the flow below and `rtk bun test`.

### Tests to run

1. Start one persistent OpenCode process.
2. Complete one model call.
3. Run `/tokens` in the same process.
4. Check non-empty System Prompt, Tools, Messages, and API Actual sections.
5. Open a second Desktop session in the same process and prove `/tokens` still exists.

### Upstream PR plan

No PR needed for current upstream body-capture logic. A future PR is useful only if a repeated-init test shows upstream needs a safe registration guard. The test must come with the change.

## 9router Model Discovery

### Where it came from

`plugins/models-discovery.js` was made in this repository. Old README history already labels it `custom` and says only this repository maintains it.

### What it does

- Reads models from the 9router OpenAI-compatible endpoint.
- Registers image input support when provider data is incomplete.
- Adds six selected `oc/*` free models when missing.
- Ignores source IDs starting with `opencode/` so OpenCode does not create broken `9router/opencode/*` names.

### Tests to run

```powershell
$models = @(rtk opencode models 9router)
@($models | Where-Object { $_ -like '9router/oc/*' }).Count
@($models | Where-Object { $_ -like '9router/opencode/*' }).Count
```

Expected: six selected `9router/oc/*` entries and zero `9router/opencode/*` entries. Total model count can change when provider inventory changes.

### How to update

No upstream file exists. Edit `plugins/models-discovery.js` directly, add a focused provider-response test or probe, run the model counts above, and check Desktop model selection. Do not replace it through `update-plugins.ps1`.

### PR plan

No upstream file exists. Keep changes here. If publishing it as its own project later, include endpoint configuration, modality fallback, namespace filtering, and mocked provider tests.

## CodeGraph Helper

### Where it came from

`plugins/codegraph-helper.ts` was made in this repository to connect OpenCode editing hooks with the separately installed [CodeGraph](https://github.com/colbymchenry/codegraph).

### What it does

- Acts only when current workspace has `.codegraph/`.
- Redirects ordinary grep/glob use to CodeGraph in indexed repositories.
- Starts index refresh after supported write tools.
- Keeps missing shell runners and background failures from crashing Desktop.
- Does nothing in repositories without a CodeGraph index.

### Tests to run

```powershell
rtk codegraph status .
rtk codegraph explore "CodeGraphHelperPlugin"
```

Also test indexed and unindexed folders, one blocked search, one file edit, and a failed background runner.

### How to update

No upstream plugin file exists. Update `plugins/codegraph-helper.ts` only when OpenCode hook names or CodeGraph commands change. Check current OpenCode and CodeGraph docs first, then run indexed and unindexed tests above. `codegraph upgrade` updates the CLI, not this custom helper.

### PR plan

No matching upstream plugin file exists. This could become a new CodeGraph OpenCode integration proposal, not a patch against existing CodeGraph source. Keep OpenCode version assumptions and supported hook names in the proposal.

## RTK OpenCode Plugin

### Where it came from

`plugins/rtk.ts` is based on `hooks/opencode/rtk.ts` generated by [RTK](https://github.com/rtk-ai/rtk). Bootstrap runs RTK setup, then restores this repository copy because the generator can overwrite it.

### What we changed

- Accepts whole plugin input so missing `input.$` can be handled.
- Returns safely when Desktop does not provide Bun shell `$`.
- Uses Windows `where rtk` instead of Unix `which rtk`.
- Sets load guard only after shell and RTK checks pass.
- Leaves original command unchanged when rewrite fails.
- Adds default `{ id, server }` export for local file discovery.

### Tests to run

- Initialize once without `$`; result must be `{}` without throwing.
- Initialize later with valid `$`; hook must register.
- Rewrite an eligible shell command and compare its result with original command.
- Compare SHA-256 of repository and active RTK plugin after bootstrap.

### How to update

1. Fetch `rtk-ai/rtk` and compare `hooks/opencode/rtk.ts` with `plugins/rtk.ts`.
2. Copy useful generator changes without losing Windows `where`, null-shell handling, guard order, or default export.
3. Run RTK's local checks plus this repository's null-shell and rewrite tests.
4. Run bootstrap and confirm it restores repository `plugins/rtk.ts` after `rtk init -g --opencode`.

### Upstream PR plan

Useful upstream PR: make generated OpenCode hook work on Windows and Desktop. Include null-shell test, later-valid-init test, cross-platform binary lookup, default export compatibility, and rewrite-failure test.

## Supermemory Wrapper

### Where it came from

`plugins/supermemory.ts` is a small local wrapper around `opencode-supermemory@2.0.8`. Upstream exports `SupermemoryPlugin` as a named function. Our file exports OpenCode file-plugin metadata:

```ts
import type { Plugin } from "@opencode-ai/plugin"
import { SupermemoryPlugin } from "opencode-supermemory"

export default {
  id: "opencode-supermemory",
  server: SupermemoryPlugin as Plugin,
}
```

### Tests to run

```powershell
Push-Location "$HOME\.config\opencode"
rtk bun build plugins/supermemory.ts --outfile "$env:TEMP\opencode-supermemory-verify.js"
Pop-Location
```

Then add a unique marker, search it, read profile/list results, forget its exact ID, and prove it is gone.

### How to update

1. Read the target `opencode-supermemory` release and compare its exports with current `src/index.ts`.
2. Update exact version in `bootstrap.ps1`, `README.md`, `setup.md`, and every current-stack/package-pin/prompt entry in `pr.md` only after review.
3. Keep `plugins/supermemory.ts` unchanged unless upstream export shape changed.
4. Install exact target under active config:

```powershell
Push-Location "$HOME\.config\opencode"
npm install --save-exact "opencode-supermemory@TARGET_VERSION"
Pop-Location
```

5. Bundle wrapper and run full add/search/profile/list/forget/delete proof.

### Upstream PR plan

Ask upstream whether it wants an OpenCode local-file default export. Do not change memory API behavior in this wrapper. Remove wrapper only after direct package loading works in both TUI and Desktop and full self-hosted add/search/profile/list/forget flow passes.

## OMO Slim Setup

### Where it came from

`oh-my-opencode-slim` is an upstream npm plugin. Repository does not patch package source.

### What we changed around it

- Pins exact tested version in global and TUI plugin lists.
- Runs exact installer version in bootstrap.
- Restores repository 9router preset after installer runs.
- Restores tracked TUI config.
- Uses `scripts/pin-opencode-plugin.ps1` to update only root `plugin` array without touching comments, credentials, nested properties, or other arrays.

### Tests to run

```powershell
rtk bun test tests/bootstrap.test.ts
```

Current expected result: 7 bootstrap tests pass. Then check agent, tool, MCP, and command registration and run one bounded child-agent call.

### How to update

Example target below is `2.2.0`. Change it only after reading that release:

1. Replace `2.1.1` with target version in runtime pin locations:
   - `bootstrap.ps1` installer and pin-helper arguments
   - `config/opencode.jsonc.example`
   - `config/tui.json`
   - `tests/bootstrap.test.ts`
2. Update version statements and commands in `README.md`, `setup.md`, `pr.md`, and `knownbug.md` where present.
3. Run exact installer, never `@latest`:

```powershell
$Version = "2.2.0"
bunx "oh-my-opencode-slim@$Version" install --yes
```

4. Run updated bootstrap so repository preset, TUI config, root plugin pin, and audited RTK file are restored:

```powershell
.\bootstrap.ps1
```

5. Normalize active package exactly:

```powershell
Push-Location "$HOME\.config\opencode"
npm install --save-exact "oh-my-opencode-slim@$Version"
bun pm ls
Pop-Location
```

6. Run bootstrap tests, confirm both resolved plugin counts are eight, open Desktop Plugins three times, and run `ping all agents` plus one bounded child-agent call.

### Upstream issue or PR plan

Useful upstream request: installer should preserve exact version when invoked through an exact package spec and should not rewrite unrelated config. Include before/after JSONC examples. Repository pin helper remains needed until installer behavior is safe for comments, compact arrays, and nested `plugin` fields.

## Update Notifier

Package source is unchanged. Repository pins `opencode-update-notifier@0.3.3` so notification compares installed and published versions correctly.

Tests: initialize read-only, confirm pinned entry is detected, confirm registry check does not modify packages, and confirm malformed/unpinned entries are skipped. No upstream PR is currently needed.

### How to update

1. Read target release in `tim-hilde/opencode-update-notifier`.
2. Change exact pin in `bootstrap.ps1`, `config/opencode.jsonc.example`, `README.md`, `setup.md`, and every current-stack/package-pin/prompt entry in `pr.md`.
3. Install exact version with `npm install --save-exact "opencode-update-notifier@TARGET_VERSION"` under `$HOME\.config\opencode`.
4. Run read-only initialization and prove update check does not modify packages.

## Safe Update Steps for Changed Plugins

Update one component at a time. Never run broad updater first.

1. Start with clean worktree and new branch.
2. Read this component's source and tests.
3. Fetch upstream into a temp folder.
4. Compare old upstream, new upstream, and repository file.
5. List which local fixes upstream now includes.
6. Copy only reviewed changes or cherry-pick a small upstream commit.
7. Keep local fixes still needed.
8. Run focused test, then full `rtk bun test`.
9. Deploy through bootstrap only after repository tests pass.
10. Verify exact package pins, eight plugins, CLI/TUI/Desktop `load_tool`, and affected plugin flow.
11. Commit only this one update.

Do not use `update-plugins.ps1` for a real update. Its `@latest` and broad `npm update` paths can change several tested pieces at once. `-DryRun -Force` is inventory only.

## Prompt for a Future Update Agent

Copy this prompt into a new coding-agent task and replace only the target plugin and target version/commit:

```text
Work in C:\Users\bacnt\opencode-dotfiles.

Goal: update TARGET_PLUGIN from its current pinned/source version to TARGET_VERSION_OR_COMMIT without breaking lazy loading, Desktop plugin display, or Supermemory.

Read first:
- AGENTS.md
- README.md
- setup.md
- pr.md, especially TARGET_PLUGIN
- knownbug.md
- docs/debug-journey/README.md

Rules:
- Use RTK wrapper for shell commands when supported.
- If .codegraph exists, use codegraph explore before text search.
- Stop if worktree has unrelated changes that overlap target files.
- Never print or commit API keys, tokens, passwords, auth.json, supermemory.jsonc, credentials.json, or my-opencode-credentials.ps1.
- Do not run update-plugins.ps1 as a real update.
- Update one plugin only. Use exact version or commit, never @latest.
- Compare current repository file against both old and new upstream source before editing.
- Keep local fixes that new upstream does not contain.
- Do not restore Mem0 code. Active memory is opencode-supermemory through plugins/supermemory.ts.
- Project .opencode/opencode.json must not contain a plugin property.
- Installers may overwrite config/tui.json, active opencode.jsonc plugin pins, config/oh-my-opencode-slim.json, and active plugins/rtk.ts. Restore repository-controlled copies and exact pins.

Current tested stack:
- OpenCode 1.17.18
- @opencode-ai/plugin 1.17.18
- @ai-sdk/openai-compatible 3.0.7
- opencode-supermemory 2.0.8
- opencode-update-notifier 0.3.3
- oh-my-opencode-slim 2.1.1
- eight effective plugins: two npm plus six local files

Required work:
1. State source URL, current version/commit, target version/commit, and exact local differences.
2. Read upstream changelog and changed source using primary upstream sources.
3. Add or update a focused regression before changing behavior when possible.
4. Make smallest required update.
5. Update exact pins and related docs only when target is a pinned package.
6. Run focused tests and rtk bun test.
7. Bundle changed local plugin under C:\Users\bacnt\.config\opencode dependency context.
8. Verify resolved plugin and plugin_origins counts are both 8 without printing full resolved config.
9. Verify CLI, TUI, and Desktop load_tool shell markers.
10. Verify affected plugin lifecycle from pr.md.
11. If Supermemory is touched, run add/search/profile/list/forget and prove test marker is deleted.
12. Get an independent diff review, fix important findings, and report exact commands/results.

Do not push. Leave one focused commit ready for review.
```

## Package Pins

These versions move only through the one-at-a-time process above:

```text
@opencode-ai/plugin@1.17.18
@ai-sdk/openai-compatible@3.0.7
opencode-supermemory@2.0.8
opencode-update-notifier@0.3.3
oh-my-opencode-slim@2.1.1
```

After any package update, `bun pm ls` and resolved plugin specs must show exact intended versions.

## Old Mem0 Work

Mem0 patches are history only. They are kept under `mem0-archive/` and `archive/broken-docs-reference`. Do not copy them into current runtime. Current memory uses `opencode-supermemory@2.0.8` through `plugins/supermemory.ts`.
