# Targeted Plugin Updates and Agent Docs Design

## Purpose

This document defines a safe way to update one OpenCode component without rerunning the full machine bootstrap. It also defines missing maintenance notes for OMO Slim, Deep Research skills, OpenCode agents, update-notifier coverage, and upstream-derived plugin diffs.

## Version File

Package versions move out of `bootstrap.ps1` into private machine file:

```text
$HOME\.config\opencode\versions.env
```

Repository tracks `config/versions.env.example`, containing tested default versions but no credentials. Bootstrap copies example only when private file is missing. User changes private file directly after reviewing an upstream release.

Supported keys:

```dotenv
OPENCODE_VERSION=1.17.18
OPENCODE_PLUGIN_VERSION=1.17.18
AI_SDK_OPENAI_COMPATIBLE_VERSION=3.0.7
OPENCODE_SUPERMEMORY_VERSION=2.0.8
OPENCODE_UPDATE_NOTIFIER_VERSION=0.3.3
OH_MY_OPENCODE_SLIM_VERSION=2.2.0
```

Parser accepts blank lines and `#` comments. Unknown keys are ignored. Missing required keys fail with a clear message. Values must contain package-version characters only; file is data, never executed as PowerShell.

## Bootstrap Modes

Existing `bootstrap.ps1` behavior remains default full install.

New interface:

```powershell
.\bootstrap.ps1 -UpdateOnly -Component OmoSlim
```

`-UpdateOnly` skips config/skill/agent/plugin copying, CodeGraph setup, Supermemory checks, environment changes, skill linking, and RTK initialization. First supported component is `OmoSlim`, matching current update need.

OMO update flow:

1. Read exact version from private version file.
2. Run exact `bunx oh-my-opencode-slim@VERSION install --yes`.
3. Restore tracked `config/oh-my-opencode-slim.json`.
4. Restore tracked `config/tui.json`, then pin its active root plugin entry to private-file version.
5. Pin active global root plugin entry with `scripts/pin-opencode-plugin.ps1`.
6. Install exact npm package under active config.
7. Print focused verification commands.

No `@latest`. No broad `npm update`. No unrelated component mutation.

`update-plugins.ps1` becomes a compatibility entrypoint for this safe component update or inventory-only dry run. It must not retain broad automatic updates.

## Tailored OMO Slim Settings

Maintenance docs must record all local settings, not only “9router preset”:

- `setDefaultAgent: false` keeps OpenCode Build as main default agent.
- `disabled_agents: ["explorer"]` disables OMO Explorer.
- Active preset is `9router`.
- All OMO roles use selected 9router model in this preset.
- Orchestrator gets all skills and all MCPs except `context7`.
- Oracle gets only `simplify` and no MCPs.
- Librarian gets web research MCPs and no skills.
- Explorer, Designer, and Fixer get no skills or MCPs.
- Tracked OpenAI and OpenCode Go presets remain available.
- Installer output never becomes source of truth; tracked config is restored after update.

## Deep Research Source and Changes

Maintenance docs add [Weizhena/Deep-Research-skills](https://github.com/Weizhena/Deep-Research-skills) as source for five research skills, web-search agent, and five strategy files.

Local differences:

- Codex English skills are adapted for OpenCode skill metadata and tool names.
- `request_user_input` references become `AskUserQuestion` where required by current files.
- Validation path uses `~/.config/opencode/skills/research/validate_json.py`.
- Strategy files move from `agents/web-search-modules/` to `data/web-search-strategies/`.
- Web-search prompt reads new data path.
- Move is functional: OpenCode treats Markdown in agent discovery folders as agents; data modules must not appear in `@` autocomplete.
- Web-search model is locally selected.

## OpenCode Agent Guide

Add one short human-readable document explaining:

- Primary agents appear in main agent switcher/tabs and are changed with Tab or agent switch controls.
- Subagents can be called by primary agents or manually through `@name`.
- `mode: primary`, `mode: subagent`, and `mode: all` control placement.
- `hidden: true` hides a subagent from `@` autocomplete but does not stop internal task invocation.
- `permission.task` controls which subagents another agent may call.
- Agent-specific model and tool settings override global defaults.
- Built-in hidden system agents such as compaction are not normal selectable agents.
- OMO Slim registers its orchestration roles on top of OpenCode agent system.
- Research strategy files are data, not agents.

Official OpenCode docs are authority. OpenCode School provides beginner examples.

## Update Notifier Coverage

Docs state exact boundary:

- Checked: exact npm pins and GitHub git package specs pinned to SemVer tags.
- Not checked: `file:` plugins, local paths, custom wrappers, custom source files, unpinned packages, non-GitHub git URLs, branches, and commit SHAs.
- In this repository, notifier sees pinned OMO Slim and notifier package entries.
- It does not independently track lazy load, token source, RTK, model discovery, CodeGraph helper, Supermemory wrapper, Deep Research files, or OMO config changes.

## Upstream Diff Review

Recompare every upstream-derived file against current source and record exact upstream commit. Preserve useful upstream comments unless local behavior makes them false.

Required corrections:

- RTK source comparison uses `rtk-ai/rtk` `develop` branch.
- Restore RTK header comments explaining token rewrite delegation and Rust registry source of truth.
- Keep local Windows/Desktop behavior: guarded input shell, `where rtk`, delayed global guard, default local-file export.
- Restore original upstream rewrite-failure comment when meaning remains unchanged.
- Review lazy-load comment removals individually; restore only still-accurate explanations.
- Token source difference remains five-line duplicate-load guard plus deployment filename.
- Deep Research files get their own source/diff section.
- OMO config gets field-by-field local-setting section.

## Verification

- Tests prove version-file creation, parsing, required-key failure, and no hardcoded package versions in update logic.
- Tests prove `-UpdateOnly -Component OmoSlim` skips full-install sections and restores tailored files after installer.
- Existing bootstrap pinning, credential preservation, lazy-load, and plugin tests stay green.
- PowerShell parser checks pass for modified scripts.
- Documentation names every upstream-derived component and states notifier coverage.
- Active update smoke uses dry-run or controlled command interception before any real package update.

## Safety

- Private version file contains no credentials and remains outside repository.
- Bootstrap never prints credentials or resolved config bodies.
- Update mode changes only selected component.
- Existing uncommitted user files remain preserved; edits merge around them.
