# MCP Architecture

## Before: Global MCPs

All MCP servers defined in `opencode.jsonc` — loaded at every startup:

```jsonc
"mcp": {
  "context7": {
    "type": "local",
    "command": ["npx", "-y", "@upstash/context7-mcp"],
    "enabled": true
  },
  "playwright": {
    "type": "local",
    "command": ["npx", "-y", "@playwright/mcp@latest"],
    "enabled": true
  },
  "chrome-devtools": {
    "type": "local",
    "command": ["npx", "-y", "chrome-devtools-mcp@latest"],
    "enabled": true
  }
}
```

**Problems:**
- All 3 MCPs start on every OpenCode session
- Context window wasted on tools you might not use
- Startup slower

## After: Skill-Embedded MCPs

Global MCP config is empty. Each MCP lives inside a skill:

```jsonc
"mcp": {}
```

Each skill's `SKILL.md` frontmatter declares its MCP:

```yaml
---
name: docs-fetcher
mcp:
  context7:
    command: ["npx", "-y", "@upstash/context7-mcp"]
---
```

## Flow

```
User: "fetch React docs"
  │
  ▼
LLM: triage(query: "documentation fetch")
  │
  ▼
Plugin: matches → docs-fetcher skill
  │
  ▼
Skill loaded → lazy-loader starts context7 MCP
  │
  ▼
LLM: skill_mcp(mcp_name="context7", ...)
  │
  ▼
Result returned
  │
  ▼
5 min idle → MCP auto-disconnects
```

## Benefits

| Aspect | Global MCPs | Skill-Embedded MCPs |
|--------|-------------|---------------------|
| Startup cost | All MCPs loaded | None |
| Memory | Always allocated | On-demand only |
| Context usage | Tool descriptions always visible | Only when skill active |
| Portability | Tied to machine config | Travels with skill files |
| Idle cleanup | Manual | Auto after 5 min |

## Connection Management

Handled by `opencode-lazy-loader`:
- Connection pooling per session/skill/server
- Lazy initialization (connects on first `skill_mcp()` call)
- Auto-cleanup after 5 min inactivity
- Session-scoped resource management
