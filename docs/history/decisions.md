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

## 2026-07-22: Lean setup archives memory, Goal, and CodeGraph helper layers

Status: active.

Problem: setup carried disabled or patched systems that no longer served the desired daily runtime: Supermemory and older Mem0 migration machinery, Goal integration, and a local CodeGraph workspace helper. Their packages, patches, credentials, commands, cleanup paths, tests, and current docs expanded every setup and update. Goal works in `tienbac2314/opencode-goal-plugin`, but the desired OpenCode core integration remains unreliable. The CodeGraph helper was originally added after a real uninitialized-project error; later search interception and process-global tool discovery caused subagent failures.

Alternatives: keep dormant artifacts in the manifest, move source into a tracked archive directory, or remove active artifacts and rely on Git plus existing history documents. Dormant entries keep setup complex; a copied archive duplicates Git history.

Decision: keep global CodeGraph 1.4.1 and remove only the helper. CodeGraph now reports an uninitialized directory cleanly; agent policy uses it only when `.codegraph/codegraph.db` exists and falls back to normal search. Remove Supermemory, Goal, and Mem0 runtime/setup artifacts completely. Remove the generic `retired` manifest and maintenance paths. Preserve their engineering record only in `docs/history/` and Git history; current README, setup, troubleshooting, patch, upstream, and agent flows describe only active components.

Implementation: component manifest/schema, setup and maintenance scripts, credential import/export, runtime plugins and commands, package patches, verifiers, current docs, and deployment tests.

Evidence: installed CodeGraph 1.4.1 returns `Not initialized` without crashing in an empty directory; upstream documents global installation plus per-project initialization. Lean-setup regression requires removed components and files to be absent and forbids retirement machinery in setup/maintenance. Full repository verification and resolved App/TUI plugin-origin checks must pass after active cleanup.

Supersede only when one archived capability is intentionally reintroduced as a newly reviewed active component with its own live lifecycle proof.

## 2026-07-22: Lazy-loaded MCP name discovery

Status: superseded by the request-scoped MCP discovery decision below.

Problem: lazy loading removed MCP tools from the provider request and deliberately omitted their names from the gateway catalog. OpenCode namespaced CodeGraph as `codegraph_codegraph_explore`, while prompt text also mentioned the alternate-client name `codegraph_explore`. Models knew CodeGraph was required but could not discover the callable OpenCode name, then repeated blocked `glob` calls or narrated guesses.

Alternatives: eagerly expose full MCP schemas, rely on prose in `AGENTS.md`, remove the CodeGraph guard, or expose names only. Full schemas lose most token savings; prose can disagree with runtime naming; removing the guard restores broad-search drift.

Decision: include exact request-captured MCP names in `load_tool`'s pointer list while keeping descriptions and schemas lazy. CodeGraph guard errors give the exact `load_tool` then `codegraph_codegraph_explore` sequence and forbid retrying broad search first.

Implementation: `plugins/opencode-lazy-load.ts`, `plugins/codegraph-helper.ts`, focused regressions, and patch reference.

Evidence: regression request containing namespaced CodeGraph now shows `codegraph_codegraph_explore` in the only provider-visible gateway description. Guard regression requires the exact sequence and remains session-scoped.

Superseded because process-global MCP discovery leaked orchestrator-only tools into subagents, while the hard search guard required those unavailable tools.

## 2026-07-22: Request-scoped MCP discovery and soft CodeGraph policy

Status: active.

Problem: the lazy loader stored MCP names and schemas in process-global maps. After an orchestrator exposed CodeGraph, subagents configured with `mcps: []` still saw `codegraph_codegraph_explore`; OpenCode then rejected the call as unavailable. The helper also blocked each subagent's first `glob` or `grep` because its attempt state was session-scoped.

Alternatives: give CodeGraph to every subagent, share a successful attempt across sessions, remove MCP discovery, or scope discovery to each request and stop enforcing search order in a hook. Broader MCP access violates agent configuration; shared state hides availability differences; removing discovery breaks valid orchestrator use.

