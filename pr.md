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
| Research skills and web-search files | [Weizhena/Deep-Research-skills](https://github.com/Weizhena/Deep-Research-skills) | OpenCode metadata/tool changes, model choice, and hidden strategy-module layout |

Comparison date: 2026-07-14. Compared upstream commits:

| Project | Commit |
|---|---|
| opencode-lazy-loading | `11ee1745e34235c90ce3fbe3167a344096afbb83` |
| OpenCode-tokens-source | `004e35f371a8bf23b22d02c63819fc91e44bc0ef` |
| opencode-supermemory | `dd7cf6273b1440a55a2e448a166de04db9e334d3` |
| RTK (`develop`) | `5d32d0736f686b69d1e8b9dc45c007d4eb77a0a2` |
| Deep-Research-skills (`master`) | `e5479f857f484cde13fe69d2f3ce8de7af193bc7` |
| oh-my-opencode-slim (`master`, package `2.2.0`) | `cb4ee1aa077d68354160214c9baa9612f66297ab` |
| opencode-update-notifier (`main`) | `ff12e7824d501862368910d01b04936744ae8ea1` |

## Before Removing Any Local Fix

Do not remove a fix only because upstream published a new version. First prove all of these:

1. Upstream now handles the same case.
2. Only one plugin is updated in the test change.
3. Local and upstream files are compared before copying.
4. `rtk proxy bun test` passes.
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
5. Run the focused and live tests below, then `rtk proxy bun test`.

### Tests to run

```powershell
rtk proxy bun test tests/lazy-load.test.ts
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
5. Copy reviewed upstream changes, then run the flow below and `rtk proxy bun test`.

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
- Keeps OMO `ag/gemini-3.5-flash-low` and compaction `ag/claude-opus-4-6-thinking` valid when startup discovery fails.
- Ignores source IDs starting with `opencode/` so OpenCode does not create broken `9router/opencode/*` names.

### Tests to run

```powershell
$models = @(rtk opencode models 9router)
@($models | Where-Object { $_ -like '9router/oc/*' }).Count
@($models | Where-Object { $_ -like '9router/opencode/*' }).Count
```

Expected: six selected `9router/oc/*` entries and zero `9router/opencode/*` entries. Total model count can change when provider inventory changes.

Run `rtk proxy bun test tests/models-discovery.test.ts` to verify configured agent models remain available when `/models` is temporarily unavailable.

### How to update

No upstream file exists. Edit `plugins/models-discovery.js` directly, add a focused provider-response test or probe, run the model counts above, and check Desktop model selection. Do not replace it through `update-plugins.ps1`.

### PR plan

No upstream file exists. Keep changes here. If publishing it as its own project later, include endpoint configuration, modality fallback, namespace filtering, and mocked provider tests.

## CodeGraph Helper

### Where it came from

`plugins/codegraph-helper.ts` was made in this repository to connect OpenCode editing hooks with the separately installed [CodeGraph](https://github.com/colbymchenry/codegraph).

### What it does

- Acts only when current workspace has `.codegraph/`.
- Redirects grep/glob until current session attempts CodeGraph, then allows fallback search.
- Always allows file reads.
- Debounces `codegraph sync` after supported write tools, including `apply_patch`.
- Keeps missing shell runners and background failures from crashing Desktop.
- Does nothing in repositories without a CodeGraph index.

### Tests to run

```powershell
rtk codegraph status .
rtk codegraph explore "CodeGraphHelperPlugin"
rtk proxy bun test tests/codegraph-helper.test.ts
```

Also test indexed and unindexed folders, session isolation, grep/glob fallback after one CodeGraph attempt, and a failed background runner.

### How to update

No upstream plugin file exists. Update `plugins/codegraph-helper.ts` only when OpenCode hook names or CodeGraph commands change. Check current OpenCode and CodeGraph docs first, then run indexed and unindexed tests above. `codegraph upgrade` updates the CLI, not this custom helper.

### PR plan

No matching upstream plugin file exists. This could become a new CodeGraph OpenCode integration proposal, not a patch against existing CodeGraph source. Keep OpenCode version assumptions and supported hook names in the proposal.

## RTK OpenCode Plugin

### Where it came from

`plugins/rtk.ts` is based on `hooks/opencode/rtk.ts` generated by [RTK](https://github.com/rtk-ai/rtk). Bootstrap runs RTK setup, then restores this repository copy because the generator can overwrite it.

### What we changed

- Accepts whole plugin input so missing `input.$` can be handled.
- Uses Node child process when Desktop does not provide injected Bun shell `$`, so rewriting still works.
- Uses Windows `where rtk` instead of Unix `which rtk`.
- Requires normal user `PATH`; does not probe or depend on `C:\Windows\System32`.
- Returns rewrite hook on every initialization because Desktop initializes plugins repeatedly.
- Leaves original command unchanged when rewrite fails.
- Adds default `{ id, server }` export for local file discovery.

### Tests to run

- Initialize without `$`; hook must register and rewrite through child process.
- Initialize with valid `$`; hook must register through injected shell.
- Initialize twice; second result must still contain working rewrite hook.
- Rewrite an eligible shell command and compare its result with original command.
- Compare SHA-256 of repository and active RTK plugin after bootstrap.

### How to update

1. Fetch `rtk-ai/rtk` and compare `hooks/opencode/rtk.ts` with `plugins/rtk.ts`.
2. Copy useful generator changes without losing Windows PATH lookup, no-`$` child process, repeated-init hook return, or default export.
3. Run RTK's local checks plus this repository's null-shell and rewrite tests.
4. Run bootstrap and confirm it restores repository `plugins/rtk.ts` after `rtk init -g --opencode`.

### Upstream PR plan

Useful upstream PR: make generated OpenCode hook work on Windows and Desktop. Include no-`$` process-runner test, injected-shell test, cross-platform binary lookup, default export compatibility, and rewrite-failure test.

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
2. Update exact version in private `$HOME\.config\opencode\versions.env`, then update tested defaults in `config/versions.env.example`, `README.md`, `setup.md`, and current-stack entries in `pr.md` only after review.
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

## Deep Research Skills and Web Search

### Where they came from

These files come from the Codex English variant in [Weizhena/Deep-Research-skills](https://github.com/Weizhena/Deep-Research-skills):

- `skills/research/`
- `skills/research-deep/`
- `skills/research-add-items/`
- `skills/research-add-fields/`
- `skills/research-report/`
- `agents/web-search.md`
- `data/web-search-strategies/*.md`

`skills/research/validate_json.py` and all five strategy files still match upstream content. Other files have small OpenCode-specific changes.

### Exact local changes

- Adds OpenCode skill metadata such as `user-invocable` and `allowed-tools`.
- Changes `request_user_input` references to `AskUserQuestion` in current adapted skills.
- Changes validation path from `~/.codex/skills/research/` to `~/.config/opencode/skills/research/`.
- Selects `opencode/deepseek-v4-flash-free` for web-search agent instead of upstream OpenAI model.
- Moves strategy files from `agents/web-search-modules/` to `data/web-search-strategies/` and updates agent prompt path.

Last move is not cosmetic. OpenCode discovers Markdown in agent folders as agents. Keeping strategy modules there makes reference files appear in `@` agent list. Data directory keeps modules readable by web-search agent without registering five fake agents. Bootstrap removes old active `agents/web-search-modules/` directory during migration.

### How to update

1. Fetch current `Weizhena/Deep-Research-skills`.
2. Compare local skills with upstream `skills/research-codex-en/` files.
3. Compare `agents/web-search.md` with upstream `agents/web-search-opencode.md`.
4. Compare data strategy files with upstream `agents/web-search-modules/` files.
5. Keep OpenCode metadata, validation path, selected model, and data-directory move.
6. Never copy strategy files back under active `agents/`.
7. Run one preliminary research flow, one deep worker, validation script, report generation, and `@` autocomplete check.

### Upstream PR plan

No upstream PR needed for personal model choice. OpenCode-safe module placement is useful upstream: store strategy modules outside agent discovery directory and update prompt paths. Include proof that only real agent appears in `@` autocomplete.

## OMO Slim Setup

### Where it came from

`oh-my-opencode-slim` is an upstream npm plugin. Repository does not patch package source. Local behavior comes from `config/oh-my-opencode-slim.json` and exact package pins.

### What we changed around it

- `setDefaultAgent: false` keeps OpenCode Build as main default agent.
- `disabled_agents: ["explorer"]` disables OMO Explorer.
- Active preset is `9router`; every OMO role uses selected 9router model.
- Orchestrator gets all skills and all MCPs except `context7`.
- Oracle gets only `simplify` and no MCPs.
- Librarian gets `websearch`, `context7`, and `gh_grep`, with no skills.
- Explorer, Designer, and Fixer get no skills or MCPs.
- Tracked OpenAI and OpenCode Go presets remain available.
- Exact version comes from private `$HOME\.config\opencode\versions.env`.
- Installer runs with exact version, then bootstrap restores tailored config, repins active global/TUI plugin lists, and copies all six audited local plugins.
- `scripts/pin-opencode-plugin.ps1` changes only root `plugin` array. It replaces both unpinned and older pinned entries without touching comments, credentials, nested properties, or other arrays.

### Tests to run

```powershell
rtk proxy bun test tests/bootstrap.test.ts
```

Then check agent, tool, MCP, and command registration and run one bounded child-agent call.

### How to update

1. Read target release and update only private version file:

```powershell
notepad "$HOME\.config\opencode\versions.env"
```

2. Preview exact version and restore targets:

```powershell
.\update-plugins.ps1 -Component OmoSlim -DryRun
```

3. Run only OMO update plus tailored restores:

```powershell
.\bootstrap.ps1 -UpdateOnly -Component OmoSlim
```

4. Run bootstrap tests, confirm both resolved plugin counts are eight, open Desktop Plugins three times, and run `ping all agents` plus one bounded child-agent call.

### Upstream issue or PR plan

Useful upstream request: installer should preserve exact version when invoked through an exact package spec and should not rewrite unrelated config. Include before/after JSONC examples. Repository pin helper remains needed until installer behavior is safe for comments, compact arrays, and nested `plugin` fields.

## Update Notifier

Package source is unchanged. Repository pins `opencode-update-notifier@0.3.3` so notification compares installed and published versions correctly.

### What it checks

- Exact npm pins such as `oh-my-opencode-slim@2.2.0`.
- GitHub git package specs pinned to SemVer tags.

### What it does not check

- `file:` entries and local paths.
- Custom wrappers and custom source files.
- Unpinned packages.
- Non-GitHub git URLs, branches, and commit SHAs.

For this stack it can see pinned OMO Slim and notifier entries. It cannot independently track lazy load, token source, RTK, model discovery, CodeGraph helper, Supermemory wrapper, Deep Research files, or changes inside tailored OMO config. Those require source comparison described in this file.

Tests: initialize read-only, confirm pinned entry is detected, confirm registry check does not modify packages, and confirm malformed/unpinned entries are skipped. No upstream PR is currently needed.

### How to update

1. Read target release in `tim-hilde/opencode-update-notifier`.
2. Change `OPENCODE_UPDATE_NOTIFIER_VERSION` in private `$HOME\.config\opencode\versions.env`.
3. Update active global plugin pin and install exact version under `$HOME\.config\opencode`. Targeted bootstrap automation currently covers OMO Slim only.
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
8. Run focused test, then full `rtk proxy bun test`.
9. For OMO Slim, deploy with `bootstrap.ps1 -UpdateOnly -Component OmoSlim`. For locally changed files, copy reviewed repository file only after tests pass.
10. Verify exact package pins, eight plugins, CLI/TUI/Desktop `load_tool`, and affected plugin flow.
11. Commit only this one update.

`update-plugins.ps1` is now a narrow OMO compatibility entrypoint. It reads private exact version and delegates to targeted bootstrap. It does not update local wrappers, Deep Research files, CodeGraph, or unrelated npm packages.

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
- Use update-plugins.ps1 only for its supported one-component exact update.
- Update one plugin only. Use exact version or commit, never @latest.
- Compare current repository file against both old and new upstream source before editing.
- Keep local fixes that new upstream does not contain.
- Do not restore Mem0 code. Active memory is opencode-supermemory through plugins/supermemory.ts.
- Project .opencode/opencode.json must not contain a plugin property.
- Installers may overwrite config/tui.json, active opencode.jsonc plugin pins, config/oh-my-opencode-slim.json, and active plugins/rtk.ts. Restore repository-controlled copies and exact pins.
- Read package targets from private C:\Users\bacnt\.config\opencode\versions.env. Never commit that machine file.
- Deep Research skills derive from Weizhena/Deep-Research-skills. Keep strategy modules under data/web-search-strategies so they do not become @ agents.

Current tested stack:
- OpenCode 1.17.18
- @opencode-ai/plugin 1.17.18
- @ai-sdk/openai-compatible 3.0.7
- opencode-supermemory 2.0.8
- opencode-update-notifier 0.3.3
- oh-my-opencode-slim 2.2.0
- eight effective plugins: two npm plus six local files

Required work:
1. State source URL, current version/commit, target version/commit, and exact local differences.
2. Read upstream changelog and changed source using primary upstream sources.
3. Add or update a focused regression before changing behavior when possible.
4. Make smallest required update.
5. Update private versions.env and related active pins only when target is a pinned package.
6. Run focused tests and rtk proxy bun test.
7. Bundle changed local plugin under C:\Users\bacnt\.config\opencode dependency context.
8. Verify resolved plugin and plugin_origins counts are both 8 without printing full resolved config.
9. Verify CLI, TUI, and Desktop load_tool shell markers.
10. Verify affected plugin lifecycle from pr.md.
11. If Supermemory is touched, run add/search/profile/list/forget and prove test marker is deleted.
12. Get an independent diff review, fix important findings, and report exact commands/results.

Do not push. Leave one focused commit ready for review.
```

## Package Pins

Private `$HOME\.config\opencode\versions.env` controls installed targets. Tracked example starts with this tested stack:

```text
@opencode-ai/plugin@1.17.18
@ai-sdk/openai-compatible@3.0.7
opencode-supermemory@2.0.8
opencode-update-notifier@0.3.3
oh-my-opencode-slim@2.2.0
```

After any package update, `bun pm ls` and resolved plugin specs must show exact intended versions.

## Old Mem0 Work

Mem0 patches are history only. They are kept under `mem0-archive/` and `archive/broken-docs-reference`. Do not copy them into current runtime. Current memory uses `opencode-supermemory@2.0.8` through `plugins/supermemory.ts`.
