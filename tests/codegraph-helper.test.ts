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

async function plugin(directory: string, commands: string[] = []) {
  const $ = (parts: TemplateStringsArray) => {
    commands.push(parts.join(""))
    return Promise.resolve()
  }

  return (CodeGraphHelperPlugin as any)({ directory, $, client: {} })
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

describe("CodeGraph index sync", () => {
  test("refreshes after apply_patch", async () => {
    const commands: string[] = []
    const hooks = await plugin(workspace(), commands)

    await hooks["tool.execute.after"](
      { tool: "apply_patch", sessionID: "session-a" },
      {},
    )
    await Bun.sleep(350)

    expect(commands).toEqual(["codegraph sync"])
  })

  test("debounces supported edits into one index refresh", async () => {
    const commands: string[] = []
    const hooks = await plugin(workspace(), commands)
    const after = hooks["tool.execute.after"]

    await after({ tool: "write_to_file", sessionID: "session-a" }, {})
    await after({ tool: "multi_replace_file_content", sessionID: "session-a" }, {})
    await Bun.sleep(350)

    expect(commands).toEqual(["codegraph sync"])
  })
})
