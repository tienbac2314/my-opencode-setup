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

## `opencode-lazy-loader` plugin

- Shipped locally in `plugins/opencode-lazy-loader` (built from `licat2023` fork)
- Provides `skill` + `skill_mcp` tools for lazy-loading skill-embedded MCP servers
- Has nothing to do with subagent tool restrictions — confirmed independent

## Desktop app plugin resolution

**Symptom:** `skill(name="...")` returns "Available skills: none" despite correct setup.

**Root cause:** OpenCode Desktop (Electron) only loads plugins from the `plugins/` directory via filesystem auto-discovery.

**Fix:** A bridge plugin at `plugins/lazy-loader.js`:
```js
import { OpenCodeEmbeddedSkillMcp } from './opencode-lazy-loader/index.js'
export const LazyLoader = (ctx) => OpenCodeEmbeddedSkillMcp(ctx)
```
The bridge is auto-discovered by both desktop and TUI.

## Skill directory path mismatch (FIXED in licat2023 fork)

**Symptom:** `discoverSkills()` returns empty.

**Root cause:** `opencode-lazy-loader` npm package (`keybrdist/opencode-lazy-loader@1.0.3`) hardcodes singular `'skill'` in `skill-loader.js`.

**Status:** We use the `licat2023/opencode-lazy-loader` fork (11 commits ahead of original), which includes:
- `3ef7547` — `skill` → `skills` path fix
- `b930798` — support both dir names, then drop singular
- `62a744f` — final cleanup, `skills/` only
- `9f35dfa` — Windows env vars for MCP processes
- `f5f54cc` — `~` expansion fix for Windows
- `416b357` — refactor to `tool.execute.after` hook (no custom `skill` tool)

**Solution:** The fork is precompiled and committed directly into the repo at `plugins/opencode-lazy-loader`. No NPM installation required.

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
