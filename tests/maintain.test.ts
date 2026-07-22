import { expect, test } from "bun:test"
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const maintainer = fileURLToPath(new URL("../maintain.ps1", import.meta.url))
const setup = fileURLToPath(new URL("../setup.ps1", import.meta.url))
const ensureBun = fileURLToPath(new URL("../scripts/ensure-bun.ps1", import.meta.url))
const powershell = Bun.which("pwsh") ?? "pwsh"
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
  expect(repositoryManifest.expectedServerPlugins).toBe(6)
  expect(repositoryManifest.components.find((item: any) => item.id === "opencode")?.target).toBe("1.18.1")
  expect(repositoryManifest.components.find((item: any) => item.id === "opencode-plugin")?.target).toBe("1.18.1")
  const omo = repositoryManifest.components.find((item: any) => item.id === "omo-slim")
  expect(omo?.target).toBe("2.2.6")
  expect(omo?.runtimeTarget).toBeUndefined()
  for (const item of components) {
    expect(item.id).toBeTruthy()
    expect(item.kind).toBeTruthy()
    expect(item.target).toBeTruthy()
    expect(item.verify).toBeTruthy()
  }
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
  const decisions = readFileSync(new URL("../docs/history/decisions.md", import.meta.url), "utf8")

  expect(agents).toContain("Repository source of truth")
  expect(agents).toContain("docs/guides/troubleshooting.md")
  expect(agents).toContain("docs/history/decisions.md")
  expect(agents).not.toContain("Think Before Coding")
  expect(globalAgents).toContain("Think Before Coding")
  expect(globalAgents).toContain("Runtime Tools")
  for (const repositoryOnly of ["README.md", "PATCHES.md", "maintain.ps1", "9router"]) {
    expect(globalAgents).not.toContain(repositoryOnly)
  }
  expect(agents).not.toContain("notifier checks npm packages")
  expect(setup).toContain("scripts/set-credentials.ps1")
  expect(setup).toContain("router_api_key")
  expect(setup).toContain("Microsoft.VisualStudio.Workload.VCTools")
  expect(setup).toContain('headroom-ai[all]==0.31.0')
  expect(setup).toContain("does not replace another `rtk.exe`")
  expect(setup).toContain("Latest versions are reported, never auto-approved")
  expect(decisions).toContain("Record conclusions and evidence, not internal deliberation")
  expect(decisions).toContain("Bare proxy reads `rtk gain`")
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
  const bunInstall = join(root, ".bun")
  const bunBin = join(bunInstall, "bin")
  const log = join(root, "commands.log")
  const manifest = join(root, "components.json")
  try {
    mkdirSync(configDir)
    mkdirSync(cacheDir)
    mkdirSync(bin)
    mkdirSync(bunBin, { recursive: true })
    copyFileSync(process.execPath, join(bunBin, "bun.exe"))
    writeFileSync(join(configDir, "package.json"), JSON.stringify({ dependencies: {
      "oh-my-opencode-slim": "2.2.0",
    } }))
    writeFileSync(join(configDir, "opencode.jsonc"), '{ "plugin": ["oh-my-opencode-slim@2.2.0"] }')
    writeFileSync(join(configDir, "tui.json"), '{ "plugin": ["oh-my-opencode-slim@2.2.0"] }')
    writeFileSync(manifest, JSON.stringify({
      schemaVersion: 1,
      expectedServerPlugins: 1,
      components: [
        { id: "omo-slim", kind: "omo", package: "oh-my-opencode-slim", target: "2.2.4" },
      ],
    }))
    writeFileSync(join(bin, "npm.cmd"), `@echo npm %*>>"${log}"\r\n@exit /b 0\r\n`)
    writeFileSync(join(bin, "bun.cmd"), "@exit /b 0\r\n")
    writeFileSync(join(bin, "bunx.cmd"), `@echo bunx config=%OPENCODE_CONFIG_DIR% path=%PATH% %*>>"${log}"\r\n@exit /b 0\r\n`)
    const result = Bun.spawnSync([
      "pwsh", "-NoProfile", "-File", maintainer, "apply", "-Component", "omo-slim",
      "-Manifest", manifest, "-ConfigDir", configDir, "-CacheDir", cacheDir,
    ], { env: { ...process.env, Path: `${bin};${process.env.Path}`, BUN_INSTALL: bunInstall, OPENCODE_CONFIG_DIR: "sentinel" } })
    expect(result.exitCode).toBe(0)
    expect(readFileSync(log, "utf8")).toContain(`bunx config=${configDir}`)
    expect(readFileSync(log, "utf8")).toContain("oh-my-opencode-slim@2.2.4 install --yes")
    const commandLog = readFileSync(log, "utf8")
    expect(commandLog).toContain(bunBin)
    expect(commandLog.indexOf(bunBin)).toBeLessThan(commandLog.indexOf(bin))
    expect(readFileSync(join(configDir, "opencode.jsonc"), "utf8")).toContain("oh-my-opencode-slim@2.2.4")
    expect(readFileSync(join(configDir, "tui.json"), "utf8")).toContain("oh-my-opencode-slim@2.2.4")
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
  expect(headroomDocs).toContain("transport-only service")
  expect(source.removeWhen).toContain("without provider, model, or MCP mutation")
})

