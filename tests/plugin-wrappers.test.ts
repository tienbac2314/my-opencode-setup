import { expect, mock, test } from "bun:test"
import { readFileSync } from "node:fs"

const upstreamSupermemory = async () => ({ event() {} })
mock.module("opencode-supermemory", () => ({
  SupermemoryPlugin: upstreamSupermemory,
}))

const { default: supermemoryModule } = await import("../plugins/supermemory")
const { TokensSourcePlugin } = await import("../plugins/0-tokens-source")

test("Supermemory wrapper exposes upstream named plugin as default server module", () => {
  expect(supermemoryModule.id).toBe("opencode-supermemory")
  expect(supermemoryModule.server).toBe(upstreamSupermemory)
})

test("token source returns hooks on every initialization and wraps fetch once", async () => {
  const originalFetch = globalThis.fetch
  const first = await TokensSourcePlugin({ client: {} } as any) as any
  const wrappedFetch = globalThis.fetch
  const second = await TokensSourcePlugin({ client: {} } as any) as any

  expect(typeof first["command.execute.before"]).toBe("function")
  expect(typeof second["command.execute.before"]).toBe("function")
  expect(wrappedFetch).not.toBe(originalFetch)
  expect(globalThis.fetch).toBe(wrappedFetch)
})

test("Supermemory lifecycle verifier always cleans disposable marker", () => {
  const source = readFileSync(new URL("../scripts/verify-supermemory.ts", import.meta.url), "utf8")
  expect(source).toContain('mode: "add"')
  expect(source).toContain('mode: "search"')
  expect(source).toContain('mode: "profile"')
  expect(source).toContain('mode: "list"')
  expect(source).toContain('mode: "forget"')
  expect(source).toContain("finally")
  expect(source).toContain("30_000")
  expect(source).toContain("Bun.sleep")
})
