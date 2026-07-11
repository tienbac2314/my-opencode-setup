# OpenCode Known Bugs & Workarounds

Known: 2026-07-11

## `experimental.primary_tools` breaks subagent tool access

**Symptom:** Explore subagent (and potentially other subagents) claims it only has `webfetch`/`websearch`. Missing `read`, `glob`, `grep`, `task` tools. Agent effectively crippled.

**Root cause:** `experimental.primary_tools` list (`["edit", "bash", "read", "glob", "grep"]`) is inverted for subagents — they lose access to tools in that list. Only tools NOT in `primary_tools` survive.

**Fix:** Remove `primary_tools` from `experimental` block:
```jsonc
"experimental": {
  "mcp_timeout": 60000
}
```

**Note:** `config/opencode.jsonc` is gitignored (contains API keys). Fix must be applied manually after each `bootstrap.ps1` run, or add a post-bootstrap sed/copy step.

## `opencode-lazy-loader` plugin

- Installed globally via npm, referenced in `plugin` array
- Provides `skill` + `skill_mcp` tools for lazy-loading skill-embedded MCP servers
- Has nothing to do with subagent tool restrictions — confirmed independent
