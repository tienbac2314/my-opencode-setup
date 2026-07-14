# Plugin Maintenance Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give future maintainers plain-language records of plugin sources, local changes, safe update steps, and machine credential setup.

**Architecture:** `setup.md` holds operator steps. `pr.md` holds plugin sources, local changes, update details, and the copy-paste agent prompt. Root and history docs open with a purpose statement and point readers to current instructions. Private secrets stay in the desktop script; repository scripts contain placeholders only.

**Tech Stack:** Markdown, TypeScript/JavaScript plugin sources, PowerShell, Git, Bun

## Global Constraints

- Do not change plugin runtime code during this documentation task.
- Do not copy secret values into repository files, terminal output, or Git remote URLs.
- Preserve working lazy-load and Supermemory behavior.
- Preserve unrelated user changes.
- Use one read-only reviewer agent after local verification.

---

### Task 1: Compare Plugin Sources

**Files:**
- Review: `plugins/0-tokens-source.ts`
- Review: `plugins/lazy-load.ts`
- Review: `plugins/models-discovery.js`
- Review: `plugins/codegraph-helper.ts`
- Review: `plugins/rtk.ts`
- Review: `plugins/supermemory.ts`
- Review: historical `README.md` versions

**Interfaces:**
- Consumes: upstream repositories, current files, Git history
- Produces: confirmed source label and local-change summary for every plugin

- [x] Compare upstream-derived files with current upstream source.
- [x] Compare custom files with first useful repository versions.
- [x] Record useful old documentation that current docs lost.

### Task 2: Rewrite Plugin and Update Docs

**Files:**
- Modify: `pr.md`
- Modify: `README.md`
- Modify: `setup.md`
- Modify: `knownbug.md`

**Interfaces:**
- Consumes: Task 1 source map
- Produces: plain-language plugin changes, PR notes, update guide, and future-agent prompt

- [x] Rename headings and replace formal maintenance words with direct language.
- [x] Add source/ownership table and per-plugin upstream PR guidance.
- [x] Add exact one-plugin-at-a-time update steps.
- [x] Add full-context copy-paste prompt for a future coding agent.
- [x] Correct stale test counts without changing version pins.

### Task 3: Make Project Docs Easy to Enter

**Files:**
- Modify: `docs/debug-journey/README.md`
- Modify: `docs/debug-journey/01-tree-corruption.md`
- Modify: `docs/debug-journey/02-lazy-load-failure.md`
- Modify: `docs/debug-journey/03-baseline-comparison.md`
- Modify: `docs/debug-journey/04-recovery-validation.md`
- Modify: `docs/opencode-bugs-known.md`
- Modify: `docs/supermemory-setup.md`
- Modify: project files under `docs/superpowers/specs/` and `docs/superpowers/plans/` only when opening purpose is missing

**Interfaces:**
- Consumes: current documentation map
- Produces: purpose-first introductions and clear current/history labels

- [x] Add one short purpose paragraph to each active project document.
- [x] Add current-guide links to historical documents.
- [x] Leave bundled `skills/`, `agents/`, and `data/` docs unchanged.

### Task 4: Update Private Credential Setup

**Files:**
- Modify outside repository: `C:\Users\bacnt\Desktop\my-opencode-credentials.ps1`
- Modify if needed: `scripts/set-credentials.ps1`

**Interfaces:**
- Consumes: existing local config/auth/environment values without printing them
- Produces: complete private restore script and secret-free repository helper

- [x] Merge locally available 9router, Supermemory, OpenRouter, and feature-flag values into private script; exclude exposed GitHub token pending rotation.
- [x] Keep missing optional values clearly reported without fake values.
- [x] Verify repository helper contains no real secrets.
- [x] Verify Git remote URL contains no credentials.

### Task 5: Verify and Review

**Files:**
- Review: all changed files

**Interfaces:**
- Consumes: Tasks 1-4 result
- Produces: test evidence and independent review

- [x] Run `rtk git diff --check` and expect exit 0.
- [x] Run `rtk bun test` and expect all tests to pass.
- [x] Scan tracked changes for credential patterns.
- [x] Ask one reviewer agent to inspect requirements and diff without editing.
- [x] Fix Critical or Important findings, rerun checks, then commit.
