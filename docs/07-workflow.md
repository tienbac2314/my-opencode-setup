# Workflow

How all components work together.

## Session Startup

```
OpenCode starts
  │
  ├── Loads opencode.jsonc → empty mcp {}, plugins registered, 9router provider
  ├── Loads AGENTS.md → behavioral + triage instructions
  ├── Loads plugins (triage + lazy-loader hooks)
  │   ├── triage: strips skill XML from prompt, modifies skill tool description
  │   └── lazy-loader: registers skill/mcp_mcp connection management
  └── Ready — MCPs NOT started, skills NOT in prompt
```

## User Requests a Skill

```
User: "use browser automation to screenshot google.com"
  │
  ├── Without AGENTS.md:
  │   LLM tries skill("browser-automation") → blocked by hook → wasted thinking
  │
  └── With AGENTS.md:
      LLM calls triage(query: "browser automation")
        │
        ├── Plugin scores skills → browser-automation wins (gap ≥ 30)
        ├── Returns skill instructions
        └── LLM follows instructions, uses skill_mcp for playwright

  Or (auto-suggestion):
      Plugin proactively suggests browser-automation skill based on keywords
      LLM sees suggestion and loads it directly
```

## MCP Lifecycle

```
skill(name="browser-automation")
  │
  ├── lazy-loader reads SKILL.md frontmatter
  ├── Discovers playwright MCP definition
  ├── Registers connection (pooled per session)
  │
  └── skill_mcp(mcp_name="playwright", ...)
        │
        ├── Lazy connection: starts npx @playwright/mcp on first call
        ├── Returns tool result
        └── Idle timer starts (5 min)
              │
              └── No activity → disconnects, cleans up resources
```

## Session Compaction

When context window gets full, OpenCode auto-compacts (keeps last 20 turns). Triage hooks persist across compaction — skills stay hidden.

## Key Metrics

| Metric | Value |
|--------|-------|
| Skill XML tokens (without triage) | ~2,002 per call |
| Skill XML tokens (with triage) | 0 |
| Token savings | 97% |
| Skills discovered | 31 |
| MCP idle timeout | 5 min |
| Subagent model | haiku-claude (fast/cheap) |
