# OpenCode Repository Recovery Design

This historical design records the recovery approach approved before implementation. Use [setup.md](../../../setup.md) for the working setup today.

## Goal

Restore `master` from stable commit `d8fa757a`, retain validated Supermemory migration behavior, repair lazy-loaded tool calls in both TUI and Desktop App, and prove every README plugin lifecycle works.

## Evidence

- `master` was clean at broken commit `c286bb8` before recovery.
- Safety branch `codex/pre-cleanup-c286bb8` preserves that exact tree.
- `c286bb8` changed `createSSETransform()` so every response with `choices[0].delta` exits the DSML branch before standard `delta.tool_calls` handling.
- Same branch drops empty finish deltas, producing `finish: "unknown"` and retaining per-turn lazy-load state.
- Live CLI reproduction emitted reasoning, no tool call, no output, and unknown finish state.
- In-memory comparison preserved identical standard SSE tool call on `c286bb8^` but discarded it on `c286bb8`.
- Supermemory wrapper initializes successfully against the configured self-hosted endpoint. Recent profile/search/list calls succeeded.
- Oracle VPS service, Cloudflare tunnel, and public endpoint respond successfully.
- `workathome\.config` proves provider-level bare configuration works; it contains no custom plugin framework to copy verbatim.

## Recovery Structure

1. Keep `codex/pre-cleanup-c286bb8` as rollback/reference branch.
2. Reset `master` to `d8fa757a` and rebuild only behavior required by this goal.
3. Preserve local `.codegraph` database while tracking only its ignore marker.
4. Reapply Supermemory migration as reviewed source changes, not the post-baseline commit chain.
5. Add regression tests before changing lazy-load implementation.
6. Modify only SSE classification/control flow: DSML text processing handles text deltas; standard tool-call and finish deltas reach existing logic.
7. Rely on OpenCode's plugin-directory auto-discovery for local plugins. Keep npm package plugins in explicit config.
8. Prove CLI/TUI lazy-load operation before parallel plugin audits.
9. Audit each README plugin independently, then validate combined stack.
10. Validate Desktop App visually and validate remote Supermemory service through Vshell.

## Lazy-Load Invariants

- Standard streamed `load_tool` call survives argument chunking.
- Standard direct built-in tool call rewrites to `load_tool` when not loaded.
- Tool loaded earlier in same turn may execute directly.
- `finish_reason: "stop"` clears per-turn state and remains in output.
- `[DONE]` remains in output.
- DSML tool calls split across arbitrary text chunks convert to standard tool calls.
- Ordinary content and reasoning text remains byte-equivalent except extracted DSML markup.
- MCP tools remain untouched.

## Supermemory Invariants

- Wrapper exports OpenCode-compatible default plugin object.
- Self-hosted `baseUrl` remains configurable and credentials remain outside Git.
- Tool supports add, search, profile, list, and forget lifecycle.
- Temporary audit memories are deleted after verification.
- No archived Mem0 plugin loads at runtime.

## Plugin Audit Scope

- `oh-my-opencode-slim`: initialize and exercise exposed orchestration behavior.
- `codegraph-helper`: initialize, inspect index state, execute update/search path.
- `supermemory`: add/search/profile/list/forget lifecycle.
- `lazy-load`: load tool, execute loaded tool, reset turn, repeat.
- `tokens-source`: capture request data and execute `/tokens` output path.
- `models-discovery`: initialize and expose model discovery command/path.
- `opencode-update-notifier`: initialize and execute update-check path without modifying packages.
- `rtk`: initialize and prove eligible shell command rewrite.

## Validation Surfaces

- Automated Bun regression tests for transform behavior.
- `opencode run` smoke sessions with exported session evidence.
- TUI interaction through Computer Use.
- Desktop App interaction through Computer Use after locating/installing existing runtime entrypoint.
- Oracle VPS status, logs, local endpoint, and public endpoint through Vshell.
- Final Git ancestry, diff, status, and tracked-file audit.

## Safety

- Never commit credentials, tokens, generated databases, logs, or temporary lifecycle data.
- Keep destructive history operation recoverable through safety branch.
- Avoid unrelated refactors from discarded commits.
- Do not push rewritten history unless user separately requests it.
