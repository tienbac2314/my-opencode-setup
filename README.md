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
| **Long-Term Memory** | [Mem0](https://github.com/mem0ai/mem0) (self-hosted) | Persistent memory across sessions via VPS |
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
├── mem0-selfhost-patch.ts            # Fetch interceptor for self-hosted Mem0 (loaded first explicitly)
├── plugins/                          # Auto-discovered file-based plugins
│   ├── 0-tokens-source.ts            # Token usage breakdown (prefix ensures load order)
│   ├── lazy-load.ts                  # Lazy tool loading to save tokens
│   └── models-discovery.js           # Auto-discover 9router models with modalities
├── opencode-mem0-plugin/             # (LEGACY, can be removed — replaced by fetch patch)
│   ├── dist/index.js                 # Was: patched Bun bundle for self-hosted
│   └── opencode-skills/              # mem0-remember, mem0-search, etc.
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
│   └── oh-my-opencode-slim.json      # Agent preset config (9router default)
├── plugins/
│   ├── opencode-lazy-load.ts         # Snapshot of lazy-load plugin
│   ├── tokens-source.ts              # Snapshot of tokens-source plugin
│   └── models-discovery.js           # Custom model discovery plugin
├── mem0-plugin/                      # Patched Mem0 plugin for self-hosted
├── mem0-selfhost-patch.ts            # Fetch interceptor for self-hosted Mem0
├── skills/                           # All skills
├── agents/                           # Sub-agents
├── docs/
│   └── opencode-bugs-known.md        # Known bugs and workarounds
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

### Mem0 (Self-Hosted)

Persistent long-term memory via self-hosted Mem0 on VPS.

**Architecture:**
- VPS runs Mem0 REST API (Docker: `mem0-dev-mem0-1`) on port 8888
- Cloudflare tunnel exposes it as `https://mem0.tienbac.dpdns.org`
- LLM/embedding calls route through 9router on the same VPS
- pgvector for vector storage

**Dashboard:**
- URL: `http://161.118.215.190:3000`
- Email: `admin@mem0.dev`
- Password: `skibidi123`

**Self-Hosted Setup & Custom Embedding Model Configuration:**
The self-hosted instance is configured to use the embedding model `openrouter/nvidia/llama-nemotron-embed-vl-1b-v2:free` (2048 dimensions). 
- **Bypass HNSW Dimension limit**: pgvector's HNSW index has a strict limit of 2000 dimensions. To run the 2048-dimensional Nemotron model, `"hnsw": False` is added to `main.py`'s `DEFAULT_CONFIG` on the VPS to default to exact search (extremely fast/accurate for agent memories).
- **Environment variables on the VPS (`~/mem0/server/.env`)**:
  ```env
  MEM0_DEFAULT_EMBEDDER_MODEL=openrouter/nvidia/llama-nemotron-embed-vl-1b-v2:free
  MEM0_DEFAULT_EMBEDDER_DIMS=2048
  ```
- **Dimension Changes**: Changing embedding models requires dropping the existing memories table so that pgvector recreates it with the correct dimensions:
  ```bash
  docker exec -i mem0-dev-postgres-1 psql -U postgres -d postgres -c 'DROP TABLE IF EXISTS memories;'
  ```

**How to Update the Self-Hosted Stack:**
1. Pull the latest updates on the VPS:
   ```bash
   cd ~/mem0 && git pull
   ```
2. Re-apply the `hnsw: False` and `embedding_model_dims` configuration to `main.py` on the VPS if it was overwritten:
   ```bash
   python3 -c '
   with open("/home/ubuntu/mem0/server/main.py", "r") as f:
       content = f.read()
   target = "\"collection_name\": POSTGRES_COLLECTION_NAME,\n        },"
   replacement = "\"collection_name\": POSTGRES_COLLECTION_NAME,\n            \"embedding_model_dims\": int(os.environ.get(\"MEM0_DEFAULT_EMBEDDER_DIMS\", 1536)),\n            \"hnsw\": False,\n        },"
   if target in content:
       with open("/home/ubuntu/mem0/server/main.py", "w") as f:
           f.write(content.replace(target, replacement))
   '
   ```
3. Rebuild and recreate the containers:
   ```bash
   cd ~/mem0/server && docker compose up -d --build --force-recreate mem0
   ```

**Plugin:** Official `@mem0/opencode-plugin` npm package (unmodified) + `mem0-selfhost-patch.ts` fetch interceptor.

The patch plugin (`mem0-selfhost-patch.ts`, loaded explicitly at the root) monkey-patches `globalThis.fetch` to:
- Rewrite Mem0 Cloud API routes (`/v3/memories/add/`, `/v1/memories/search/`) to self-hosted routes (`/memories`, `/search`)
- Inject `X-API-Key` header for self-hosted auth
- Mock `/v1/ping/` to return self-hosted identity
- Mock organization/project endpoints (not available on open-source Mem0)

This means `@mem0/opencode-plugin` auto-updates via npm normally — no re-patching needed.

**Required environment variables (User scope):**
```powershell
[System.Environment]::SetEnvironmentVariable('MEM0_HOST', 'https://mem0.tienbac.dpdns.org', 'User')
[System.Environment]::SetEnvironmentVariable('MEM0_API_KEY', 'YOUR_MEM0_ADMIN_KEY', 'User')
```

**Testing & Verification:**
Verify the setup and patch execution by running the diagnosis script:
```bash
bun verify-patch.ts
```
This tests:
1. Mocked `GET /v1/ping/` returns self-hosted identity.
2. Mocked `GET /v1/organizations/.../projects/...` returns custom categories.
3. Rewritten `POST /v3/memories/search/` successfully queries your self-hosted VPS backend.

**Skills:** mem0-remember, mem0-search, mem0-forget, mem0-dream, mem0-pin, mem0-scope, mem0-status, mem0-tour, mem0-context-loader

### Token Optimization Plugins

**lazy-load.ts** — Strips all tool/MCP schema definitions from every LLM request. The model calls `load_tool(name)` to fetch individual schemas on-demand. Saves ~85% base tokens per turn.

**0-tokens-source.ts** — Wraps the fetch pipeline to track token usage by source (system prompt, tools, user messages, etc.). Use `/tokens` command to view breakdown.

**Load order matters:** The `0-` prefix ensures tokens-source loads before lazy-load so the fetch wrapper nesting is correct.

### models-discovery.js

Custom plugin that queries `9router/v1/models` on startup and auto-registers discovered models with correct `modalities` (text+image input). Solves the "this model does not support image input" error for 9router models.

Falls back to `text+image` input for models without explicit capabilities metadata.

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
- `mem0-selfhost-patch.ts` -- only changes if Mem0's self-hosted API routes change
- `opencode-update-notifier` — updated via npm deps step

## Environment Variables

| Variable | Scope | Value | Purpose |
|----------|-------|-------|---------|
| `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` | User | `true` | Enable omo-slim background agent dispatch |
| `MEM0_HOST` | User | `https://mem0.tienbac.dpdns.org` | Self-hosted Mem0 endpoint |
| `MEM0_API_KEY` | User | (your admin key) | Mem0 API authentication |

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

## Maintenance

**Daily:** The `update-plugins.ps1` script handles routine updates with a 12h cooldown.

**When Mem0 upstream changes routes:**
The `mem0-selfhost-patch.ts` fetch interceptor handles route mapping. If Mem0 changes its self-hosted API routes, update the `ROUTE_REWRITES` array in `mem0-selfhost-patch.ts`. No need to re-patch the npm package.

**When switching models:** Edit both files:
- `~/.config/opencode/opencode.jsonc` — `model` and `agent` section
- `~/.config/opencode/oh-my-opencode-slim.json` — active preset's agent models

**To add a new project to CodeGraph:**
```bash
cd your-project
codegraph init
```

## Architecture Notes

- **Plugin load order:** The patch `./mem0-selfhost-patch.ts` is placed at the root ConfigDir and loaded explicitly as the first entry in the config `plugin` array to guarantee it intercepts requests before `@mem0/opencode-plugin` initializes at startup. Auto-discovered plugins (`0-tokens-source.ts`, `lazy-load.ts`, `models-discovery.js`) load alphabetically after the config array, chaining their fetch wrappers cleanly.
- **omo-slim overrides default agents:** The installer disables OpenCode's built-in `general` and `explore` agents, replacing them with the Pantheon (Orchestrator, Oracle, etc.).
- **Context window strategy:** lazy-load strips ~85% of tool schemas. Compaction is enabled with 20 tail turns. CodeGraph provides surgical context to avoid file-crawling bloat.
- **No Honcho:** We replaced Honcho with self-hosted Mem0. Honcho was cloud-dependent. Mem0 runs on your VPS with your own LLM routing.
