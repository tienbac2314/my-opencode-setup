# OpenCode Agents in This Setup

Use this guide when agent names in main switcher, `@` menu, OMO Slim, or agent files feel confusing. It explains which names are selectable, which run as workers, and why some Markdown belongs under `data/` instead of `agents/`.

## Three Different Agent Lists

OpenCode does not use one flat agent list.

| Where you see it | What it means | How it starts |
|---|---|---|
| Main agent switcher or Tab cycle | Primary agent controlling current conversation | Select in UI or cycle with Tab |
| `@name` autocomplete | Subagent available for direct mention | Type `@` and choose name |
| Internal task call | Subagent allowed to work for another agent | Primary agent calls task tool |

[Official OpenCode agent docs](https://opencode.ai/docs/agents/) call these two user-facing types **primary agents** and **subagents**. [OpenCode School](https://opencode.school/) uses simpler Plan/Build examples for learning normal workflow.

## Primary Agents

Primary agent owns main conversation. Built-in examples are Build and Plan. Pressing Tab or using agent switch control changes primary agent; it does not create child worker.

Agent mode controls placement:

```yaml
mode: primary
```

`mode: all` makes agent usable as primary or subagent. If mode is omitted, OpenCode currently treats agent as usable in both roles.

Global `default_agent` chooses starting primary agent. This repository uses OpenCode Build. OMO Slim config keeps `setDefaultAgent: false`, so plugin does not replace that choice.

## `@` Agents and Internal Workers

Subagent handles bounded task inside child session. It may be selected manually with `@name` or called by another agent through task tool.

```yaml
mode: subagent
```

Two controls often get mixed up:

- `hidden: true` removes subagent from `@` autocomplete. It does not stop internal task calls.
- `permission.task` controls which subagents calling agent may start. Denied names are removed from task-tool choices.

Model and tool settings can differ per agent. Primary agent without explicit model uses global model. Subagent without explicit model inherits model of primary agent that called it. Agent-level settings override global settings.

OpenCode also uses hidden system agents for work such as compaction, title, and summary. These are not normal names to select in main switcher or `@` menu.

## OMO Slim Roles

OMO Slim adds orchestration roles on top of OpenCode agent system. Local file `config/oh-my-opencode-slim.json` controls model, skills, and MCP access for Orchestrator, Oracle, Librarian, Explorer, Designer, and Fixer.

Current 9router rules:

- OpenCode Build remains default primary agent.
- OMO Explorer is disabled.
- Orchestrator gets all skills and all MCPs except `context7`.
- Oracle gets `simplify` only and no MCPs.
- Librarian gets research MCPs and no skills.
- Explorer, Designer, and Fixer get no skills or MCPs.

OMO installer can rewrite its generated config. Targeted updater restores this tracked file after each OMO update.

## Why Research Modules Are Hidden from Agent List

[Weizhena/Deep-Research-skills](https://github.com/Weizhena/Deep-Research-skills) originally stores web-search strategy Markdown under agent module directory. OpenCode discovers agent Markdown from agent paths, so strategy files can appear as fake selectable agents.

This repository moves those reference files to:

```text
data/web-search-strategies/
```

Real agent stays at `agents/web-search.md`. Its prompt reads strategy files from data directory. Result: one real web-search agent in `@` list, five strategy documents hidden from agent discovery but still readable.

## Where Agent Files Load From

OpenCode supports global agents under `~/.config/opencode/agents/` and project agents under `.opencode/agents/`. Markdown filename becomes agent name. JSON `agent` entries can also define or override agents. Config sources merge; later sources can override earlier values. See [OpenCode config docs](https://opencode.ai/docs/config/) before debugging duplicate or missing agents.

For this repository:

- tracked agents: `agents/`
- active global agents: `$HOME\.config\opencode\agents\`
- tracked research reference data: `data/web-search-strategies/`
- active research reference data: `$HOME\.config\opencode\data\web-search-strategies\`

## Quick Debug Checks

1. Missing from main switcher: confirm agent mode includes `primary`.
2. Missing from `@`: confirm mode includes `subagent`, agent is not disabled, and `hidden` is not true.
3. Cannot be called internally: inspect caller's `permission.task` and plugin role permissions.
4. Strategy file appears as agent: remove old `$HOME\.config\opencode\agents\web-search-modules\` and rerun bootstrap migration.
5. OMO role has wrong model/tools: compare active `oh-my-opencode-slim.json` with tracked file, then use targeted OMO update/restore.
