# OpenCode Goal and Headroom Integration Design Spec

> Superseded historical draft. See `2026-07-14-isolated-headroom-launcher-design.md` for implemented Headroom design and current repository docs for goal adapter architecture.

## Goal Plugin
* Pin version `0.1.24` of `@prevalentware/opencode-goal-plugin`.
* Add `/goal` command configuration to global and TUI config templates.
* Add to private `versions.env` and bootstrap npm package mapping.

## Headroom Integration
* Start Headroom proxy server on port `8787` (`headroom proxy --port 8787`).
* Do not wrap OpenCode globally or run native transport patches.
* Register provider `headroom` in `opencode.jsonc` pointing to `http://localhost:8787/v1`.
* Model namespace `headroom/*` will optimize and route to upstream targets (e.g. `9router/oc/deepseek-v4-flash-free`).
* Validate existing direct `9router` requests are unaffected when proxy is offline.
