# OpenCode Dotfiles

Personal OpenCode configuration with skill-embedded MCPs, lazy loading, and token-optimized skill routing.

## Stack

| Component | Choice |
|-----------|--------|
| **Shell** | PowerShell 7+ |
| **Provider** | 9router (OpenAI-compatible) |
| **Model** | deepseek-v4-flash-free (free tier) |
| **MCP Lazy Loader** | [omarwaly-ai/opencode-lazy-loading](https://github.com/omarwaly-ai/opencode-lazy-loading) |
| **Token Monitor** | [omarwaly-ai/OpenCode-tokens-source](https://github.com/omarwaly-ai/OpenCode-tokens-source) |
| **LSP** | Auto-discovered |

## Structure

```
~/.config/opencode/
├── opencode.jsonc              # Main config
├── AGENTS.md                   # Behavioral instructions
├── package.json                # npm deps: plugin SDK + lazy-loader
├── plugins/
│   ├── opencode-lazy-load.ts   # Lazy loads tools and MCPs to save tokens
│   ├── tokens-source.ts        # Breaks down token usage per source
│   ├── models-discovery.js     # Auto-discovers LLM models from provider
│   └── rtk.ts                  # RTK agent protocol (optional)
├── agents/                     # Sub-agents
│   ├── web-search.md           # Web researcher sub-agent (used by research skills)
│   └── web-search-modules/     # Search strategy modules
├── skills/                     # 31 skills (3 with embedded MCPs)
│   ├── browser-automation/     # Playwright MCP
│   ├── devtools-debugger/      # Chrome DevTools MCP
│   ├── docs-fetcher/           # Context7 MCP
│   ├── brainstorming/          # Creative work workflow
│   ├── research/               # Deep research workflow (5 skills)
│   ├── research-add-fields/
│   ├── research-add-items/
│   ├── research-deep/
│   ├── research-report/
│   ├── codex-security-*/       # 10 security scanning skills
│   ├── systematic-debugging/   # Debugging workflow
│   ├── test-driven-development/
│   ├── writing-plans/          # Implementation planning
│   └── ...                     # review, git, dispatching, etc
```

## Quick Install

```powershell
git clone https://github.com/tienbac2314/opencode-dotfiles ~\opencode-dotfiles
cd ~\opencode-dotfiles
.\bootstrap.ps1
```

Then restart OpenCode.

## Architecture Notes

See [docs/opencode-bugs-known.md](docs/opencode-bugs-known.md) for detailed plugin loading behavior, path fixes, and workarounds.

Key points:
- Desktop app (Electron) loads plugins from `plugins/` dir only — ignores npm config entries
- We use single-file `.ts` plugins (`opencode-lazy-load.ts` and `tokens-source.ts`) which load cleanly in both CLI and Desktop without needing bridges or transpilation.
- No NPM dependencies required.

## OpenCode 2.0 Considerations

- **Plugin API stability**: v2 may change how plugins export/register. Bridge plugin is thin — one import + re-export. Easy to update.
- **ESM-only**: v2 likely drops CJS support. Package.json already has `"type": "module"`.
- **Built-in skill system**: v2 may natively support skills without lazy-loader. Bridge plugin makes migration trivial — just remove it and let v2 handle skills directly.
- **Desktop app plugin resolution**: If v2 desktop app adds `node_modules` plugin resolution, `lazy-loader.js` bridge becomes unnecessary and can be deleted.

## Key Features

- **MCPs load on-demand** via skill activation (not at startup)
- **Windows-native** environment variable pass-through for MCPs
- **Dual-client support** — same config works for desktop app and CLI
- **No NPM package dependencies** — single-file TypeScript plugins
- **Automatic bootstrap** installs everything simply.
