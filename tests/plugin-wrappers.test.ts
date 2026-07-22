import { expect, test } from "bun:test"
const { TokensSourcePlugin } = await import("../plugins/0-tokens-source")

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

