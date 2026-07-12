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

Auto-discovered plugins from `~/.config/opencode/plugins/` load by filename sort BEFORE config `plugin` array entries.
Config array plugins load in order.
Because `@mem0/opencode-plugin` performs startup initialization (e.g. calls to `/v1/ping/`), `mem0-selfhost-patch.ts` must load *before* it to successfully rewrite those requests.
To solve this, we place `mem0-selfhost-patch.ts` in the root of `~/.config/opencode/` (so it is not auto-loaded out of order) and list it explicitly at the very beginning of the `plugin` array in `opencode.jsonc` and `tui.json`.

Plugin load order is now:
1. `./mem0-selfhost-patch.ts` (loaded first explicitly, patches fetch globally)
2. `opencode-update-notifier`
3. `@mem0/opencode-plugin` (loads third, uses patched fetch)
4. `oh-my-opencode-slim`
5. Auto-discovered plugins (`0-tokens-source.ts`, `lazy-load.ts`, `models-discovery.js`) load alphabetically after the config array. Since `mem0-selfhost-patch.ts` already patched fetch at the root, the later wrappers chain on top cleanly.

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

**Fix:** A thin interceptor `mem0-selfhost-patch.ts` is loaded explicitly in `opencode.jsonc` before `@mem0/opencode-plugin`. It monkey-patches `globalThis.fetch` to:
- Redirect Mem0 Cloud routes to self-hosted FastAPI routes
- Inject `X-API-Key` headers
- Mock project-level metadata endpoints

This allows running the unmodified official `@mem0/opencode-plugin` from npm, supporting automatic updates without manual re-patching.

## oh-my-opencode-slim installer overwrites

**Symptom:** Running `bunx oh-my-opencode-slim@latest install` may reorder the `plugin` array in `opencode.jsonc` and overwrite `oh-my-opencode-slim.json`.

**Workaround:** The `bootstrap.ps1` restores the preset config after running the installer. The `update-plugins.ps1` script also runs the installer but your custom preset is preserved because omo-slim only writes defaults if the config file doesn't exist.
