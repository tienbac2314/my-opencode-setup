import { expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const maintainer = fileURLToPath(new URL("../maintain.ps1", import.meta.url))
const setup = fileURLToPath(new URL("../setup.ps1", import.meta.url))
const repositoryManifest = JSON.parse(readFileSync(new URL("../config/components.json", import.meta.url), "utf8"))

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
  expect(repositoryManifest.retired.npmLocal).toContain("opencode-update-notifier")
  for (const item of components) {
    expect(item.id).toBeTruthy()
    expect(item.kind).toBeTruthy()
    expect(item.target).toBeTruthy()
    expect(item.verify).toBeTruthy()
  }
})

test("active docs use manifest and unified scripts only", () => {
  const files = ["README.md", "setup.md", "PATCHES.md", "pr.md"]
  for (const file of files) {
    const body = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
    expect(body).not.toContain("versions.env")
    expect(body).not.toContain("update-plugins.ps1")
    expect(body).not.toContain("bootstrap.ps1")
  }
})

test("active documentation has no broken local links", () => {
  const files = ["README.md", "setup.md", "PATCHES.md", "pr.md"]
  for (const file of files) {
    const body = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
    for (const match of body.matchAll(/\[[^\]]+\]\((?!https?:\/\/|#)([^)]+)\)/g)) {
      const target = match[1]!.split("#")[0]!
      expect(existsSync(new URL(`../${target}`, import.meta.url))).toBe(true)
    }
  }
})

test("setup and maintainer use cross-platform config and temp paths", () => {
  const setup = readFileSync(new URL("../setup.ps1", import.meta.url), "utf8")
  const maintain = readFileSync(new URL("../maintain.ps1", import.meta.url), "utf8")
  expect(setup).toContain('[IO.Path]::Combine($HOME, ".config", "opencode")')
  expect(maintain).toContain("[IO.Path]::GetTempPath()")
  expect(setup).toContain("Copy-UniqueSkills")
  expect(setup).toContain("externalNames")
  expect(setup).toContain("foreach ($name in $externalNames)")
  expect(setup).toContain("environment.d")
  expect(setup.lastIndexOf("Copy-UniqueSkills")).toBeGreaterThan(setup.indexOf("& pwsh @apply"))
  expect(maintain).toContain('node_modules\\bun\\bin\\bun.exe')
  expect(maintain).toContain('$env:PATH = $originalPath')
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

test("Headroom installer reads commit from component manifest", () => {
  const source = readFileSync(new URL("../scripts/install-headroom-plugin.ps1", import.meta.url), "utf8")
  expect(source).toContain("components.json")
  expect(source).toContain("headroom-source")
  expect(source).not.toContain("versions.env")
})

test("Goal package patch keeps sidebar reactive and visible when empty", () => {
  const patch = readFileSync(new URL("../patches/opencode-goal-plugin-0.1.24.patch", import.meta.url), "utf8")
  const manifest = repositoryManifest.components.find((item: any) => item.id === "goal")
  expect(manifest.patch).toBe("patches/opencode-goal-plugin-0.1.24.patch")
  expect(manifest.tuiCache).toBe(true)
  expect(patch).toContain("+    nowSeconds()")
  expect(patch).toContain("No active goal")
  expect(patch).toContain("const details = createMemo")
  expect(patch).toContain("-                <Show when={value().tokenBudget}")
  expect(patch).toContain("+              <text fg={theme().textMuted}>{details()}</text>")
})

test("Goal TUI verifier covers cached empty and active sidebar states", () => {
  const source = readFileSync(new URL("../scripts/verify-goal-tui.ts", import.meta.url), "utf8")
  expect(source).toContain("No active goal")
  expect(source).toContain("Status: active")
  expect(source).toContain("testRender")
  expect(source).toContain("opencode-goal-plugin@0.1.24")
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
    expect(existsSync(join(configDir, "tui.json"))).toBe(true)
    expect(existsSync(join(configDir, "plugins", "lazy-load.ts"))).toBe(true)
    expect(existsSync(join(configDir, "commands", "goal.md"))).toBe(true)
    const commands = readFileSync(log, "utf8")
    expect(commands).toContain("opencode-ai@1.17.20")
    expect(commands).toContain("@opencode-ai/plugin@1.17.20")
    expect(commands).not.toContain("headroom-ai")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}, 30000)
