# Bun prerequisite convergence

## Context

OMO Slim's vanilla auto-updater invokes `bun install`. On a Windows Desktop launch where `bun` is absent from `PATH`, version detection succeeds but installation fails with `spawn bun ENOENT`. OpenCode's internal package runtime and cache do not satisfy this process-level prerequisite.

The repository should make a bare-machine setup complete enough for upstream OMO Slim auto-updates without patching or wrapping OMO Slim. OMO also treats an exact plugin entry such as `oh-my-opencode-slim@2.2.1` as pinned and deliberately skips auto-installation, so executable availability alone is insufficient.

## Decision

`setup.ps1` ensures official Bun is available before component installation:

- keep an existing working `bun` installation unchanged;
- when missing, invoke Bun's official installer for the current platform;
- add Bun's standard user bin directory to the current setup process after installation;
- verify both `bun` and `bunx`, then stop with an actionable error if either remains unavailable.

Windows uses Bun's official PowerShell installer. Linux and macOS use Bun's official shell installer. The setup guide records prerequisites, automatic installation, restart behavior, verification, and recovery for `spawn bun ENOENT`.

Tracked Desktop and TUI plugin entries use `oh-my-opencode-slim@latest`, the upstream auto-update channel. `config/components.json` retains the current tested version as the reproducible fresh-install and compatibility baseline; maintenance installs that baseline but does not rewrite the runtime channel back to an exact pin.

## Boundaries

- Do not patch OMO Slim, override its updater, or add a repository updater for OMO Slim.
- Do not reinstall or replace a working Bun.
- Do not couple Bun installation to `-SkipEnvironment`; Bun is a runtime prerequisite.
- Do not change exact-version policy for other packages or plugins.
- OMO's tested manifest version remains the setup baseline; the runtime plugin entry alone follows `latest` so upstream auto-update is authorized.
- Do not print credentials or resolved OpenCode configuration.

## Verification

Tests exercise setup with a pre-existing Bun and with a simulated missing Bun whose official installer supplies `bun` and `bunx`. Tests must not contact the network. They also prove maintenance preserves OMO's `@latest` runtime channel while other plugins remain exact. Existing isolated setup convergence and full repository tests must remain green.

A Windows live check verifies `bun` resolves from user `PATH` in a fresh process and that OMO Slim no longer logs `spawn bun ENOENT` during an update attempt.

## Supersession

Remove setup-owned Bun convergence when OMO Slim no longer requires an external `bun` executable or OpenCode guarantees the executable in Desktop and TUI process environments.
