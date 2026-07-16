# Engineering Decisions

Purpose: retain implementation context that future maintainers need without storing private chain-of-thought, raw transcripts, or secrets.

## Recording rule

For any non-trivial architecture, integration, migration, or rejected approach, add or update a concise entry before completion. Each entry must contain:

- status and date;
- problem and constraints;
- considered alternatives;
- decision and ownership boundary;
- implementation paths;
- reproducible evidence;
- supersession or removal condition.

Record conclusions and evidence, not internal deliberation. Never include credentials, full resolved config, personal data, private prompts, or unredacted logs. When a decision changes, mark the old entry superseded and link the replacement; do not silently erase history.

## 2026-07-16: Normalized full-repository history

Status: active.

Problem: cleanup commit `e661d8f` correctly removed obsolete runbooks and unsafe archives from active documentation, but left important rationale discoverable only through Git archaeology. Existing maintenance history covered recent refactor, not initial triage, Mem0, broken-tree recovery, Goal/Headroom iterations, or OpenViking side-branch research.

Alternatives: restore deleted documents verbatim, leave history in Git only, or normalize evidence into explicitly historical records.

Decision: retain active guides as current authority and add a historical corpus: timeline, architecture evolution, incident ledger, and source index. Superseded commands remain summarized rather than executable. Source index freezes all 104 commits reachable across refs at reconstruction time and maps deleted documents to `git show` paths.

Evidence: `git rev-list --all`, `git log --all`, Markdown add/delete/rename history, deleted blobs at representative transition commits, and current tests. Historical source index contains 104 unique commit rows with no missing pre-reconstruction hash.

Supersede only with a history format that preserves equivalent graph coverage, deleted-document retrieval, current-versus-historical separation, and verifiable source references.

## 2026-07-16: Headroom service and OpenCode transport

Status: active.

Problem: Headroom had to serve both Desktop and TUI while preserving dynamic 9router providers/models. Its official OpenCode wrapper introduced synthetic providers and persistent MCP state, and a direct scheduled console action remained visible.

Alternatives:

- official `headroom wrap opencode`: rejected for config/model/MCP mutation;
- shell profile wrapper: rejected because Desktop would bypass it;
- per-OpenCode temporary proxy: rejected because Desktop and TUI would not share lifecycle;
- independent proxy plus auto-discovered bridge: selected.

Decision: a current-user login task owns one loopback proxy. `plugins/headroom.ts` provides fail-open in-process transport for both OpenCode surfaces. A hidden PowerShell runner redirects proxy output to bounded local logs.

Implementation: `plugins/headroom.ts`, `scripts/manage-headroom-proxy.ps1`, `scripts/run-headroom-proxy.ps1`, `scripts/remove-headroom-opencode-pollution.ps1`, and pinned source transport from `config/components.json`.

Evidence: Headroom tests pass; manifest verification reports matching local plugin hashes and origins; live Desktop/TUI requests increment proxy `/v1/chat/completions`; task and dashboard remain healthy; provider/MCP inventories remain unmodified.

Supersede when upstream ships provider-neutral Desktop/TUI transport and a no-mutation service lifecycle.

## 2026-07-16: RTK ownership with Headroom

Status: active.

Problem: Headroom's banner says `Context Tool: rtk`, which can imply bare proxy performs shell rewriting.

Alternatives: remove local RTK as duplicate, or retain it as OpenCode hook.

Decision: retain local RTK. `plugins/rtk.ts` executes `rtk rewrite` for OpenCode. `headroom wrap` owns upstream RTK setup/instruction injection, but is not used here. Bare proxy reads `rtk gain` for metrics and does not run RTK on tool-result content.

Evidence: pinned and current upstream `docs/rtk-architecture.md`, `headroom/cli/wrap.py`, and `headroom/proxy/helpers.py`; local plugin source; Desktop/TUI rewrite tests.

Supersede when OpenCode or Headroom provides a provider-neutral native hook that covers both Desktop and TUI without policy injection.

## 2026-07-16: Single persistent-memory owner

Status: active.

Problem: Headroom and Supermemory can both store and inject cross-session memories.

Alternatives: enable both, replace Supermemory with Headroom memory, or keep one owner.

Decision: Supermemory remains sole persistent-memory owner. Headroom memory, automatic memory tools/context, and learning stay disabled. Headroom owns transport optimization only.

Evidence: Headroom CLI exposes project/user/global memory storage, tool/context injection, and learning; live proxy reports memory disabled; runner passes explicit memory/learning-off options; Supermemory CRUD lifecycle passes.

Supersede only after a deliberate memory migration with export, re-ingestion, rollback, and duplicate-context tests.

## 2026-07-15: Unified component maintenance

Status: active.

Decision: `config/components.json` is the only version/source authority. `setup.ps1` handles machine convergence; `maintain.ps1` handles check, plan, approved apply, and verification. Copied forks remain review-only.

Evidence and migration detail: [Maintenance refactor](maintenance-refactor.md).
