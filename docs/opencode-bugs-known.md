# OpenCode Known Bugs & Workarounds

Known: 2026-07-11

## `experimental.primary_tools` breaks subagent tool access

**Symptom:** Explore subagent (and potentially other subagents) claims it only has `webfetch`/`websearch`. Missing `read`, `glob`, `grep`, `task` tools. Agent effectively crippled.

**Root cause:** `experimental.primary_tools` list (`["edit", "bash", "read", "glob", "grep"]`) is inverted for subagents — they lose access to tools in that list. Only tools NOT in `primary_tools` survive.

**Fix:** Remove `primary_tools` from `experimental` block:
```jsonc
"experimental": {
  "mcp_timeout": 60000
}
```

**Note:** `config/opencode.jsonc` is gitignored (contains API keys). Fix must be applied manually after each `bootstrap.ps1` run, or add a post-bootstrap sed/copy step.

## `opencode-lazy-load` plugin

- Shipped locally in `plugins/opencode-lazy-load.ts`
- Strips tool definitions from request payload to save 85%+ tokens per request.
- Uses `load_tool` to dynamically load tool schemas and skills on-demand.
- Replaces the old broken `opencode-lazy-loader` npm package.

## Desktop app plugin resolution

**Symptom:** `skill(name="...")` returns "Available skills: none" despite correct setup.

**Root cause:** OpenCode Desktop (Electron) only loads plugins from the `plugins/` directory via filesystem auto-discovery.

**Fix:** Since we now use single-file `.ts` plugins (`opencode-lazy-load.ts`, `tokens-source.ts`), they are placed directly in the `plugins/` directory. They are auto-discovered correctly by both Desktop and TUI without needing bridge files.

## `.agents/skills/` not discovered

**Symptom:** Skills in `~/.agents/skills/` (handoff, find-skills, grill-me, etc.) don't appear in `skill()` tool even though listed in system prompt's `available_skills`.

**Root cause:** `opencode-lazy-loader` only scans `~/.config/opencode/skills/` and `.opencode/skills/`. The `.agents/` directory is a separate path not in discovery scope. The system prompt's `available_skills` list is hardcoded agent metadata, not a live filesystem scan.

**Fix:** Create junctions from `.config/opencode/skills/{name}` → `.agents/skills/{name}` for the 6 unique skills:
```
find-skills, grill-me, grill-with-docs, handoff, notebooklm, vshell
```
Overlapping skills (brainstorming, debugging, etc.) are intentionally NOT junctioned — the `.config/opencode/skills/` versions are the canonical ones.

## Missing `"type": "module"` in package.json

**Symptom:** Server log warning: `MODULE_TYPELESS_PACKAGE_JSON — Reparsing as ES module because module syntax was detected.`

**Fix:** Add `"type": "module"` to `~/.config/opencode/package.json`. Required because `plugins/models-discovery.js` and `plugins/lazy-loader.js` use ESM syntax.
