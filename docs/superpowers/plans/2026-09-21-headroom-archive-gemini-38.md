# Headroom Archive and Gemini 3.8 Defaults Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Archive Headroom, restore direct provider calls, and set active OpenCode/OMO defaults to verified Gemini 3.8 Flash models.

**Architecture:** Active setup contains only components deployed by `setup.ps1` and `maintain.ps1`. Headroom files move to a reference-only archive. Model discovery uses the process default `fetch`, so provider inventory and requests go directly to configured endpoints.

**Tech Stack:** PowerShell setup/maintenance, TypeScript/JavaScript plugins, Bun tests, JSON/JSONC configuration, Markdown history.

## Global Constraints

- Preserve unrelated dirty changes.
- Do not print or commit credentials.
- Keep exact OMO package pin `2.2.6`.
- Use only verified IDs `ag/gemini-3.8-flash-low`, `...-medium`, and `...-high` for active 9router defaults.
- Keep OpenCode compaction and dormant `opencode-go` presets unchanged.
- Archive paths must not be copied or installed by active setup.

### Task 1: Add regression expectations

**Files:**
- Modify: `tests/bootstrap.test.ts`
- Modify: `tests/maintain.test.ts`
- Modify: `tests/models-discovery.test.ts`
- Delete from active imports: `tests/headroom.test.ts` (move to archive in Task 2)

- [x] Assert active config uses Gemini 3.8 IDs and active setup has no Headroom references.
- [x] Assert the manifest has five expected plugin origins after Headroom removal.
- [x] Assert model discovery calls the configured endpoint directly without Headroom state.
- [x] Run focused tests and observe expected failures before implementation.

### Task 2: Archive Headroom runtime artifacts

**Files:**
- Create: `archive/headroom/README.md`
- Move: `plugins/headroom.ts`
- Move: `scripts/install-headroom-plugin.ps1`
- Move: `scripts/manage-headroom-proxy.ps1`
- Move: `scripts/remove-headroom-opencode-pollution.ps1`
- Move: `scripts/run-headroom-proxy.ps1`
- Move: `scripts/start-opencode-headroom.ps1`
- Move: `tests/headroom.test.ts` to `archive/headroom/tests/headroom.archived.ts`
- Move: `docs/integrations/headroom.md`

- [x] Preserve archived source unchanged except path references needed for the archive note.
- [x] State that archived files are not active setup inputs and include the removal date/reason.

### Task 3: Remove active Headroom wiring

**Files:**
- Modify: `config/components.json`
- Modify: `setup.ps1`
- Modify: `maintain.ps1`
- Modify: `plugins/models-discovery.js`
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/guides/setup.md`
- Modify: `docs/guides/troubleshooting.md`
- Modify: `docs/reference/patches.md`
- Modify: `docs/reference/upstream.md`
- Modify: `AGENTS.md`
- Modify: `config/opencode.jsonc.example`
- Modify: `config/components.json`

- [x] Remove Headroom components and reduce expected plugin origins from six to five.
- [x] Remove cleanup/service convergence calls and all active Headroom instructions.
- [x] Make model discovery use `globalThis.fetch` directly.
- [x] Preserve provider/model/MCP ownership and direct fail behavior.

### Task 4: Switch active defaults and record decision

**Files:**
- Modify: `config/opencode.jsonc.example`
- Modify: `config/oh-my-opencode-slim.json`
- Modify: `agents/web-search.md`
- Modify: `scripts/start-opencode-headroom.ps1` (archived in Task 2; no active edit)
- Modify: `docs/history/decisions.md`
- Modify: `docs/history/maintenance-refactor.md`
- Modify: `docs/history/architecture-evolution.md`

- [x] Replace active 3.7 defaults with exact 3.8 effort mapping.
- [x] Add a concise decision that Headroom is archived and direct transport is intentional.
- [x] Mark old Headroom runtime text historical where needed without reintroducing it to active setup flow.

### Task 5: Remove machine Headroom state and verify

**Files:**
- No tracked file changes beyond prior tasks.

- [x] Stop/unregister `OpenCode Headroom Proxy` and remove `~/.config/opencode/headroom-proxy.url`.
- [x] Uninstall `headroom-ai` only if the local tool is installed.
- [x] Run focused tests, full Bun tests, `pwsh ./maintain.ps1 verify -Offline`, and active config/plugin checks.
- [x] Query 9router inventory without printing credentials and confirm Gemini 3.8 IDs.
