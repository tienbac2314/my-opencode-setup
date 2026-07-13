# OpenCode Documentation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-context, technically exact documentation suite for restored OpenCode architecture, setup, plugin patches, current defects, legacy evidence, and recovery history.

**Architecture:** Root files are canonical entry points. Ordered files under `docs/debug-journey/` hold recovery evidence. Existing docs paths become compatibility stubs, and `archive/broken-docs-reference` protects broken documentation-bearing history without changing runtime source.

**Tech Stack:** Git, Markdown, PowerShell 7+, Bun tests, OpenCode 1.17.18, 9router, CodeGraph, RTK, Vshell.

## Global Constraints

- Canonical files: `README.md`, `setup.md`, `pr.md`, and `knownbug.md`.
- Debug files: `docs/debug-journey/README.md`, `01-tree-corruption.md`, `02-lazy-load-failure.md`, `03-baseline-comparison.md`, and `04-recovery-validation.md`.
- Compatibility files contain links, not duplicated canonical prose.
- Archive branch must point to `c286bb890666528fbdfed486f1851b1226a075b6`.
- Explicit npm plugins remain `opencode-update-notifier@0.3.3` and `oh-my-opencode-slim@2.1.1`.
- Active local plugins remain `0-tokens-source.ts`, `codegraph-helper.ts`, `lazy-load.ts`, `models-discovery.js`, `rtk.ts`, and `supermemory.ts`.
- Mem0 remains archive-only.
- No runtime source or configuration edits.
- No credential values or secret-shaped example values.
- Every shell command uses explicit `rtk` wrapper when supported.

---

### Task 1: Preserve and Index Broken Documentation History

**Files:**
- Modify later: `knownbug.md`
- Reference: `docs/superpowers/specs/2026-07-13-opencode-recovery-design.md`

**Interfaces:**
- Consumes: broken tip `c286bb890666528fbdfed486f1851b1226a075b6` and existing safety branch `codex/pre-cleanup-c286bb8`.
- Produces: branch `archive/broken-docs-reference` and exact documentation-bearing commit inventory.

- [ ] **Step 1: Prove archive branch is absent before creation**

Run:

```powershell
rtk git show-ref --verify refs/heads/archive/broken-docs-reference
```

Expected: nonzero exit before first creation.

- [ ] **Step 2: Create archive branch without switching working tree**

Run:

```powershell
rtk git branch archive/broken-docs-reference c286bb890666528fbdfed486f1851b1226a075b6
```

Expected: exit 0; current branch remains `master`.

- [ ] **Step 3: Inventory documentation-bearing commits**

Run:

```powershell
rtk git log archive/broken-docs-reference --format="%H %s" --name-status -- "*.md"
```

Expected: full SHAs for Mem0 archive, Supermemory migration, known-bug updates, and broken-tip context.

- [ ] **Step 4: Prove branch protection**

Run:

```powershell
rtk git rev-parse archive/broken-docs-reference
rtk git merge-base --is-ancestor 490ed47467403ae1405a9d513dec80fd860721e1 archive/broken-docs-reference
```

Expected: first command prints `c286bb890666528fbdfed486f1851b1226a075b6`; ancestry check exits 0.

### Task 2: Rewrite Primary Architecture and Onboarding Map

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: current plugin source, effective plugin origins, pinned packages, design spec.
- Produces: canonical navigation and architecture vocabulary used by every other document.

- [ ] **Step 1: Capture current effective facts**

Run:

```powershell
rtk bun pm ls
rtk opencode models 9router
rtk opencode debug config
```

Expected: pinned packages, six `9router/oc/*` models without `9router/opencode/*`, and eight plugin origins.

- [ ] **Step 2: Rewrite README sections**

Required section order:

```markdown
# OpenCode Dotfiles
## Verified Runtime
## Architecture
## Tool Execution Flow
## Plugin Loading and Ordering
## Active Plugin Matrix
## Repository Layout
## Quick Start
## Verification Entry Points
## Documentation Map
## Historical Boundary
```

