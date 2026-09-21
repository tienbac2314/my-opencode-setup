# Headroom Archive and Gemini 3.8 Defaults

## Goal

Remove Headroom from active OpenCode setup because it adds no value here and can
break OpenCode Zen free-tier requests. Preserve its source and operating notes
under `archive/headroom/`. Move active OpenCode and OMO 9router defaults to the
verified Gemini 3.8 Flash effort models.

## Design

- Move Headroom bridge, proxy scripts, cleanup script, integration docs, and
  tests into `archive/headroom/`; archive files are reference-only and never
  copied by setup or deployed by maintenance.
- Remove Headroom manifest entries, setup cleanup calls, maintenance branches,
  active documentation links, and the model-discovery transport bypass.
- Remove the existing Windows Headroom task and marker, then uninstall the
  optional `headroom-ai` tool when present.
- Keep direct provider transport as the only active request path.
- Use `9router/ag/gemini-3.8-flash-medium` for global/build and OMO
  orchestrator/designer/fixer; use `...-low` for general/explore/web-search and
  OMO librarian/explorer; use `...-high` for OMO oracle.
- Keep the separate OpenCode compaction model and dormant OMO `opencode-go`
  preset unchanged.

## Verification

- Focused tests assert Headroom files are archived and absent from active setup,
  manifest, docs, and plugin deployment.
- Model tests assert exact Gemini 3.8 IDs and no active Gemini 3.7 defaults.
- Full Bun tests, manifest verification, active config inspection, and direct
  9router model inventory query confirm the final state.

