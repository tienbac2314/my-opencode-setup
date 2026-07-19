import { afterEach, describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { ModelDiscovery } from "../plugins/models-discovery.js"

const originalFetch = globalThis.fetch
const transportState = Symbol.for("headroom.opencode.transport")
const originalTransportState = (globalThis as any)[transportState]

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalTransportState === undefined) delete (globalThis as any)[transportState]
  else (globalThis as any)[transportState] = originalTransportState
})

describe("9router model discovery fallback", () => {
  test("preserves image attachments for native vision models", () => {
    const config = JSON.parse(
      readFileSync(join(import.meta.dir, "..", "config", "oh-my-opencode-slim.json"), "utf8"),
    )

    expect(config.image_routing).toBe("direct")
  })

  test("uses native OpenCode model for OMO runtime roles", () => {
    const preset = JSON.parse(
      readFileSync(join(import.meta.dir, "..", "config", "oh-my-opencode-slim.json"), "utf8"),
    ).presets["9router"]

    for (const role of Object.values(preset) as any[]) {
      expect(role.model).toBe("opencode/deepseek-v4-flash-free")
    }
  })

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

    expect(config.provider["9router"].models["ag/gemini-3.5-flash-low"]).toBeUndefined()
    expect(config.provider["9router"].models["ag/claude-opus-4-6-thinking"]).toBeDefined()
  })

  test("bypasses Headroom transport for model inventory", async () => {
    globalThis.fetch = async () => {
      throw new Error("transport should not receive model discovery")
    }
    ;(globalThis as any)[transportState] = {
      originalFetch: async () => Response.json({
        data: [{ id: "ag/live-model", capabilities: { vision: false } }],
      }),
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

    expect(config.provider["9router"].models["ag/live-model"]).toBeDefined()
  })
})