Document request-body tool stripping, `load_tool` response rewriting, DSML conversion, per-turn reset, local auto-discovery, npm pinning, and Supermemory wrapper boundary.

- [ ] **Step 3: Verify complete active-plugin coverage**

Run:

```powershell
rtk rg -n "oh-my-opencode-slim|codegraph-helper|supermemory|lazy-load|tokens-source|models-discovery|opencode-update-notifier|RTK" README.md
```

Expected: every active component appears in architecture or plugin matrix.

### Task 3: Write Zero-Context Setup Guide

**Files:**
- Create: `setup.md`
- Replace with compatibility stub: `docs/supermemory-setup.md`

**Interfaces:**
- Consumes: `bootstrap.ps1`, config examples, pinned package list, verified launch commands.
- Produces: executable clone-to-App/TUI procedure and canonical Supermemory setup section.

- [ ] **Step 1: Record bootstrap interface and tracked examples**

Run:

```powershell
rtk proxy pwsh -NoProfile -Command "Get-Help .\bootstrap.ps1 -Detailed"
rtk rg --files config
```

Expected: bootstrap parameters plus provider, TUI, OMO Slim, and Supermemory example files.

- [ ] **Step 2: Create setup guide sections**

Required section order:

```markdown
# OpenCode Setup
## Supported Environment
## Required Software
## Clone and Bootstrap
## Bootstrap Parameters
## Provider Credentials
## Supermemory Credentials and Endpoint
## Dependency Pins
## Effective Plugin Origins
## TUI Startup
## Desktop App Startup
## First-Run Lifecycle Checks
## Oracle VPS Health Checks
## Upgrade Procedure
## Recovery Diagnostics
## Security Rules
```

Use placeholder-only credential JSON. Include exact ignored target paths and warn that `workathome\.config` is reference-only.

- [ ] **Step 3: Replace old Supermemory document with stub**

Stub content must identify `../setup.md#supermemory-credentials-and-endpoint` as canonical and state that historical standalone details remain in Git history.

- [ ] **Step 4: Verify setup prerequisites and command coverage**

Run:

```powershell
rtk rg -n "Git|PowerShell|Bun|Node.js|OpenCode|CodeGraph|RTK|Vshell|bootstrap.ps1|opencode run|OpenCode.exe|supermemory.jsonc" setup.md
```

Expected: every dependency, startup path, and credential target appears.

### Task 4: Write Plugin Patch Ledger

**Files:**
- Create: `pr.md`

**Interfaces:**
- Consumes: current plugin diffs since `d8fa757a`, regression tests, installer repair logic.
- Produces: per-component patch and upgrade gates.

- [ ] **Step 1: Capture minimal recovery diffs**

Run:

```powershell
rtk git diff d8fa757a..HEAD -- plugins/lazy-load.ts plugins/supermemory.ts plugins/models-discovery.js plugins/rtk.ts bootstrap.ps1 scripts/pin-opencode-plugin.ps1 tests/lazy-load.test.ts tests/bootstrap.test.ts
```

Expected: current local divergences from stable baseline.

- [ ] **Step 2: Create patch ledger sections**

Required sections:

```markdown
# OpenCode Plugin Patch Ledger
## Patch Removal Policy
## lazy-load
## Supermemory Export Adapter
## Models Discovery Namespace Filter
## RTK Desktop Shell Guard
## Bootstrap OMO Slim Pin Preservation
## Bootstrap RTK Restoration
## tokens-source Wrapper Ordering
## CodeGraph Helper Desktop Safety
## npm Plugin Pinning
## Upgrade Verification Matrix
## Historical Mem0 Patches
```

Each active patch section must contain version, upstream assumption, failure, invariant, file, minimal diff or structural instruction, regression command, and removal gate.

- [ ] **Step 3: Verify patch ledger maps to source and tests**

Run:

