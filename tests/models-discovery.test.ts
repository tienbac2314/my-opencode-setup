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
  async function discover(
    body: unknown,
    existingModels: Record<string, unknown> = {},
    logs: any[] = [],
    providerId = "9router",
  ) {
    globalThis.fetch = async () => Response.json(body)
    const config: any = {
      provider: {
        [providerId]: {
          options: {
            baseURL: "https://9router.invalid/v1",
            apiKey: "test-key",
            modelsDiscovery: { enabled: true, timeout: 1 },
          },
          models: existingModels,
        },
      },
    }
    const hooks = await ModelDiscovery({
      client: { app: { log: async (entry: any) => logs.push(entry.body) } },
    } as any)
    await hooks.config(config)
    return config.provider[providerId].models
  }

  test("preserves image attachments for native vision models", () => {
    const config = JSON.parse(
      readFileSync(join(import.meta.dir, "..", "config", "oh-my-opencode-slim.json"), "utf8"),
    )

    expect(config.image_routing).toBe("direct")
    expect(config.disabled_tools).toEqual([])
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

  test("maps every OpenCode-supported capability from a full 9router model", async () => {
    const models = await discover({
      object: "list",
      data: [{
        id: "gemini/gemini-3.1-flash-lite-preview",
        object: "model",
        owned_by: "gemini",
        capabilities: {
          vision: true,
          pdf: true,
          audioInput: true,
          videoInput: true,
          imageOutput: true,
          audioOutput: true,
          search: true,
          tools: true,
          reasoning: true,
          thinkingFormat: "gemini-level",
          thinkingCanDisable: false,
          thinkingRange: null,
          contextWindow: 1048576,
          maxOutput: 65536,
        },
      }],
    })

    expect(models["gemini/gemini-3.1-flash-lite-preview"]).toEqual({
      name: "gemini/gemini-3.1-flash-lite-preview",
      attachment: true,
      reasoning: true,
      tool_call: true,
      modalities: {
        input: ["text", "audio", "image", "video", "pdf"],
        output: ["text", "audio", "image"],
      },
      limit: { context: 1048576, output: 65536 },
    })
  })

  test("accepts raw arrays and standalone model responses", async () => {
    const rawArray = await discover([{
      id: "array/model",
      capabilities: { vision: false, reasoning: true, contextWindow: 32000, maxOutput: 4096 },
    }])
    expect(rawArray["array/model"].reasoning).toBe(true)
    expect(rawArray["array/model"].modalities.input).toEqual(["text"])

    const standalone = await discover({
      id: "kimchi/kimi-k2.7",
      capabilities: {
        vision: true,
        reasoning: true,
        contextWindow: 262144,
        maxOutput: 262144,
        upstreamProvider: "ai-enabler",
      },
    })
    expect(standalone["kimchi/kimi-k2.7"]).toEqual({
      name: "kimchi/kimi-k2.7",
      attachment: true,
      reasoning: true,
      modalities: { input: ["text", "image"], output: ["text"] },
      limit: { context: 262144, output: 262144 },
    })
  })

  test("keeps manual model fields authoritative while filling missing discovery metadata", async () => {
    const models = await discover({ data: [{
      id: "custom/model",
      capabilities: { vision: true, tools: true, reasoning: true, contextWindow: 200000, maxOutput: 32000 },
    }] }, {
      "custom/model": {
        name: "My model name",
        limit: { context: 100000, output: 16000 },
      },
    })

    expect(models["custom/model"]).toEqual({
      name: "My model name",
      attachment: true,
      reasoning: true,
      tool_call: true,
      modalities: { input: ["text", "image"], output: ["text"] },
      limit: { context: 100000, output: 16000 },
    })
  })

  test("completes partial discovered limits with safe defaults", async () => {
    const models = await discover({ data: [
      { id: "partial/context", capabilities: { contextWindow: 200000 } },
      { id: "partial/output", capabilities: { maxOutput: 4096 } },
    ] })

    expect(models["partial/context"].limit).toEqual({ context: 200000, output: 65536 })
    expect(models["partial/output"].limit).toEqual({ context: 1000000, output: 4096 })
  })

  test("deep-merges partial manual limits and modalities over discovery", async () => {
    const models = await discover({ data: [{
      id: "custom/partial",
      capabilities: {
        vision: true,
        audioOutput: true,
        contextWindow: 200000,
        maxOutput: 32000,
      },
    }] }, {
      "custom/partial": {
        modalities: { input: ["text"] },
        limit: { output: 8000 },
      },
    })

    expect(models["custom/partial"].modalities).toEqual({
      input: ["text"],
      output: ["text", "audio"],
    })
    expect(models["custom/partial"].limit).toEqual({ context: 200000, output: 8000 })
  })

  test("logs unsupported metadata when every discovered model is manually configured", async () => {
    const logs: any[] = []
    await discover({ data: [{
      id: "manual/model",
      owned_by: "manual-owner",
      capabilities: { upstreamProvider: "manual-upstream" },
    }] }, {
      "manual/model": { name: "Manual model" },
    }, logs, "custom-provider")

    expect(logs.find((item) => item.level === "info")?.extra).toEqual({
      added: [],
      metadata: {
        "manual/model": {
          owned_by: "manual-owner",
          upstreamProvider: "manual-upstream",
        },
      },
    })
  })

  test("supports legacy thinking without leaking unsupported metadata into model options", async () => {
    const logs: any[] = []
    const models = await discover({ data: [{
      id: "legacy/model",
      owned_by: "legacy-owner",
      capabilities: {
        vision: false,
        thinking: true,
        search: true,
        thinkingFormat: "legacy-format",
        thinkingCanDisable: true,
        thinkingRange: [0, 100],
        upstreamProvider: "legacy-upstream",
      },
    }] }, {}, logs)

    expect(models["legacy/model"].reasoning).toBe(true)
    expect(models["legacy/model"].options).toBeUndefined()
    expect(models["legacy/model"].owned_by).toBeUndefined()
    expect(models["legacy/model"].search).toBeUndefined()
    expect(logs.find((item) => item.level === "info")?.extra?.metadata?.["legacy/model"]).toEqual({
      owned_by: "legacy-owner",
      search: true,
      thinkingFormat: "legacy-format",
      thinkingCanDisable: true,
      thinkingRange: [0, 100],
      upstreamProvider: "legacy-upstream",
    })
  })
})
