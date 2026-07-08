# AGENTS.md — Behavioral Instructions

The `AGENTS.md` file contains the behavioral guidelines that OpenCode loads into every session. It's referenced from `opencode.jsonc`:

```jsonc
"instructions": ["AGENTS.md"]
```

## Contents

The file merges two concerns:

### 1. Coding Behavior (from sub-project)

Guidelines for focused, surgical, goal-driven execution:

- **Think Before Coding** — surface tradeoffs, don't assume silently
- **Simplicity First** — minimum code, no speculative features
- **Surgical Changes** — touch only what you must
- **Goal-Driven Execution** — define success criteria, loop until verified
- **Communication mode** — Caveman full style (no filler, fragments OK)

### 2. Triage Integration

```
When the user asks you to use a skill or you think a skill might be relevant,
use the `triage()` tool to find and load it — NOT the `skill()` tool (which is disabled).

Example: user says "use the brainstorming skill"
→ call triage({ query: "brainstorming" })
→ then use the returned skill instructions.
```

## Why AGENTS.md Matters

Without this instruction, the LLM instinctively calls `skill()` when you say "use skill X", even though:
- The `skill` tool's description says to use triage instead
- The `tool.execute.before` hook blocks `skill()` calls

The AGENTS.md overrides this behavior at the instruction level, so the LLM goes straight to `triage()`.

## Location

- **Global:** `~/.config/opencode/AGENTS.md` (applies to all projects)
- **Project:** `.opencode/AGENTS.md` or root `AGENTS.md` (project-specific)

OpenCode loads instructions from both locations and merges them.
