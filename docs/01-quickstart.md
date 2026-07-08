# Quickstart

## Prerequisites

- [OpenCode](https://opencode.ai) 1.14+
- Node.js 18+ (for plugin CLI tools)
- PowerShell 7+ (configured shell)
- Git (optional, for dotfiles sync)

## Install

### 1. Install Plugins

```powershell
# Triage — hides skills from prompt, routes on demand
npm install -g opencode-triage

# Lazy Loader — loads skill-embedded MCPs on demand
npm install -g opencode-lazy-loader
```

### 2. Activate Triage

```powershell
npx opencode-triage on
```

Verify:
```
npx opencode-triage status
```

### 3. Copy Config

```powershell
# Create config directory if needed
New-Item -ItemType Directory -Path ~\.config\opencode -Force

# Copy files
Copy-Item -Recurse config\* ~\.config\opencode\
Copy-Item -Recurse skills\* ~\.config\opencode\skills\
Copy-Item AGENTS.md ~\.config\opencode\AGENTS.md
```

### 4. Install Dependencies

```powershell
cd ~\.config\opencode
npm install
```

### 5. Restart OpenCode

## Verify

Run these inside OpenCode to confirm:

1. **Triage active** — ask: *"describe the skill tool"* → should mention triage
2. **Skills loadable** — `skill(name="docs-fetcher")` → loads Context7 MCP
3. **No startup MCPs** — check that context7/playwright/chrome-devtools aren't pre-loaded

## Usage Pattern

Instead of: `skill(name="brainstorming")`

Use: `triage(query: "brainstorming")` or just describe what you need — the auto-suggestion handles it.