Decision: snapshot MCP names, descriptions, and schemas from each provider request and use only that session's snapshot for gateway discovery, `load_tool`, and call rewriting. Remove all search interception from the CodeGraph helper. Keep only bidirectional `.codegraph/codegraph.db` availability control; agent instructions express CodeGraph-first as a soft policy with normal search fallback.

Implementation: `plugins/opencode-lazy-load.ts`, `plugins/codegraph-helper.ts`, agent policy, troubleshooting, patch reference, and focused regressions.

Evidence: regression first captures CodeGraph for an orchestrator, then starts a subagent request without it. The subagent gateway omits CodeGraph and `load_tool` returns unknown. Helper regression proves indexed workspaces expose no `tool.execute.before` hook.

Supersede when OpenCode provides native lazy tool discovery scoped to each agent request and workspace-aware CodeGraph activation.

## 2026-07-22: OMO Slim 2.2.6 and native Bun validation

Status: active; supersedes the Bun command-detection part of the 2026-07-20 decision.

Problem: OMO Slim 2.2.6 installation still reported `spawn bun ENOENT`. PowerShell resolved npm-created `bun.ps1` and `bun.cmd` shims, so the prerequisite check treated Bun as installed, but OMO's Node child process could not spawn a standalone executable. The 2.2.6 installer also changed its config entry to a managed tuple; the string-only pin synchronizer appended a duplicate `@latest` entry. Finally, 2.2.6 exported `minimumExpectedToolCount` beside its default plugin. OpenCode invoked both exported functions as plugins, so the helper received plugin context and failed on `disabledTools.filter` while the default export still initialized.

Alternatives: patch OMO, accept shell shims, or require official `bun.exe`. Patching remains unnecessary; shell shims cannot satisfy the upstream process contract.

Decision: on Windows, prerequisite validation requires runnable `bun.exe`. OMO maintenance prioritizes `$BUN_INSTALL/bin/bun.exe` or `~/.bun/bin/bun.exe` before fallback paths. Pin synchronization preserves OMO's managed tuple, updates its first item, and removes duplicate string entries. A one-line package patch removes the non-plugin helper export from installed, exact-cache, and `@latest` cache copies. Keep runtime entries on `@latest`; advance the reviewed install baseline to 2.2.6.

Implementation: `scripts/ensure-bun.ps1`, `maintain.ps1`, `config/components.json`, focused regressions, setup guidance, and troubleshooting guidance.

Evidence: a direct 2.2.6 installer run reproduced cache warm-up failure with shim-only PATH. After official Bun installation and PATH prioritization, the same installer warmed `oh-my-opencode-slim@2.2.6`; active npm state resolved 2.2.6 while tracked tailored OMO and TUI files were restored. Resolved config then reported eight plugins and eight origins with one OMO managed tuple. Before the export patch, fresh runs logged both successful default-plugin health and `disabledTools.filter` failure; afterward runtime module exports only `default` and a fresh health check reports seven agents, five tools, and three MCPs without load error.

Supersede when OMO no longer spawns external Bun or its child-process launcher supports Windows shell shims.

## 2026-07-20: Vanilla OMO Slim auto-update prerequisites

Status: superseded by the 2026-07-22 exact OMO Slim runtime pin decision below.

Problem: OMO Slim 2.2.1 detected 2.2.4 but failed installation with `spawn bun ENOENT` in OpenCode Desktop. Its updater directly invokes `bun install`; OpenCode's internal runtime does not place a standalone Bun executable on process PATH. Upstream also deliberately skips installation when plugin config contains an exact version.

Alternatives: patch OMO's updater, keep exact pins and update only through repository maintenance, install Bun through npm, or satisfy the upstream contract. Patching adds a local fork; exact pins contradict seamless auto-update; npm adds a secondary Bun distribution path.

Decision: use Bun's official platform installer from `setup.ps1` only when `bun` or `bunx` is missing. Keep OMO 2.2.4 as the tested fresh-install baseline, but use `oh-my-opencode-slim@latest` in Desktop and TUI so vanilla same-major auto-update is authorized. Keep every other component's exact-version policy unchanged.

Implementation: `scripts/ensure-bun.ps1`, `setup.ps1`, OMO manifest runtime target, config synchronization/verification, Desktop/TUI templates, setup/troubleshooting guidance, and isolated tests.

