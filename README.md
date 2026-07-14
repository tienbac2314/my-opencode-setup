# OpenCode Dotfiles

Use this repository to install, understand, test, and safely update a Windows OpenCode setup with 9router, lazy-loaded tools, multi-agent orchestration, CodeGraph, self-hosted Supermemory, token reporting, model discovery, update notifications, and RTK shell rewriting.

New here: start with [setup.md](setup.md). Confused by main agents, `@` workers, or OMO roles: read [OpenCode Agents in This Setup](docs/opencode-agents.md). Updating locally changed plugins: read [Plugin Fixes and Update Notes](pr.md).

## Verified Runtime

| Component | Verified value |
|---|---|
| OpenCode | `1.17.18`; TUI and Desktop App |
| Shell | PowerShell 7+ |
| Provider | OpenAI-compatible 9router gateway |
| Validation model | `9router/oc/deepseek-v4-flash-free` |
| Plugin API | `@opencode-ai/plugin@1.17.18` |
| Provider adapter | `@ai-sdk/openai-compatible@3.0.7` |
| Orchestration | `oh-my-opencode-slim@2.2.0` |
| Memory client | `opencode-supermemory@2.0.8` |
| Update notifier | `opencode-update-notifier@0.3.3` |
| Supermemory endpoint | `https://supermemory.tienbac.dpdns.org` |
| Recovery baseline | `d8fa757af2f97a640610fb00e32d4d811a255fab` |
| Broken reference tip | `c286bb890666528fbdfed486f1851b1226a075b6` |

Recovery verification completed with 16 Bun tests, local and Supermemory plugin bundles, CLI/TUI/Desktop `load_tool` execution, eight effective plugin origins, six repository-to-runtime plugin hash matches, 52 discovered 9router models, a complete Supermemory add/search/profile/list/forget lifecycle, and Oracle VPS local/public HTTP 200 checks.

## Architecture

```text
Repository source
  bootstrap.ps1
    copies configs, agents, skills, data, and six local plugins
    reads exact package versions from private versions.env
    installs npm dependencies derived from active plugin entries and private versions
    runs OMO Slim and RTK installers
    restores repository-controlled pins and all six audited local plugins

~/.config/opencode/
  opencode.jsonc       provider, npm plugins, permissions, compaction
  versions.env         ignored machine-local exact version targets
  tui.json             pinned TUI npm plugin list
  supermemory.jsonc    ignored Supermemory credentials and endpoint
  package.json         generated pinned runtime dependencies
  plugins/             six auto-discovered repository plugins

OpenCode process
  npm plugins          update notifier and OMO Slim
  file plugins         token source, CodeGraph helper, lazy load,
                       model discovery, RTK, Supermemory adapter
  MCP                  CodeGraph server and any user-configured servers
```

OpenCode auto-discovers every file under `~/.config/opencode/plugins/`. Local file plugins must not also appear in `opencode.jsonc` or `tui.json`; duplicate registration changes hook order, nests `fetch` wrappers, and can make Desktop behavior differ from TUI behavior. Explicit plugin arrays contain pinned npm packages only.

Project config `.opencode/opencode.json` must omit the `plugin` property. An empty project value (`"plugin": []`) overrides Desktop's displayed plugin list even while resolved `plugin_origins` and `load_tool` remain functional. If Desktop briefly shows eight or nine plugins, returns to eight, then shows only `Plugins configured in opencode.json`, follow [Desktop Plugin List Hidden by Project Override](knownbug.md#desktop-plugin-list-hidden-by-project-override) before debugging lazy load or Supermemory.

`mem0-archive/` contains historical Mem0 implementation and documentation. Bootstrap removes legacy Mem0 runtime artifacts and never deploys this directory.

