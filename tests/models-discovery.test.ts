import { afterEach, describe, expect, test } from "bun:test"
import { ModelDiscovery } from "../plugins/models-discovery.js"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe("9router model discovery fallback", () => {
  test("keeps configured agent models valid when discovery fails", async () => {
    globalThis.fetch = async () => {
      throw new Error("temporary discovery failure")
    }

    const config: any = {
      provider: {
        "9router": {
          options: {
            baseURL: "https://9router.invalid/v1",
            apiKey: "test-key",
            modelsDiscovery: { enabled: true, timeout: 1 },
          },
          models: {},
        },
      },
    }
    const hooks = await ModelDiscovery({
      client: { app: { log: async () => {} } },
    } as any)

    await hooks.config(config)

    expect(config.provider["9router"].models["ag/gemini-3.5-flash-low"]).toBeDefined()
    expect(config.provider["9router"].models["ag/claude-opus-4-6-thinking"]).toBeDefined()
  })
})
