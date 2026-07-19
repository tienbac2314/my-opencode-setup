# Repository Timeline

Purpose: reconstruct repository history across every reachable branch and deleted document. Historical material explains current boundaries; it is not current setup guidance.

## Scope

Reconstruction on 2026-07-16 covered 104 unique commits reachable from all local and remote refs: active `refactor/unified-maintenance`, merged `main` (then named `master`), both broken-doc archive refs, and `feat/openviking-migration-research`. Evidence came from commit subjects, tree changes, deleted Markdown read with `git show`, current tests, and retained decisions. [Source index](source-index.md) lists every commit and retrieval path.

## Era 1: triage-first dotfiles (2026-07-08)

Initial commit `bccb45f` created numbered guides around `opencode-triage`, lazy loading, skill-embedded MCP servers, agent rules, and three MCP-bearing skills. Triage selected skills and their MCPs to reduce prompt/tool cost.

Architecture changed immediately. `a96e704` added Caveman policy and RTK docs. `8eccc14` removed duplicate agent guidance. `71dbefb` added four slash commands; `abd8b9e` reverted them. `b365f76` introduced `bootstrap.ps1`. `22417d4` and `91faf7c` iterated RTK instructions. `5669871` removed triage, commands, and eight guides. `8f39e5f` stopped recursive subagent dispatch; `c3d92e7` removed custom Explorer.

Durable lesson: schema reduction must not make custom routing agents or skill-local MCP state hidden runtime authorities.

## Era 2: models, policy, skills, agents (2026-07-10 to 2026-07-11)

Repository shifted toward explicit plugins and reusable policy. `3980648` introduced 9router model discovery; `38d565d` added timeout, retries, and fallback preservation. `29a2aff`, `1e84b99`, and `747a00e` refined concise writing policy. `3659369` recorded a subagent tool bug. `5a14547` simplified Windows/config ownership. `75aa805` imported research and engineering skills plus web-search agent.

Reference strategies initially lived under agent discovery paths and later appeared as fake `@` agents. Durable lesson: discovery path is behavior, even for Markdown that looks informational.

## Era 3: plugin expansion and Mem0 (2026-07-12 to early 2026-07-13)

`c3734ea` switched token optimization to Omar Waly lazy-loading and token-source plugins. `d7b7848` added OMO Slim, CodeGraph, self-hosted Mem0, and update notifier.

Mem0 became first major integration investigation. A patched fork became a fetch interceptor (`7b46794`), then self-host integration (`256f2de`) and fallback tools (`5b096b7`). `c37c7fe` and `28a0fcb` documented ten cloud/self-host incompatibilities: unsupported `text`; silently dropped `app_id`/`scope`; missing event, ping, and organization endpoints; mandatory search filters; auth differences; Node `__require`; unsupported `shell.env`.

Interceptor rewrote requests, mocked cloud-only endpoints, dynamically imported package, and registered fallback tools. It proved incompatibilities but left too much semantic compatibility code. Meanwhile `058581c` added 9router free-model aliases, `a288e5a` split TUI config, and `d8fa757` established later recovery baseline.

Durable lesson: ten semantic mismatches and duplicate tools indicate replacement is safer than indefinite emulation.

## Era 4: Supermemory migration and broken-tree lineage (2026-07-13)

`5086f08` introduced a Mem0/Supermemory switch. `490ed47` archived Mem0 and made Supermemory default; `fc9ffcb` completed single-memory direction. Useful model-filter, dependency, CodeGraph, RTK, Electron, and Supermemory-wrapper fixes followed.

Combined tree became unsafe. Between trusted baseline `d8fa757` and archived tip `c286bb8`, valid migration work mixed with incompatible plugin guards, broad reverts, DSML conversion, stream buffering, and contradictory docs. Archived lazy-load could consume ordinary SSE argument fragments while classifying DSML and lose hooks after repeated Desktop initialization.

Recovery rebuilt behavior from trusted boundary instead of merging broken tip:

- `18089e8`: recovery plan;
- `e72ff2c`: rebuilt plugin stack;
- `c654121`: preserved streamed tool calls;
- `2f4d06f`: normalized plugin loading;
- `03db0fd`: restored per-session lifecycle registration.

`d70c083` documented recovery journey. `18300f6` fixed project-level `plugin: []`, which hid Desktop plugin status although origins still loaded.

