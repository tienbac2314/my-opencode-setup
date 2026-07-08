---
name: browser-automation
description: Browser automation for E2E testing, scraping, screenshots, and form interactions using Playwright.
mcp:
  playwright:
    command: ["npx", "-y", "@playwright/mcp@latest"]
---

# Browser Automation

Browser automation via the Playwright MCP server. Navigate pages, take screenshots, fill forms, click elements, and more.

## Available Tools

- Navigation, clicking, typing, screenshots
- Form filling, file uploads, drag-and-drop
- Console message inspection, network request inspection

## Usage

```
skill(name="browser-automation")
```

Then use MCP tools:

```
skill_mcp(mcp_name="playwright", tool_name="browser_snapshot", arguments='{"url": "https://example.com"}')
```
