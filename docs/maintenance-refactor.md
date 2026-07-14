# Maintenance Refactor Journey

Purpose: explain why the current setup looks this way, what failed before, and which evidence proves each repair. Read this before changing plugin loading, package pins, setup, or update logic.

## Scope

Work happened on `refactor/unified-maintenance`. Stable historical baseline was `d8fa757a`; Git history keeps all removed debug notes and the retired Mem0 bundle.

Current active references:

- `README.md`: component map and daily commands.
- `setup.md`: Windows/Linux install, update, recovery, and live checks.
- `PATCHES.md`: every local fork, wrapper, package patch, and removal condition.
- `pr.md`: minimal upstream issue/PR text and correct target repositories.
- `config/components.json`: only source of approved versions and source commits.

## Main changes

1. Replaced `bootstrap.ps1`, `update-plugins.ps1`, and separate version files with `setup.ps1`, `maintain.ps1`, and `config/components.json`.
2. Made setup idempotent. Current packages are skipped, so a running App/TUI no longer blocks setup by locking `opencode.exe`.
3. Removed runtime update notifier. `maintain.ps1 check|plan|apply|verify` handles all npm, GitHub, PyPI, copied-fork, and local components.
4. Kept copied upstream forks review-only. Maintainer reports them but never overwrites local behavior.
5. Removed old plans, duplicate debug docs, IDE files, and `mem0-archive/`. History remains available through Git.
6. Added exact package patches and deterministic lifecycle verifiers for Goal and Supermemory.
7. Added tracked `/goal` and `/tokens` commands, package/origin validation, documentation link checks, and high/critical npm audit gating.

## Root causes and fixes

### Lazy loading

Failure was not one bad tool name. Reloads could lose `load_tool`, namespaced tool names could be rewritten incorrectly, split SSE/DSML calls could lose data, and same-turn execution needed the real tool call restored without corrupting finish events.

Fix lives in `plugins/lazy-load.ts`; regression coverage is `tests/lazy-load.test.ts`. Live proof showed the model call `load_tool`, load `bash`, execute a command, and return the marker.

### Goal server tools

`@prevalentware/opencode-goal-plugin/server@VERSION` looked valid in resolved config but silently registered no tools. OpenCode selects `./server` or `./tui` only when both configs use the root package spec:

```text
@prevalentware/opencode-goal-plugin@VERSION
```

Do not restore the deleted local Goal wrapper. Root package loading now exposes `create_goal`, `get_goal`, `update_goal`, and related tools directly.

### Goal sidebar

Four upstream TUI problems existed:

- active details nested conditional fragments inside `<text>`, causing OpenTUI `Orphan text error`;
- state memo did not consume the timer signal, so delayed goal parts were not rescanned;
- TUI only scanned loaded chat tool parts, while server-owned Goal state lives in its persisted state file;
- persisted server records omit two display-only fields required by the TUI snapshot validator.

`patches/opencode-goal-plugin-0.1.24.patch` fixes these in both config and cached TUI package copies. It polls and normalizes server-owned state, requests a host rerender, and shows a clear active block. Inactive Goal state renders nothing. `scripts/verify-goal-tui.ts` covers tool-backed active, file-backed active, empty, and cleared states.

OpenCode also persists sidebar visibility. A bare config still reuses that host state, so reinstalling the plugin does not make a hidden sidebar reappear. In a wide terminal, press `Ctrl+X`, then `B`. The built-in `Plugins` command distinguishes host state from plugin failure: `local.goal-mode.tui` must be active. A narrow terminal can hide all sidebars by responsive design.

Live OpenCode proof showed `local.goal-mode.tui` and `oh-my-opencode-slim:tui` active together. OMO does not overwrite Goal; OpenCode appends both sidebar slots. `willytop8/OpenCode-goal-plugin` 0.6.5 has server exports only and no TUI export, so replacing Prevalent Goal with Willy would remove sidebar support rather than fix it.

### Supermemory self-hosting

The package made an unawaited cloud `settings.update()` call even with a custom self-hosted base URL. Memory/model traffic succeeded, then an HTTP 405 appeared later.

`patches/opencode-supermemory-2.0.8-selfhost.patch` limits cloud settings updates to the official cloud URL and catches failures. `plugins/supermemory.ts` only adapts the package's named export. CRUD remains upstream.

### OMO Slim and skills

