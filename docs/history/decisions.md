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

## 2026-07-20: Lazy-load maintained fork authority

Status: active.

Problem: dotfiles carried an early local compatibility patch while component authority still identified original upstream commit `11ee174`. The independently reviewed fork evolved those ideas into request-local gateway state, conservative schema normalization, strict streamed DSML conversion, preserved MCP routing, stable finish/index ordering, and 37 behavioral regressions. Keeping a divergent local copy made updates and provenance ambiguous.

Alternatives: retain the local patch, wait for original upstream adoption, or pin the maintained fork. Retaining two implementations duplicates review; waiting restores known Desktop and model failures.

Decision: `tienbac2314/opencode-lazy-loading` commit `dcc5e7f` is the managed lazy-load source. `plugins/opencode-lazy-load.ts` and `tests/opencode-lazy-load.test.ts` are exact copies of the fork files. Original `omarwaly-ai/opencode-lazy-loading` remains the PR target and historical upstream.

Evidence: the fork suite against the prior dotfiles implementation produced 13 passes and 24 failures. The exact fork implementation produced 37 passes, 0 failures, and 123 assertions. Repository, fork, and active plugin hashes match; the full dotfiles suite covers deployment and manifest integration.

Supersede when original upstream merges equivalent behavior and passes all fork regressions, or a newer reviewed fork commit replaces `dcc5e7f`.

## 2026-07-20: Bidirectional CodeGraph MCP state

Status: active.

Problem: the global CodeGraph MCP fails during startup outside indexed repositories, so the helper historically disabled it when `.codegraph/codegraph.db` was absent. That hook only wrote `false`. OpenCode Desktop can reuse the resolved config object across workspace initialization, so opening an unindexed workspace poisoned later indexed workspaces and CodeGraph remained disabled. TUI usually starts with one workspace and did not expose the stale transition.

Alternatives: remove dynamic disabling, add a session-aware MCP proxy, or make the existing config hook assign both enabled and disabled states. Removing the hook restores the original unindexed startup error/freeze; a proxy duplicates OpenCode and CodeGraph lifecycle machinery.

Decision: preserve the global MCP entry and let the helper own `codegraph.enabled`, setting it to the current plugin instance's `.codegraph/codegraph.db` result on every config hook. Search enforcement remains inert in unindexed workspaces and session-scoped in indexed workspaces. OpenCode exposes one mutable config property rather than a per-session MCP switch; if a host shares that live object across concurrently initialized workspaces, the most recent config hook wins. The sequential Desktop transition reported here is covered; true concurrent isolation requires an upstream workspace-scoped MCP API.

Implementation: `plugins/codegraph-helper.ts`, `tests/codegraph-helper.test.ts`, troubleshooting, and local-patch reference.

Evidence: commit `a55c657` records the original unindexed startup failure and disable-only mitigation. The regression passes one shared config through unindexed then indexed plugin instances; it fails with stale `false` before the fix and passes with bidirectional assignment. Focused and full repository tests verify existing metadata-only, session-isolation, and search-fallback behavior.

Supersede when OpenCode provides workspace-scoped MCP configuration without shared mutable state, or CodeGraph starts safely outside indexed repositories.

## 2026-07-19: Direct OMO Slim image routing

Status: active.

Problem: OMO Slim's effective `auto` image path intercepted attachments when Observer was enabled. It saved image data locally, removed binary image parts from the primary model request, and inserted `@observer` delegation text. Vision-capable models reached through 9router therefore never received the original image payload.

Alternatives: retain automatic Observer delegation, patch/fork OMO Slim for model-capability detection, or select its supported direct-routing mode. Automatic delegation blocked native vision; a package fork added ownership and update cost for behavior already exposed by configuration.

Decision: tracked OMO configuration sets top-level `image_routing: direct`. OMO Slim package/source remains vanilla. Model/provider selection owns image capability, while Observer remains available for explicit delegation. Existing auto-update, preset, fallback, MCP, tool, skill, and disabled-agent behavior stays unchanged.

Implementation: `config/oh-my-opencode-slim.json`, setup/maintenance's existing config copy path, tracked/deployed config regression tests, and current setup/agent/troubleshooting documentation.

Evidence: installed OMO Slim 2.2.1 schema and runtime implement `direct` as an early bypass of attachment processing; failing tests observed `image_routing` absent before the config change; focused tests prove tracked and isolated deployed configs contain `direct`. Live acceptance requires a vision-capable 9router model to analyze an attached image without injected Observer delegation text.

Supersede when OMO Slim provides reliable capability-aware routing that preserves direct delivery for vision-capable models, or OpenCode owns an equivalent per-model attachment-routing policy.

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

Decision: a current-user login task owns one loopback proxy. `plugins/headroom.ts` provides fail-open in-process transport for both OpenCode surfaces, with four short health attempts so stale state cannot hold startup. A hidden PowerShell runner merges output into a two-file rolling log and enforces memory, learning, and telemetry disablement on every launch path.

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
