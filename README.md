# OpenCode Dotfiles

Personal OpenCode setup for Windows and Linux. One component manifest controls versions, sources, local patches, and verification.

## Start here

- Install: [setup.md](setup.md)
- Check or apply updates: `pwsh ./maintain.ps1 check|plan|apply|verify`
- Understand local differences: [PATCHES.md](PATCHES.md)
- Prepare upstream reports: [pr.md](pr.md)
- Understand this refactor and past failures: [docs/maintenance-refactor.md](docs/maintenance-refactor.md)

## Architecture

```text
config/components.json   approved versions, commits, sources, tests
setup.ps1                first install and machine integration
maintain.ps1             check, plan, apply, verify
commands/                tracked slash commands
plugins/                 custom plugins and maintained forks
patches/                 small exact package patches
scripts/                 focused helpers used by setup/maintainer
tests/                   behavior and maintenance contracts
```

Private credentials stay outside this repository under `~/.config/opencode`.

## Components

Purpose: show what this setup loads and where each part comes from.

| Component | Source | What it does |
|---|---|---|
| OpenCode | `anomalyco/opencode` | App, TUI, server, LSP, and built-in tools |
| 9router model discovery | Local `models-discovery.js` | Adds available 9router models with correct input types |
| Oh My OpenCode Slim | `alvinunreal/oh-my-opencode-slim` | Orchestrator plus Oracle, Librarian, Designer, and Fixer agents |
| Goal | `prevalentWare/opencode-goal-plugin` | Long-running goal tools, `/goal`, and TUI sidebar status |
| Supermemory | `supermemoryai/opencode-supermemory` | Self-hosted memory across sessions |
| Lazy loading | `omarwaly-ai/opencode-lazy-loading` | Loads tool schemas only when the model asks for them |
| Token source | `omarwaly-ai/OpenCode-tokens-source` | `/tokens` breakdown by prompt, tool, and message source |
| CodeGraph | `colbymchenry/codegraph` plus local guard | Code search for indexed projects; no action elsewhere |
| RTK | `rtk-ai/rtk` plus local OpenCode hook | Shorter shell output and Windows-safe command rewriting |
| Deep Research | `Weizhena/Deep-Research-skills` | Research workflow without exposing strategy files as agents |
| Headroom | `headroomlabs-ai/headroom` | Optional one-session proxy; normal App/TUI traffic is unchanged |

Exact versions and source commits live only in `config/components.json`.

## Daily commands

```powershell
pwsh ./maintain.ps1 check
pwsh ./maintain.ps1 plan
pwsh ./maintain.ps1 apply -Component COMPONENT_ID
pwsh ./maintain.ps1 apply -All
pwsh ./maintain.ps1 verify
```

`check` never changes files. `plan` writes ignored reports under `.state/`. `apply` installs only targets already approved in `config/components.json`. Local forks are never overwritten automatically.

## Runtime boundaries

- Project `.opencode/opencode.json` does not define `plugin`; global plugin origins remain authoritative.
- Headroom is launcher-only. Normal App/TUI sessions are not proxied.
- CodeGraph runs only when project has `.codegraph/codegraph.db`.
- Goal server and TUI use the pinned root package spec. One exact TUI patch remains until upstream ships equivalent behavior.
- Update checks come from `maintain.ps1`; no runtime notifier plugin is needed.
- Supermemory wrapper adapts package export only; memory behavior remains upstream.
- `npm ls --depth=0` and `opencode debug config` are authoritative. `bun pm ls` can show stale lock metadata after npm installs.
- `.opencode/goals/` is user/runtime state and remains untracked.

## Expected verification

`pwsh ./maintain.ps1 verify` checks:

- exact local package targets;
- repository-to-runtime plugin hashes;
- package patches;
- resolved plugin/origin counts;
- full Bun test suite.
- production dependency audit at high severity or above when online.

Live checks still matter for provider traffic, Goal sidebar, App rendering, agent orchestration, and Supermemory CRUD. OpenCode remembers sidebar visibility globally; press `Ctrl+X`, then `B` before treating a missing Goal block as a plugin failure.
