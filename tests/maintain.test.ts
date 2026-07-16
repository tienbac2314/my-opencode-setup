import { expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const maintainer = fileURLToPath(new URL("../maintain.ps1", import.meta.url))
const setup = fileURLToPath(new URL("../setup.ps1", import.meta.url))
const updateOpenCode = fileURLToPath(new URL("../scripts/update-opencode.ps1", import.meta.url))
const repositoryManifest = JSON.parse(readFileSync(new URL("../config/components.json", import.meta.url), "utf8"))
const activeDocs = [
  "README.md",
  "AGENTS.md",
  "config/AGENTS.md",
  "docs/README.md",
  "docs/guides/setup.md",
  "docs/guides/troubleshooting.md",
  "docs/integrations/headroom.md",
  "docs/integrations/supermemory-server-embedding.md",
  "docs/reference/agents.md",
  "docs/reference/patches.md",
  "docs/reference/upstream.md",
  "docs/history/decisions.md",
  "docs/history/maintenance-refactor.md",
  "docs/history/repository-timeline.md",
  "docs/history/architecture-evolution.md",
  "docs/history/incident-ledger.md",
  "docs/history/source-index.md",
]
const operationalDocs = activeDocs.filter((file) => !file.startsWith("docs/history/"))
const retiredMcpSkills = ["browser-automation", "devtools-debugger", "docs-fetcher"]

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "opencode-maintain-"))
  const configDir = join(root, "config")
  const outputDir = join(root, "state")
  const cacheDir = join(root, "cache")
  const manifest = join(root, "components.json")
  mkdirSync(configDir)
  writeFileSync(join(configDir, "package.json"), JSON.stringify({
    type: "module",
    dependencies: { "fixture-package": "1.2.3" },
  }))
  writeFileSync(manifest, JSON.stringify({
    schemaVersion: 1,
    expectedServerPlugins: 1,
    components: [{
      id: "fixture",
      name: "Fixture",
      kind: "npm-local",
      package: "fixture-package",
      target: "1.2.3",
      repository: "https://example.invalid/fixture",
      verify: "fixture verification",
    }],
  }))
  return { root, configDir, cacheDir, outputDir, manifest }
}

test("component manifest is unique and complete", () => {
  const components = repositoryManifest.components as Array<Record<string, unknown>>
  expect(new Set(components.map((item) => item.id)).size).toBe(components.length)
  expect(repositoryManifest.expectedServerPlugins).toBe(8)
  expect(repositoryManifest.components.find((item: any) => item.id === "opencode")?.target).toBe("1.18.1")
  expect(repositoryManifest.components.find((item: any) => item.id === "opencode-plugin")?.target).toBe("1.18.1")
  expect(repositoryManifest.retired.npmLocal).toContain("opencode-update-notifier")
  expect(repositoryManifest.retired.npmLocal).toContain("@prevalentware/opencode-goal-plugin")
  expect(repositoryManifest.retired.skills).toEqual(retiredMcpSkills)
  for (const item of components) {
    expect(item.id).toBeTruthy()
    expect(item.kind).toBeTruthy()
    expect(item.target).toBeTruthy()
    expect(item.verify).toBeTruthy()
  }
})

test("Goal plugin stays disabled until its OpenCode integration bug is fixed", () => {
  const goal = repositoryManifest.components.find((item: any) => item.id === "goal")
  const globalConfig = readFileSync(new URL("../config/opencode.jsonc.example", import.meta.url), "utf8")
  const tuiConfig = JSON.parse(readFileSync(new URL("../config/tui.json", import.meta.url), "utf8"))

  expect(goal.disabled).toBe(true)
  expect(goal.disabledReason).toContain("OpenCode")
  expect(globalConfig).toContain("Goal plugin disabled")
  expect(JSON.parse(globalConfig.replace(/^\s*\/\/.*$/gm, "")).plugin).not.toContain("@prevalentware/opencode-goal-plugin@0.1.24")
  expect(tuiConfig.plugin).not.toContain("@prevalentware/opencode-goal-plugin@0.1.24")
})

