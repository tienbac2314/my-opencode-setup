# Desktop Plugin Status Runbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve diagnosis and prevention guidance for the Desktop plugin-count regression fixed in commit `443099a`.

**Architecture:** Keep full operational procedure in `knownbug.md`, expose it from `README.md`, and record incident chronology in `docs/debug-journey/README.md`. Document configuration-layer distinction between `plugin` and `plugin_origins` without changing runtime code.

**Tech Stack:** Markdown, PowerShell, Bun tests, Git

## Global Constraints

- Project `.opencode/opencode.json` must omit `plugin`; `"plugin": []` is not a valid empty override.
- Diagnostics must not print credentials or full resolved configuration.
- Existing Supermemory configuration and migration behavior must remain unchanged.
- Amend commit `443099a`; do not create a follow-up commit.

---

### Task 1: Document Desktop plugin-count regression

**Files:**
- Modify: `README.md`
- Modify: `knownbug.md`
- Modify: `docs/debug-journey/README.md`

**Interfaces:**
- Consumes: OpenCode resolved `plugin` and `plugin_origins` fields
- Produces: discoverable symptom, invariant, diagnostic, recovery, and verification guidance

- [x] **Step 1: Add canonical known-bug runbook**

Add symptom `8 -> 9 -> 8 -> empty`, explain project-layer empty-array override, compare only counts/specs, require App reload, and identify `tests/bootstrap.test.ts` regression guard.

- [x] **Step 2: Add discovery links**

Add concise README warning beside plugin-loading rules and append incident to debug-journey reading order and recovered sequence.

- [x] **Step 3: Run verification**

Run: `rtk git diff --check`

Expected: exit 0 with no whitespace errors.

Run: `rtk bun test`

Expected: all tests pass, including project-config plugin omission assertion.

- [x] **Step 4: Review staged scope and amend commit**

Run: `rtk git diff -- README.md knownbug.md docs/debug-journey/README.md docs/superpowers/plans/2026-07-13-desktop-plugin-status-runbook.md`

Expected: documentation-only additions matching this plan.

Run: `rtk git commit --amend -m "fix(config): preserve desktop plugin list" -m "Remove empty project plugin override that hid loaded plugins in Desktop. Add regression and recovery notes for context-free diagnosis."`

Expected: amended commit contains configuration fix, regression test, and documentation.
