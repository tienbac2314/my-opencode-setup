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
const exportCredentialsScript = fileURLToPath(new URL("../scripts/export-credentials.ps1", import.meta.url))
const setCredentialsSource = readFileSync(setCredentialsScript, "utf8")
const exportCredentialsSource = readFileSync(exportCredentialsScript, "utf8")
const removeLegacyGoalScript = fileURLToPath(new URL("../scripts/remove-legacy-goal-command.ps1", import.meta.url))
const installHeadroomScript = fileURLToPath(new URL("../scripts/install-headroom-plugin.ps1", import.meta.url))
const launchHeadroomScript = fileURLToPath(new URL("../scripts/start-opencode-headroom.ps1", import.meta.url))
const manageHeadroomScript = fileURLToPath(new URL("../scripts/manage-headroom-proxy.ps1", import.meta.url))
const runHeadroomScript = fileURLToPath(new URL("../scripts/run-headroom-proxy.ps1", import.meta.url))
const cleanupHeadroomScript = fileURLToPath(new URL("../scripts/remove-headroom-opencode-pollution.ps1", import.meta.url))
const projectConfig = JSON.parse(readFileSync(new URL("../.opencode/opencode.json", import.meta.url), "utf8"))
const globalConfig = JSON.parse(readFileSync(new URL("../config/opencode.jsonc.example", import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, ""))

test("project config does not override global plugins", () => {
  expect(projectConfig).not.toHaveProperty("plugin")
})

test("Headroom stays out of tracked global config", () => {
  expect(globalConfig.provider?.headroom).toBeUndefined()
  expect(globalConfig.plugin ?? []).not.toContain("headroom-opencode")
  expect(globalConfig.mcp?.headroom).toBeUndefined()
})

test("goal plugin is commented out while its OpenCode integration is broken", () => {
  expect(globalConfig.plugin ?? []).not.toContain("@prevalentware/opencode-goal-plugin@0.1.24")
  expect(setupScript).toContain("-not $_.disabled")
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
  expect(existsSync(launchHeadroomScript)).toBe(true)
  expect(existsSync(manageHeadroomScript)).toBe(true)
  expect(existsSync(runHeadroomScript)).toBe(true)
})

test("Headroom service and fallback launcher preserve provider ownership", () => {
  const source = readFileSync(launchHeadroomScript, "utf8")
  const manager = readFileSync(manageHeadroomScript, "utf8")
  const runner = readFileSync(runHeadroomScript, "utf8")
  expect(source).toContain('headroom -CommandType Application,ExternalScript')
  expect(source).toContain('$startInfo.ArgumentList.Add("proxy")')
  expect(source).toContain("PositionalBinding = $false")
  expect(source).toContain("Position = 0, ValueFromRemainingArguments")
  expect(source).toContain("HEADROOM_PROXY_URL")
  expect(manager).toContain("New-ScheduledTaskTrigger -AtLogOn")
  expect(manager).toContain("New-ScheduledTaskPrincipal")
  expect(manager).toContain("headroom-proxy.url")
  expect(manager).toContain("-Hidden")
  expect(manager).toContain("Headroom version drift")
  expect(manager).toContain("restartOwnedTask")
  expect(manager).toContain("-WindowStyle Hidden")
  expect(manager).toContain("run-headroom-proxy.ps1")
  expect(runner).toContain("LITELLM_SUPPRESS_DEBUG_INFO")
  expect(runner).toContain("--no-memory-tools")
  expect(runner).toContain("--no-memory-context")
  expect(runner).toContain("proxy.log")
  expect(runner).toContain("Write-BoundedLogLine")
  expect(runner).toContain("ForEach-Object")
  expect(source).toContain('$startInfo.ArgumentList.Add("--no-memory-tools")')
  expect(source).toContain('$startInfo.ArgumentList.Add("--no-memory-context")')
  expect(source).toContain('$startInfo.ArgumentList.Add("--no-learn")')
  expect(source).toContain('$startInfo.ArgumentList.Add("--no-telemetry")')
  expect(source).not.toContain("wrap opencode")
  expect(source).not.toContain("provider =")
  expect(source).not.toContain("mcp =")
  expect(manager).not.toContain('"provider"')
  expect(manager).not.toContain('"mcp"')
})

test("Headroom cleanup preserves unrelated JSONC configuration", () => {
  const directory = mkdtempSync(join(tmpdir(), "opencode-headroom-cleanup-"))
  const configPath = join(directory, "opencode.jsonc")
  const original = `{
  // keep this comment
  "provider": {
    "9router": { "options": { "apiKey": "keep-secret" } },
    "headroom": { "name": "Headroom Proxy", "options": { "baseURL": "http://127.0.0.1:8787/v1" } }
  },
  "mcp": {
    "codegraph": { "command": ["codegraph", "serve", "--mcp"] },
    "headroom": { "command": ["headroom.exe", "mcp", "serve"] },
    "serena": { "command": ["uvx", "--from", "git+https://github.com/oraios/serena", "serena", "start-mcp-server", "--context", "agent", "--open-web-dashboard", "False"] }
  }
}`
  try {
    writeFileSync(configPath, original)
    const result = Bun.spawnSync(["pwsh", "-NoProfile", "-File", cleanupHeadroomScript, "-ConfigFile", configPath])
    expect(result.exitCode).toBe(0)
    const updated = readFileSync(configPath, "utf8")
    expect(updated).toContain("// keep this comment")
    expect(updated).toContain("keep-secret")
    expect(updated).toContain("codegraph")
    expect(updated).not.toContain('"headroom"')
    expect(updated).not.toContain('"serena"')
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("Headroom cleanup defaults to dual config and deletes empty leftover JSON", () => {
  const directory = mkdtempSync(join(tmpdir(), "opencode-headroom-dual-"))
  const home = join(directory, "home")
  const configDir = join(home, ".config", "opencode")
  const jsoncPath = join(configDir, "opencode.jsonc")
  const jsonPath = join(configDir, "opencode.json")
  try {
    mkdirSync(configDir, { recursive: true })
    writeFileSync(jsoncPath, `{
  // keep this comment
  "provider": {
    "9router": { "options": { "apiKey": "keep-secret" } },
    "headroom": { "name": "Headroom Proxy", "options": { "baseURL": "http://127.0.0.1:8787/v1" } }
  },
  "mcp": {
    "codegraph": { "command": ["codegraph", "serve", "--mcp"] },
    "headroom": { "command": ["headroom.exe", "mcp", "serve"] }
  }
}`)
    writeFileSync(jsonPath, JSON.stringify({
      $schema: "https://opencode.ai/config.json",
      provider: {
        headroom: { name: "Headroom Proxy", options: { baseURL: "http://127.0.0.1:8787/v1" } },
      },
      mcp: {
        headroom: { command: ["headroom.exe", "mcp", "serve"] },
        serena: { command: ["uvx", "--from", "git+https://github.com/oraios/serena", "serena", "start-mcp-server", "--context", "agent", "--open-web-dashboard", "False"] },
      },
    }))
    const result = Bun.spawnSync(["pwsh", "-NoProfile", "-File", cleanupHeadroomScript], {
      env: { ...process.env, HOME: home, USERPROFILE: home },
    })
    expect(result.exitCode).toBe(0)
    const updated = readFileSync(jsoncPath, "utf8")
    expect(updated).toContain("// keep this comment")
    expect(updated).toContain("keep-secret")
    expect(updated).toContain("codegraph")
    expect(updated).not.toContain('"headroom"')
    expect(updated).not.toContain('"serena"')
    expect(existsSync(jsonPath)).toBe(false)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
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

test("RTK uses PATH without executable-specific resolution", () => {
  const source = readFileSync(new URL("../plugins/rtk.ts", import.meta.url), "utf8")
  expect(source).not.toContain("rtkCommand")
  expect(source).not.toContain("rtk.exe")
  expect(source).not.toContain("System32")
  expect(source).toContain('runFile("rtk", ["--version"])')
  expect(setupScript).toContain("& rtk init -g")
  expect(maintainerScript).not.toContain("$userBinary")
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

test("credential export collects populated 9router, Supermemory, and OpenRouter values", () => {
  const directory = mkdtempSync(join(tmpdir(), "opencode-export-credentials-"))
  const configDirectory = join(directory, ".config", "opencode")
  const outputPath = join(directory, "my-opencode-credentials.json")
  const authPath = join(directory, "auth.json")

  try {
    mkdirSync(configDirectory, { recursive: true })
    writeFileSync(join(configDirectory, "opencode.jsonc"), `{
  // decoy: "apiKey": "wrong-key"
  "provider": {
    "other": { "options": { "apiKey": "keep-key" } },
    "9router": { "options": { "baseURL": "https://router.invalid/v1", "apiKey": "router-key" } }
  }
}`)
    writeFileSync(join(configDirectory, "supermemory.jsonc"), `{
  "apiKey": "memory-key",
  "baseUrl": "https://memory.invalid"
}`)
    writeFileSync(authPath, JSON.stringify({
      openrouter: { type: "api", key: "openrouter-key" },
      unrelated: { type: "api", key: "ignore-key" },
    }))

    const result = Bun.spawnSync([
      "pwsh", "-NoProfile", "-File", exportCredentialsScript,
      "-OutputFile", outputPath,
      "-ConfigDir", configDirectory,
      "-AuthFile", authPath,
      "-SkipAcl",
    ])

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(readFileSync(outputPath, "utf8"))).toEqual({
      router_api_key: "router-key",
      router_base_url: "https://router.invalid/v1",
      supermemory_api_key: "memory-key",
      supermemory_base_url: "https://memory.invalid",
      openrouter_api_key: "openrouter-key",
    })
    expect(result.stdout.toString()).not.toContain("router-key")
    expect(result.stdout.toString()).not.toContain("memory-key")
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("credential export and restore share the same private default file", () => {
  const sharedDefault = '[string]$CredentialsFile = "$env:USERPROFILE\\.config\\opencode\\credentials.json"'
  expect(setCredentialsSource).toContain(sharedDefault)
  expect(exportCredentialsSource.replace("$OutputFile", "$CredentialsFile")).toContain(sharedDefault)
})

describe("JSONC plugin pinning", () => {
  test("manifest maintainer owns exact config pin synchronization", () => {
    expect(maintainerScript).toContain("Sync-ConfigPins")
    expect(maintainerScript).toContain("@prevalentware/opencode-goal-plugin/tui")
    expect(maintainerScript).toContain('-Name "@prevalentware/opencode-goal-plugin/server" -Remove')
    expect(maintainerScript).toContain('name = "@prevalentware/opencode-goal-plugin"; add = $true')
  })

  test("TUI does not load disabled Goal package", () => {
    const tui = JSON.parse(readFileSync(new URL("../config/tui.json", import.meta.url), "utf8"))
    expect(tui.plugin).not.toContain("@prevalentware/opencode-goal-plugin@0.1.24")
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
