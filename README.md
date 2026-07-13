# OpenCode Dotfiles

Windows OpenCode configuration for multi-agent orchestration, code intelligence, self-hosted memory, lazy tool loading, token reporting, model discovery, update checks, and RTK shell rewriting.

## Runtime

| Component | Implementation |
|---|---|
| Shell | PowerShell 7+ |
| OpenCode | TUI and Desktop App |
| Provider | OpenAI-compatible 9router gateway |
| Agents | `oh-my-opencode-slim` |
| Code intelligence | CodeGraph plus `codegraph-helper.ts` |
| Memory | `opencode-supermemory` against self-hosted Supermemory |
| Tool optimization | `lazy-load.ts` |
| Token reporting | `0-tokens-source.ts` |
| Model discovery | `models-discovery.js` |
| Update checks | `opencode-update-notifier` |
| Shell compression | RTK plus `rtk.ts` |

## Repository Layout

```text
opencode-dotfiles/
├── bootstrap.ps1
├── update-plugins.ps1
├── config/
│   ├── opencode.jsonc.example
│   ├── oh-my-opencode-slim.json
│   ├── supermemory.jsonc.example
│   └── tui.json
├── plugins/
│   ├── 0-tokens-source.ts
│   ├── codegraph-helper.ts
│   ├── lazy-load.ts
│   ├── models-discovery.js
│   ├── rtk.ts
│   └── supermemory.ts
├── agents/
├── skills/
├── docs/
└── mem0-archive/
```

`mem0-archive/` is historical reference only. Bootstrap never deploys it.

## Install

```powershell
git clone https://github.com/tienbac2314/my-opencode-setup "$HOME\opencode-dotfiles"
Set-Location "$HOME\opencode-dotfiles"
.\bootstrap.ps1
```

Then configure:

1. `~/.config/opencode/opencode.jsonc`: provider API key and model.
2. `~/.config/opencode/supermemory.jsonc`: Supermemory API key and base URL.
3. Restart OpenCode after dependency or plugin changes.

Real credentials belong only in local ignored files. Never add them to this repository.

## Plugin Loading

OpenCode auto-discovers local files under `~/.config/opencode/plugins/` in both TUI and Desktop App. `opencode.jsonc` explicitly lists only npm plugins:

- `opencode-update-notifier`
- `oh-my-opencode-slim`

Both npm entries are version-pinned in configuration so update-notifier can compare installed and published versions.

Bootstrap copies every repository plugin into that directory. Local plugins must not also be listed explicitly; duplicate registration changes wrapper order and can break Desktop startup.

`0-tokens-source.ts` sorts before `lazy-load.ts`. This ordering lets token reporting observe the request after lazy-load reduces tool schemas.

## Installed Plugins

### oh-my-opencode-slim

Provides Orchestrator, Oracle, Explorer, Librarian, Designer, and Fixer agents. Configuration lives in `config/oh-my-opencode-slim.json`.

Lifecycle check: OpenCode startup loads agents, then `ping all agents` exercises orchestration.

### CodeGraph and codegraph-helper

CodeGraph indexes symbols and call paths. When a repository contains `.codegraph/`, helper steers code search toward `codegraph_explore` and updates index after supported file edits.

```powershell
npm install -g @colbymchenry/codegraph
codegraph install --yes
codegraph init
codegraph explore "symbol or question"
```

Lifecycle check: plugin initializes, detects index, `codegraph explore` returns current source, and index update completes.

### Supermemory

`plugins/supermemory.ts` adapts current named `SupermemoryPlugin` export to OpenCode's default plugin-object contract. Client configuration lives in ignored `supermemory.jsonc`.

The `supermemory` tool supports these modes:

- `add`
- `search`
- `profile`
- `list`
- `forget`

Lifecycle check: add uniquely tagged temporary memory, find it, retrieve profile/list state, forget it, then prove it no longer appears.

Server operations: [docs/supermemory-setup.md](docs/supermemory-setup.md).

### lazy-load

Removes built-in tool schemas from LLM requests and exposes `load_tool(name)`. Loaded tools remain usable for current turn only. MCP tools pass through.

Lifecycle check: call `load_tool` for shell tool, run exact command, end turn, then prove next turn requires loading again.

### tokens-source

Captures system, message, tool, and API token accounting without modifying request payload. `/tokens` displays latest breakdown.

Lifecycle check: complete one model request, invoke `/tokens`, and verify non-empty system/message/tool sections.

### models-discovery

Queries configured OpenAI-compatible provider model endpoint and registers discovered models with text/image modalities.

Lifecycle check: startup completes without discovery exception and `opencode models 9router` includes provider results.

### opencode-update-notifier

Checks configured npm plugins for newer releases and shows a TUI notification. It does not install updates.

Lifecycle check: plugin initializes and update check completes without changing `package.json`.

### RTK

`plugins/rtk.ts` delegates eligible shell-command rewriting to installed `rtk` binary.

Lifecycle check: plugin initializes, eligible shell command is rewritten, and command output remains equivalent.

## Configuration Rules

- Keep `experimental.primary_tools` unset; it can hide tools from subagents.
- Keep local plugins in `plugins/`; do not add bridge files.
- Keep `compaction.reserved` high enough to leave room for stable compaction output.
- Keep credentials, logs, package caches, and `.codegraph` databases untracked.
- Use `workathome\.config` only as bare provider/configuration control. It has no custom lazy-load framework.

## Updates

```powershell
.\update-plugins.ps1
.\update-plugins.ps1 -Force
.\update-plugins.ps1 -DryRun -Force
```

Local plugin patches remain repository-controlled until upstream behavior matches tested OpenCode TUI and Desktop requirements.

## Troubleshooting

```powershell
opencode debug config
opencode models 9router
opencode run "Use load_tool to load bash, then run: Write-Output LAZY_LOAD_OK"
```

Expected `debug config` plugin origins: each local file once plus each npm plugin once.

Known runtime issues: [docs/opencode-bugs-known.md](docs/opencode-bugs-known.md).
