# Plugins

Two plugins form the core of this setup: triage and lazy-loader. Both use [licat2023](https://github.com/licat2023) forks with Windows compatibility fixes and additional features.

## opencode-triage

**Repo:** [licat2023/opencode-triage](https://github.com/licat2023/opencode-triage) (forked from cascharly)

### What it does

OpenCode injects every skill's name + description into the system prompt on every message (~2,000 tokens). Triage eliminates this entirely by:

1. **`tool.definition` hook** — Replaces the built-in `skill` tool description with "Use triage instead"
2. **`system.transform` hook** — Strips the `<available_skills>` XML block from the system prompt
3. **`tool.execute.before` hook** — Blocks any stray `skill()` calls

### Savings

```
Without triage: 2,034 tokens per call (2,002 skill XML + 32 tool def)
With triage:      59 tokens per call (0 skill XML + 59 tool def)
Savings:       1,975 tokens (97%)
```

### licat2023 improvements over original

| Feature | Description |
|---------|-------------|
| **Semantic matching** | Uses `@xenova/transformers` embedding model for cross-lingual skill matching |
| **Auto-suggestion** | Injects relevant skill suggestions per-message (CJK tokenization via jieba-wasm) |
| **`list-skills` tool** | Separates skill search from loading |
| **Stale suggestion fix** | Clears `_suggested` across sessions so suggestions reappear |
| **Cleanup** | Removed unused code, O(1) Set lookups, conditional sharp stub |

### Usage

```powershell
# CLI (outside OpenCode)
npx opencode-triage on
npx opencode-triage status
npx opencode-triage compare
npx opencode-triage dedupe

# Inside OpenCode
/triage on
/triage status
/triage compare
```

## opencode-lazy-loader

**Repo:** [licat2023/opencode-lazy-loader](https://github.com/licat2023/opencode-lazy-loader) (forked from keybrdist)

### What it does

Lets skills bundle their own MCP servers. Instead of defining MCPs globally in `opencode.jsonc`, each skill defines its needed MCPs in SKILL.md frontmatter. The MCP starts only when the skill is activated.

### licat2023 improvements over original

| Fix | Issue |
|-----|-------|
| **Windows env vars** | Passes APPDATA, USERPROFILE, SystemRoot to MCP child processes |
| **Cross-platform paths** | Uses `os.tmpdir()` instead of hardcoded `/tmp/` |
| **Signal handler guard** | Reentrancy guard for cleanup |
| **Transport cleanup** | Closes transport before deleting client map |
| **Debug logging** | `OPENCODE_LAZY_LOADER_DEBUG=1` for diagnostics |

### Skill MCP format

Define MCPs in SKILL.md frontmatter:

```yaml
---
name: my-skill
mcp:
  server-name:
    command: ["npx", "-y", "@some/mcp"]
---
```

Then activate on-demand:

```
skill(name="my-skill")
skill_mcp(mcp_name="server-name", tool_name="...")
```

MCPs auto-disconnect after 5 minutes of inactivity.

## Installation

```powershell
npm install -g licat2023/opencode-triage
npm install -g licat2023/opencode-lazy-loader
```

Both register as OpenCode plugins via the `"plugin"` array in `opencode.jsonc`.