```powershell
rtk rg -n "plugins/lazy-load.ts|plugins/supermemory.ts|plugins/models-discovery.js|plugins/rtk.ts|bootstrap.ps1|tests/lazy-load.test.ts|tests/bootstrap.test.ts" pr.md
```

Expected: all patched sources and regression suites appear.

### Task 5: Write Known Bugs and Legacy Commit Index

**Files:**
- Create: `knownbug.md`
- Replace with compatibility stub: `docs/opencode-bugs-known.md`

**Interfaces:**
- Consumes: archive branch inventory, current known-bug document, runtime verification evidence.
- Produces: current operational defect catalog and exact legacy retrieval index.

- [ ] **Step 1: Create current issue sections**

Required issues:

```markdown
# OpenCode Known Bugs and Operational Boundaries
## Local Plugin Duplication
## Desktop Plugin Module Shape
## OpenCode Free-Tier Exhaustion
## DeepSeek DSML After Compaction
## Lazy-Load Turn-State Invariant
## Supermemory Module Shape
## Supermemory Standalone Server Version
## Skill Duplication Warnings
## Models Discovery Namespace Pollution
## RTK Shell Injection
## Historical Mem0 Boundary
## Broken Documentation Archive
```

Every current issue must state symptom, cause, rule, detection, and recovery.

- [ ] **Step 2: Add exact legacy commit table**

Index these documentation-bearing commits with full SHA, subject, useful content, invalid runtime assumption, and an exact `rtk git show 045b733afc6fc2c97ca6a1d5fe69ab6924c00125 -- "*.md"`-form retrieval command using each row's SHA:

```text
045b733afc6fc2c97ca6a1d5fe69ab6924c00125
fc9ffcb84f9c77bcc5fb132debdfa3becf4e2ab1
490ed47467403ae1405a9d513dec80fd860721e1
d8fa757af2f97a640610fb00e32d4d811a255fab
058581c3c42d03d9a89e30f0f0ecb280232f8300
28a0fcb479b0a3384b9950e95261ab59240f5868
c37c7fe95f386322aba3b225c85003c5defe818f
b69bb62a0c296e957f56a6baf2ea136674fdbc3b
751d216cfe4d0af4a6639d493b4659c0af62d6b5
5b096b70cdd17d8de6c038f020bf1b2188a9701a
256f2de90e7a16f04c288073e4c885e5e401c673
```

Mark `archive/broken-docs-reference` non-deployable.

- [ ] **Step 3: Replace old known-bug document with stub**

Stub must link `../knownbug.md` and contain no duplicated issue text.

- [ ] **Step 4: Verify every indexed SHA is reachable**

Run:

```powershell
$shas = @(
  '045b733afc6fc2c97ca6a1d5fe69ab6924c00125',
  'fc9ffcb84f9c77bcc5fb132debdfa3becf4e2ab1',
  '490ed47467403ae1405a9d513dec80fd860721e1',
  'd8fa757af2f97a640610fb00e32d4d811a255fab',
  '058581c3c42d03d9a89e30f0f0ecb280232f8300',
  '28a0fcb479b0a3384b9950e95261ab59240f5868',
  'c37c7fe95f386322aba3b225c85003c5defe818f',
  'b69bb62a0c296e957f56a6baf2ea136674fdbc3b',
  '751d216cfe4d0af4a6639d493b4659c0af62d6b5',
  '5b096b70cdd17d8de6c038f020bf1b2188a9701a',
  '256f2de90e7a16f04c288073e4c885e5e401c673'
)
foreach ($sha in $shas) {
  rtk git merge-base --is-ancestor $sha archive/broken-docs-reference
  if ($LASTEXITCODE -ne 0) { throw "Unreachable legacy commit: $sha" }
}
```

Expected: exit 0 for every legacy entry.

### Task 6: Write Chronological Debug Journey

