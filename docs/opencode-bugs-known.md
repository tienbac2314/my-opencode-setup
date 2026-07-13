# OpenCode Known Issues

## Local plugin duplication

**Symptom:** Hook runs twice, fetch wrappers nest unpredictably, or Desktop startup differs from TUI.

**Cause:** Same local plugin appears in `opencode.jsonc` and `plugins/` auto-discovery.

**Rule:** Keep local plugins only in `plugins/`. Explicit config array contains npm plugins only. Confirm with `opencode debug config`; each origin must appear once.

## Desktop plugin resolution

**Symptom:** TUI loads plugin while Desktop App reports missing default export or unavailable tools.

**Cause:** Desktop Electron runtime is stricter about module shape and Bun shell injection.

**Rule:** Every local plugin exports default `{ id, server }`. Plugins using `input.$` must validate it before setting global load guard or registering hooks.

## `experimental.primary_tools`

**Symptom:** Subagents lose built-in tools.

**Cause:** Restriction applies beyond primary agent in current OpenCode behavior.

**Rule:** Leave `experimental.primary_tools` unset. Lazy-load controls schemas at request boundary instead.

## DeepSeek DSML tool format after compaction

**Symptom:** Model emits `<｜｜DSML｜｜tool_calls>` text instead of standard streamed `tool_calls` JSON.

**Mitigation:** Lazy-load response transform converts complete DSML blocks, including blocks split across stream chunks. Standard JSON tool-call and finish deltas must bypass DSML text buffering.

**Configuration:** Keep compaction buffer large enough to reduce format drift. Dedicated stable compaction model remains recommended.

## Lazy-load per-turn state

**Invariant:** Tool loaded in current turn may execute directly. `finish_reason: "stop"` clears state. New turn must load again.

**Failure mode:** Dropping empty finish delta retains stale loaded-tool state and yields `finish: "unknown"`.

**Coverage:** `tests/lazy-load.test.ts` must preserve standard tool calls, finish events, split DSML, ordinary content, and MCP passthrough.

## Supermemory module shape

**Symptom:** `opencode-supermemory` installs but Desktop cannot discover plugin.

**Cause:** Current package exports `SupermemoryPlugin` by name while OpenCode local discovery expects default plugin object.

**Fix:** `plugins/supermemory.ts` adapts named export to `{ id, server }`. Keep credentials in ignored `supermemory.jsonc`.

## Skill duplication warnings

**Symptom:** Startup logs warn same skill name exists through multiple junctions or discovery roots.

**Cause:** Bootstrap links `.agents/skills` names already discoverable from another configured path.

**Rule:** Link only unique names. Treat warnings as configuration debt; do not delete user-owned skill directories automatically.

## Models discovery

**Symptom:** Provider models lack image input or discovered plugin crashes Desktop.

**Rule:** Plugin exports default object, skips built-in `opencode/` model IDs, and falls back conservatively when provider metadata omits modalities.

## RTK shell injection

**Symptom:** Desktop logs `input.$ is not a function` or RTK remains disabled after later valid load.

**Rule:** Validate `input.$` and locate `rtk` before setting global load guard. Rewrite failures preserve original command.

## Historical Mem0 material

Legacy Mem0 implementation, troubleshooting, and upstream notes live only under `mem0-archive/`. Nothing there loads at runtime.
