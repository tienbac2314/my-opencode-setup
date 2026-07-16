# OpenCode Dotfiles Repository Guide

Global behavior and runtime policy deploys from `config/AGENTS.md`. This file contains repository-only contracts and must not duplicate that shared policy.

## Repository source of truth

**When changing this repository, resolve these paths from repository root and read current contracts before changing setup or runtime behavior.**

* `README.md`: architecture, component map, runtime boundaries, daily commands.
* `setup.md`: install, credentials, environment, updates, recovery, live checks.
* `config/components.json`: only authority for approved versions, source commits, disabled components, and retired artifacts.
* `PATCHES.md`: local forks, wrappers, package patches, verification, removal conditions.
* `TROUBLESHOOTING.md`: symptom-first checks and safe recovery.
* `docs/agents.md`: primary agents, `@` subagents, OMO roles, discovery paths.
* `docs/maintenance-refactor.md`: root causes, rejected approaches, historical boundaries.
* `pr.md`: upstream ownership; repository policy stays local.

Current boundaries: Goal is disabled; runtime notifier is retired; Headroom uses the official wrapper with optional machine-local profile routing; local plugins are auto-discovered. Compare repository files with active `~/.config/opencode` before diagnosing drift. Never print full resolved config or credential values.

Repository runtime rules:

* `/tokens` reports token sources; model discovery builds 9router entries; update checks belong to `maintain.ps1`.
* Local plugins auto-discover. Never list local file paths or set `"plugin": []`.
* CodeGraph guard requires `.codegraph/codegraph.db`, not metadata-only `.codegraph/` state.
* Goal package and command remain dormant until full live lifecycle succeeds.