test("lean setup excludes archived runtime families and retirement machinery", () => {
  const ids = new Set(repositoryManifest.components.map((item: any) => item.id))
  const setup = readFileSync(new URL("../setup.ps1", import.meta.url), "utf8")
  const maintainer = readFileSync(new URL("../maintain.ps1", import.meta.url), "utf8")
  const activeFlow = [
    readFileSync(new URL("../README.md", import.meta.url), "utf8"),
    readFileSync(new URL("../docs/README.md", import.meta.url), "utf8"),
    readFileSync(new URL("../docs/guides/setup.md", import.meta.url), "utf8"),
    readFileSync(new URL("../docs/guides/troubleshooting.md", import.meta.url), "utf8"),
    readFileSync(new URL("../docs/reference/patches.md", import.meta.url), "utf8"),
    readFileSync(new URL("../docs/reference/upstream.md", import.meta.url), "utf8"),
  ].join("\n")

  expect((repositoryManifest as any).retired).toBeUndefined()
  for (const id of ["supermemory", "goal", "codegraph-helper"]) expect(ids.has(id)).toBe(false)
  for (const file of [
    "../plugins/supermemory.ts",
    "../plugins/codegraph-helper.ts",
    "../commands/goal.md",
    "../config/supermemory.jsonc.example",
    "../patches/opencode-supermemory-2.0.8-selfhost.patch",
    "../patches/opencode-goal-plugin-0.1.24.patch",
    "../scripts/verify-supermemory.ts",
    "../scripts/verify-goal-tui.ts",
    "../scripts/remove-legacy-goal-command.ps1",
    "../tests/codegraph-helper.test.ts",
  ]) expect(existsSync(new URL(file, import.meta.url))).toBe(false)
  expect(`${setup}\n${maintainer}`).not.toMatch(/retired|supermemory|mem0|goal/i)
  expect(activeFlow).not.toMatch(/retired|supermemory|mem0|goal plugin|goal tool/i)
})

