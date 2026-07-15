import { expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const launcher = fileURLToPath(new URL("../scripts/start-opencode-headroom.ps1", import.meta.url))

test("Headroom launcher is isolated and provider-neutral", () => {
  expect(existsSync(launcher)).toBe(true)
  const source = readFileSync(launcher, "utf8")

  expect(source).toContain("HEADROOM_PROXY_URL")
  expect(source).toContain("OPENCODE_CONFIG_CONTENT")
  expect(source).toContain("OpenCodeArgsJson")
  expect(source).toContain("ConvertFrom-Json")
  expect(source).toContain("Where-Object { $_ }")
  expect(source).toContain("debug config")
  expect(source).toContain('"x-headroom-base-url"')
  expect(source).toContain('"--log-file"')
  expect(source).not.toContain('"--log-messages"')
  expect(source).not.toContain("9router")
  expect(source).not.toContain("headroom wrap")
  expect(source).not.toContain("tienbac.dpdns.org")
  expect(source).not.toContain('provider.headroom')
  expect(source).not.toContain('mcp.headroom')
  expect(source).not.toContain("Get-NetTCPConnection")
  expect(source).toContain("Test-TcpPort")
  expect(source).toContain('if ($IsWindows) { $start.WindowStyle = "Hidden" }')
  expect(source).toContain("[IO.Path]::GetTempPath()")
  expect(source).toContain("$proxy.WaitForExit(5000) | Out-Null")
})

test("Headroom launcher rejects non-array OpenCode arguments", () => {
  const result = Bun.spawnSync([
    "pwsh", "-NoProfile", "-File", launcher,
    "-OpenCodeArgsJson", '"run"',
  ])

  expect(result.exitCode).not.toBe(0)
  expect(result.stderr.toString() + result.stdout.toString()).toContain(
    "OpenCodeArgsJson must be a JSON array",
  )
})

test("Headroom launcher fails before OpenCode when plugin build is missing", () => {
  const directory = mkdtempSync(join(tmpdir(), "headroom-launcher-"))
  try {
    const result = Bun.spawnSync([
      "pwsh", "-NoProfile", "-File", launcher,
      "-PluginEntry", join(directory, "missing.js"),
    ])

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr.toString() + result.stdout.toString()).toContain(
      "Headroom plugin entry not found",
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
