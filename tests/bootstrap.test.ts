import { describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const script = readFileSync(new URL("../bootstrap.ps1", import.meta.url), "utf8")
const pinPluginScript = fileURLToPath(new URL("../scripts/pin-opencode-plugin.ps1", import.meta.url))
const setCredentialsScript = fileURLToPath(new URL("../scripts/set-credentials.ps1", import.meta.url))
const projectConfig = JSON.parse(readFileSync(new URL("../.opencode/opencode.json", import.meta.url), "utf8"))

test("project config does not override global plugins", () => {
  expect(projectConfig).not.toHaveProperty("plugin")
})

test("credential restore updates only provider.9router.options", () => {
  const directory = mkdtempSync(join(tmpdir(), "opencode-credentials-"))
  const configDirectory = join(directory, ".config", "opencode")
  const configPath = join(configDirectory, "opencode.jsonc")
  const credentialsPath = join(directory, "credentials.json")
  const authPath = join(directory, "auth.json")
  const original = `{
  // decoy: "apiKey": "comment-key", "baseURL": "https://comment.invalid"
  "provider": {
    "other": { "options": { "apiKey": "keep-key", "baseURL": "https://keep.invalid" } },
    "9router": { "options": { "baseURL": "https://old.invalid", "apiKey": "old-key" } }
  }
}`

  try {
    mkdirSync(configDirectory, { recursive: true })
    writeFileSync(configPath, original)
    writeFileSync(credentialsPath, JSON.stringify({
      router_api_key: "new-key",
      router_base_url: "https://new.invalid",
      supermemory_api_key: "memory-key",
      supermemory_base_url: "https://memory.invalid",
      openrouter_api_key: "openrouter-key",
    }))

    const result = Bun.spawnSync([
      "rtk", "proxy", "pwsh", "-NoProfile", "-File", setCredentialsScript,
      "-CredentialsFile", credentialsPath,
      "-ConfigDir", configDirectory,
      "-AuthFile", authPath,
      "-SkipUserEnvironment",
    ])

    expect(result.exitCode).toBe(0)
    const updated = readFileSync(configPath, "utf8")
    expect(updated).toContain('// decoy: "apiKey": "comment-key"')
    expect(updated).toContain('"apiKey": "keep-key"')
    expect(updated).toContain('"baseURL": "https://keep.invalid"')
    expect(updated).toContain('"baseURL": "https://new.invalid"')
    expect(updated).toContain('"apiKey": "new-key"')
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

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