Research skills, web-search agent, and strategy files derive from [Weizhena/Deep-Research-skills](https://github.com/Weizhena/Deep-Research-skills). Strategy Markdown lives under `data/web-search-strategies/`, not `agents/`, so OpenCode does not show five reference modules as fake `@` agents. Exact local changes and update steps are in [pr.md](pr.md#deep-research-skills-and-web-search).

## Tool Execution Flow

`plugins/lazy-load.ts` reduces tool-schema context by exposing only `load_tool` to model while retaining schemas for built-in, plugin, and MCP tools.

1. OpenCode registers built-in, plugin, and MCP tools.
2. `tool.definition` stores original built-in descriptions and JSON schemas.
3. Wrapped `fetch` detects LLM requests, captures every tool description/schema, and removes every request tool except `load_tool`.
4. Model calls `load_tool({"name":"bash"})`; plugin returns original instructions and schema.
5. Response transform tracks that tool for current session turn. Next model request may call `bash` directly.
6. Direct unloaded calls, including MCP calls captured from request, are rewritten to `load_tool` instead of being dropped.
7. Standard JSON `delta.tool_calls` arguments are buffered by tool-call index until complete JSON exists.
8. DeepSeek DSML text blocks are buffered across arbitrary SSE chunks and converted into standard tool calls. Ordinary content and reasoning deltas remain intact.
9. After a built-in, plugin, or MCP tool is loaded in current turn, its direct call passes through.
10. Terminal `finish_reason: "stop"` clears per-turn loaded-tool state. New user turn must load again.

Repeated OpenCode plugin initialization still returns `load_tool` and `tool.definition` hooks. Global `fetch` wrapping remains idempotent inside module, avoiding Desktop hot-reload loss of tool registration.

## Plugin Loading and Ordering

Effective origins must contain exactly eight entries:

```text
opencode-update-notifier@0.3.3
oh-my-opencode-slim@2.2.0
plugins/supermemory.ts
plugins/rtk.ts
plugins/models-discovery.js
plugins/lazy-load.ts
plugins/codegraph-helper.ts
plugins/0-tokens-source.ts
```

Local plugin filename order matters. `0-tokens-source.ts` sorts before `lazy-load.ts`, making token source inner `fetch` wrapper. Lazy load modifies request before token source observes final API body, so `/tokens` reports schemas actually sent to model.

Bootstrap runs two installers that mutate active files:

- Exact OMO installer version comes from private `versions.env`. Installer may rewrite plugin arrays, so bootstrap restores tailored OMO/TUI files and repins root `plugin` entries in active global and TUI configs through `scripts/pin-opencode-plugin.ps1`.
- `rtk init -g --opencode` generates RTK plugin. Bootstrap restores audited `plugins/rtk.ts` afterward.

## Plugins in This Setup

| Component | Load source | What it does | What must keep working | How we tested it |
|---|---|---|---|---|
| `oh-my-opencode-slim@2.2.0` | npm plugin | Orchestrator, Librarian, Oracle, Designer, Fixer, Observer, and Councillor agents | Installer result must be re-pinned; repository preset restored | Agent/tool/MCP/command registration plus bounded Fixer `PONG` |
| `opencode-update-notifier@0.3.3` | npm plugin | Read-only npm update notification | Version remains pinned so installed/published comparison is meaningful | Initialization and registry check without file mutation |
| `0-tokens-source.ts` | auto-discovered file | System, tool, message, and API token accounting; `/tokens` | Loads before lazy load; request body is never modified | Persistent session produced non-empty system/tool/message/usage output |
| `codegraph-helper.ts` | auto-discovered file | Requires one CodeGraph attempt before grep/glob fallback; syncs after supported writes | Per-session guard; `.codegraph/` gate; nonfatal background sync | 6 hook tests plus live sync, status, and explore |
| `lazy-load.ts` | auto-discovered file | `load_tool`, request schema reduction, SSE/DSML rewriting, per-turn state | Standard tool calls, finish events, content, reasoning, and MCP calls must survive | 9 regression tests plus CLI/TUI/Desktop shell markers |
| `models-discovery.js` | auto-discovered file | Fetches provider models and keeps configured 9router models available during startup failures | Six `oc/*` fallbacks; OMO and compaction models remain valid; skip `opencode/*` source IDs | Mocked discovery failure plus live 52-model inventory |
| `rtk.ts` | auto-discovered file | Rewrites eligible bash/shell commands through RTK | Use injected shell in TUI and child-process fallback in Desktop; every repeated initialization returns hook | Rewrite equivalence, Desktop-shaped input, and repeated init passed |
| `supermemory.ts` | auto-discovered file | Adapts named Supermemory plugin export; memory CRUD tools | Default `{ id, server }` object; ignored credentials; no Mem0 runtime | Add, search, profile, list, forget, and absence-after-delete passed |

CodeGraph MCP is configured separately in `opencode.jsonc`; it is not a local plugin origin.

## Repository Layout

```text
opencode-dotfiles/
├── README.md                         architecture and documentation index
├── setup.md                          installation and daily commands
├── pr.md                             plugin sources, fixes, PR notes, updates
├── knownbug.md                       current boundaries and legacy index
├── bootstrap.ps1                     idempotent deployment
├── update-plugins.ps1                manual updater; read knownbug.md first
├── scripts/
│   └── pin-opencode-plugin.ps1       JSONC-aware root plugin pin repair
├── config/
│   ├── opencode.jsonc.example        provider and pinned npm plugins
│   ├── oh-my-opencode-slim.json      agent presets
│   ├── supermemory.jsonc.example     ignored credential template
│   └── tui.json                      pinned TUI npm plugin
├── plugins/
│   ├── 0-tokens-source.ts
│   ├── codegraph-helper.ts
│   ├── lazy-load.ts
│   ├── models-discovery.js
│   ├── rtk.ts
│   └── supermemory.ts
├── tests/
│   ├── bootstrap.test.ts
│   ├── codegraph-helper.test.ts
│   ├── models-discovery.test.ts
│   └── lazy-load.test.ts
├── docs/
│   ├── debug-journey/
│   └── superpowers/
├── agents/
├── skills/
├── data/
└── mem0-archive/                     non-runtime historical reference
```

## Quick Start

```powershell
git clone https://github.com/tienbac2314/my-opencode-setup "$HOME\opencode-dotfiles"
Set-Location "$HOME\opencode-dotfiles"
.\bootstrap.ps1
```

Edit ignored runtime files:

- `~/.config/opencode/opencode.jsonc`: replace provider `YOUR_API_KEY_HERE`; select working model.
- `~/.config/opencode/opencode.jsonc`: replace tracked `C:\Users\bacnt\.config\opencode\skills` with current user's absolute skills path.
- `~/.config/opencode/supermemory.jsonc`: replace `sm_your_api_key_here`; keep self-hosted base URL.

Start TUI with explicit validated model:

```powershell
opencode --model 9router/oc/deepseek-v4-flash-free
```

Desktop App retains per-session model choice. Select provider `9router`, then model `oc/deepseek-v4-flash-free` before first smoke test. Default OpenCode free model may return `Free usage exceeded, subscribe to Go` even when local plugins are healthy.

Full prerequisites, credential handling, App path, and lifecycle commands: [setup.md](setup.md).

## Verification Entry Points

```powershell
rtk proxy bun test
rtk codegraph status .
rtk opencode models 9router
rtk opencode run --model 9router/oc/deepseek-v4-flash-free "Use load_tool to load bash, then use bash to run: Write-Output LAZY_LOAD_OK. Return exact command output."
```

Expected lazy-load trace contains `load_tool`, shell command, and `LAZY_LOAD_OK`.

Desktop plugin-status verification is separate from tool execution: resolved `plugin` and `plugin_origins` must both contain eight entries, and the Plugins tab must remain at eight across repeated opens after a full App reload.

Plugin sources, our changes, upstream PR notes, and safe update steps: [pr.md](pr.md). Current problems and fixes: [knownbug.md](knownbug.md).

## Which Document to Read

| Document | Use |
|---|---|
| [setup.md](setup.md) | Clone, bootstrap, credentials, TUI/App startup, lifecycle tests, remote checks |
| [pr.md](pr.md) | Where plugins came from, what we changed, upstream PR notes, and safe update steps |
| [docs/opencode-agents.md](docs/opencode-agents.md) | Main agents, `@` subagents, hidden workers, OMO roles, and research modules |
| [knownbug.md](knownbug.md) | Current problems, checks, and fixes |
| [docs/debug-journey/README.md](docs/debug-journey/README.md) | Chronological failure and recovery evidence |
| [docs/superpowers/specs/2026-07-13-opencode-recovery-design.md](docs/superpowers/specs/2026-07-13-opencode-recovery-design.md) | Recovery design source |
| [docs/superpowers/plans/2026-07-13-opencode-recovery.md](docs/superpowers/plans/2026-07-13-opencode-recovery.md) | Recovery execution plan |

## Historical Boundary

Branch `archive/broken-docs-reference` points to broken tip `c286bb890666528fbdfed486f1851b1226a075b6`. It preserves useful Mem0, Supermemory migration, CodeGraph, 9router, and lazy-load investigation documents but is not deployable. Current `master` was rebuilt from stable baseline `d8fa757af2f97a640610fb00e32d4d811a255fab` through reviewed recovery commits.

Use [knownbug.md#broken-documentation-archive](knownbug.md#broken-documentation-archive) for exact commit index and read-only retrieval commands.
