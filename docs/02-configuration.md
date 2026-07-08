# Configuration

The main config is `config/opencode.jsonc` (mirror of `~/.config/opencode/opencode.jsonc`).

## Provider: 9router

Uses an OpenAI-compatible router backend for model access:

```jsonc
"provider": {
  "9router": {
    "npm": "@ai-sdk/openai-compatible",
    "options": {
      "baseURL": "https://tienbac.dpdns.org/v1",
      "modelsDiscovery": { "enabled": true }
    }
  }
}
```

Key points:
- `modelsDiscovery: true` — auto-discovers available models on startup
- API key stored in config (ensure `.config/opencode/` is in `.gitignore` if pushing to public repo)

## Models

Two primary models configured:

| Name | ID | Use |
|------|-----|-----|
| opus-claude | `9router/opus-claude` | Default, heavy tasks |
| haiku-claude | `9router/haiku-claude` | Subagents, fast tasks |

## Agent

Single subagent for exploration:

```jsonc
"agent": {
  "explorer": {
    "description": "Fast explorer subagent for codebase exploration",
    "mode": "subagent",
    "model": "9router/haiku-claude"
  }
}
```

## MCP

Empty by design — all MCPs migrated to skill-embedded configs:

```jsonc
"mcp": {}
```

See [MCP Architecture](05-mcp-architecture.md) for details.

## Plugins

```jsonc
"plugin": [
  ["opencode-triage", { "autoHide": true }],
  "opencode-lazy-loader"
]
```

- `opencode-triage` with `autoHide: true` — hides skill descriptions from prompt
- `opencode-lazy-loader` — manages skill-embedded MCP connections

## Permissions

All tools allowed (no prompt/ask):

```jsonc
"permission": {
  "edit": "allow", "bash": "allow", "read": "allow",
  "glob": "allow", "grep": "allow", "task": "allow",
  "webfetch": "allow", "websearch": "allow", "lsp": "allow"
}
```

## Other Settings

| Setting | Value | Effect |
|---------|-------|--------|
| `shell` | `pwsh` | PowerShell 7+ |
| `logLevel` | `INFO` | Standard logging |
| `formatter` | `false` | No auto-formatting |
| `lsp` | `true` | Language servers enabled |
| `compaction.auto` | `true` | Auto-compact sessions |
| `compaction.tail_turns` | `20` | Keep 20 recent turns |
| `tool_output.max_lines` | `500` | Truncate tool output |
| `tool_output.max_bytes` | `16384` | Truncate tool output size |