Durable lessons: classify complete stream frames before transformation; distinguish process-wide wrapping from per-session hooks; use bare config to isolate provider health without overwriting repository behavior; preserve unsafe lineage through refs, not active files.

## Era 5: targeted maintenance and integration experiments (2026-07-14)

`9e09a73`, `3c379a9`, and `fb75b25` designed targeted plugin updates and upstream diff review. `40c95a8` fixed RTK Windows PATH behavior. `5498246`, `64d0f64`, and `a55c657` narrowed CodeGraph to indexed workspaces and delegated updates to its watcher. `f64c0ff` preserved OMO model fallbacks during discovery failure.

Goal and Headroom evolved together. Goal `0.1.24` was pinned/configured by `5af2e08` and `ddd1aa3`; entrypoint, OMO parsing, and TUI lifecycle fixes followed in `7077428`, `9f36b82`, and `576e894`. Initial persistent Headroom provider `bf0fb94` became provider-neutral process interception in `be3ef35`.

Isolated Headroom preserved provider IDs and models, pinned native transport, passed child args as JSON, logged metadata without prompts, left config hashes unchanged, and stopped only owned proxy. Its provider-neutral isolation rules survived later redesigns.

Durable lesson: optional integrations must prove ownership of every process, port, provider, MCP entry, and file mutation across both CLI and Desktop.

## Era 6: unified maintenance and cleanup (2026-07-15)

`3f91594` replaced `bootstrap.ps1`, `update-plugins.ps1`, and version files with `setup.ps1`, `maintain.ps1`, and `config/components.json`. `968985a` restored lifecycles, `f0cff2a` cleaned patches, and `380f2b9` replaced setup/patch guides.

`e661d8f` deleted debug journeys, plans, old bug ledgers, and Mem0 archives from active tree. Git retained them, but removal obscured repository history; this corpus restores discoverability without reviving obsolete operations.

Goal remained unreliable despite persisted-state work (`0e8b2e9`), so `f6756a0` disabled it. `7fdc544` restored concise guidance and retired old MCP-bearing skills.

Headroom temporarily adopted official wrapper in `17389a2`. Later live use exposed synthetic providers, fixed model inventory, persistent Headroom/Serena MCP state, and no shared Desktop lifecycle.

Side branch `feat/openviking-migration-research` (`0ab1042`, `bf57a31`) evaluated OpenViking as shared OpenCode/Hermes memory. Decision: pilot only; no Supermemory cutover before backup/restore, actor isolation, lazy-load compatibility, outage replay, migration, token, latency, and rollback gates.

Durable lesson: active cleanup is valuable, but removed rationale needs normalized historical replacement.

## Era 7: current boundaries (2026-07-16)

`5ec7ec9` normalized model-produced tool argument types. `e1dcc06` split deployed global policy from repository-only `AGENTS.md`.

`5a24221` established current Headroom architecture: hidden current-user proxy task, bounded logs, auto-discovered Desktop/TUI bridge, fail-open direct traffic, no provider/model/MCP mutation, and disabled Headroom memory/learning because Supermemory owns persistence. Local RTK plugin rewrites OpenCode commands; bare Headroom proxy only reads RTK statistics.

`48f5564` organized docs into guides, integrations, reference, and history and required decision records. This corpus extends that reconstruction across complete commit graph.

## Historical initiative status

| Initiative | Outcome | Current status |
|---|---|---|
| opencode-triage and skill MCPs | Removed after command/policy churn | Retired |
| Custom Explorer/scout | Recursion and policy complexity | Retired |
| Mem0 self-host patch | Proved ten API incompatibilities | Retired, history only |
| Supermemory | Replaced Mem0 after recovery | Active sole persistent-memory owner |
| OpenViking | Strategic fit but immature integration | Research/pilot proposal only |
| Broken lazy-load branch | Useful DSML ideas, unsafe SSE/lifecycle | Archived; repaired implementation active |
| Goal plugin | Package/TUI fixes failed live reliability gate | Disabled |
| Headroom persistent provider | Synthetic namespace, no lifecycle ownership | Superseded |
| Headroom isolated launcher | Provider-neutral but CLI-only | Superseded |
| Headroom official wrapper | Provider/model/MCP pollution and Desktop mismatch | Superseded |
| Unified maintainer | Exact manifest and deterministic convergence | Active |
