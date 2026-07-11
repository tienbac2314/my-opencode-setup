# OpenCode Dotfiles

Personal OpenCode configuration with skill-embedded MCPs, lazy loading, and token-optimized skill routing.

## Stack

| Component | Choice |
|-----------|--------|
| **Shell** | PowerShell 7+ |
| **Provider** | 9router (OpenAI-compatible) |
| **Model** | opus-claude / haiku-claude |
| **MCP Lazy Loader** | [opencode-lazy-loader](https://github.com/keybrdist/opencode-lazy-loader) |
| **LSP** | 36 language servers |

## Structure

```
~/.config/opencode/
├── opencode.jsonc          # Main config
├── AGENTS.md               # Behavioral instructions
├── package.json            # npm deps (plugin SDK + lazy-loader)
├── plugins/                # Local plugins (models-discovery, rtk)
├── commands/               # Slash commands
└── skills/                 # 25 skill-embedded MCP servers
    ├── browser-automation/ # Playwright MCP
    ├── devtools-debugger/  # Chrome DevTools MCP
    ├── docs-fetcher/       # Context7 MCP
    ├── brainstorming/      # Creative work workflow
    ├── codex-security-*/   # 10 security scanning skills
    └── ...                 # planning, review, git, testing, etc
```

## Quick Install (via Bootstrap)

```powershell
# 1. Clone this repo
git clone https://github.com/tienbac2314/opencode-dotfiles ~\opencode-dotfiles
cd ~\opencode-dotfiles

# 2. Run bootstrap (installs everything)
.\bootstrap.ps1

# 3. Restart OpenCode
```

## Key Features

- **MCPs load on-demand** via skill activation (not at startup)
- **Windows-native** environment variable pass-through for MCPs
