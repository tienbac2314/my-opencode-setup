# Bun Prerequisite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make vanilla OMO Slim auto-updates work after bare-machine setup.

**Architecture:** `setup.ps1` converges the official Bun prerequisite before component installation and refreshes the current process PATH. The manifest keeps OMO 2.2.4 as the tested install baseline while one generic manifest field makes its runtime config use the upstream `latest` channel.

**Tech Stack:** PowerShell 7, Bun tests, JSON component manifest, OpenCode JSONC configuration.

## Global Constraints

- Existing working Bun installations remain untouched.
- Missing Bun uses the official platform installer and must yield both `bun` and `bunx`.
- OMO Slim runtime config uses `@latest`; all other plugin pins remain exact.
- No OMO Slim patch, wrapper, updater override, or new runtime dependency.
- Tests never contact the network or print credentials.

---

### Task 1: OMO runtime channel

**Files:**
- Modify: `config/components.json`
- Modify: `config/opencode.jsonc.example`
- Modify: `config/tui.json`
- Modify: `maintain.ps1`
- Test: `tests/maintain.test.ts`

**Interfaces:**
- Consumes: component `target` as tested install version.
- Produces: optional component `runtimeTarget`; `Sync-ConfigPins` and `Verify-State` use it for config entries while package installation continues using `target`.

- [ ] Add failing tests proving OMO uses `oh-my-opencode-slim@latest`, package installation remains `2.2.4`, and another managed plugin remains exact.
- [ ] Run `bun test tests/maintain.test.ts` and confirm failures show current exact OMO pinning.
- [ ] Set OMO `target` to `2.2.4` and `runtimeTarget` to `latest`; use `runtimeTarget ?? target` only at config synchronization and verification boundaries.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Official Bun prerequisite

**Files:**
- Modify: `setup.ps1`
- Test: `tests/maintain.test.ts`

**Interfaces:**
- Produces: `Ensure-BunPrerequisite`, which returns only after `bun` and `bunx` resolve in the current process.
- Consumes: official `https://bun.sh/install.ps1` on Windows and `https://bun.sh/install` through an available POSIX shell elsewhere.

- [ ] Add failing tests for preserving an existing fake Bun and for a mocked official installer creating fake `bun` and `bunx` under the isolated home directory.
- [ ] Run the focused tests and confirm missing Bun currently fails before component installation.
- [ ] Implement `Ensure-BunPrerequisite`: detect both commands; run the official installer only when required; prepend the standard Bun bin directory to current PATH; verify both commands; throw an actionable error otherwise.
- [ ] Call it before `maintain.ps1 apply`, independent of `-SkipEnvironment`.
- [ ] Run focused tests and confirm both paths pass without network access.

### Task 3: Operator documentation and decision record

**Files:**
- Modify: `README.md`
- Modify: `docs/guides/setup.md`
- Modify: `docs/guides/troubleshooting.md`
- Modify: `docs/history/decisions.md`

**Interfaces:**
- Documents: automatic Bun installation, fresh-process PATH behavior, `spawn bun ENOENT` recovery, OMO latest-channel exception, and tested 2.2.4 baseline.

- [ ] Add focused documentation assertions to `tests/maintain.test.ts` for the prerequisite and runtime-channel boundary.
- [ ] Run focused tests and observe documentation assertions fail.
- [ ] Update current docs and decision history with concise commands, evidence, alternatives, and supersession condition.
- [ ] Run focused tests and confirm they pass.

### Task 4: Deploy, verify, and update PR

**Files:**
- Modify active files under `~/.config/opencode` only through repository setup/maintenance.
- Update existing GitHub PR #4.

**Interfaces:**
- Produces: committed and pushed branch `refactor/unified-maintenance`, active OMO `@latest`, Bun available to a fresh process, and updated PR evidence.

- [ ] Run `bun test`, `git diff --check`, standalone relevant checks, and `maintain.ps1 check -Offline`.
- [ ] Run setup/maintenance to deploy OMO 2.2.4 baseline and `@latest` runtime entries.
- [ ] Start a fresh PowerShell process and verify `bun --version` and `bunx --version` resolve.
- [ ] Restart-test OMO where feasible; inspect new OMO log for absence of `spawn bun ENOENT` and report any live limitation exactly.
- [ ] Update `docs/history/decisions.md` evidence with verified results, commit detailed changes, push, and update PR #4 body.
