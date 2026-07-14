import { describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { RtkOpenCodePlugin } from "../plugins/rtk"

const setupScript = readFileSync(new URL("../setup.ps1", import.meta.url), "utf8")
const maintainerScript = readFileSync(new URL("../maintain.ps1", import.meta.url), "utf8")
const pinPluginScript = fileURLToPath(new URL("../scripts/pin-opencode-plugin.ps1", import.meta.url))
const setCredentialsScript = fileURLToPath(new URL("../scripts/set-credentials.ps1", import.meta.url))
const removeLegacyGoalScript = fileURLToPath(new URL("../scripts/remove-legacy-goal-command.ps1", import.meta.url))
const installHeadroomScript = fileURLToPath(new URL("../scripts/install-headroom-plugin.ps1", import.meta.url))
const projectConfig = JSON.parse(readFileSync(new URL("../.opencode/opencode.json", import.meta.url), "utf8"))
const globalConfig = JSON.parse(readFileSync(new URL("../config/opencode.jsonc.example", import.meta.url), "utf8"))

test("project config does not override global plugins", () => {
  expect(projectConfig).not.toHaveProperty("plugin")
})

test("Headroom stays launcher-only", () => {
  expect(globalConfig.provider?.headroom).toBeUndefined()
  expect(globalConfig.plugin ?? []).not.toContain("headroom-opencode")
  expect(globalConfig.mcp?.headroom).toBeUndefined()
})

test("goal plugin uses root package so OpenCode resolves its server export", () => {
  expect(globalConfig.plugin ?? []).toContain("@prevalentware/opencode-goal-plugin@0.1.24")
  expect(globalConfig.plugin.some((item: string) => item.includes("/server@"))).toBe(false)
  expect(globalConfig.command?.goal).toBeUndefined()
})

test("setup delegates approved installs to the manifest maintainer", () => {
  expect(setupScript).toContain('config\\components.json')
  expect(setupScript).toContain('maintain.ps1", "apply"')
  expect(setupScript).toContain('maintain.ps1" verify')
  expect(setupScript).not.toContain("raw.githubusercontent.com")
  expect(setupScript).not.toContain("@latest")
  expect(setupScript).toContain('Copy-Tree "$RepoDir\\commands"')
})

test("goal and token commands are tracked locally", () => {
  const goal = readFileSync(new URL("../commands/goal.md", import.meta.url), "utf8")
  const tokens = readFileSync(new URL("../commands/tokens.md", import.meta.url), "utf8")
  expect(goal).toContain("$ARGUMENTS")
  expect(goal).toContain("create_goal")
  expect(tokens).toContain("/tokens")
})

test("maintainer removes retired local adapters during deployment", () => {
  expect(maintainerScript).toContain('"goal.ts"')
  expect(maintainerScript).toContain("Remove-Item")
})

test("legacy raw goal command migration preserves other config", () => {
  const directory = mkdtempSync(join(tmpdir(), "opencode-goal-command-"))
  const configPath = join(directory, "opencode.jsonc")
  const original = `{
  // keep
  "provider": { "demo": { "options": { "apiKey": "keep-secret" } } },
  "command": {
    "goal": { "description": "legacy", "template": "$ARGUMENTS", "agent": "build" },
    "other": { "template": "keep-other" }
  }
}`
  try {
    writeFileSync(configPath, original)
    const result = Bun.spawnSync([
      "pwsh", "-NoProfile", "-File", removeLegacyGoalScript, "-Path", configPath,
    ])
    expect(result.exitCode).toBe(0)
    const updated = readFileSync(configPath, "utf8")
    expect(updated).toContain("// keep")
    expect(updated).toContain("keep-secret")
    expect(updated).toContain("keep-other")
    expect(updated).not.toContain('"goal"')
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("Headroom native plugin installer is tracked", () => {
  expect(existsSync(installHeadroomScript)).toBe(true)
})

test("retired notifier is removed from manifest and config", () => {
  const manifest = JSON.parse(readFileSync(new URL("../config/components.json", import.meta.url), "utf8"))
  expect(manifest.components.some((item: any) => item.id === "update-notifier")).toBe(false)
  expect(manifest.retired.npmLocal).toContain("opencode-update-notifier")
  expect(globalConfig.plugin ?? []).not.toContain("opencode-update-notifier@0.3.3")
})

test("RTK requires PATH and never probes Windows system directory", async () => {
  delete (globalThis as any).__rtk_opencode_loaded__
  const calls: Array<{ parts: readonly string[]; values: unknown[] }> = []
  const shell = (parts: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ parts: [...parts], values })
    const promise = Promise.reject(new Error("not in PATH"))
    return Object.assign(promise, {
      quiet() { return this },
      nothrow() { return this },
    })
  }

  const hooks = await RtkOpenCodePlugin({ $: shell } as any) as any

  expect(calls).toHaveLength(1)
  expect(calls[0]?.parts.join("{}")).toBe("where rtk")
  expect(hooks).toEqual({})
})

test("RTK registers in Desktop without an injected Bun shell", async () => {
  delete (globalThis as any).__rtk_opencode_loaded__

  const hooks = await RtkOpenCodePlugin({} as any) as any
  const output = { args: { command: "git status" } }
  await hooks["tool.execute.before"]({ tool: "shell" }, output)

  expect(typeof hooks["tool.execute.before"]).toBe("function")
  expect(output.args.command).toStartWith("rtk ")
})

test("RTK repeated Desktop initialization keeps rewrite hook", async () => {
  delete (globalThis as any).__rtk_opencode_loaded__

  await RtkOpenCodePlugin({} as any)
  const hooks = await RtkOpenCodePlugin({} as any) as any
  const output = { args: { command: "git status" } }
  await hooks["tool.execute.before"]({ tool: "shell" }, output)

  expect(typeof hooks["tool.execute.before"]).toBe("function")
  expect(output.args.command).toStartWith("rtk ")
})

test("RTK prefers user-managed binary over System32 PATH entry", () => {
  const source = readFileSync(new URL("../plugins/rtk.ts", import.meta.url), "utf8")
  expect(source).toContain('join(homedir(), ".local", "bin"')
  expect(source).not.toContain("System32")
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

describe("JSONC plugin pinning", () => {
  test("manifest maintainer owns exact config pin synchronization", () => {
    expect(maintainerScript).toContain("Sync-ConfigPins")
    expect(maintainerScript).toContain("@prevalentware/opencode-goal-plugin/tui")
    expect(maintainerScript).toContain('-Name "@prevalentware/opencode-goal-plugin/server" -Remove')
    expect(maintainerScript).toContain('name = "@prevalentware/opencode-goal-plugin"; add = $true')
  })

  test("TUI uses root Goal package spec so OpenCode resolves its tui export", () => {
    const tui = JSON.parse(readFileSync(new URL("../config/tui.json", import.meta.url), "utf8"))
    expect(tui.plugin).toContain("@prevalentware/opencode-goal-plugin@0.1.24")
    expect(tui.plugin.some((item: string) => item.includes("/tui@"))).toBe(false)
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

  test("removes a legacy plugin without rewriting JSONC", () => {
    const directory = mkdtempSync(join(tmpdir(), "opencode-remove-plugin-"))
    const configPath = join(directory, "opencode.jsonc")
    const original = `{
  // keep comment
  "plugin": ["first@1", "@prevalentware/opencode-goal-plugin/server@0.1.24", "last@1"],
  "provider": { "9router": { "options": { "apiKey": "keep-secret" } } }
}`

    try {
      writeFileSync(configPath, original)
      const result = Bun.spawnSync([
        "rtk", "proxy", "pwsh", "-NoProfile", "-File", pinPluginScript,
        "-Path", configPath, "-Name", "@prevalentware/opencode-goal-plugin/server", "-Remove",
      ])

      expect(result.exitCode).toBe(0)
      const updated = readFileSync(configPath, "utf8")
      expect(updated).not.toContain("opencode-goal-plugin/server")
      expect(updated).toContain("// keep comment")
      expect(updated).toContain('"apiKey": "keep-secret"')
      expect(updated).toContain('"plugin": ["first@1",  "last@1"]')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test("adds a missing pinned plugin without rewriting JSONC", () => {
    const directory = mkdtempSync(join(tmpdir(), "opencode-add-plugin-"))
    const configPath = join(directory, "opencode.jsonc")
    writeFileSync(configPath, '{\n  // keep\n  "plugin": [\n    "first@1"\n  ]\n}')
    try {
      const result = Bun.spawnSync([
        "rtk", "proxy", "pwsh", "-NoProfile", "-File", pinPluginScript,
        "-Path", configPath, "-Name", "goal/server", "-Version", "2.0.0", "-Add",
      ])
      expect(result.exitCode).toBe(0)
      const updated = readFileSync(configPath, "utf8")
      expect(updated).toContain("// keep")
      expect(JSON.parse(updated.replace("// keep", "")).plugin).toEqual(["first@1", "goal/server@2.0.0"])
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
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
