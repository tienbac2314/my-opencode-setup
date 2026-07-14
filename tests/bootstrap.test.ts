import { describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { RtkOpenCodePlugin } from "../plugins/rtk"

const script = readFileSync(new URL("../bootstrap.ps1", import.meta.url), "utf8")
const pinPluginScript = fileURLToPath(new URL("../scripts/pin-opencode-plugin.ps1", import.meta.url))
const setCredentialsScript = fileURLToPath(new URL("../scripts/set-credentials.ps1", import.meta.url))
const readVersionsScript = fileURLToPath(new URL("../scripts/read-versions.ps1", import.meta.url))
const bootstrapScript = fileURLToPath(new URL("../bootstrap.ps1", import.meta.url))
const updaterScript = readFileSync(new URL("../update-plugins.ps1", import.meta.url), "utf8")
const projectConfig = JSON.parse(readFileSync(new URL("../.opencode/opencode.json", import.meta.url), "utf8"))

const versionFileBody = `
# machine-local tested versions
OPENCODE_VERSION=1.17.18
OPENCODE_PLUGIN_VERSION=1.17.18
AI_SDK_OPENAI_COMPATIBLE_VERSION=3.0.7
OPENCODE_SUPERMEMORY_VERSION=2.0.8
OPENCODE_UPDATE_NOTIFIER_VERSION=0.3.3
OH_MY_OPENCODE_SLIM_VERSION=9.8.7
`

test("project config does not override global plugins", () => {
  expect(projectConfig).not.toHaveProperty("plugin")
})

describe("private version file", () => {
  test("parses comments, blank lines, and every required version", () => {
    const directory = mkdtempSync(join(tmpdir(), "opencode-versions-"))
    const versionsPath = join(directory, "versions.env")

    try {
      writeFileSync(versionsPath, versionFileBody)
      const result = Bun.spawnSync([
        "rtk", "proxy", "pwsh", "-NoProfile", "-File", readVersionsScript,
        "-Path", versionsPath,
      ])

      expect(result.exitCode).toBe(0)
      const versions = JSON.parse(result.stdout.toString())
      expect(versions.OPENCODE_VERSION).toBe("1.17.18")
      expect(versions.OPENCODE_PLUGIN_VERSION).toBe("1.17.18")
      expect(versions.AI_SDK_OPENAI_COMPATIBLE_VERSION).toBe("3.0.7")
      expect(versions.OPENCODE_SUPERMEMORY_VERSION).toBe("2.0.8")
      expect(versions.OPENCODE_UPDATE_NOTIFIER_VERSION).toBe("0.3.3")
      expect(versions.OH_MY_OPENCODE_SLIM_VERSION).toBe("9.8.7")
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }, 15000)

  test("rejects a file with a missing required version", () => {
    const directory = mkdtempSync(join(tmpdir(), "opencode-versions-"))
    const versionsPath = join(directory, "versions.env")

    try {
      writeFileSync(versionsPath, "OPENCODE_VERSION=1.17.18\n")
      const result = Bun.spawnSync([
        "rtk", "proxy", "pwsh", "-NoProfile", "-File", readVersionsScript,
        "-Path", versionsPath,
      ])

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr.toString()).toContain("Missing required version key")
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }, 15000)
})

test("OMO update mode changes only OMO files and restores tailored config", () => {
  const directory = mkdtempSync(join(tmpdir(), "opencode-update-only-"))
  const configDirectory = join(directory, ".config", "opencode")
  const versionsPath = join(configDirectory, "versions.env")
  const fakeBin = join(directory, "bin")
  const commandLog = join(directory, "commands.log")

  try {
    mkdirSync(configDirectory, { recursive: true })
    mkdirSync(fakeBin, { recursive: true })
    writeFileSync(versionsPath, versionFileBody)
    writeFileSync(join(configDirectory, "opencode.jsonc"), '{"plugin":["oh-my-opencode-slim@1.0.0","other@1.0.0"]}')
    writeFileSync(join(fakeBin, "bunx.cmd"), `@echo bunx %*>>"${commandLog}"\r\n@exit /b 0\r\n`)
    writeFileSync(join(fakeBin, "npm.cmd"), `@echo npm %*>>"${commandLog}"\r\n@exit /b 0\r\n`)

    const result = Bun.spawnSync([
      "rtk", "proxy", "pwsh", "-NoProfile", "-File", bootstrapScript,
      "-UpdateOnly", "-Component", "OmoSlim", "-VersionsFile", versionsPath,
    ], {
      env: {
        ...process.env,
        USERPROFILE: directory,
        Path: `${fakeBin};${process.env.Path}`,
      },
    })

    expect(result.exitCode).toBe(0)
    const commands = readFileSync(commandLog, "utf8")
    expect(commands).toContain("bunx oh-my-opencode-slim@9.8.7 install --yes")
    expect(commands).toContain("npm install --save-exact oh-my-opencode-slim@9.8.7")
    expect(readFileSync(join(configDirectory, "opencode.jsonc"), "utf8")).toContain(
      '"oh-my-opencode-slim@9.8.7"',
    )
    expect(readFileSync(join(configDirectory, "oh-my-opencode-slim.json"), "utf8")).toBe(
      readFileSync(new URL("../config/oh-my-opencode-slim.json", import.meta.url), "utf8"),
    )
    expect(readFileSync(join(configDirectory, "tui.json"), "utf8")).toContain(
      '"oh-my-opencode-slim@9.8.7"',
    )
    expect(result.stdout.toString()).not.toContain("[1/8]")
    expect(result.stdout.toString()).not.toContain("CodeGraph")
    expect(readFileSync(join(configDirectory, "plugins", "rtk.ts"), "utf8")).toBe(
      readFileSync(new URL("../plugins/rtk.ts", import.meta.url), "utf8"),
    )
    expect(readFileSync(join(configDirectory, "plugins", "lazy-load.ts"), "utf8")).toBe(
      readFileSync(new URL("../plugins/lazy-load.ts", import.meta.url), "utf8"),
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}, 15000)

test("RTK uses Windows system fallback when Desktop PATH omits rtk", async () => {
  delete (globalThis as any).__rtk_opencode_loaded__
  const calls: Array<{ parts: readonly string[]; values: unknown[] }> = []
  const shell = (parts: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ parts: [...parts], values })
    const command = parts.join("{}")
    const promise = command === "where rtk"
      ? Promise.reject(new Error("not in PATH"))
      : Promise.resolve({ stdout: command.includes("rewrite") ? "rtk rg pattern" : "rtk 0.23.0" })
    return Object.assign(promise, {
      quiet() { return this },
      nothrow() { return this },
    })
  }

  const hooks = await RtkOpenCodePlugin({ $: shell } as any) as any
  const output = { args: { command: "rg pattern" } }
  await hooks["tool.execute.before"]({ tool: "shell" }, output)

  const fallback = `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\rtk.exe`
  expect(calls[1]?.values[0]).toBe(fallback)
  expect(calls[2]?.values[0]).toBe(fallback)
  expect(output.args.command).toBe("rtk rg pattern")
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
    const install = script.indexOf('bunx "oh-my-opencode-slim@$Version" install --yes')
    const restore = script.indexOf('Copy-Item "$RepoDir\\config\\tui.json"', install)
    const repin = script.indexOf('pin-opencode-plugin.ps1', install)

    expect(install).toBeGreaterThan(-1)
    expect(restore).toBeGreaterThan(install)
    expect(repin).toBeGreaterThan(install)
    expect(script).not.toContain("oh-my-opencode-slim@latest")
  })

  test("legacy updater delegates one exact component to bootstrap", () => {
    expect(updaterScript).toContain('bootstrap.ps1" -UpdateOnly')
    expect(updaterScript).toContain('[ValidateSet("OmoSlim")]')
    expect(updaterScript).not.toContain("oh-my-opencode-slim@latest")
    expect(updaterScript).not.toContain("npm update")
    expect(updaterScript).not.toContain("codegraph upgrade")
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
