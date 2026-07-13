# OpenCode Dotfiles

Personal OpenCode configuration: multi-agent orchestration, semantic code intelligence, persistent memory, token optimization, and auto-updating plugins.

## Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| **Shell** | PowerShell 7+ | All scripts target pwsh |
| **Provider** | 9router (OpenAI-compatible) | Self-hosted LLM gateway at `tienbac.dpdns.org` |
| **Default Model** | `9router/ag/gemini-3.5-flash-low` | Free tier via 9router |
| **Agent Orchestrator** | [oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim) | Multi-agent delegation (Orchestrator, Oracle, Explorer, Librarian, Designer, Fixer) |
| **Code Intelligence** | [CodeGraph](https://github.com/colbymchenry/codegraph) | Semantic code graph — surgical context, fewer tool calls |
| **Long-Term Memory** | [SuperMemory](https://supermemory.ai) (self-hosted) | Persistent memory across sessions via VPS |
| **Token Optimization** | [opencode-lazy-loading](https://github.com/omarwaly-ai/opencode-lazy-loading) | Strips tool schemas, saves ~85% base tokens |
| **Token Monitoring** | [OpenCode-tokens-source](https://github.com/omarwaly-ai/OpenCode-tokens-source) | Per-source token usage breakdown |
| **Model Discovery** | `models-discovery.js` (custom) | Auto-discovers models from 9router with correct modalities |
| **Update Notifier** | [opencode-update-notifier](https://github.com/tim-hilde/opencode-update-notifier) | Alerts when pinned npm plugins have updates |
| **LSP** | Built-in | Auto-discovered, enabled globally |

## Directory Structure

```
~/.config/opencode/
├── opencode.jsonc                    # Main config (API keys — gitignored)
├── oh-my-opencode-slim.json          # Agent orchestration presets
├── tui.json                          # TUI plugin config
├── AGENTS.md                         # Behavioral instructions
├── package.json                      # npm deps (plugin SDK + provider SDK)
├── supermemory.jsonc                 # Active SuperMemory backend configuration
├── plugins/                          # Auto-discovered file-based plugins
│   ├── 0-tokens-source.ts            # Token usage breakdown (prefix ensures load order)
│   ├── lazy-load.ts                  # Lazy tool loading to save tokens
│   ├── models-discovery.js           # Auto-discover 9router models with modalities
│   └── codegraph-helper.ts           # Enforces and auto-updates CodeGraph index
├── commands/
│   └── tokens.md                     # /tokens slash command
├── skills/                           # 30+ skills (security, research, debugging, etc.)
└── agents/                           # Sub-agents (web-search, etc.)
```

## Setup Repo Structure

```
~/opencode-dotfiles/
├── bootstrap.ps1                     # Full installer script
├── update-plugins.ps1                # Plugin auto-updater (12h cooldown)
├── config/
│   ├── opencode.jsonc.example        # Template config (no secrets)
│   ├── oh-my-opencode-slim.json      # Agent preset config (9router default)
│   └── supermemory.jsonc.example     # Template SuperMemory config
├── scripts/
│   └── toggle-memory.ps1             # Deprecated — SuperMemory is now the only memory provider
├── plugins/
│   ├── lazy-load.ts                  # Snapshot of lazy-load plugin
│   ├── 0-tokens-source.ts            # Snapshot of tokens-source plugin
│   ├── models-discovery.js           # Custom model discovery plugin
│   └── codegraph-helper.ts           # CodeGraph dynamic helper plugin
├── mem0-archive/                     # Archived legacy Mem0 files (historical reference, no longer active)
│   ├── mem0-plugin/                  # Patched Mem0 plugin for self-hosted
│   ├── mem0-selfhost-patch.ts        # Fetch interceptor for self-hosted Mem0 (archived)
│   └── verify-patch.ts               # Verification script for Mem0 (archived)
├── skills/                           # All skills
├── agents/                           # Sub-agents
├── docs/
│   ├── opencode-bugs-known.md        # Known bugs and workarounds
│   └── supermemory-setup.md          # Guide to setting up self-hosted SuperMemory
├── AGENTS.md                         # LLM behavioral instructions
└── README.md                         # This file
```

## Quick Install

```powershell
git clone https://github.com/tienbac2314/my-opencode-setup ~/opencode-dotfiles
cd ~/opencode-dotfiles
.\bootstrap.ps1
```

Then:
1. Edit `~/.config/opencode/opencode.jsonc` — set your 9router API key
2. Restart your terminal (env vars need a new session)
3. Start OpenCode and type `ping all agents` to verify

## Plugin Details

### oh-my-opencode-slim (V2)

Multi-agent orchestration. Routes tasks to specialized agents:

| Agent | Role | Model |
|-------|------|-------|
| **Orchestrator** | Plans, delegates, reconciles | `9router/ag/gemini-3.5-flash-low` |
| **Oracle** | Architecture review, deep analysis | `9router/ag/gemini-3.5-flash-low` |
| **Explorer** | Codebase reconnaissance | `9router/ag/gemini-3.5-flash-low` |
| **Librarian** | Documentation lookup, web search | `9router/ag/gemini-3.5-flash-low` |
| **Designer** | UI/UX work | `9router/ag/gemini-3.5-flash-low` |
| **Fixer** | Bug fixes, implementations | `9router/ag/gemini-3.5-flash-low` |

Config: `~/.config/opencode/oh-my-opencode-slim.json`

Three presets available: `9router` (active), `openai`, `opencode-go`.

To switch presets: change `"preset"` value in the config file.

### CodeGraph

Semantic code intelligence. Builds a knowledge graph of symbols, call edges, and dependencies.

- **Install:** `npm install -g @colbymchenry/codegraph` (or via `bootstrap.ps1`)
- **Wire up:** `codegraph install --yes` (auto-configures OpenCode MCP)
- **Index a project:** `codegraph init` (run inside each project dir)
- **Auto-syncs:** Watches for file changes after init — no re-indexing needed

Reduces tool calls by 40-80% and speeds up responses by providing surgical context.

### SuperMemory (Self-Hosted)

Persistent long-term memory via self-hosted SuperMemory on your VPS.

**Architecture:**
- VPS runs SuperMemory API Server (listening locally on port 6767).
- Cloudflare tunnel routes public requests to `https://supermemory.tienbac.dpdns.org`.
- Local embeddings are computed using `Xenova/bge-base-en-v1.5` natively.
- Memory summaries are processed through your custom 9router gateway on the VPS.

For details on how to set up, update, or maintain the VPS hosting stack, read the [Self-Hosting SuperMemory Setup Guide](file:///C:/Users/bacnt/opencode-dotfiles/docs/supermemory-setup.md).

---

### Memory Provider

OpenCode now uses **SuperMemory** exclusively. Mem0 has been archived to `mem0-archive/` for future reference.

To configure SuperMemory, see the [Self-Hosting SuperMemory Setup Guide](docs/supermemory-setup.md).

---

### Token Optimization Plugins

**lazy-load.ts** — Strips all tool/MCP schema definitions from every LLM request. The model calls `load_tool(name)` to fetch individual schemas on-demand. Saves ~85% base tokens per turn.

**0-tokens-source.ts** — Wraps the fetch pipeline to track token usage by source (system prompt, tools, user messages, etc.). Use `/tokens` command to view breakdown.

**Load order matters:** The `0-` prefix ensures tokens-source loads before lazy-load so the fetch wrapper nesting is correct.

### models-discovery.js

Custom plugin that queries `9router/v1/models` on startup and auto-registers discovered models with correct `modalities` (text+image input). Solves the "this model does not support image input" error for 9router models.

Falls back to `text+image` input for models without explicit capabilities metadata.

### codegraph-helper.ts

Enforces CodeGraph search and automates database updates using OpenCode hooks:
- **Enforcement (`tool.execute.before`)**: Intercepts `grep_search` and `glob_search`. If the repository is indexed by CodeGraph (`.codegraph` folder exists), it blocks standard grep/glob and returns a redirect error instructing the model to use `codegraph_explore` instead.
- **Auto-Update (`tool.execute.after`)**: Watches for successful file write/edit tool executions (`replace_file_content`, `write_to_file`, `multi_replace_file_content`) and triggers `codegraph index` in the background asynchronously to ensure the database is always up-to-date with agent changes.

### opencode-update-notifier

Checks pinned npm plugin entries for newer versions. Shows TUI toast if updates available. Does NOT auto-update.

To benefit from it, pin your plugin versions: `"oh-my-opencode-slim@x.y.z"` instead of `"oh-my-opencode-slim"`.

## Auto-Update Script

`update-plugins.ps1` updates everything in one shot:

```powershell
# Normal run (respects 12h cooldown)
.\update-plugins.ps1

# Force update now
.\update-plugins.ps1 -Force

# Dry run (show what would change)
.\update-plugins.ps1 -DryRun -Force
```

What it updates:
1. **oh-my-opencode-slim** via `bunx` (re-runs installer)
2. **lazy-load.ts** and **0-tokens-source.ts** from GitHub raw
3. **tokens.md** command from GitHub raw
4. **CodeGraph CLI** via `codegraph upgrade`
5. **npm deps** in `package.json` via `npm update`

**Not auto-updated** (intentionally):
- `models-discovery.js` -- custom, only you maintain it
- `opencode-update-notifier` — updated via npm deps step

## Environment Variables

| Variable | Scope | Value | Purpose |
|----------|-------|-------|---------|
| `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` | User | `true` | Enable omo-slim background agent dispatch |

Set via:
```powershell
[System.Environment]::SetEnvironmentVariable('VAR_NAME', 'value', 'User')
```

## Known Issues

See [docs/opencode-bugs-known.md](docs/opencode-bugs-known.md).

Key ones:
- `experimental.primary_tools` breaks subagent tool access — do NOT use it
- Desktop app (Electron) only loads plugins from `plugins/` dir via auto-discovery
- Skills in `~/.agents/skills/` need junctions into `~/.config/opencode/skills/`
- DeepSeek XML regression after compaction — keep `keep.tokens` ≥ 20000 and configure a compaction agent with a stable model

## Maintenance

**Daily:** The `update-plugins.ps1` script handles routine updates with a 12h cooldown.

**When switching models:** Edit both files:
- `~/.config/opencode/opencode.jsonc` — `model` and `agent` section
- `~/.config/opencode/oh-my-opencode-slim.json` — active preset's agent models

**To add a new project to CodeGraph:**
```bash
cd your-project
codegraph init
```

## Architecture Notes

- **omo-slim overrides default agents:** The installer disables OpenCode's built-in `general` and `explore` agents, replacing them with the Pantheon (Orchestrator, Oracle, etc.).
- **Context window strategy:** lazy-load strips ~85% of tool schemas. Compaction is enabled with `keep.tokens: 20000` (~10-15 turns verbatim). A dedicated `compaction` agent (`9router/ag/claude-opus-4-6-thinking`) writes the summary — decoupling summary generation from the working model avoids DeepSeek XML format regression. CodeGraph provides surgical context to avoid file-crawling bloat.
- **No Honcho:** We replaced Honcho with self-hosted SuperMemory. Honcho was cloud-dependent.