test("Bun prerequisite preserves an existing working installation", () => {
  const root = mkdtempSync(join(tmpdir(), "opencode-bun-existing-"))
  const bin = join(root, "bin")
  try {
    mkdirSync(bin)
    copyFileSync(process.execPath, join(bin, "bun.exe"))
    copyFileSync(process.execPath, join(bin, "bunx.exe"))
    const command = `function Invoke-RestMethod { throw 'installer must not run' }; & '${ensureBun.replaceAll("'", "''")}'`
    const result = Bun.spawnSync([powershell, "-NoProfile", "-Command", command], {
      env: { ...process.env, Path: bin },
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toContain("Bun prerequisite already available")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}, 15000)

test("Bun prerequisite rejects shell shims that Node child processes cannot spawn", () => {
  if (process.platform !== "win32") return
  const root = mkdtempSync(join(tmpdir(), "opencode-bun-shim-"))
  const bin = join(root, "bin")
  const installed = join(root, ".bun", "bin")
  const installer = [
    `$bin = Join-Path $env:BUN_INSTALL 'bin'`,
    `New-Item -ItemType Directory -Path $bin -Force | Out-Null`,
    `Copy-Item $env:TEST_BUN_EXE (Join-Path $bin 'bun.exe')`,
    `Copy-Item $env:TEST_BUN_EXE (Join-Path $bin 'bunx.exe')`,
  ].join("; ")
  try {
    mkdirSync(bin)
    writeFileSync(join(bin, "bun.cmd"), "@exit /b 0\r\n")
    writeFileSync(join(bin, "bunx.cmd"), "@exit /b 0\r\n")
    writeFileSync(join(bin, "bun.ps1"), "exit 0\r\n")
    writeFileSync(join(bin, "bunx.ps1"), "exit 0\r\n")
    const command = `function Invoke-RestMethod { $env:TEST_BUN_INSTALLER }; & '${ensureBun.replaceAll("'", "''")}'`
    const result = Bun.spawnSync([powershell, "-NoProfile", "-Command", command], {
      env: {
        ...process.env,
        Path: bin,
        BUN_INSTALL: join(root, ".bun"),
        TEST_BUN_EXE: process.execPath,
        TEST_BUN_INSTALLER: installer,
      },
    })

    expect(result.exitCode).toBe(0)
    expect(existsSync(join(installed, "bun.exe"))).toBe(true)
    expect(result.stdout.toString()).toContain("Installed official Bun prerequisite")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}, 15000)

test("Bun prerequisite repairs resolved commands that cannot run", () => {
  const root = mkdtempSync(join(tmpdir(), "opencode-bun-broken-"))
  const bin = join(root, "bin")
  const installer = [
    `Copy-Item $env:TEST_BUN_EXE (Join-Path $env:TEST_BUN_BIN 'bun.exe')`,
    `Copy-Item $env:TEST_BUN_EXE (Join-Path $env:TEST_BUN_BIN 'bunx.exe')`,
  ].join("; ")
  try {
    mkdirSync(bin)
    writeFileSync(join(bin, "bun.cmd"), "@exit /b 1\r\n")
    writeFileSync(join(bin, "bunx.cmd"), "@exit /b 0\r\n")
    const command = `function Invoke-RestMethod { $env:TEST_BUN_INSTALLER }; & '${ensureBun.replaceAll("'", "''")}'`
    const result = Bun.spawnSync([powershell, "-NoProfile", "-Command", command], {
      env: { ...process.env, Path: bin, TEST_BUN_BIN: bin, TEST_BUN_EXE: process.execPath, TEST_BUN_INSTALLER: installer },
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toContain("Installed official Bun prerequisite")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("Bun prerequisite WhatIf never executes the remote installer", () => {
  const root = mkdtempSync(join(tmpdir(), "opencode-bun-whatif-"))
  try {
    const command = `function Invoke-RestMethod { throw 'installer executed' }; & '${ensureBun.replaceAll("'", "''")}' -WhatIf`
    const result = Bun.spawnSync([powershell, "-NoProfile", "-Command", command], {
      env: { ...process.env, Path: join(root, "empty-bin"), BUN_INSTALL: join(root, ".bun") },
    })

    expect(result.exitCode).toBe(0)
    expect(result.stderr.toString()).not.toContain("installer executed")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("setup checks Bun before component installation and propagates WhatIf", () => {
  const source = readFileSync(new URL("../setup.ps1", import.meta.url), "utf8")
  const prerequisite = source.indexOf("scripts\\ensure-bun.ps1")
  const components = source.indexOf("& pwsh @apply")

  expect(prerequisite).toBeGreaterThan(-1)
  expect(prerequisite).toBeLessThan(components)
  expect(source).toContain("-WhatIf:$WhatIfPreference")
})

test("Bun prerequisite uses the official installer when commands are missing", () => {
  const root = mkdtempSync(join(tmpdir(), "opencode-bun-install-"))
  const bunBin = join(root, ".bun", "bin")
  const installer = [
    `$bin = Join-Path $env:BUN_INSTALL 'bin'`,
    `New-Item -ItemType Directory -Path $bin -Force | Out-Null`,
    `Copy-Item $env:TEST_BUN_EXE (Join-Path $bin 'bun.exe')`,
    `Copy-Item $env:TEST_BUN_EXE (Join-Path $bin 'bunx.exe')`,
  ].join("; ")
  try {
    const command = `function Invoke-RestMethod { $env:TEST_BUN_INSTALLER }; & '${ensureBun.replaceAll("'", "''")}'`
    const result = Bun.spawnSync([powershell, "-NoProfile", "-Command", command], {
      env: {
        ...process.env,
        Path: join(root, "empty-bin"),
        BUN_INSTALL: join(root, ".bun"),
        TEST_BUN_EXE: process.execPath,
        TEST_BUN_INSTALLER: installer,
      },
    })

    expect(result.exitCode).toBe(0)
    expect(existsSync(join(bunBin, "bun.exe"))).toBe(true)
    expect(existsSync(join(bunBin, "bunx.exe"))).toBe(true)
    expect(result.stdout.toString()).toContain("Installed official Bun prerequisite")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}, 15000)

test("OMO uses the tested exact target in every runtime config", () => {
  const globalConfig = JSON.parse(readFileSync(new URL("../config/opencode.jsonc.example", import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, ""))
  const tuiConfig = JSON.parse(readFileSync(new URL("../config/tui.json", import.meta.url), "utf8"))

  expect(globalConfig.plugin).toContain("oh-my-opencode-slim@2.2.6")
  expect(tuiConfig.plugin).toContain("oh-my-opencode-slim@2.2.6")
})

test("bare-machine docs explain exact OMO update policy and Bun prerequisites", () => {
  const setupGuide = readFileSync(new URL("../docs/guides/setup.md", import.meta.url), "utf8")
  const troubleshooting = readFileSync(new URL("../docs/guides/troubleshooting.md", import.meta.url), "utf8")
  const decisions = readFileSync(new URL("../docs/history/decisions.md", import.meta.url), "utf8")

  expect(setupGuide).toContain("automatically installs official Bun")
  expect(setupGuide).toContain("fresh setups, Desktop, and TUI load the tested version")
  expect(troubleshooting).toContain("spawn bun ENOENT")
  expect(decisions).toContain("Exact OMO Slim runtime pin")
})

test("README links every managed upstream repository", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8")
  const repositories = new Set(
    repositoryManifest.components
      .map((item: any) => item.repository)
      .filter((repository: unknown): repository is string => typeof repository === "string"),
  )

  expect(repositories.size).toBeGreaterThan(0)
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
    } }))
    writeFileSync(join(configDir, "tui.json"), JSON.stringify({ plugin: [
      "oh-my-opencode-slim",
    ] }))
    writeFileSync(manifest, JSON.stringify({
      schemaVersion: 1,
      expectedServerPlugins: 1,
      components: [
        { id: "omo-slim", kind: "omo", package: "oh-my-opencode-slim", target: "2.2.1" },
      ],
    }))
    writeFileSync(join(bin, "opencode.cmd"), '@echo {"plugin":["oh-my-opencode-slim@2.2.1"],"plugin_origins":[{}]}\r\n')
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

test("verification accepts OMO installer managed tuple", () => {
  const root = mkdtempSync(join(tmpdir(), "opencode-omo-tuple-verify-"))
  const configDir = join(root, "config")
  const cacheDir = join(root, "cache")
  const bin = join(root, "bin")
  const manifest = join(root, "components.json")
  try {
    mkdirSync(configDir)
    mkdirSync(cacheDir)
    mkdirSync(bin)
    writeFileSync(join(configDir, "package.json"), JSON.stringify({ dependencies: {
      "oh-my-opencode-slim": "2.2.6",
    } }))
    writeFileSync(join(configDir, "tui.json"), JSON.stringify({ plugin: [
      "oh-my-opencode-slim@2.2.6",
    ] }))
    writeFileSync(manifest, JSON.stringify({
      schemaVersion: 1,
      expectedServerPlugins: 1,
      components: [
        { id: "omo-slim", kind: "omo", package: "oh-my-opencode-slim", target: "2.2.6" },
      ],
    }))
    writeFileSync(join(bin, "opencode.cmd"), '@echo {"plugin":[["oh-my-opencode-slim@2.2.6",{"__ohMyOpencodeSlimManagedByInstaller":true}]],"plugin_origins":[{}]}\r\n')
    const result = Bun.spawnSync([
      "pwsh", "-NoProfile", "-File", maintainer, "verify", "-Offline", "-SkipTests",
      "-Manifest", manifest, "-ConfigDir", configDir, "-CacheDir", cacheDir,
    ], { env: { ...process.env, Path: `${bin};${process.env.Path}` } })
    expect(result.exitCode).toBe(0)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("OMO patch exports only the OpenCode plugin entry", () => {
  const patch = readFileSync(new URL("../patches/oh-my-opencode-slim-2.2.6-export.patch", import.meta.url), "utf8")
  const patchInstaller = readFileSync(new URL("../scripts/apply-package-patches.ps1", import.meta.url), "utf8")
  const manifest = repositoryManifest.components.find((item: any) => item.id === "omo-slim")
  expect(manifest.patch).toBe("patches/oh-my-opencode-slim-2.2.6-export.patch")
  expect(manifest.tuiCache).toBe(true)
  expect(patch).toContain("-  minimumExpectedToolCount,")
  expect(patch).toContain("src_default as default")
  expect(patchInstaller).not.toContain("$item.runtimeTarget")
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
    writeFileSync(join(configDir, "package.json"), JSON.stringify({ dependencies: {} }))
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
    expect(existsSync(join(configDir, "plugins", "opencode-lazy-load.ts"))).toBe(true)
    const deployedOmo = JSON.parse(readFileSync(join(configDir, "oh-my-opencode-slim.json"), "utf8"))
    expect(deployedOmo.image_routing).toBe("direct")
    expect(readFileSync(join(configDir, "AGENTS.md"), "utf8")).toBe(
      readFileSync(new URL("../config/AGENTS.md", import.meta.url), "utf8"),
    )
    expect(readFileSync(join(configDir, "AGENTS.md"), "utf8")).not.toContain("Repository source of truth")
    const commands = readFileSync(log, "utf8")
    expect(commands).toContain("opencode-ai@1.18.1")
    expect(commands).toContain("@opencode-ai/plugin@1.18.1")
    expect(commands).not.toContain("headroom-ai")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}, 30000)
