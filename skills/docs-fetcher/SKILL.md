---
name: docs-fetcher
description: Fetches documentation for libraries and frameworks using Context7. Use when you need current API docs, examples, or migration guides.
mcp:
  context7:
    command: ["npx", "-y", "@upstash/context7-mcp"]
---

# Docs Fetcher

Use this skill when you need to look up documentation for any library, framework, SDK, API, or CLI tool. The embedded Context7 MCP provides up-to-date docs with code examples.

## Available Tools

- `context7_resolve-library-id` - Resolves a package name to a Context7 library ID
- `context7_query-docs` - Queries documentation for a specific library

## Usage

```
skill(name="docs-fetcher")
```

Then use the MCP tools directly:

```
skill_mcp(mcp_name="context7", tool_name="context7_query-docs", arguments='{"libraryId": "/vercel/next.js", "query": "how to use App Router"}')
```
