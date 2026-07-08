# OpenCode Dotfiles

Personal OpenCode configuration with skill-embedded MCPs, lazy loading, and token-optimized skill routing.

## Stack

| Component | Choice |
|-----------|--------|
| **Shell** | PowerShell 7+ |
| **Provider** | 9router (OpenAI-compatible) |
| **Model** | opus-claude / haiku-claude |
| **Skill Router** | [opencode-triage](https://github.com/cascharly/opencode-triage) |
| **MCP Lazy Loader** | [opencode-lazy-loader](https://github.com/keybrdist/opencode-lazy-loader) |
| **LSP** | 36 language servers |

## Structure

```
~/.config/opencode/
├── opencode.jsonc          # Main config
├── AGENTS.md               # Behavioral instructions
├── package.json            # npm deps (plugin SDK)
├── plugins/                # Local plugins (models-discovery)
├── commands/triage.md      # Triage CLI command
└── skills/
    ├── docs-fetcher/       # Context7 MCP
    ├── browser-automation/ # Playwright MCP
    └── devtools-debugger/  # Chrome DevTools MCP
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

- **97% token savings** on skill metadata via triage hooks
- **MCPs load on-demand** via skill activation (not at startup)
- **Per-message auto-suggestion** of relevant skills
- **Semantic skill matching** with multilingual embedding model
- **Windows-native** environment variable pass-through for MCPs
