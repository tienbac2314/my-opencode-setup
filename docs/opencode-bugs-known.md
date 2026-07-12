# OpenCode Known Bugs & Workarounds

Last updated: 2026-07-12

## `experimental.primary_tools` breaks subagent tool access

**Symptom:** Explore subagent claims it only has `webfetch`/`websearch`. Missing `read`, `glob`, `grep`, `task` tools.

**Root cause:** `experimental.primary_tools` list is inverted for subagents — they lose access to tools in that list.

**Fix:** Do NOT add `primary_tools` to `experimental` block. Keep it as:
```jsonc
"experimental": {
  "mcp_timeout": 60000
}
```

## Plugin load order

Auto-discovered plugins from `~/.config/opencode/plugins/` load by filename sort BEFORE config `plugin` array entries. This is why:
- `0-tokens-source.ts` has the `0-` prefix (loads first)
- `lazy-load.ts` loads second (needs tokens-source's fetch wrapper already in place)
- `models-discovery.js` loads third

Config array plugins load after: `opencode-update-notifier`, `./opencode-mem0-plugin`, `oh-my-opencode-slim`.

## Desktop app plugin resolution

**Symptom:** `skill(name="...")` returns "Available skills: none" in Desktop app.

**Fix:** File-based `.ts` plugins in `plugins/` dir are auto-discovered by both Desktop and TUI. No bridge files needed.

## `.agents/skills/` not discovered

**Symptom:** Skills in `~/.agents/skills/` don't appear in `skill()` tool.

**Fix:** Create junctions into `~/.config/opencode/skills/`:
```powershell
New-Item -ItemType Junction -Path "$env:USERPROFILE\.config\opencode\skills\skill-name" -Target "$env:USERPROFILE\.agents\skills\skill-name"
```
The `bootstrap.ps1` script handles this automatically.

## 9router model modalities

**Symptom:** "Cannot read image.png (this model does not support image input)" with 9router models.

**Root cause:** Newly discovered models got `{ name: id }` with no `modalities`, so OpenCode assumed text-only.

**Fix:** `models-discovery.js` plugin now defaults to `text+image` input for all discovered models. It checks `capabilities.vision` from the API response and falls back to multimodal.

## Mem0 plugin self-hosted compatibility

**Symptom:** Official `@mem0/opencode-plugin` fails against self-hosted Mem0 (missing `/v1/` prefix, no org/project endpoints).

**Fix:** Local patched copy at `~/.config/opencode/opencode-mem0-plugin/`. Patches:
- `MEM0_HOST` env var support
- `X-API-Key` header injection
- Mocked `getProject`/`updateProject`

Re-patch required if upstream `@mem0/opencode-plugin` updates significantly.

## oh-my-opencode-slim installer overwrites

**Symptom:** Running `bunx oh-my-opencode-slim@latest install` may reorder the `plugin` array in `opencode.jsonc` and overwrite `oh-my-opencode-slim.json`.

**Workaround:** The `bootstrap.ps1` restores the preset config after running the installer. The `update-plugins.ps1` script also runs the installer but your custom preset is preserved because omo-slim only writes defaults if the config file doesn't exist.