test("active docs use manifest and unified scripts only", () => {
  for (const file of operationalDocs) {
    const body = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
    expect(body).not.toContain("versions.env")
    expect(body).not.toContain("update-plugins.ps1")
    expect(body).not.toContain("bootstrap.ps1")
  }
})

test("active documentation has no broken local links", () => {
  for (const file of activeDocs) {
    const body = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
    for (const match of body.matchAll(/\[[^\]]+\]\((?!https?:\/\/|#)([^)]+)\)/g)) {
      const target = match[1]!.split("#")[0]!
      expect(existsSync(new URL(target, new URL(`../${file}`, import.meta.url)))).toBe(true)
    }
  }
})

test("active instructions match current manifest and retained operations", () => {
  const agents = readFileSync(new URL("../AGENTS.md", import.meta.url), "utf8")
  const globalAgents = readFileSync(new URL("../config/AGENTS.md", import.meta.url), "utf8")
  const setup = readFileSync(new URL("../docs/guides/setup.md", import.meta.url), "utf8")
  const journey = readFileSync(new URL("../docs/history/maintenance-refactor.md", import.meta.url), "utf8")
  const decisions = readFileSync(new URL("../docs/history/decisions.md", import.meta.url), "utf8")

  expect(agents).toContain("Repository source of truth")
  expect(agents).toContain("docs/guides/troubleshooting.md")
  expect(agents).toContain("docs/history/decisions.md")
  expect(agents).not.toContain("Think Before Coding")
  expect(globalAgents).toContain("Think Before Coding")
  expect(globalAgents).toContain("Runtime Tools")
  for (const repositoryOnly of ["README.md", "PATCHES.md", "Goal package", "maintain.ps1", "9router", "Supermemory"]) {
    expect(globalAgents).not.toContain(repositoryOnly)
  }
  expect(agents).not.toContain("notifier checks npm packages")
  expect(setup).toContain("scripts/set-credentials.ps1")
  expect(setup).toContain("router_api_key")
  expect(setup).toContain("Microsoft.VisualStudio.Workload.VCTools")
  expect(setup).toContain('headroom-ai[all]==0.31.0')
  expect(setup).toContain("does not replace another `rtk.exe`")
  expect(setup).toContain("Latest versions are reported, never auto-approved")
  expect(journey).toContain("full Bun suite passing")
  expect(journey).toContain(`${repositoryManifest.expectedServerPlugins} plugins`)
  expect(journey).toContain("Goal remains disabled")
  expect(journey).not.toContain("8 plugins, 8 origins")
  expect(decisions).toContain("Record conclusions and evidence, not internal deliberation")
  expect(decisions).toContain("Single persistent-memory owner")
  expect(decisions).toContain("Bare proxy reads `rtk gain`")
})

test("obsolete MCP skills are retired from source and deployment", () => {
  const setup = readFileSync(new URL("../setup.ps1", import.meta.url), "utf8")
  expect(setup).toContain("retired.skills")
  for (const name of retiredMcpSkills) {
    expect(existsSync(new URL(`../skills/${name}`, import.meta.url))).toBe(false)
  }
})

test("operator scripts expose comment-based help", () => {
  for (const file of ["setup.ps1", "maintain.ps1", "scripts/update-opencode.ps1", "scripts/install-headroom-plugin.ps1"]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
    expect(source).toContain(".SYNOPSIS")
    expect(source).toContain(".DESCRIPTION")
    expect(source).toContain(".EXAMPLE")
  }
})

test("setup and maintainer use cross-platform config and temp paths", () => {
  const setup = readFileSync(new URL("../setup.ps1", import.meta.url), "utf8")
  const maintain = readFileSync(new URL("../maintain.ps1", import.meta.url), "utf8")
  expect(setup).toContain('[IO.Path]::Combine($HOME, ".config", "opencode")')
  expect(maintain).toContain("[IO.Path]::GetTempPath()")
  expect(maintain).toContain("Get-Command $File -CommandType Application,ExternalScript")
  expect(setup).toContain("Copy-UniqueSkills")
  expect(setup).toContain('Copy-Item "$RepoDir\\config\\AGENTS.md"')
  expect(setup).not.toContain('Copy-Item "$RepoDir\\AGENTS.md"')
  expect(setup).toContain("externalNames")
  expect(setup).toContain("foreach ($name in $externalNames)")
  expect(setup).toContain("environment.d")
  expect(setup.lastIndexOf("Copy-UniqueSkills")).toBeGreaterThan(setup.indexOf("& pwsh @apply"))
  expect(maintain).toContain('node_modules\\bun\\bin\\bun.exe')
  expect(maintain).toContain('$env:PATH = $originalPath')
  expect(maintain).toContain('$env:OPENCODE_CONFIG_DIR = $ConfigDir')
  expect(maintain).toContain('$env:OPENCODE_CONFIG_DIR = $originalConfigDir')
})

test("offline check is read-only and reports approved target", () => {
  const item = fixture()
  try {
    const before = readFileSync(join(item.configDir, "package.json"), "utf8")
    const result = Bun.spawnSync([
      "pwsh", "-NoProfile", "-File", maintainer, "check", "-Offline", "-Json",
      "-Manifest", item.manifest, "-ConfigDir", item.configDir,
    ])
    expect(result.exitCode).toBe(0)
    const report = JSON.parse(result.stdout.toString())
    expect(report[0]).toMatchObject({ id: "fixture", installed: "1.2.3", target: "1.2.3", state: "current" })
    expect(readFileSync(join(item.configDir, "package.json"), "utf8")).toBe(before)
  } finally {
    rmSync(item.root, { recursive: true, force: true })
  }
})

test("plan writes machine and human update reports", () => {
  const item = fixture()
  try {
    const result = Bun.spawnSync([
      "pwsh", "-NoProfile", "-File", maintainer, "plan", "-Offline",
      "-Manifest", item.manifest, "-ConfigDir", item.configDir, "-OutputDir", item.outputDir,
    ])
    expect(result.exitCode).toBe(0)
    const json = JSON.parse(readFileSync(join(item.outputDir, "update-plan.json"), "utf8"))
    const markdown = readFileSync(join(item.outputDir, "update-plan.md"), "utf8")
    expect(json[0].id).toBe("fixture")
    expect(markdown).toContain("# OpenCode Update Plan")
    expect(markdown).toContain("Fixture")
    expect(markdown).toContain("Never overwrite local forks")
  } finally {
    rmSync(item.root, { recursive: true, force: true })
  }
})

test("apply rejects unknown component before mutation", () => {
  const item = fixture()
  try {
    const before = readFileSync(join(item.configDir, "package.json"), "utf8")
    const result = Bun.spawnSync([
      "pwsh", "-NoProfile", "-File", maintainer, "apply", "-Component", "missing",
      "-Manifest", item.manifest, "-ConfigDir", item.configDir,
    ])
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr.toString() + result.stdout.toString()).toContain("Unknown component IDs")
    expect(readFileSync(join(item.configDir, "package.json"), "utf8")).toBe(before)
  } finally {
    rmSync(item.root, { recursive: true, force: true })
  }
})

test("apply accepts comma-separated component IDs", () => {
  const item = fixture()
  try {
    const manifest = JSON.parse(readFileSync(item.manifest, "utf8"))
    manifest.components.push({
      id: "second",
      name: "Second",
      kind: "local",
      target: "local",
      localFile: "plugins/second.ts",
      verify: "second verification",
    })
    writeFileSync(item.manifest, JSON.stringify(manifest))
    const result = Bun.spawnSync([
      "pwsh", "-NoProfile", "-File", maintainer, "apply", "-Component", "fixture,second", "-WhatIf",
      "-Manifest", item.manifest, "-ConfigDir", item.configDir,
    ])
    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toContain("LOCAL second")
  } finally {
    rmSync(item.root, { recursive: true, force: true })
  }
})

test("apply installs only selected exact npm target", () => {
  const item = fixture()
  const bin = join(item.root, "bin")
  const log = join(item.root, "npm.log")
  try {
    const config = JSON.parse(readFileSync(join(item.configDir, "package.json"), "utf8"))
    config.dependencies["fixture-package"] = "1.2.2"
    writeFileSync(join(item.configDir, "package.json"), JSON.stringify(config))
    mkdirSync(bin)
    writeFileSync(join(bin, "npm.cmd"), `@echo %*>>"${log}"\r\n@exit /b 0\r\n`)
    const result = Bun.spawnSync([
      "pwsh", "-NoProfile", "-File", maintainer, "apply", "-Component", "fixture",
      "-Manifest", item.manifest, "-ConfigDir", item.configDir,
    ], {
      env: { ...process.env, Path: `${bin};${process.env.Path}` },
    })
    expect(result.exitCode).toBe(0)
    expect(readFileSync(log, "utf8")).toContain("install --save-exact fixture-package@1.2.3")
  } finally {
    rmSync(item.root, { recursive: true, force: true })
  }
})

test("apply skips an already-current npm target", () => {
  const item = fixture()
  const bin = join(item.root, "bin")
  const log = join(item.root, "npm.log")
  try {
    mkdirSync(bin)
    writeFileSync(join(bin, "npm.cmd"), `@echo %*>>"${log}"\r\n@exit /b 0\r\n`)
    const result = Bun.spawnSync([
      "pwsh", "-NoProfile", "-File", maintainer, "apply", "-Component", "fixture",
      "-Manifest", item.manifest, "-ConfigDir", item.configDir,
    ], { env: { ...process.env, Path: `${bin};${process.env.Path}` } })
    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toContain("CURRENT fixture")
    expect(existsSync(log)).toBe(false)
  } finally {
    rmSync(item.root, { recursive: true, force: true })
  }
})

test("Windows OpenCode updater waits for running process before npm install", () => {
  if (process.platform !== "win32") return
  const root = mkdtempSync(join(tmpdir(), "opencode-update-"))
  const bin = join(root, "bin")
  const log = join(root, "npm.log")
  try {
    mkdirSync(bin)
    writeFileSync(join(bin, "npm.cmd"), `@echo %*>>"${log}"\r\n@exit /b 0\r\n`)
    const blocker = Bun.spawn(["pwsh", "-NoProfile", "-Command", "Start-Sleep -Milliseconds 800"])
    const started = Date.now()
    const result = Bun.spawnSync([
      "pwsh", "-NoProfile", "-File", updateOpenCode,
      "-Version", "1.18.1", "-WaitForProcessId", String(blocker.pid),
    ], { env: { ...process.env, Path: `${bin};${process.env.Path}` } })

    expect(result.exitCode).toBe(0)
    expect(Date.now() - started).toBeGreaterThanOrEqual(600)
    expect(readFileSync(log, "utf8")).toContain("install --global opencode-ai@1.18.1")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("OMO installer honors custom OpenCode config directory", () => {
  const root = mkdtempSync(join(tmpdir(), "opencode-omo-config-"))
  const configDir = join(root, "config")
  const cacheDir = join(root, "cache")
  const bin = join(root, "bin")
  const log = join(root, "commands.log")
  const manifest = join(root, "components.json")
  try {
    mkdirSync(configDir)
    mkdirSync(cacheDir)
    mkdirSync(bin)
    writeFileSync(join(configDir, "package.json"), JSON.stringify({ dependencies: {
      "oh-my-opencode-slim": "2.2.0",
      "@prevalentware/opencode-goal-plugin": "0.1.24",
    } }))
    writeFileSync(join(configDir, "opencode.jsonc"), '{ "plugin": [] }')
    writeFileSync(join(configDir, "tui.json"), '{ "plugin": [] }')
    writeFileSync(manifest, JSON.stringify({
      schemaVersion: 1,
      expectedServerPlugins: 2,
      retired: { npmLocal: [], pluginSpecs: [] },
      components: [
        { id: "omo-slim", kind: "omo", package: "oh-my-opencode-slim", target: "2.2.1" },
        { id: "goal", kind: "npm-local", package: "@prevalentware/opencode-goal-plugin", target: "0.1.24" },
      ],
    }))
    writeFileSync(join(bin, "npm.cmd"), `@echo npm %*>>"${log}"\r\n@exit /b 0\r\n`)
    writeFileSync(join(bin, "bun.cmd"), "@exit /b 0\r\n")
    writeFileSync(join(bin, "bunx.cmd"), `@echo bunx config=%OPENCODE_CONFIG_DIR% %*>>"${log}"\r\n@exit /b 0\r\n`)
    const result = Bun.spawnSync([
      "pwsh", "-NoProfile", "-File", maintainer, "apply", "-Component", "omo-slim",
      "-Manifest", manifest, "-ConfigDir", configDir, "-CacheDir", cacheDir,
    ], { env: { ...process.env, Path: `${bin};${process.env.Path}`, OPENCODE_CONFIG_DIR: "sentinel" } })
    expect(result.exitCode).toBe(0)
    expect(readFileSync(log, "utf8")).toContain(`bunx config=${configDir} oh-my-opencode-slim@2.2.1 install --yes`)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("Headroom installer reads commit from component manifest", () => {
  const source = readFileSync(new URL("../scripts/install-headroom-plugin.ps1", import.meta.url), "utf8")
  expect(source).toContain("components.json")
  expect(source).toContain("headroom-source")
  expect(source).not.toContain("versions.env")
})

test("Headroom uses auto-loaded bridge and independent proxy", () => {
  const setup = readFileSync(new URL("../docs/guides/setup.md", import.meta.url), "utf8")
  const patches = readFileSync(new URL("../docs/reference/patches.md", import.meta.url), "utf8")
  const headroomDocs = readFileSync(new URL("../docs/integrations/headroom.md", import.meta.url), "utf8")
  const bridge = readFileSync(new URL("../plugins/headroom.ts", import.meta.url), "utf8")
  const manager = readFileSync(new URL("../scripts/manage-headroom-proxy.ps1", import.meta.url), "utf8")
  const runner = readFileSync(new URL("../scripts/run-headroom-proxy.ps1", import.meta.url), "utf8")
  const maintain = readFileSync(new URL("../maintain.ps1", import.meta.url), "utf8")
  const source = repositoryManifest.components.find((item: any) => item.id === "headroom-source")

  expect(existsSync(new URL("../plugins/headroom.ts", import.meta.url))).toBe(true)
  expect(existsSync(new URL("../scripts/manage-headroom-proxy.ps1", import.meta.url))).toBe(true)
  expect(existsSync(new URL("../scripts/run-headroom-proxy.ps1", import.meta.url))).toBe(true)
  expect(existsSync(new URL("../scripts/remove-headroom-opencode-pollution.ps1", import.meta.url))).toBe(true)
  expect(existsSync(new URL("../scripts/install-headroom-plugin.ps1", import.meta.url))).toBe(true)
  expect(setup).toContain("scripts/manage-headroom-proxy.ps1 install")
  expect(setup).toContain("scripts/remove-headroom-opencode-pollution.ps1")
  expect(bridge).toContain("waitForHealthyHeadroomProxy")
  expect(bridge).toContain("headroom-proxy.url")
  expect(manager).toContain("New-ScheduledTaskTrigger -AtLogOn")
  expect(manager).toContain("-WindowStyle Hidden")
  expect(runner).toContain("--no-memory-tools")
  expect(runner).toContain("LITELLM_SUPPRESS_DEBUG_INFO")
  expect(runner).toContain("--no-learn")
  expect(maintain).toContain("Headroom proxy task convergence failed")
  expect(setup).not.toContain("headroom wrap opencode --no-context-tool --")
  expect(patches).toContain("Auto-discovered `plugins/headroom.ts`")
  expect(headroomDocs).toContain("Bare `headroom proxy`")
  expect(headroomDocs).toContain("Supermemory is the single owner")
  expect(source.removeWhen).toContain("without provider, model, or MCP mutation")
})

test("README links every managed upstream repository", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8")
  const repositories = new Set(
    repositoryManifest.components
      .map((item: any) => item.repository)
      .filter((repository: unknown): repository is string => typeof repository === "string"),
  )

  expect(repositories.size).toBe(11)
  for (const repository of repositories) {
    expect(readme).toContain(`](${repository})`)
  }
  expect(readme).toContain("](https://github.com/obra/superpowers)")
})

test("repository history indexes the full pre-reconstruction graph", () => {
  const source = readFileSync(new URL("../docs/history/source-index.md", import.meta.url), "utf8")
  const hashes = [...source.matchAll(/^\| `([0-9a-f]{7})` \|/gm)].map((match) => match[1])
  expect(hashes.length).toBe(104)
  expect(new Set(hashes).size).toBe(104)
  for (const boundary of ["bccb45f", "d8fa757", "c286bb8", "03db0fd", "bf57a31", "48f5564"]) {
    expect(hashes).toContain(boundary)
  }
  expect(source).toContain("Deleted-document map")
  expect(source).toContain("archive/broken-docs-reference")
})

test("Goal package patch keeps active sidebar reactive and hides inactive state", () => {
  const patch = readFileSync(new URL("../patches/opencode-goal-plugin-0.1.24.patch", import.meta.url), "utf8")
  const manifest = repositoryManifest.components.find((item: any) => item.id === "goal")
  expect(manifest.patch).toBe("patches/opencode-goal-plugin-0.1.24.patch")
  expect(manifest.tuiCache).toBe(true)
  expect(patch).toContain("+    nowSeconds()")
  expect(patch).toContain("persistedGoals")
  expect(patch).toContain("● Goal active")
  expect(patch).not.toContain("No active goal")
  expect(patch).toContain("const details = createMemo")
  expect(patch).toContain("-                <Show when={value().tokenBudget}")
  expect(patch).toContain("+              <text fg={theme().textMuted}>{details()}</text>")
})

test("Goal TUI verifier covers tool, file, and inactive sidebar states", () => {
  const source = readFileSync(new URL("../scripts/verify-goal-tui.ts", import.meta.url), "utf8")
  expect(source).toContain("file-active")
  expect(source).toContain("file-cleared")
  expect(source).toContain("inactive Goal state should be absent")
  expect(source).toContain("testRender")
  expect(source).toContain("opencode-goal-plugin@0.1.24")
})

test("verification checks exact active TUI plugin pins", () => {
  const root = mkdtempSync(join(tmpdir(), "opencode-tui-drift-"))
  const configDir = join(root, "config")
  const cacheDir = join(root, "cache")
  const bin = join(root, "bin")
  const manifest = join(root, "components.json")
  try {
    mkdirSync(configDir)
    mkdirSync(cacheDir)
    mkdirSync(bin)
    writeFileSync(join(configDir, "package.json"), JSON.stringify({ dependencies: {
      "oh-my-opencode-slim": "2.2.1",
      "@prevalentware/opencode-goal-plugin": "0.1.24",
    } }))
    writeFileSync(join(configDir, "tui.json"), JSON.stringify({ plugin: [
      "@prevalentware/opencode-goal-plugin@0.1.24",
      "oh-my-opencode-slim",
    ] }))
    writeFileSync(manifest, JSON.stringify({
      schemaVersion: 1,
      expectedServerPlugins: 2,
      retired: { npmLocal: [] },
      components: [
        { id: "omo-slim", kind: "omo", package: "oh-my-opencode-slim", target: "2.2.1" },
        { id: "goal", kind: "npm-local", package: "@prevalentware/opencode-goal-plugin", target: "0.1.24" },
      ],
    }))
    writeFileSync(join(bin, "opencode.cmd"), '@echo {"plugin":["oh-my-opencode-slim@2.2.1","@prevalentware/opencode-goal-plugin@0.1.24"],"plugin_origins":[{},{}]}\r\n')
    const result = Bun.spawnSync([
      "pwsh", "-NoProfile", "-File", maintainer, "verify", "-Offline", "-SkipTests",
      "-Manifest", manifest, "-ConfigDir", configDir, "-CacheDir", cacheDir,
    ], { env: { ...process.env, Path: `${bin};${process.env.Path}` } })
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr.toString()).toContain("active tui.json is missing exact plugin pin: oh-my-opencode-slim@2.2.1")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("Supermemory self-host patch skips cloud settings endpoint", () => {
  const patch = readFileSync(new URL("../patches/opencode-supermemory-2.0.8-selfhost.patch", import.meta.url), "utf8")
  const manifest = repositoryManifest.components.find((item: any) => item.id === "supermemory")
  expect(manifest.patch).toBe("patches/opencode-supermemory-2.0.8-selfhost.patch")
  expect(patch).toContain("if (baseURL === DEFAULT_BASE_URL)")
  expect(patch).toContain("settings.update: error")
})

test("setup converges isolated config without machine integration", () => {
  const root = mkdtempSync(join(tmpdir(), "opencode-setup-"))
  const configDir = join(root, "config")
  const bin = join(root, "bin")
  const log = join(root, "commands.log")
  try {
    mkdirSync(bin)
    mkdirSync(configDir)
    writeFileSync(join(configDir, "opencode.json"), JSON.stringify({
      $schema: "https://opencode.ai/config.json",
      provider: {
        headroom: { name: "Headroom Proxy", options: { baseURL: "http://127.0.0.1:8787/v1" } },
      },
      mcp: {
        headroom: { command: ["headroom.exe", "mcp", "serve"] },
        serena: { command: ["uvx", "--from", "git+https://github.com/oraios/serena", "serena", "start-mcp-server", "--context", "agent", "--open-web-dashboard", "False"] },
      },
    }))
    writeFileSync(join(configDir, "package.json"), JSON.stringify({ dependencies: {
      "@prevalentware/opencode-goal-plugin": "0.1.24",
    } }))
    for (const name of retiredMcpSkills) {
      const skill = join(configDir, "skills", name)
      mkdirSync(skill, { recursive: true })
      writeFileSync(join(skill, "SKILL.md"), "obsolete")
    }
    writeFileSync(join(bin, "npm.cmd"), `@echo npm %*>>"${log}"\r\n@exit /b 0\r\n`)
    writeFileSync(join(bin, "bunx.cmd"), `@echo bunx %*>>"${log}"\r\n@exit /b 0\r\n`)
    const result = Bun.spawnSync([
      "pwsh", "-NoProfile", "-File", setup,
      "-ConfigDir", configDir,
      "-CacheDir", join(root, "cache"),
      "-SkipRtk", "-SkipCodeGraph", "-SkipTests", "-SkipEnvironment",
    ], { env: { ...process.env, Path: `${bin};${process.env.Path}` } })
    expect(result.exitCode).toBe(0)
    expect(existsSync(join(configDir, "opencode.jsonc"))).toBe(true)
    expect(existsSync(join(configDir, "opencode.json"))).toBe(false)
    expect(existsSync(join(configDir, "tui.json"))).toBe(true)
    expect(existsSync(join(configDir, "plugins", "lazy-load.ts"))).toBe(true)
    expect(readFileSync(join(configDir, "AGENTS.md"), "utf8")).toBe(
      readFileSync(new URL("../config/AGENTS.md", import.meta.url), "utf8"),
    )
    expect(readFileSync(join(configDir, "AGENTS.md"), "utf8")).not.toContain("Repository source of truth")
    expect(existsSync(join(configDir, "commands", "goal.md"))).toBe(false)
    for (const name of retiredMcpSkills) {
      expect(existsSync(join(configDir, "skills", name))).toBe(false)
    }
    const commands = readFileSync(log, "utf8")
    expect(commands).toContain("opencode-ai@1.18.1")
    expect(commands).toContain("@opencode-ai/plugin@1.18.1")
    expect(commands).toContain("npm uninstall @prevalentware/opencode-goal-plugin")
    expect(commands).not.toContain("install --save-exact @prevalentware/opencode-goal-plugin")
    expect(commands).not.toContain("headroom-ai")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}, 30000)
