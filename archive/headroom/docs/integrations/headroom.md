# Headroom Integration

Status: optional, enabled on this machine, shared by OpenCode Desktop and TUI.

## Architecture

```text
OpenCode Desktop / TUI
        |
auto-discovered plugins/headroom.ts
        |
http://127.0.0.1:8787
        |
hidden current-user scheduled task
        |
Headroom proxy -> configured 9router upstream
```

`plugins/headroom.ts` intercepts provider transport in process. It activates only when `headroom-proxy.url` exists and `/livez` identifies a healthy Headroom service. Failure is fail-open: OpenCode keeps its original provider transport.

Provider names, model inventory, default model, and MCP servers remain owned by normal OpenCode config. Headroom must not add synthetic providers or persistent MCP entries.

## Service lifecycle

On Windows, `scripts/manage-headroom-proxy.ps1 install` creates a current-user logon task. The task starts `pwsh -WindowStyle Hidden`, which runs `scripts/run-headroom-proxy.ps1`. The runner:

- merges proxy stdout and stderr into a rolling `proxy.log`/`proxy.log.previous` pair under `~/.local/state/opencode-headroom`, bounded to two configured-size files;
- sets LiteLLM suppression before Python imports;
- keeps telemetry off;
- keeps Headroom memory, memory tools, memory context, and learning off.

The auto-discovered bridge checks service health four times over roughly one second. A stale marker or dead proxy therefore fails open promptly instead of delaying OpenCode startup.

This indirection is required because Task Scheduler's hidden-task setting alone does not prevent a console executable from showing a terminal. Redirecting output also contains Headroom's startup banner and any LiteLLM `Provider List` message.

```powershell
pwsh ./scripts/manage-headroom-proxy.ps1 status
pwsh ./scripts/manage-headroom-proxy.ps1 install
pwsh ./scripts/manage-headroom-proxy.ps1 stop
pwsh ./scripts/manage-headroom-proxy.ps1 start
```

Dashboard: `http://127.0.0.1:8787/dashboard`.

## RTK boundary

Three mechanisms must not be conflated:

1. `plugins/rtk.ts` is this repository's OpenCode hook. It calls `rtk rewrite` before `bash` or `shell` execution in Desktop and TUI.
2. `headroom wrap opencode` can install RTK and inject RTK instructions into OpenCode policy. This repository does not use that wrapper lifecycle.
3. Bare `headroom proxy` labels RTK as its selected context tool and reads `rtk gain --format json` for dashboard statistics. It does not invoke RTK on proxy tool-result content.

Headroom upstream documents this explicitly in `docs/rtk-architecture.md`: RTK is wrap-CLI-side, not a proxy-side compressor. This was verified against the pinned source commit in `config/components.json` and upstream `main` at `718c8dc559c0432d234da28053cea602c2d9245a`.

Removing the local RTK plugin would remove automatic OpenCode command rewriting. It would not remove Headroom's independent prompt compression, but Headroom could still discover an installed RTK binary and display its counters.

## Memory boundary

Headroom memory is a second persistent-memory system. With `--memory`, Headroom can:

- store memories in SQLite, partitioned per project by default;
- inject `memory_save` and `memory_search` tools;
- retrieve relevant memories into system context;
- enable `--learn`, which extracts patterns and can write agent-native memory files.

It stays disabled so Headroom remains a transport-only service and does not inject memory tools or context.

Responsibility split:

| Concern | Owner |
|---|---|
| Provider/model identity | OpenCode and 9router config |
| Transport compression, caching, rate limits | Headroom |
| Shell command rewriting | Local RTK OpenCode plugin |
| Cross-session memory | None |

## Why the official wrapper is not used

For the pinned release, `headroom wrap opencode` mutates OpenCode runtime/config with synthetic providers, a fixed model catalog, Headroom MCP, optional Serena MCP, and RTK instructions. Those mutations hid dynamic 9router models and polluted Desktop/TUI state during live testing.

The independent proxy plus local transport bridge preserves the useful proxy path without those ownership changes. `scripts/remove-headroom-opencode-pollution.ps1` removes only recognized wrapper-owned entries during migration. Default cleanup scrubs both `opencode.jsonc` and leftover `opencode.json`, then deletes empty leftover JSON shells.

## Validation contract

Repository checks:

- `tests/headroom.test.ts`: marker, health, startup race, and fail-open behavior;
- `tests/bootstrap.test.ts`: hidden runner, memory-off flags, logs, and config ownership;
- `tests/models-discovery.test.ts`: model inventory bypasses Headroom transport;
- `pwsh ./maintain.ps1 verify`: deployed plugin hashes and origin count.

Live proof requires all of these:

- scheduled task running through hidden PowerShell runner;
- `/livez` healthy and dashboard HTTP 200;
- normal Desktop and TUI requests increment `/v1/chat/completions` proxy stats;
- only configured 9router provider and models remain visible;
- no persistent Headroom or Serena MCP entry in `opencode.jsonc` or leftover `opencode.json`;
- no visible proxy terminal.
