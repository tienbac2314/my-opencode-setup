# Archived Headroom Integration

Purpose: keep old Headroom runtime files available as reference-only material.

Headroom was removed from active setup on 2026-09-21. It added no useful value
here and its proxy could change OpenCode Zen requests enough to trigger the free
tier policy error. Nothing under this directory is installed, copied, or loaded
by `setup.ps1`, `maintain.ps1`, or OpenCode.

Archived paths:

- `plugins/`: auto-discovered bridge.
- `scripts/`: proxy install, service, cleanup, and diagnostic launchers.
- `tests/`: bridge and proxy lifecycle test source, renamed so the active Bun suite does not run archived tests.
- `docs/integrations/`: old integration contract.

For current behavior, use the active setup and troubleshooting guides. For the
decision and removal evidence, see `docs/history/decisions.md`.
