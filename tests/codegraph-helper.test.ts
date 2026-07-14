import { afterEach, describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { CodeGraphHelperPlugin } from "../plugins/codegraph-helper"

const directories: string[] = []

function workspace(indexed = true): string {
  const directory = mkdtempSync(join(tmpdir(), "codegraph-helper-"))
  directories.push(directory)
  if (indexed) mkdirSync(join(directory, ".codegraph"))
  return directory
}

async function plugin(directory: string) {
  return (CodeGraphHelperPlugin as any)({ directory, client: {} })
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe("CodeGraph search guard", () => {
  test("does nothing when workspace has no CodeGraph index", async () => {
    const hooks = await plugin(workspace(false))

    await expect(hooks["tool.execute.before"](
      { tool: "grep_search", sessionID: "session-a" },
      {},
    )).resolves.toBeUndefined()
  })

  test("redirects broad search until same session attempts CodeGraph", async () => {
    const hooks = await plugin(workspace())
    const before = hooks["tool.execute.before"]

    await expect(before(
      { tool: "grep_search", sessionID: "session-a" },
      {},
    )).rejects.toThrow("Try CodeGraph first")

    await before({ tool: "codegraph_codegraph_explore", sessionID: "session-a" }, {})

    await expect(before(
      { tool: "glob_search", sessionID: "session-a" },
      {},
    )).resolves.toBeUndefined()
  })

  test("keeps search attempts isolated by session", async () => {
    const hooks = await plugin(workspace())
    const before = hooks["tool.execute.before"]

    await before({ tool: "codegraph_explore", sessionID: "session-a" }, {})

    await expect(before(
      { tool: "grep_search", sessionID: "session-b" },
      {},
    )).rejects.toThrow("Try CodeGraph first")
  })

  test("always permits exact file reads", async () => {
    const hooks = await plugin(workspace())

    await expect(hooks["tool.execute.before"](
      { tool: "read", sessionID: "session-a" },
      {},
    )).resolves.toBeUndefined()
  })
})

describe("CodeGraph index ownership", () => {
  test("leaves edit syncing to the CodeGraph MCP watcher", async () => {
    const hooks = await plugin(workspace())

    expect(hooks["tool.execute.after"]).toBeUndefined()
  })
})
