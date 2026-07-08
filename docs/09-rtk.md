# RTK Auto-Rewrite Hook

[RTK](https://github.com/rtk-ai/rtk) transparently rewrites Bash commands to optimized equivalents before execution — saving tokens and standardizing command usage.

## Installation

```powershell
rtk init -g                 # Install hook + RTK.md (recommended)
rtk init -g --opencode      # OpenCode plugin (instead of Claude Code)
```

The OpenCode plugin (`plugins/rtk.ts`) intercepts `bash`/`shell` tool calls and runs `rtk rewrite` on each command. If rewrite succeeds, the rewritten command executes instead — zero token overhead, no LLM thinking required.

## Verification

```powershell
rtk init --show
```

Expected output:
```
[ok] Hook: rtk hook claude (native binary command)
[ok] OpenCode: plugin found
[ok] settings.json: RTK hook configured
```

## How It Works

```
LLM calls:  git status
              │
              ▼
rtk plugin intercepts → rtk rewrite "git status"
              │
              ▼
If rewrite available:  rtk status  (fewer tokens)
If no rewrite:         git status  (pass through unchanged)
```

No AGENTS.md instruction needed — the plugin handles it at the tool level.
