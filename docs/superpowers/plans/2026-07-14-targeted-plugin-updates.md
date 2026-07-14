# Targeted Plugin Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move package versions into a private machine file, add one-component OMO Slim update mode, and document every missing upstream/local agent change.

**Architecture:** `bootstrap.ps1` remains full installer by default and gains a narrow OMO update path. A non-executable dotenv parser reads `$HOME\.config\opencode\versions.env`, seeded from a tracked example. Documentation records upstream diffs, agent discovery rules, tailored OMO settings, Deep Research changes, and notifier limits.

**Tech Stack:** PowerShell 7+, Bun tests, JSON/JSONC, Markdown, OpenCode plugin configuration

## Global Constraints

- Use explicit `rtk` wrapper for supported terminal commands.
- Preserve user changes in `setup.md` and `docs/debug-journey/README.md`.
- Use exact versions only; never `@latest` or broad `npm update`.
- Update mode may change only selected component.
- Do not print or commit credentials.
- Preserve lazy-load and Supermemory behavior.

---

### Task 1: Private Version File Contract

**Files:**
- Create: `config/versions.env.example`
- Create: `scripts/read-versions.ps1`
- Modify: `tests/bootstrap.test.ts`

**Interfaces:**
- Consumes: dotenv file path passed as `-Path`.
- Produces: PowerShell hashtable containing six required version keys.

- [ ] **Step 1: Add failing parser tests**

Add tests that invoke `scripts/read-versions.ps1` through `pwsh`, verify comments and blank lines are accepted, verify all six values return, and verify missing required keys exit nonzero with `Missing required version key`.

- [ ] **Step 2: Run parser tests and verify RED**

Run: `rtk proxy bun test tests/bootstrap.test.ts`

Expected: FAIL because `scripts/read-versions.ps1` and example do not exist.

- [ ] **Step 3: Add exact example data**

Create `config/versions.env.example` with:

```dotenv
# Tested OpenCode stack. Copy to ~/.config/opencode/versions.env and edit after reviewing releases.
OPENCODE_VERSION=1.17.18
OPENCODE_PLUGIN_VERSION=1.17.18
AI_SDK_OPENAI_COMPATIBLE_VERSION=3.0.7
OPENCODE_SUPERMEMORY_VERSION=2.0.8
OPENCODE_UPDATE_NOTIFIER_VERSION=0.3.3
OH_MY_OPENCODE_SLIM_VERSION=2.2.0
```

- [ ] **Step 4: Implement non-executable parser**

Create `scripts/read-versions.ps1` with a `-Path` parameter. Read lines, ignore blank/comment lines, split once on `=`, accept only uppercase underscore keys, validate values with `^[0-9A-Za-z][0-9A-Za-z.+-]*$`, require all six keys, then output one JSON object for testability. Do not dot-source file.

- [ ] **Step 5: Run parser tests and verify GREEN**

Run: `rtk proxy bun test tests/bootstrap.test.ts`

Expected: parser tests pass; existing tests remain green.

### Task 2: Targeted OMO Slim Update

**Files:**
- Modify: `bootstrap.ps1`
- Modify: `update-plugins.ps1`
- Modify: `tests/bootstrap.test.ts`

**Interfaces:**
- Consumes: `-UpdateOnly`, `-Component OmoSlim`, optional `-VersionsFile` for tests and alternate machines.
- Produces: exact OMO installation followed by tracked config restoration and active exact pin.

- [ ] **Step 1: Add failing mode tests**

Add static and process-level tests proving:

```powershell
.\bootstrap.ps1 -UpdateOnly -Component OmoSlim -VersionsFile <temp-file>
```

reads `OH_MY_OPENCODE_SLIM_VERSION`, uses exact package spec, passes `--yes`, restores OMO/TUI configs after installer, repins both active global and TUI root plugin entries, restores six audited local plugins, and does not enter full copy, CodeGraph, environment, skill-link, or RTK-init sections.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `rtk proxy bun test tests/bootstrap.test.ts`

Expected: FAIL because new parameters and branch do not exist.

- [ ] **Step 3: Extract version loading and OMO installation helpers**

Add minimum PowerShell helpers inside `bootstrap.ps1`:

```powershell
function Get-VersionConfig { param([string]$Path) ... }
function Install-OmoSlim { param([string]$Version) ... }
```

Default version path is `$ConfigDir\versions.env`. Copy `config/versions.env.example` only when missing. `Install-OmoSlim` performs installer, tracked-config restoration, root repin, and exact npm install.

- [ ] **Step 4: Add early targeted branch**

After directory and version initialization:

```powershell
if ($UpdateOnly) {
  if ($Component -ne "OmoSlim") { throw "-UpdateOnly requires -Component OmoSlim" }
  Install-OmoSlim -Version $versions.OH_MY_OPENCODE_SLIM_VERSION
  return
}
```

Full bootstrap reuses same loaded versions for dependency pins and OMO install.

- [ ] **Step 5: Replace broad updater behavior**

Change `update-plugins.ps1` into narrow compatibility wrapper accepting `-Component OmoSlim`, `-DryRun`, and `-VersionsFile`. Dry run reports exact command and restore targets. Real run calls `bootstrap.ps1 -UpdateOnly` with same component/file. Remove `@latest`, raw-file overwrite list, CodeGraph upgrade, and broad `npm update` paths.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `rtk proxy bun test tests/bootstrap.test.ts`

Expected: all bootstrap tests pass.

- [ ] **Step 7: Parse-check PowerShell**