Evidence: upstream OMO code classifies exact versions as pinned and calls `bun install` only for plain or `@latest` entries. Regression tests cover existing, broken, missing, and `-WhatIf` Bun paths without network access, exact baseline installation, latest-channel synchronization, and exact targets for other components. Full verification passed 125 tests with 638 assertions; active package/config checks showed baseline 2.2.4 plus `@latest` in Desktop and TUI, a fresh user-PATH process resolved Bun/Bunx 1.3.14, and OMO initialized with its health check passing and no new `spawn bun ENOENT` log.

Superseded because later OMO releases required local compatibility patches and repeated update failures made an unreviewed runtime channel unsafe.

## 2026-07-22: Exact OMO Slim runtime pin

Status: active; search-enforcement wording superseded by the 2026-07-22 soft CodeGraph policy.

Problem: fresh setups loaded `oh-my-opencode-slim@latest` even though the repository tested, patched, and installed an exact version. A new upstream release could therefore bypass review, miss the matching local patch, or behave differently between new and existing machines.

Alternatives: keep `@latest`, pin only fresh setups, or use one exact manifest target everywhere. Keeping two policies preserves drift; `@latest` preserves first-launch risk.

Decision: use the exact OMO Slim `target` from `config/components.json` in fresh setup, Desktop, TUI, package installation, cache patching, and verification. Update OMO only by reviewing its upstream diff, changing the manifest target, applying the matching patch, and running full verification.

Implementation: remove OMO's `runtimeTarget`; synchronize and verify only `target`; pin both config templates and the schema URL; update setup and troubleshooting guidance.

Evidence: regression tests require the same exact OMO version in manifest, Desktop, and TUI. Repository verification covers package state, config synchronization, patch application, resolved plugin count, and test suite.

Supersede when OMO updates are proven compatible without version-specific patches and the repository has a pre-activation compatibility gate.

## 2026-07-20: Conservative 9router capability discovery

Status: active.

Problem: 9router `/models` returns richer capabilities than the local discovery plugin mapped. The plugin handled vision and limits but checked legacy `thinking` instead of current `reasoning`, omitted audio/video/PDF modalities and tool support, accepted only `{ data: [...] }`, and skipped discovery metadata whenever a manual model entry existed.

Alternatives: copy every 9router field into arbitrary model options, map only OpenCode's documented schema, or keep the partial mapper. Arbitrary `options` are passed to providers and could mutate requests; the partial mapper hid real capabilities.

Decision: map only fields supported by OpenCode's current custom-model schema: input/output modalities, attachment, reasoning, `tool_call`, and limits. Accept list envelopes, raw arrays, and standalone objects. Merge discovered defaults beneath manual entries so explicit user configuration remains authoritative. Keep `search`, thinking format/toggle/range, `owned_by`, and upstream-provider metadata in discovery logs only because OpenCode has no matching model-config fields.

Implementation: `plugins/models-discovery.js`, `tests/models-discovery.test.ts`, component verification text, troubleshooting, and patch reference.

Evidence: official OpenCode model documentation and `packages/opencode/src/provider/models.ts` define the supported fields. Exact Gemini and Kimi fixtures cover all supplied attributes; tests also cover legacy thinking, unsupported metadata isolation, response shapes, manual precedence, fallback preservation, and Headroom bypass.

Supersede when OpenCode provides native custom-provider discovery with equivalent response normalization, capability mapping, override precedence, and safe unsupported-metadata handling.

## 2026-07-20: Lazy-load maintained fork authority

Status: superseded in part by the 2026-07-22 MCP name-discovery delta.

Problem: dotfiles carried an early local compatibility patch while component authority still identified original upstream commit `11ee174`. The independently reviewed fork evolved those ideas into request-local gateway state, conservative schema normalization, strict streamed DSML conversion, preserved MCP routing, stable finish/index ordering, and 37 behavioral regressions. Keeping a divergent local copy made updates and provenance ambiguous.

Alternatives: retain the local patch, wait for original upstream adoption, or pin the maintained fork. Retaining two implementations duplicates review; waiting restores known Desktop and model failures.

