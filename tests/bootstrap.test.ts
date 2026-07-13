import { describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const script = readFileSync(new URL("../bootstrap.ps1", import.meta.url), "utf8")
const pinPluginScript = fileURLToPath(new URL("../scripts/pin-opencode-plugin.ps1", import.meta.url))

describe("bootstrap plugin pinning", () => {
  test("keeps oh-my-opencode-slim pinned after its installer runs", () => {
    const install = script.indexOf('bunx oh-my-opencode-slim@2.1.1 install')
    const restore = script.indexOf('Copy-Item "$RepoDir\\config\\tui.json"', install)
    const repin = script.indexOf('pin-opencode-plugin.ps1', install)

    expect(install).toBeGreaterThan(-1)
    expect(restore).toBeGreaterThan(install)
    expect(repin).toBeGreaterThan(install)
    expect(script).not.toContain("oh-my-opencode-slim@latest")
  })

  test("pins only the plugin array and preserves credentials", () => {
    const directory = mkdtempSync(join(tmpdir(), "opencode-pin-plugin-"))
    const configPath = join(directory, "opencode.jsonc")
    const original = `{
  // keep this comment
  "credentials": { "token": "oh-my-opencode-slim" },
  "plugin": [
    // keep example "oh-my-opencode-slim"
    "oh-my-opencode-slim",
    "other-plugin@1.0.0"
  ]
}`

    try {
      writeFileSync(configPath, original)
      const result = Bun.spawnSync([
        "rtk", "proxy", "pwsh", "-NoProfile", "-File", pinPluginScript,
        "-Path", configPath, "-Name", "oh-my-opencode-slim", "-Version", "2.1.1",
      ])

      expect(result.exitCode).toBe(0)
      const updated = readFileSync(configPath, "utf8")
      expect(updated).toContain('// keep this comment')
      expect(updated).toContain('// keep example "oh-my-opencode-slim"')
      expect(updated).toContain('"token": "oh-my-opencode-slim"')
      expect(updated).toContain('"oh-my-opencode-slim@2.1.1"')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test("restores the audited RTK plugin after rtk init", () => {
    const install = script.indexOf("rtk init -g --opencode")
    const restore = script.indexOf('Copy-Item "$RepoDir\\plugins\\rtk.ts"', install)

    expect(install).toBeGreaterThan(-1)
    expect(restore).toBeGreaterThan(install)
  })

  test("pins compact plugin arrays without touching later arrays", () => {
    const directory = mkdtempSync(join(tmpdir(), "opencode-pin-plugin-"))
    const configPath = join(directory, "opencode.jsonc")
    const original = '{"plugin":["oh-my-opencode-slim","other@1"],"examples":["oh-my-opencode-slim"]}'

    try {
      writeFileSync(configPath, original)
      const result = Bun.spawnSync([
        "rtk", "proxy", "pwsh", "-NoProfile", "-File", pinPluginScript,
        "-Path", configPath, "-Name", "oh-my-opencode-slim", "-Version", "2.1.1",
      ])

      expect(result.exitCode).toBe(0)
      expect(readFileSync(configPath, "utf8")).toBe(
        '{"plugin":["oh-my-opencode-slim@2.1.1","other@1"],"examples":["oh-my-opencode-slim"]}',
      )
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test("pins the root plugin array instead of nested plugin properties", () => {
    const directory = mkdtempSync(join(tmpdir(), "opencode-pin-plugin-"))
    const configPath = join(directory, "opencode.jsonc")
    const original = '{"provider":{"demo":{"plugin":["oh-my-opencode-slim"]}},"plugin":["oh-my-opencode-slim"]}'

    try {
      writeFileSync(configPath, original)
      const result = Bun.spawnSync([
        "rtk", "proxy", "pwsh", "-NoProfile", "-File", pinPluginScript,
        "-Path", configPath, "-Name", "oh-my-opencode-slim", "-Version", "2.1.1",
      ])

      expect(result.exitCode).toBe(0)
      expect(readFileSync(configPath, "utf8")).toBe(
        '{"provider":{"demo":{"plugin":["oh-my-opencode-slim"]}},"plugin":["oh-my-opencode-slim@2.1.1"]}',
      )
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
