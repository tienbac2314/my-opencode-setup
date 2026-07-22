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

Flow: `setup.ps1` reads the component manifest and delegates installs to `maintain.ps1`; maintainer converges package pins, tracked runtime files, and patches; OpenCode auto-discovers local files under `plugins/`; tests encode integration contracts. Read [engineering decisions](docs/history/decisions.md) before changing ownership boundaries.

## Components

Purpose: show what this setup loads and where each part comes from.

| Component | Source | What it does |
|---|---|---|
| OpenCode | [`anomalyco/opencode`](https://github.com/anomalyco/opencode) | App, TUI, server, plugin SDK, LSP, and built-in tools |
| Vercel AI SDK | [`vercel/ai`](https://github.com/vercel/ai) | OpenAI-compatible provider used by configured transports |
| 9router model discovery | Local `models-discovery.js` | Adds available models with OpenCode modalities, reasoning, tools, and limits |
| Oh My OpenCode Slim | [`alvinunreal/oh-my-opencode-slim`](https://github.com/alvinunreal/oh-my-opencode-slim) | Orchestrator plus specialist agents; vanilla updates use `@latest` and standalone Bun |
| Lazy loading | [`tienbac2314/opencode-lazy-loading`](https://github.com/tienbac2314/opencode-lazy-loading) | Maintained fork; loads tool schemas only when the model asks for them |
| Token source | [`omarwaly-ai/OpenCode-tokens-source`](https://github.com/omarwaly-ai/OpenCode-tokens-source) | `/tokens` breakdown by prompt, tool, and message source |
| CodeGraph | [`colbymchenry/codegraph`](https://github.com/colbymchenry/codegraph) | Code search for indexed projects |
| RTK | [`rtk-ai/rtk`](https://github.com/rtk-ai/rtk) plus local OpenCode hook | Shorter shell output and Windows-safe command rewriting |
| Deep Research | [`Weizhena/Deep-Research-skills`](https://github.com/Weizhena/Deep-Research-skills) | Research workflow without exposing strategy files as agents |
| Superpowers skills | [`obra/superpowers`](https://github.com/obra/superpowers) | Bundled planning, debugging, testing, review, and execution workflows |
| Headroom | [`headroomlabs-ai/headroom`](https://github.com/headroomlabs-ai/headroom) plus local bridge | Optional persistent proxy plus auto-discovered Desktop/CLI transport bridge |

Exact versions and source commits for managed components live only in `config/components.json`. Superpowers is vendored skill content, not a manifest-installed runtime component. Current Codex Security and VibeShell skill files do not retain a verifiable upstream URL, so this catalog does not guess one.

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
- OMO Slim uses direct image routing so vision-capable models receive original attachments; Observer remains available only when explicitly delegated.
- Headroom is opt-in. Its hidden login task and auto-discovered bridge serve Desktop and TUI without taking ownership of providers, models, MCP, RTK, or memory. See [Headroom integration](docs/integrations/headroom.md).
- Use CodeGraph only when the project has `.codegraph/codegraph.db`; normal search remains available elsewhere.
- Update checks come from `maintain.ps1`; no runtime notifier plugin is needed.
- MCP ownership stays in explicit OpenCode/OMO configuration.
- Headroom memory and learning remain disabled; this setup has no persistent-memory plugin.
- RTK is installed under `~/.local/bin`; executable replacement and removal of stale copies elsewhere on `PATH` remain user-managed.
- `npm ls --depth=0` and `opencode debug config` are authoritative. `bun pm ls` can show stale lock metadata after npm installs.

## Expected verification

`pwsh ./maintain.ps1 verify` checks:

- exact local package targets;
- repository-to-runtime plugin hashes;
- package patches;
- resolved plugin/origin counts;
- full Bun test suite;
- production dependency audit at high severity or above when online.

Live checks still matter for provider traffic, App rendering, and agent orchestration.

Credential migration uses `scripts/export-credentials.ps1` on the configured Windows PC and `scripts/set-credentials.ps1` on the target; both default to `~/.config/opencode/credentials.json`. Keep the exported JSON outside Git and restart OpenCode after restore.
