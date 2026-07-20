# Maintenance Refactor Journey

Purpose: explain why the current setup looks this way, what failed before, and which evidence proves each repair. Read this before changing plugin loading, package pins, setup, or update logic.

## Scope

Work happened on `refactor/unified-maintenance`. Stable historical baseline was `d8fa757a`; Git history keeps all removed debug notes and the retired Mem0 bundle.

Current active references are indexed by [Documentation](../README.md). `config/components.json` remains the only source of approved versions and source commits.

## Main changes

1. Replaced `bootstrap.ps1`, `update-plugins.ps1`, and separate version files with `setup.ps1`, `maintain.ps1`, and `config/components.json`.
2. Made setup idempotent. Current packages are skipped, so a running App/TUI no longer blocks setup by locking `opencode.exe`.
3. Removed runtime update notifier. `maintain.ps1 check|plan|apply|verify` handles all npm, GitHub, PyPI, copied-fork, and local components.
4. Kept copied upstream forks review-only. Maintainer reports them but never overwrites local behavior.
5. Removed old plans, duplicate debug docs, IDE files, and `mem0-archive/`. History remains available through Git.
6. Added exact package patches and deterministic lifecycle verifiers for Goal and Supermemory.
7. Added tracked `/goal` and `/tokens` commands, package/origin validation, documentation link checks, and high/critical npm audit gating.
8. Disabled Goal after later live integration failures; retained its source, patch, and historical tests while removing package, pins, and command from active setup.
9. Retired three MCP-bearing skills from an older lazy-load design: browser automation, DevTools debugger, and docs fetcher.

## Root causes and fixes

### Lazy loading

Failure was not one bad tool name. Reloads could lose `load_tool`, namespaced tool names could be rewritten incorrectly, split SSE or text-encoded calls could lose data, and models could serialize typed tool fields as strings. Same-turn execution needed the real tool call restored without corrupting finish events. Argument repair now uses each tool's captured JSON Schema at the common response path, so it applies across model formats without guessing missing keys or aliases.

Fix lives in `plugins/opencode-lazy-load.ts`; regression coverage is `tests/opencode-lazy-load.test.ts`. Live proof showed the model call `load_tool`, load `bash`, execute a command, and return the marker.

### Goal server tools

Historical repair context follows. Goal remains disabled in current manifest because live OpenCode integration stayed unreliable after these package-level fixes.

`@prevalentware/opencode-goal-plugin/server@VERSION` looked valid in resolved config but silently registered no tools. OpenCode selects `./server` or `./tui` only when both configs use the root package spec:

```text
@prevalentware/opencode-goal-plugin@VERSION
```

Do not restore the deleted local Goal wrapper. If Goal is reconsidered, start with root package loading and prove complete lifecycle before removing disabled state.

### Goal sidebar

Four upstream TUI problems existed:

- active details nested conditional fragments inside `<text>`, causing OpenTUI `Orphan text error`;
- state memo did not consume the timer signal, so delayed goal parts were not rescanned;
- TUI only scanned loaded chat tool parts, while server-owned Goal state lives in its persisted state file;
- persisted server records omit two display-only fields required by the TUI snapshot validator.

Dormant `patches/opencode-goal-plugin-0.1.24.patch` demonstrates package fixes. Historical verifier covers tool-backed active, file-backed active, empty, and cleared states, but these tests do not authorize runtime re-enable.

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

Headroom remains optional. A hidden current-user login task owns the proxy independently of OpenCode. Auto-discovered `plugins/headroom.ts` activates the pinned transparent transport for Desktop and CLI only after the local health endpoint identifies a real Headroom proxy; otherwise it fails open to direct provider traffic.

The `headroom-ai` 0.31.0 wheel does not ship the transparent OpenCode transport. Repository keeps a pinned source build so custom providers such as 9router are intercepted without changing provider identity or model inventory. Official `headroom wrap opencode` was rejected here because it injects synthetic `anthropic`, `openai`, and `headroom` providers and persists Headroom/Serena MCP entries; those mutations hid dynamically discovered 9router models in TUI and polluted App config.

