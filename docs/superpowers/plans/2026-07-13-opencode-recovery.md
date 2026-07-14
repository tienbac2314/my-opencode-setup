# OpenCode Repository Recovery Implementation Plan

This completed plan records recovery work and old checkpoints. Use [setup.md](../../../setup.md) and [pr.md](../../../pr.md) for current commands.

> Execute in order. Each task has independent verification evidence.

**Goal:** Rebuild clean post-`d8fa757a` history with working lazy-loaded tools, preserved Supermemory migration, functioning README plugins, and verified TUI/Desktop/VPS operation.

**Architecture:** Stable baseline plus surgical, reviewed commits. Local TypeScript/JavaScript plugins auto-discover from `plugins/`; npm plugins remain configured explicitly. Lazy-load fetch wrapper classifies text/DSML deltas separately from standard tool-call and finish deltas.

**Runtime:** OpenCode 1.17.18, Bun, TypeScript plugins, PowerShell bootstrap, Git, Computer Use, Vshell.

---

### Task 1: Establish clean recovery base

**Files:**
- Add: `.codegraph/.gitignore`
- Add: recovery design and plan documents

1. Confirm `master` points to `d8fa757a` and safety branch points to `c286bb8`.
2. Track only `.codegraph/.gitignore`; keep database and daemon files ignored.
3. Commit recovery metadata.
4. Verify clean status and exact refs.

### Task 2: Reapply validated Supermemory migration

**Files:**
- Modify: `README.md`
- Modify: `bootstrap.ps1`
- Modify: `config/opencode.jsonc.example`
- Add: `plugins/supermemory.ts`
- Add: `docs/supermemory-setup.md`
- Move: `mem0-plugin/` to `mem0-archive/`
- Move: `mem0-selfhost-patch.ts` to `mem0-archive/`

1. Inspect safety-branch migration diff file-by-file.
2. Reapply only wrapper, config, archive, bootstrap, and accurate documentation changes.
3. Run secret scan over tracked diff.
4. Bootstrap to temporary config root and verify expected file layout.
5. Import Supermemory wrapper with installed package and verify plugin initialization.
6. Commit migration.

### Task 3: Create lazy-load regression harness

**Files:**
- Add: `tests/lazy-load.test.ts`
- Modify minimally: `plugins/lazy-load.ts` only if export seam is required

1. Add test for chunked standard `load_tool` event.
2. Add test for direct built-in rewrite.
3. Add test for same-turn loaded direct execution.
4. Add test for `finish_reason: "stop"` preservation and state reset.
5. Add test for split DSML start/end boundaries.
6. Add test for ordinary content/reasoning preservation.
7. Run tests against broken reference implementation and confirm expected failures.
8. Run tests against stable implementation and distinguish missing DSML support from regressions.

### Task 4: Repair SSE transform

**Files:**
- Modify: `plugins/lazy-load.ts`

1. Gate DSML accumulator to content/reasoning text deltas only.
2. Let standard `delta.tool_calls` reach existing buffer/filter logic.
3. Let empty finish deltas reach finish-state cleanup logic.
4. Preserve split-boundary DSML conversion.
5. Run targeted tests until all pass.
6. Run TypeScript/Bun import smoke check.
7. Commit framework repair.

### Task 5: Normalize plugin loading and deploy active config

**Files:**
- Modify: `config/opencode.jsonc.example`
- Modify: `config/tui.json`
- Modify: `bootstrap.ps1`
- Modify only required plugin wrappers under `plugins/`

1. Remove redundant explicit local plugin entries where auto-discovery is authoritative.
2. Keep npm plugins explicit.
3. Bootstrap into temporary root; compare against `workathome\.config` provider structure.
4. Back up active config through existing bootstrap workflow.
5. Apply rebuilt repository config to active OpenCode directory.
6. Run `opencode debug config`; verify each plugin origin appears once.
7. Run live `load_tool` plus shell execution smoke twice across separate turns.

### Task 6: Delegate README plugin lifecycle audits

1. Spawn parallel agents only after Task 5 smoke passes.
2. Split independent plugin groups across agents.
3. Require command evidence, lifecycle result, errors, and exact files changed.
4. Review all agent changes centrally; reject unrelated edits.
5. Rerun each lifecycle centrally after integration.

### Task 7: Validate TUI and Desktop App

1. Locate installed OpenCode TUI and Desktop launch paths without exposing credentials.
2. Launch TUI through Computer Use and visually execute lazy-loaded shell tool.
3. Launch Desktop App through Computer Use and execute equivalent tool flow.
4. Verify Supermemory and one non-memory plugin through each supported UI.
5. Capture screenshots or visible state evidence without secrets.

### Task 8: Validate Oracle VPS alignment

1. Check service/tunnel state through Vshell.
2. Check recent logs for request failures and restarts.
3. Execute authenticated Supermemory lifecycle from local plugin client.
4. Verify public and VPS-local endpoints.
5. Update stale deployment documentation only where current evidence contradicts it.

### Task 9: Completion audit

1. Run targeted tests and full available checks.
2. Verify every README plugin initializes and completes documented lifecycle.
3. Verify TUI and Desktop evidence.
4. Verify Supermemory temporary data cleanup.
5. Verify `master` ancestry begins at `d8fa757a` with only recovery commits.
6. Verify clean worktree and no tracked secrets/logs/databases.
7. Request final code review and address findings.