On Windows, OMO's Node installer could resolve `bun.cmd` but could not spawn `bun`, so cache warm-up was skipped. Maintainer now prepends the real Bun executable directory only while the installer runs.

The OMO installer defaults to the normal global OpenCode directory. Maintainer now points it at the requested `-ConfigDir` only while the installer runs, then restores the previous environment. This matters during first install, version changes, recovery, or custom-config checks. Normal maintenance skips the installer when the approved OMO version is already installed.

OMO also copied skills already visible under `~/.agents` or `~/.claude`. Setup now removes active-config duplicates after OMO runs. It deliberately does not delete user-owned duplicates between `~/.agents` and `~/.claude`.

### Headroom

Headroom remains opt-in and launcher-only. `scripts/start-opencode-headroom.ps1` starts a local proxy, creates in-memory provider overrides for every non-loopback provider, injects the transport plugin only for that process, verifies config hashes, and stops only the proxy it started.

Normal App/TUI sessions are never proxied. Both native OpenCode and 9router routes passed after the final source pin.

### CodeGraph and RTK

CodeGraph already watches indexed files, so the redundant post-edit reindex hook was removed. The local guard acts only when `.codegraph/codegraph.db` exists and does nothing in unindexed workspaces.

RTK uses `~/.local/bin`, supports Desktop-shaped hook input without an injected shell, and never probes `System32`. A stale system copy may exist but is intentionally untouched.

## Approaches tried and rejected

- Resetting back to the baseline would have discarded working Supermemory migration and later fixes. The final branch keeps good history and replaces broken architecture in focused commits.
- A local Goal server wrapper appeared necessary when `/server@VERSION` lost tools. Upstream docs and runtime proof showed root package selection was the real fix, so wrapper and adapter test were removed.
- Waiting on OpenTUI `renderOnce()`/visual-idle hung because Goal has a recurring timer. The verifier instead checks captured real frames with a bounded loop.
- Source-string checks alone were too weak for Goal UI. The final verifier imports the cached package and renders both states.
- Re-running every installer during updates caused locked binaries, slow setup, and avoidable config churn. Apply now installs only missing/drifted approved targets, then always converges local files, pins, and patches.
- Computer Use and Playwright MCP runtimes were not exposed in the final session. App proof used `opencode web`, HTTP 200, and a real headless Chrome screenshot; TUI proof used a live PTY plus the deterministic OpenTUI renderer.

## Final evidence gathered

- `pwsh ./maintain.ps1 verify`: 65 tests, 0 failures; exact targets, local hashes, package patches, and 8 plugin origins verified.
- `opencode debug config`: 8 plugins, 8 origins, root Goal package, `/goal`, and `/tokens`.
- Goal: create/get/update/clear lifecycle passed; empty and active sidebar frames passed.
- Lazy loading: live `load_tool` then Bash execution passed.
- OMO Slim: Oracle, Librarian, Designer, and Fixer task lifecycles passed; Explorer is intentionally disabled.
- Token source: saved `/tokens` report showed real API usage after a model turn.
- Supermemory: add/search/profile/list/forget passed with disposable-marker cleanup.
- Headroom: native and 9router markers passed, both upstreams were logged, config stayed unchanged, and port cleanup passed.
- CodeGraph: indexed exploration and unindexed startup passed.
- Deep Research skill loaded; strategy modules remain hidden from agent autocomplete.
- App: local web UI returned HTTP 200 and rendered through headless Chrome without plugin/server errors.
- TUI: live plugin manager showed Goal and OMO active together. Deterministic rendering covers active state from both tool output and the persisted server state; empty and cleared states stay hidden.
- Oracle VPS: both service hosts were reachable; unauthenticated 9router returned expected 401. Authenticated Supermemory CRUD was proven locally.
- Production npm audit: 0 high, 0 critical. Remaining findings were transitive low/moderate packages with no safe forced fix.
- Repository secret scan found placeholders/constants only. Private credential values stay outside Git.

## Future update workflow

1. Run `pwsh ./maintain.ps1 check` and `plan`.
2. Read upstream old-to-new diff and `PATCHES.md`.
3. Change only the reviewed target in `config/components.json`.
4. Run `apply -Component ID`, focused live lifecycle checks, then `verify`.
5. Remove a patch/wrapper only when the manifest's `removeWhen` condition is proven against the new upstream release.

Never use `npm audit fix --force`, blindly overwrite copied forks, add local plugin paths to config, or use Goal `/server@VERSION` and `/tui@VERSION` specs.
