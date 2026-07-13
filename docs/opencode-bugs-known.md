# OpenCode Known Bugs & Workarounds

Last updated: 2026-07-13

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

Plugin load order:
1. `opencode-update-notifier`
2. `oh-my-opencode-slim`
3. Auto-discovered plugins (`0-tokens-source.ts`, `lazy-load.ts`, `models-discovery.js`, `codegraph-helper.ts`) load alphabetically after the config array.

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

## Mem0 (archived)

Mem0 self-hosted integration has been archived to `mem0-archive/` in the dotfiles repo. No longer active.
SuperMemory is now the sole memory provider. See `docs/supermemory-setup.md` for configuration.

## lazy-load.ts: Tool filtering splits `originals` and `mcpOriginals`

**Symptom:** Mem0 tools disappear after `lazy-load.ts` processes them. Tools registered by later-loading plugins are missing but earlier ones work.

**Root cause:** `lazy-load.ts` originally maintained two maps: `originals` (tools for OpenAI provider endpoints) and `mcpOriginals` (tools for MCP endpoints). The `mcpOriginals` map captured ALL known tools at startup, including mem0 tools. When the tool schema filtering function checked `name in originals`, it returned `false` for mem0 tools (they lived in `mcpOriginals`), causing the filter to strip their schemas. Since `tool()` merges by name, stripped schemas didn't get re-added.

**Fix:** The two maps were merged into a single `originals` object. The filter now checks one map:
```typescript
const originals: Record<string, OriginalToolInfo> = { ...mcpOriginals, ...openAIOriginals };
```
This ensures tools from either source retain their full schemas.

**Why it matters:** Any plugin that registers tools late (after `lazy-load.ts` initializes its originals snapshot) can collide with the filtering. MCP-originated tools are especially vulnerable because they don't match OpenAI provider patterns.

---

## Duplicate loading guards

**Symptom:** After running `update-plugins.ps1` or `bootstrap.ps1`, tools appear twice in the UI or `tool()` throws "already registered" errors.

**Root cause:** `lazy-load.ts` and `0-tokens-source.ts` are auto-discovered from `plugins/` dir AND may also be manually loaded by other plugins. Without guards, they register their hooks/tools multiple times.

**Workaround:** Both files use `globalThis` sentinels:
```typescript
if (globalThis.__lazy_load_loaded__) return;
globalThis.__lazy_load_loaded__ = true;
```

```typescript
if (globalThis.__tokens_source_loaded__) return;
globalThis.__tokens_source_loaded__ = true;
```

These prevent re-registration on second load. The guards are safe because the registration is idempotent apart from the duplicate-error problem.

**Note:** The `bootstrap.ps1` no longer re-downloads these files from GitHub (see "Bootstrap / update scripts" section), so double-loading only happens if another plugin explicitly imports them.

---

## oh-my-opencode-slim installer overwrites

**Symptom:** Running `bunx oh-my-opencode-slim@latest install` may reorder the `plugin` array in `opencode.jsonc` and overwrite `oh-my-opencode-slim.json`.

**Workaround:** The `bootstrap.ps1` restores the preset config after running the installer. The `update-plugins.ps1` script also runs the installer but your custom preset is preserved because omo-slim only writes defaults if the config file doesn't exist.

---

## Bootstrap / update scripts overwrite local plugin patches

**Symptom:** After running `bootstrap.ps1` or `update-plugins.ps1`, custom patches in `lazy-load.ts` or `0-tokens-source.ts` are gone — replaced by upstream GitHub raw copies.

**Root cause:** Both scripts hardcode download URLs pointing to GitHub raw content for `lazy-load.ts` and `0-tokens-source.ts`. When run, they overwrite the local patched files in `~/.config/opencode/plugins/` with the unpatched upstream versions.

**Workaround:** The download steps in both scripts are now disabled. Scripts use local copies from the dotfiles repo instead. If re-enabling upstream downloads, ensure patches are re-applied afterward.

---

## DeepSeek XML tool-call regression after compaction

**Symptom:** After compaction, the agent outputs XML-style tool calls (`<｜｜DSML｜｜tool_calls> <｜｜DSML｜｜invoke name="skill">…`) instead of OpenAI JSON format. The agent becomes effectively dead — it cannot call any tools successfully.

**Root cause (two parts):**

1. `compaction.keep.tokens` was set to `4000` — roughly 2-3 turns. After compaction the rebuilt context was too thin. DeepSeek-class models revert to their base training format (XML tool calls) when they lack enough context to stay in "assistant mode".

2. The compaction summary itself was generated by the same DeepSeek free model. If the model was already in a degraded state, it produced a corrupt summary, making the next epoch start broken.

**Fix applied (`opencode.jsonc`):**
```jsonc
// Raise keep window so model retains 10-15 turns verbatim after compaction
"compaction": {
  "auto": true,
  "prune": true,
  "keep": { "tokens": 20000 },
  "buffer": 8000
},
// Dedicated compaction agent using a powerful model (Claude writes the summary)
"agent": {
  "compaction": { "model": "9router/ag/claude-opus-4-6-thinking" }
}
```

**Why it matters:** Even models with 128K context windows suffer from format regression when compacted context is too sparse. The compaction agent decouples summary generation from the working model — Gemini produces a coherent summary; DeepSeek receives it and continues normally.

## lazy-load.ts URL detection — NOTE (not a bug)

`lazy-load.ts`'s `isLLM` check looks for `/chat/completions` in the URL path. Since the AI SDK always appends `/chat/completions` to any OpenAI-compatible provider's `baseURL`, **all** OpenAI-compatible proxies (including `tienbac.dpdns.org`) are already matched by the first condition — no domain-specific entry needed.

The domain list (`api.openai.com`, `api.deepseek.com`, etc.) only matters for providers that use non-standard paths. For any standard `/chat/completions` endpoint, the plugin works out of the box.

---

## 9router missing free opencode models

**Symptom:** OpenCode cannot select or resolve `9router/oc/deepseek-v4-flash-free` or other free models under the `9router` provider because they are missing from the proxy's `/v1/models` endpoint list, preventing registration by the discovery plugin.

**Fix:** Modified `plugins/models-discovery.js` to explicitly inject these free models (`oc/big-pickle`, `oc/deepseek-v4-flash-free`, `oc/hy3-free`, `oc/mimo-v2.5-free`, `oc/north-mini-code-free`, and `oc/nemotron-3-ultra-free`) into the discovered models array when `providerId === '9router'`. This registers them with correct capabilities (vision for flash/hy3/mimo, reasoning for flash/hy3) and proper token limits (`context: 190000`, `output: 16384`) so OpenCode can route them through the `9router` proxy.

---

## Dynamic CodeGraph Enforcement & Auto-Index Updates

**Goal:** Force agents to use CodeGraph search tools in repositories that are indexed (to prevent token waste on raw grep/glob), while keeping standard grep/glob as a fallback for non-indexed repositories. Also, automatically keep the CodeGraph index updated when files are written or edited.

**Fix:** Created `plugins/codegraph-helper.ts` which uses two OpenCode hooks:
1. `tool.execute.before`: Intercepts `grep_search` and `glob_search` execution. If a `.codegraph` directory exists in the workspace, it blocks the tool run and throws a redirection error: *"This repository is indexed by CodeGraph. Standard grep/glob is blocked. Use codegraph_explore instead."*
2. `tool.execute.after`: Runs after file write/edit tools (`replace_file_content`, `write_to_file`, `multi_replace_file_content`) finish successfully. It triggers an asynchronous `codegraph index` update command in the background.