**Files:**
- Create: `docs/debug-journey/README.md`
- Create: `docs/debug-journey/01-tree-corruption.md`
- Create: `docs/debug-journey/02-lazy-load-failure.md`
- Create: `docs/debug-journey/03-baseline-comparison.md`
- Create: `docs/debug-journey/04-recovery-validation.md`

**Interfaces:**
- Consumes: recovery design, recovery plan, Git lineage, lazy-load regression tests, plugin audit evidence.
- Produces: ordered evidence chain from failure through recovery proof.

- [ ] **Step 1: Write journey index**

State stable boundary `d8fa757a`, broken tip `c286bb8`, recovered commit chain, reading order, and final state.

- [ ] **Step 2: Write tree-corruption analysis**

Include exact commit chronology, useful versus invalid changes, safety branch, reset rationale, and archive retrieval commands.

- [ ] **Step 3: Write lazy-load failure mechanics**

Document standard SSE `delta.tool_calls`, split JSON arguments, DSML content buffering, finish events, dropped-control-flow bug, repeated plugin initialization bug, and corrected event classification.

- [ ] **Step 4: Write baseline comparison**

Separate facts found in `workathome\.config` from absent custom framework logic. Explain why baseline proved provider/config health but could not supply lazy-load implementation.

- [ ] **Step 5: Write recovery validation**

Record 14-test suite, plugin bundles, CLI/TUI/Desktop exact markers, eight plugin origins, six hash matches, model counts, Supermemory CRUD lifecycle, and Oracle VPS HTTP/service checks.

- [ ] **Step 6: Verify chronological cross-links**

Run:

```powershell
rtk rg -n "01-tree-corruption|02-lazy-load-failure|03-baseline-comparison|04-recovery-validation" docs/debug-journey/README.md
```

Expected: all four ordered entries resolve.

### Task 7: Complete Documentation Audit and Verification

**Files:**
- Modify only when verification reports a defect: `README.md`, `setup.md`, `pr.md`, `knownbug.md`, `docs/debug-journey/README.md`, `docs/debug-journey/01-tree-corruption.md`, `docs/debug-journey/02-lazy-load-failure.md`, `docs/debug-journey/03-baseline-comparison.md`, `docs/debug-journey/04-recovery-validation.md`, `docs/opencode-bugs-known.md`, `docs/supermemory-setup.md`.

**Interfaces:**
- Consumes: completed documentation suite and current runtime evidence.
- Produces: verified, committed documentation-only change set.

- [ ] **Step 1: Run existing regression suite**

Run:

```powershell
rtk bun test
```

Expected: 14 pass, 0 fail.

- [ ] **Step 2: Validate tracked relative links**

Parse tracked Markdown links, ignore `http:`, `https:`, `mailto:`, and anchors, resolve each remaining target relative to source file, and fail on missing targets.

Expected: zero missing relative targets.

- [ ] **Step 3: Scan documentation constraints**

Run:

```powershell
rtk rg -n "TBD|TODO|In this document|we will|sm_[A-Za-z0-9]{10,}" README.md setup.md pr.md knownbug.md docs/debug-journey docs/opencode-bugs-known.md docs/supermemory-setup.md
```

Expected: no matches.

- [ ] **Step 4: Validate Git and archive state**

Run:

```powershell
rtk git diff --check
rtk git rev-parse archive/broken-docs-reference
rtk git status --short
```

Expected: no whitespace errors; archive ref equals broken tip; only intended documentation files changed before final commit.

- [ ] **Step 5: Run independent link and formatting review**

Reviewer scope: relative links, headings, fenced blocks, tables, SHA consistency, canonical/stub boundaries, and setup command sequence. Reviewer must not edit files.

- [ ] **Step 6: Commit implementation**

Run:

```powershell
rtk git add README.md setup.md pr.md knownbug.md docs/debug-journey docs/opencode-bugs-known.md docs/supermemory-setup.md docs/superpowers/plans/2026-07-13-opencode-documentation.md
rtk git commit -m "docs: document restored plugin system"
```

Expected: commit succeeds and `rtk git status --short` is empty.