Desktop App and normal `opencode` launches use the same auto-discovered bridge and persistent proxy. No shell profile wrapper is required. App and TUI retain identical configured providers and model selection while both traverse Headroom when the service is healthy.

### CodeGraph and RTK

CodeGraph already watches indexed files, so the redundant post-edit reindex hook was removed. The local guard acts only when `.codegraph/codegraph.db` exists and does nothing in unindexed workspaces.

RTK installs under `~/.local/bin` and resolves through `PATH`. Local wrapper only supports Desktop-shaped hook input without an injected shell.

## Approaches tried and rejected

- Resetting back to the baseline would have discarded working Supermemory migration and later fixes. The final branch keeps good history and replaces broken architecture in focused commits.
- A local Goal server wrapper appeared necessary when `/server@VERSION` lost tools. Upstream docs and runtime proof showed root package selection was the real fix, so wrapper and adapter test were removed.
- Waiting on OpenTUI `renderOnce()`/visual-idle hung because Goal has a recurring timer. The verifier instead checks captured real frames with a bounded loop.
- Source-string checks alone were too weak for Goal UI. The final verifier imports the cached package and renders both states.
- Re-running every installer during updates caused locked binaries, slow setup, and avoidable config churn. Apply now installs only missing/drifted approved targets, then always converges local files, pins, and patches.
- Computer Use and Playwright MCP runtimes were not exposed in the final session. App proof used `opencode web`, HTTP 200, and a real headless Chrome screenshot; TUI proof used a live PTY plus the deterministic OpenTUI renderer.

## Current evidence

- Real global setup completed against `~/.config/opencode` with full Bun suite passing.
- `opencode debug config`: 8 plugins and 8 origins; Goal package and `/goal` are absent from active runtime.
- Goal remains disabled; dormant renderer tests preserve historical package investigation only.
- Lazy loading: live `load_tool` then Bash execution passed.
- OMO Slim: Oracle, Librarian, Designer, and Fixer task lifecycles passed; Explorer is intentionally disabled.
- Token source: saved `/tokens` report showed real API usage after a model turn.
- Supermemory: add/search/profile/list/forget passed with disposable-marker cleanup.
- Headroom: native and 9router markers passed, both upstreams were logged, config stayed unchanged, and port cleanup passed.
- CodeGraph: indexed exploration and unindexed startup passed.
- Deep Research skill loaded; strategy modules remain hidden from agent autocomplete.
- App: local web UI returned HTTP 200 and rendered through headless Chrome without plugin/server errors.
- TUI: OMO active; Goal intentionally absent.
- Oracle VPS: both service hosts were reachable; unauthenticated 9router returned expected 401. Authenticated Supermemory CRUD was proven locally.
- Production npm audit: 0 high, 0 critical. Remaining findings were transitive low/moderate packages with no safe forced fix.
- Repository secret scan found placeholders/constants only. Private credential values stay outside Git.

Earlier Goal-enabled revisions passed isolated renderer and lifecycle checks before later integration failures motivated disablement. Retrieve removed debug material read-only through `git show main:knownbug.md`, `git show main:docs/opencode-agents.md`, or branches `archive/broken-docs-reference` and `codex/pre-cleanup-c286bb8`; never deploy those historical trees.

## Future update workflow

1. Run `pwsh ./maintain.ps1 check` and `plan`.
2. Read the upstream old-to-new diff and [local patches](../reference/patches.md).
3. Change only the reviewed target in `config/components.json`.
4. Run `apply -Component ID`, focused live lifecycle checks, then `verify`.
5. Remove a patch/wrapper only when the manifest's `removeWhen` condition is proven against the new upstream release.

Never use `npm audit fix --force`, blindly overwrite copied forks, add local plugin paths to config, or use Goal `/server@VERSION` and `/tui@VERSION` specs.
