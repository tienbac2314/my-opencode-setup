# OpenCode Dotfiles

Personal OpenCode configuration with skill-embedded MCPs, lazy loading, and token-optimized skill routing.

## Stack

| Component | Choice |
|-----------|--------|
| **Shell** | PowerShell 7+ |
| **Provider** | 9router (OpenAI-compatible) |
| **Model** | opus-claude / haiku-claude |
| **Skill Router** | [opencode-triage](https://github.com/licat2023/opencode-triage) (licat2023 fork) |
| **MCP Lazy Loader** | [opencode-lazy-loader](https://github.com/licat2023/opencode-lazy-loader) (licat2023 fork) |
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

## Quick Install

```powershell
# 1. Install plugins globally
npm install -g licat2023/opencode-triage
npm install -g licat2023/opencode-lazy-loader

# 2. Activate triage
npx opencode-triage on

# 3. Copy config + skills
Copy-Item -Recurse config\* ~\.config\opencode\
Copy-Item -Recurse skills\* ~\.config\opencode\skills\
Copy-Item AGENTS.md ~\.config\opencode\AGENTS.md

# 4. Restart OpenCode
```

## Key Features

- **97% token savings** on skill metadata via triage hooks
- **MCPs load on-demand** via skill activation (not at startup)
- **Per-message auto-suggestion** of relevant skills
- **Semantic skill matching** with multilingual embedding model
- **Windows-native** environment variable pass-through for MCPs
