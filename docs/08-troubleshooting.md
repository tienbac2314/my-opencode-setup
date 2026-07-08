# Troubleshooting

## Triage /triage on doesn't work

```powershell
# Check status
npx opencode-triage status

# If hooks showing OFF:
npx opencode-triage on

# If command not found:
npm install -g licat2023/opencode-triage
```

## Skill not found via triage

```powershell
# List all skills
npx opencode-triage status --all

# Check skill directories exist
Get-ChildItem ~\.config\opencode\skills -Directory

# Each should have a SKILL.md with frontmatter:
# ---
# name: <name>
# description: <description>
# ---
```

## MCP not loading when skill activated

Enable debug logging:

```powershell
$env:OPENCODE_LAZY_LOADER_DEBUG = "1"
# restart OpenCode
# check logs at: $env:TMP\opencode-lazy-loader.log
```

## Plugin not loading silently

Check OpenCode logs:

```powershell
Get-Content ~\.local\share\opencode\log\opencode.log -Tail 20
```

Look for `plugin` or `init` messages. If none appear, the plugin array isn't being processed — try adding the plugin as a local file instead.

## LLM keeps using skill() instead of triage()

1. Verify `AGENTS.md` has the triage instruction
2. Check `config/opencode.jsonc` has `"instructions": ["AGENTS.md"]`
3. Restart OpenCode
4. The LLM may still try skill() once — it learns from the blocked call

## Subagent not using configured model

Subagent model set in `opencode.jsonc` under `agent.explorer.model`. The model ID must match one of the available models from your provider.

## LSP servers too slow

List of 36 LSP servers is aggressive. Edit `opencode.jsonc` to disable unused ones, or set `"lsp": false` to disable all.
