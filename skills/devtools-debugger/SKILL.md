---
name: devtools-debugger
description: Chrome DevTools for debugging - inspect the DOM, console, network, performance, and more.
mcp:
  chrome-devtools:
    command: ["npx", "-y", "chrome-devtools-mcp@latest"]
---

# DevTools Debugger

Chrome DevTools debugging capabilities via the chrome-devtools-mcp server. Inspect elements, view console logs, analyze network requests, profile performance, and take screenshots.

## Available Tools

- DOM inspection and manipulation
- Console message monitoring
- Network request analysis
- Performance tracing
- Screenshots and heap snapshots
- Lighthouse audits

## Usage

```
skill(name="devtools-debugger")
```

Then use MCP tools:

```
skill_mcp(mcp_name="chrome-devtools", tool_name="chrome-devtools_take_snapshot", arguments='{}')
```