Run:

```powershell
rtk proxy pwsh -NoProfile -Command '$null = [System.Management.Automation.Language.Parser]::ParseFile("bootstrap.ps1", [ref]$null, [ref]$errors); if ($errors) { $errors; exit 1 }'
rtk proxy pwsh -NoProfile -Command '$null = [System.Management.Automation.Language.Parser]::ParseFile("update-plugins.ps1", [ref]$null, [ref]$errors); if ($errors) { $errors; exit 1 }'
```

Expected: exit 0.

### Task 3: Restore Accurate Upstream Comments and Diff Notes

**Files:**
- Modify: `plugins/rtk.ts`
- Modify only if comparison proves inaccurate removal: `plugins/lazy-load.ts`
- Modify: `pr.md`

**Interfaces:**
- Consumes: current upstream RTK `develop`, lazy-loading `main`, token-source `main`, Deep Research current default branch, OMO Slim current source.
- Produces: code comments matching behavior and complete human-readable diff record.

- [ ] **Step 1: Record current upstream commits**

Use `rtk git rev-parse HEAD` in each clean temp clone. Record branch and commit in `pr.md`; RTK must say `develop`.

- [ ] **Step 2: Restore RTK explanatory comments**

Restore upstream header describing RTK token-saving rewrite delegation, minimum version, and Rust registry source of truth. Restore upstream rewrite-failure comment if still exact. Keep all functional Windows/Desktop changes.

- [ ] **Step 3: Review lazy-load comments line by line**

Use raw `git diff --no-index` only because RTK no-index output was proven empty. Restore upstream comments only when corresponding local code still follows described behavior. Do not restore stale comments or alter runtime behavior.

- [ ] **Step 4: Expand `pr.md` source map and exact diffs**

Add Deep Research, five strategy modules, web-search agent, OMO field-level settings, notifier coverage limits, correct RTK branch, and any comment-only differences. Replace vague “9router preset” wording with exact local settings.

- [ ] **Step 5: Verify comment-only runtime diff**

Run: `rtk proxy bun test`

Expected: all tests pass.

### Task 4: OpenCode Agent and Update Guides

**Files:**
- Create: `docs/opencode-agents.md`
- Modify: `README.md`
- Modify: `setup.md`
- Modify: `pr.md`

**Interfaces:**
- Consumes: official OpenCode agent/config docs and OpenCode School beginner material.
- Produces: beginner-readable explanation and copy-paste update workflow.

- [ ] **Step 1: Write agent guide with purpose first**

Explain primary agents/main switcher, subagents/`@`, modes, hidden autocomplete, task permissions, model inheritance/overrides, system agents, OMO roles, and why research strategy files live under `data/`.

- [ ] **Step 2: Document private version workflow**

Add commands:

```powershell
Copy-Item .\config\versions.env.example "$HOME\.config\opencode\versions.env"
notepad "$HOME\.config\opencode\versions.env"
.\bootstrap.ps1 -UpdateOnly -Component OmoSlim
```

State full bootstrap remains first-install/recovery tool, not normal updater.

- [ ] **Step 3: Update future-agent prompt**

Tell future agent to update private version file, run one-component update, compare upstream commits/files, preserve tailored OMO and Deep Research changes, and verify notifier blind spots manually.

- [ ] **Step 4: Add README navigation**

Link `docs/opencode-agents.md`, version/update section, and Deep Research origin from main README. Each linked document must state purpose in opening paragraph.

- [ ] **Step 5: Run documentation checks**

Run:

```powershell
rtk rg -n "Deep-Research-skills|versions.env|UpdateOnly|hidden: true|permission.task|file:.*not checked|develop" README.md setup.md pr.md docs/opencode-agents.md
rtk rg -n "oh-my-opencode-slim@latest|npm update --save" bootstrap.ps1 update-plugins.ps1 setup.md pr.md
```

Expected: first command finds every required concept; second finds no executable update instruction.

### Task 5: Full Verification and Diff Audit

**Files:**
- Review only: all changed files

**Interfaces:**
- Consumes: completed Tasks 1-4.
- Produces: fresh evidence for handoff.

- [ ] **Step 1: Run full tests**

Run: `rtk proxy bun test`

Expected: zero failures.

- [ ] **Step 2: Run safe updater dry run**

Run: `rtk proxy pwsh -NoProfile -File .\update-plugins.ps1 -Component OmoSlim -DryRun`

Expected: exact pinned version, installer command, and restore targets; no mutation.

- [ ] **Step 3: Review repository diff**

Run:

```powershell
rtk git status --short
rtk git diff --stat
rtk git diff -- bootstrap.ps1 update-plugins.ps1 config/versions.env.example scripts/read-versions.ps1 tests/bootstrap.test.ts plugins/rtk.ts README.md setup.md pr.md docs/opencode-agents.md
```

Expected: every changed line maps to approved design; unrelated user changes remain intact.

- [ ] **Step 4: Scan for secrets and unsafe updates**

Run:

```powershell
rtk rg -n "sm_[A-Za-z0-9_-]{20,}|YOUR_API_KEY_HERE|@latest|npm update" bootstrap.ps1 update-plugins.ps1 config scripts README.md setup.md pr.md docs/opencode-agents.md
```

Expected: no real secret; no unsafe executable updater path.

- [ ] **Step 5: Report exact evidence**

Report test counts, PowerShell parse results, dry-run output summary, upstream commit table, notifier coverage, and any verification not run. Do not claim live update success unless real selected update was authorized and executed.
