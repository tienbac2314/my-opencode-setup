# Agents in This Setup

Purpose: explain primary agents, `@` subagents, internal workers, OMO roles, and discovery paths without requiring source archaeology.

## Agent lists

OpenCode exposes three related lists:

| Surface | Meaning | Start method |
|---|---|---|
| Main switcher or Tab cycle | Primary agent controlling current conversation | Select in UI |
| `@name` autocomplete | Visible subagent for direct mention | Type `@` |
| Internal task call | Subagent allowed by caller policy | Primary/plugin invokes task tool |

`mode: primary` limits agent to main conversation. `mode: subagent` limits it to child work. `mode: all` permits both. `hidden: true` removes autocomplete visibility but does not necessarily block internal calls; caller `permission.task` controls which workers it may start.

Agent with no explicit model inherits caller/global behavior according to OpenCode. Agent-level model, tools, permissions, temperature, and prompt override broader settings. Built-in compaction/title/summary workers are system agents, not normal switcher entries.

## Local policy and OMO Slim

OpenCode Build remains default primary agent because `config/opencode.jsonc.example` sets `default_agent: build` and OMO uses `setDefaultAgent: false`.

`config/oh-my-opencode-slim.json` is authoritative for current presets, models, variants, skills, MCP access, and image routing. Current 9router policy disables Explorer, gives Orchestrator broad skills/MCP access except Context7, limits Oracle to simplify, gives Librarian research MCPs, and keeps Designer/Fixer minimal. Setup restores this tracked file after OMO installer changes.

Image routing is explicitly `direct`. OMO Slim's `auto` path saves incoming attachments locally, removes the binary image parts from the primary request, and inserts text nudging delegation to `@observer` when Observer is enabled. Direct routing bypasses that mutation so OpenCode and 9router receive the original image parts. The selected provider/model must support image input; explicit `@observer` delegation remains available when specialized visual analysis is wanted. This is configuration policy only—OMO Slim package source remains vanilla.

Do not duplicate OMO role details elsewhere when exact models change; link to tracked config.

## Discovery paths

- Repository agents: `agents/`
- Active global agents: `~/.config/opencode/agents/`
- Repository skills: `skills/`
- Active global skills: `~/.config/opencode/skills/`
- External skill roots respected by setup: `~/.agents/skills/`, `~/.claude/skills/`
- Research strategy data: `data/web-search-strategies/`

`agents/web-search.md` is a real subagent. Strategy Markdown stays under `data/` so OpenCode does not expose reference documents as fake agents.

Do not add skill-local `mcp:` blocks; MCP ownership belongs to explicit OpenCode or OMO configuration.

## Debug checks

1. Missing from main switcher: confirm mode includes `primary` and agent is not disabled.
2. Missing from `@`: confirm mode includes `subagent`, `hidden` is not true, and agent file reached active config.
3. Cannot run internally: inspect caller `permission.task` and plugin role permissions.
4. Strategy file appears as agent: remove stale active agent-module copy and rerun setup.
5. OMO role has wrong model/tools: compare active `oh-my-opencode-slim.json` with tracked config, then apply only `omo-slim` and verify.
6. Vision model cannot see attachment: confirm effective OMO config has `image_routing: direct`; project-local config and global `oh-my-opencode-slim.jsonc` can take precedence over managed global JSON.
7. Duplicate skill warning: compare active skills with external roots; setup preserves user-owned external roots.

See [troubleshooting](../guides/troubleshooting.md) for runtime symptoms and [maintenance refactor](../history/maintenance-refactor.md) for design history.
