# Skills

Three custom skills with embedded MCP servers for on-demand loading.

## docs-fetcher

Fetches library/framework documentation via Context7.

**SKILL.md:**
```yaml
---
name: docs-fetcher
description: Fetches documentation for libraries and frameworks using Context7.
mcp:
  context7:
    command: ["npx", "-y", "@upstash/context7-mcp"]
---
```

**Usage:**
```
skill(name="docs-fetcher")
skill_mcp(mcp_name="context7", tool_name="context7_query-docs",
          arguments='{"libraryId": "/vercel/next.js", "query": "app router"}')
```

## browser-automation

Browser automation via Playwright — navigation, screenshots, form filling, scraping.

**SKILL.md:**
```yaml
---
name: browser-automation
description: Browser automation for E2E testing, scraping, screenshots, and form interactions using Playwright.
mcp:
  playwright:
    command: ["npx", "-y", "@playwright/mcp@latest"]
---
```

**Usage:**
```
skill(name="browser-automation")
skill_mcp(mcp_name="playwright", tool_name="browser_snapshot",
          arguments='{"url": "https://example.com"}')
```

## devtools-debugger

Chrome DevTools protocol — DOM inspection, console, network, performance.

**SKILL.md:**
```yaml
---
name: devtools-debugger
description: Chrome DevTools for debugging - inspect the DOM, console, network, performance, and more.
mcp:
  chrome-devtools:
    command: ["npx", "-y", "chrome-devtools-mcp@latest"]
---
```

**Usage:**
```
skill(name="devtools-debugger")
skill_mcp(mcp_name="chrome-devtools", tool_name="chrome-devtools_take_snapshot")
```

## Why skill-embedded MCPs?

Before these, all three MCPs were defined globally in `opencode.jsonc` under `"mcp"`. This meant they started on every OpenCode session — consuming memory and startup time regardless of whether you needed them.

By embedding them in skills, they:
- **Load on-demand** — only when you explicitly load the skill
- **Auto-disconnect** — after 5 minutes idle
- **Zero startup cost** — clean context window at session start

## Discovery

Triage auto-discovers these skills along with your existing ones (31 total). The auto-suggestion feature proactively suggests relevant skills based on your message content.
