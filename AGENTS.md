# OpenCode Dotfiles Repository Guide

Global behavior and runtime policy deploys from `config/AGENTS.md`. This file contains repository-only contracts and must not duplicate that shared policy.

## Repository source of truth

**When changing this repository, resolve these paths from repository root and read current contracts before changing setup or runtime behavior.**

* `README.md`: architecture, component map, runtime boundaries, daily commands.
* `docs/README.md`: documentation index and authority map.
* `docs/guides/setup.md`: install, credentials, environment, updates, recovery, live checks.
* `config/components.json`: only authority for approved versions and source commits.
* `docs/reference/patches.md`: local forks, wrappers, package patches, verification, removal conditions.
* `docs/guides/troubleshooting.md`: symptom-first checks and safe recovery.
* `docs/reference/agents.md`: primary agents, `@` subagents, OMO roles, discovery paths.
* `docs/integrations/`: current integration boundaries and operator contracts.
* `docs/history/decisions.md`: architectural decisions, implementation evidence, and supersession conditions.
* `docs/reference/upstream.md`: upstream ownership; repository policy stays local.

Current boundaries: Headroom uses an optional independent proxy plus an auto-discovered fail-open bridge; local plugins are auto-discovered. Compare repository files with active `~/.config/opencode` before diagnosing drift. Never print full resolved config or credential values.

Repository runtime rules:

* `/tokens` reports token sources; model discovery builds 9router entries; update checks belong to `maintain.ps1`.
* Local plugins auto-discover. Never list local file paths or set `"plugin": []`.
* Use CodeGraph only when `.codegraph/codegraph.db` exists; use normal search when unavailable.

## Engineering history

Before finishing a non-trivial architecture, integration, migration, or rejected approach, update `docs/history/decisions.md`. Record context, alternatives, decision, implementation paths, reproducible evidence, and removal/supersession condition. Record concise engineering conclusions, not hidden chain-of-thought or raw chat transcripts. Never store credentials, personal data, full resolved config, or unredacted logs. Mark superseded decisions instead of deleting them silently.