Decision: `tienbac2314/opencode-lazy-loading` commit `dcc5e7f` is the managed lazy-load source. `plugins/opencode-lazy-load.ts` and `tests/opencode-lazy-load.test.ts` are exact copies of the fork files. Original `omarwaly-ai/opencode-lazy-loading` remains the PR target and historical upstream.

Evidence: the fork suite against the prior dotfiles implementation produced 13 passes and 24 failures. The exact fork implementation produced 37 passes, 0 failures, and 123 assertions. Repository, fork, and active plugin hashes match; the full dotfiles suite covers deployment and manifest integration.

Supersede when original upstream merges equivalent behavior and passes all fork regressions, or a newer reviewed fork commit replaces `dcc5e7f`.

## 2026-07-20: Bidirectional CodeGraph MCP state

Status: active.

Problem: the global CodeGraph MCP fails during startup outside indexed repositories, so the helper historically disabled it when `.codegraph/codegraph.db` was absent. That hook only wrote `false`. OpenCode Desktop can reuse the resolved config object across workspace initialization, so opening an unindexed workspace poisoned later indexed workspaces and CodeGraph remained disabled. TUI usually starts with one workspace and did not expose the stale transition.

Alternatives: remove dynamic disabling, add a session-aware MCP proxy, or make the existing config hook assign both enabled and disabled states. Removing the hook restores the original unindexed startup error/freeze; a proxy duplicates OpenCode and CodeGraph lifecycle machinery.

Decision: preserve the global MCP entry and let the helper own `codegraph.enabled`, setting it to the current plugin instance's `.codegraph/codegraph.db` result on every config hook. OpenCode exposes one mutable config property rather than a per-session MCP switch; if a host shares that live object across concurrently initialized workspaces, the most recent config hook wins. The sequential Desktop transition reported here is covered; true concurrent isolation requires an upstream workspace-scoped MCP API.

Implementation: `plugins/codegraph-helper.ts`, `tests/codegraph-helper.test.ts`, troubleshooting, and local-patch reference.

Evidence: commit `a55c657` records the original unindexed startup failure and disable-only mitigation. The regression passes one shared config through unindexed then indexed plugin instances; it fails with stale `false` before the fix and passes with bidirectional assignment. Focused and full repository tests verify metadata-only and bidirectional workspace behavior.

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

## 2026-07-20: Local embeddings for self-hosted Supermemory

Status: active.

Problem: after the VPS Nginx and embedding-model change, authenticated adds reached Supermemory but user and project search returned zero results. Supermemory 0.0.5 logs showed the remote `gemini-embedding-2-preview` route crossing its approximately 800 ms embedding deadline and failing vector upserts even when document status later read `done`.

Alternatives: change Nginx/auth routing, configure an undocumented timeout, retain the remote model and accept intermittent indexing, or use Supermemory's documented local default. Nginx was ruled out by equivalent direct/proxied auth behavior and successful embedding endpoint responses; no supported embedding-timeout setting was documented.

Decision: use local `Xenova/bge-base-en-v1.5` at 768 dimensions in a fresh `/home/ubuntu/.supermemory-local` data directory. Preserve the incompatible Gemini store at `/home/ubuntu/.supermemory` for rollback. Rotate the data-directory-generated API key across Nginx, user environment, and plugin config as one operation.

Implementation: Oracle VPS systemd embedding and data-directory environment, existing Nginx edge, local `SUPERMEMORY_API_KEY`, and `~/.config/opencode/supermemory.jsonc`. No repository runtime code changed.

Evidence: first-run model download completed and server reported local embeddings ready; public-endpoint disposable add/index/search/delete passed; the original user preference was re-ingested into user scope and retrieved by search; no post-cutover embedding timeout or vector-upsert error appeared.

Supersede only with a measured embedding backend that stays within the server deadline, plus a fresh-store or full re-ingestion plan and live retrieval proof.

## 2026-07-15: Unified component maintenance

Status: active.

Decision: `config/components.json` is the only version/source authority. `setup.ps1` handles machine convergence; `maintain.ps1` handles check, plan, approved apply, and verification. Copied forks remain review-only.

Evidence and migration detail: [Maintenance refactor](maintenance-refactor.md).
