# Isolated Headroom Launcher Design

Purpose: explain why Headroom uses a separate launcher and define boundaries future changes must preserve.

## Problem

Headroom is a local OpenAI-compatible proxy. A permanent `headroom` provider or global wrapper changes model names, routes every OpenCode session through one upstream, and can break normal App/TUI use when proxy is stopped. Repository needs optional optimization without changing normal OpenCode behavior.

## Design

- Python runtime comes from exact installed `headroom-ai[all]` package.
- Native OpenCode transport plugin is built from exact `HEADROOM_GIT_COMMIT` under `$HOME\.cache\opencode-headroom`.
- `scripts/start-opencode-headroom.ps1` starts proxy only when port has no healthy Headroom listener.
- Launcher reads resolved providers and creates process-local provider overrides. Each remote `baseURL` points to local proxy while `x-headroom-base-url` preserves original upstream authority.
- Launcher injects native transport plugin and overrides through child-process environment only.
- Original provider IDs and model names stay unchanged. No `headroom/*` model namespace exists.
- OpenCode arguments cross PowerShell boundary as JSON array so flags and spaces stay intact.
- Request metadata goes to `$env:TEMP\opencode-headroom\requests.jsonl`; message content logging stays disabled.

## Isolation Rules

- Never edit `opencode.jsonc`, `tui.json`, or `AGENTS.md` during launch.
- Never run `headroom wrap`.
- Never add persistent Headroom provider, plugin, MCP, RTK, Serena, memory, or instruction config.
- Stop only proxy process launcher created. Reuse healthy pre-existing proxy.
- Reject occupied non-Headroom port instead of killing unknown process.
- Restore prior `HEADROOM_PROXY_URL` and `OPENCODE_CONFIG_CONTENT` after child exits.

## Verification

Automated tests cover launcher presence, provider-neutral routing, no message logging, JSON argument validation, and missing-build failure. Live proof must show one 9router request and one native OpenCode request in metadata log with distinct original upstreams, unchanged config hashes, and no remaining listener owned by launcher.
