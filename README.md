# OpenCode Dotfiles

Personal OpenCode setup for Windows and Linux. One component manifest controls versions, sources, local patches, and verification.

## Start here

- Documentation index: [docs/README.md](docs/README.md)
- Install: [docs/guides/setup.md](docs/guides/setup.md)
- Check or apply updates: `pwsh ./maintain.ps1 check|plan|apply|verify`
- Diagnose runtime problems: [docs/guides/troubleshooting.md](docs/guides/troubleshooting.md)
- Understand current integration decisions: [docs/history/decisions.md](docs/history/decisions.md)

## Architecture

```text
config/components.json   approved versions, commits, sources, tests
config/AGENTS.md         reusable global agent policy deployed by setup
AGENTS.md                repository-only contracts and boundaries
setup.ps1                first install and machine integration
maintain.ps1             check, plan, apply, verify
commands/                tracked slash commands
plugins/                 custom plugins and maintained forks
patches/                 small exact package patches
scripts/                 focused helpers used by setup/maintainer
tests/                   behavior and maintenance contracts
```

Private credentials stay outside this repository under `~/.config/opencode`.

Flow: `setup.ps1` reads the component manifest and delegates installs to `maintain.ps1`; maintainer converges package pins, tracked runtime files, patches, and retired artifacts; OpenCode auto-discovers local files under `plugins/`; tests encode integration contracts. Read [engineering decisions](docs/history/decisions.md) before changing ownership boundaries.

## Components

Purpose: show what this setup loads and where each part comes from.

| Component | Source | What it does |
|---|---|---|
| OpenCode | `anomalyco/opencode` | App, TUI, server, LSP, and built-in tools |
| 9router model discovery | Local `models-discovery.js` | Adds available 9router models with correct input types |
| Oh My OpenCode Slim | `alvinunreal/oh-my-opencode-slim` | Orchestrator plus Oracle, Librarian, Designer, and Fixer agents |
| Goal (disabled) | `prevalentWare/opencode-goal-plugin` | Retained for investigation; setup does not install or load it while OpenCode integration remains broken |
| Supermemory | `supermemoryai/opencode-supermemory` | Self-hosted memory across sessions |
| Lazy loading | `omarwaly-ai/opencode-lazy-loading` | Loads tool schemas only when the model asks for them |
| Token source | `omarwaly-ai/OpenCode-tokens-source` | `/tokens` breakdown by prompt, tool, and message source |
| CodeGraph | `colbymchenry/codegraph` plus local guard | Code search for indexed projects; no action elsewhere |
| RTK | `rtk-ai/rtk` plus local OpenCode hook | Shorter shell output and Windows-safe command rewriting |
| Deep Research | `Weizhena/Deep-Research-skills` | Research workflow without exposing strategy files as agents |
| Headroom | `headroomlabs-ai/headroom` | Optional persistent proxy plus auto-discovered Desktop/CLI transport bridge |

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
- Headroom is opt-in. Its hidden login task and auto-discovered bridge serve Desktop and TUI without taking ownership of providers, models, MCP, RTK, or memory. See [Headroom integration](docs/integrations/headroom.md).
- CodeGraph runs only when project has `.codegraph/codegraph.db`.
- Goal package, patch, and command remain tracked but are not installed or loaded. `components.json` records the temporary disable reason.
- Update checks come from `maintain.ps1`; no runtime notifier plugin is needed.
- Browser automation, DevTools debugger, and docs-fetcher MCP skills are retired; MCP ownership stays in explicit OpenCode/OMO configuration.
- Supermemory is the single persistent-memory owner. Headroom memory and learning remain disabled.
- RTK is installed under `~/.local/bin`; executable replacement and removal of stale copies elsewhere on `PATH` remain user-managed.
- `npm ls --depth=0` and `opencode debug config` are authoritative. `bun pm ls` can show stale lock metadata after npm installs.
- `.opencode/goals/` is user/runtime state and remains untracked.

## Expected verification

`pwsh ./maintain.ps1 verify` checks:

- exact local package targets;
- repository-to-runtime plugin hashes;
- package patches;
- resolved plugin/origin counts;
- full Bun test suite;
- production dependency audit at high severity or above when online.

Live checks still matter for provider traffic, App rendering, agent orchestration, and Supermemory CRUD.
