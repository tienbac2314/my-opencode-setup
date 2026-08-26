# Gemini 3.7 Default Models Design

## Goal

Replace removed `opencode/deepseek-v4-flash-free` defaults with 9router Gemini 3.7 Flash effort-specific models across tracked and deployed global OpenCode configuration.

## Scope

- Global default and `build`: `9router/ag/gemini-3.7-flash-medium`.
- Disabled `general` and `explore`: `9router/ag/gemini-3.7-flash-low`.
- OMO 9router orchestrator, designer, and fixer: medium.
- OMO 9router oracle: high.
- OMO 9router librarian and explorer: low.
- Compaction keeps `9router/ag/claude-opus-4-6-thinking`.
- Dormant `opencode-go` preset stays unchanged because it belongs to another provider and is not the default.
- Remove `oc/deepseek-v4-flash-free` from 9router discovery fallback because the model is gone.

## Files and deployment

Update `config/opencode.jsonc.example`, `config/oh-my-opencode-slim.json`, model-discovery fallback, and focused tests. Deploy the two tracked global config files to `~/.config/opencode` without replacing credentials.

## Verification

- Tests assert exact global and OMO role mappings.
- Active global and OMO configs contain no `opencode/deepseek-v4-flash-free`.
- Discovery fallback contains no `oc/deepseek-v4-flash-free`.
- Full offline repository verification passes.

## Supersession

Replace this mapping when Gemini model IDs or supported effort tiers change, after verifying the new IDs through 9router inventory.
