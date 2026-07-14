# Plugin Maintenance Docs Design

## Purpose

This document defines how to make plugin maintenance understandable to someone opening the repository with no previous chat context. Use it when reviewing local plugin changes, preparing upstream pull requests, or upgrading a plugin safely.

## Files We Will Review

Review the six files under `plugins/` and compare files with upstream projects against their upstream source and useful old repository versions:

- `lazy-load.ts`
- `0-tokens-source.ts`
- `models-discovery.js`
- `codegraph-helper.ts`
- `rtk.ts`
- `supermemory.ts`

Do not restore removed runtime code only because it existed before. Restore useful explanations, source links, reasons for changes, and test instructions when current docs lost them.

## Simple Source Labels

Use these labels in public docs:

- **Made by us**: no upstream source file exists.
- **Copied from upstream, then changed**: repository started from an upstream plugin and now carries local fixes.
- **Generated, then fixed by us**: another tool created the file and this repository hardened it.
- **Small wrapper around an npm package**: local file only adapts package loading.
- **Upstream package, config changes only**: package source is unchanged; repository controls version and setup.

Known classification:

| Plugin | Label |
|---|---|
| `models-discovery.js` | Made by us |
| `codegraph-helper.ts` | Made by us |
| `lazy-load.ts` | Copied from upstream, then changed |
| `0-tokens-source.ts` | Copied from upstream, then changed |
| `rtk.ts` | Generated, then fixed by us |
| `supermemory.ts` | Small wrapper around an npm package |
| `oh-my-opencode-slim` | Upstream package, config changes only |
| `opencode-update-notifier` | Upstream package, config changes only |

## Documentation Changes

Rewrite `pr.md` as **Plugin Fixes and Update Notes**. Start with a short purpose statement. For each plugin, state:

1. Where it came from.
2. Whether we own the whole file or only local changes.
3. What changed and why.
4. Which code or docs should be proposed upstream.
5. How to test it.
6. How to update it safely.
7. When the local fix can be removed.

Use common words. Keep exact technical names where simpler words would lose meaning. Replace terms such as “ledger,” “provenance,” “invariant,” and “gate” with direct headings such as “What we changed,” “Must keep working,” and “Tests to run.”

Review active project docs:

- `README.md`
- `setup.md`
- `pr.md`
- `knownbug.md`
- `docs/debug-journey/*.md`
- moved-page notices under `docs/`
- project specs and plans under `docs/superpowers/`

Every document must explain its purpose in the opening paragraph. Historical documents must say they are history and must link to current setup instructions. Bundled `skills/`, `agents/`, and `data/` Markdown files are outside this rewrite.

## Plugin Update Guide

Add a guide for locally changed plugins. It must use exact versions, update one plugin at a time, compare upstream changes before copying, reapply only fixes still needed, and run the matching tests plus App/TUI checks.

Add a copy-paste prompt for a future coding agent. Prompt must include repository path, current pins, source labels, files that installers may overwrite, tests, App/TUI checks, Supermemory safety, credential rules, and a requirement to stop on unrelated worktree changes.

## Credential Setup

`C:\Users\bacnt\Desktop\my-opencode-credentials.ps1` is private machine state. Update it from existing local OpenCode configuration, Supermemory configuration, OpenCode auth data, existing credential data, and relevant environment variables without printing secret values.

Repository `scripts/set-credentials.ps1` remains safe to commit. It may contain field names, placeholders, and instructions, but no real key, token, password, private endpoint credential, or authenticated Git URL.

Remove credentials from Git remote URLs. Tell user to rotate any token exposed during inspection.

## Checks

- Compare every upstream-derived plugin against its named upstream source.
- Check useful old README/plugin notes and restore missing explanations only.
- Run `rtk git diff --check`.
- Run `rtk bun test`.
- Scan tracked files and Git remote URLs for credential patterns.
- Confirm desktop credential script contains required fields without printing values.
- Ask one reviewer agent to inspect final repository diff without editing files.
- Preserve unrelated user changes.
