import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import lazyLoadPlugin, { createSSETransform } from "../plugins/lazy-load.ts"

const encoder = new TextEncoder()
let originalFetch: typeof globalThis.fetch
let upstreamSSE = "data: [DONE]\n\n"
let capturedRequestBody: any

function sse(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`
}

function toolCall(name: string, args: string, id = "call_1", index = 0): string {
  return sse({
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index,
          id,
          type: "function",
          function: { name, arguments: args },
        }],
      },
      finish_reason: null,
    }],
  })
}

function finish(reason = "stop"): string {
  return sse({
    choices: [{ index: 0, delta: {}, finish_reason: reason }],
  })
}

function content(text: string, field: "content" | "reasoning_content" = "content"): string {
  return sse({
    choices: [{ index: 0, delta: { [field]: text }, finish_reason: null }],
  })
}

async function transform(sessionID: string, chunks: string[]): Promise<string> {
  const input = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })

  return new Response(input.pipeThrough(createSSETransform(sessionID))).text()
}

function jsonEvents(output: string): any[] {
  return output
    .split(/\r?\n\r?\n/)
    .filter((event) => event.startsWith("data: ") && event !== "data: [DONE]")
    .map((event) => JSON.parse(event.slice(6)))
}

function emittedToolNames(output: string): string[] {
  return jsonEvents(output).flatMap((event) =>
    event?.choices?.[0]?.delta?.tool_calls?.map((call: any) => call.function.name) ?? [],
  )
}

beforeAll(async () => {
  originalFetch = globalThis.fetch
  globalThis.fetch = async (_input, init) => {
    capturedRequestBody = JSON.parse(String(init?.body ?? "{}"))
    return new Response(upstreamSSE, {
      headers: { "content-type": "text/event-stream" },
    })
  }
  delete (globalThis as any).__lazy_load_loaded__

  const hooks = await (lazyLoadPlugin.server as any)({}, {})
  await hooks["tool.definition"](
    { toolID: "bash" },
    {
      description: "Run a PowerShell command.",
      jsonSchema: {
        type: "object",
        properties: { command: { type: "string" } },
        required: ["command"],
      },
    },
  )
})

afterAll(() => {
  globalThis.fetch = originalFetch
  delete (globalThis as any).__lazy_load_loaded__
})

describe("lazy-load SSE transform", () => {
  test("re-registers load_tool when OpenCode initializes the plugin again", async () => {
    const hooks = await (lazyLoadPlugin.server as any)({}, {})

    expect(hooks.tool?.load_tool).toBeDefined()
    expect(hooks["tool.definition"]).toBeFunction()
  })

  test("preserves a standard load_tool call split across argument chunks", async () => {
    const output = await transform("standard-load", [
      toolCall("load_tool", '{"na'),
      toolCall("", 'me":"bash"}', "call_1"),
      "data: [DONE]\n\n",
    ])

    expect(emittedToolNames(output)).toEqual(["load_tool"])
    const call = jsonEvents(output)[0].choices[0].delta.tool_calls[0]
    expect(JSON.parse(call.function.arguments)).toEqual({ name: "bash" })
    expect(output).toEndWith("data: [DONE]\n\n")
  })

  test("preserves OpenCode-namespaced load_tool names", async () => {
    const namespaced = "opencode-lazy-load_load_tool"
    upstreamSSE = toolCall(namespaced, '{"name":"bash"}') + "data: [DONE]\n\n"

    const response = await globalThis.fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "x-opencode-session": "namespaced" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "load bash" }],
        tools: [
          { type: "function", function: { name: namespaced, description: "Load one tool", parameters: {} } },
          { type: "function", function: { name: "bash", description: "Run command", parameters: {} } },
        ],
      }),
    })
    const output = await response.text()

    expect(capturedRequestBody.tools.map((entry: any) => entry.function.name)).toEqual([namespaced])
    expect(emittedToolNames(output)).toEqual([namespaced])
  })

  test("rewrites unloaded built-in tools and permits same-turn execution", async () => {
    const first = await transform("turn-state", [toolCall("bash", '{"command":"echo one"}')])
    const second = await transform("turn-state", [toolCall("bash", '{"command":"echo two"}')])

    expect(emittedToolNames(first)).toHaveLength(1)
    expect(emittedToolNames(first)[0]).toContain("load_tool")
    expect(emittedToolNames(second)).toEqual(["bash"])
  })

  test("preserves stop finish event and clears loaded tools for next turn", async () => {
    const stopped = await transform("turn-reset", [
      toolCall("bash", '{"command":"echo one"}'),
      toolCall("bash", '{"command":"echo two"}'),
      finish(),
    ])
    const nextTurn = await transform("turn-reset", [toolCall("bash", '{"command":"echo three"}')])

    expect(jsonEvents(stopped).at(-1)?.choices?.[0]?.finish_reason).toBe("stop")
    expect(emittedToolNames(stopped)).toHaveLength(2)
    expect(emittedToolNames(stopped)[0]).toContain("load_tool")
    expect(emittedToolNames(stopped)[1]).toBe("bash")
    expect(emittedToolNames(nextTurn)).toHaveLength(1)
    expect(emittedToolNames(nextTurn)[0]).toContain("load_tool")
  })

  test("passes MCP tools through unchanged", async () => {
    const output = await transform("mcp", [toolCall("codegraph_explore", '{"query":"LazyLoadPlugin"}')])
    expect(emittedToolNames(output)).toEqual(["codegraph_explore"])
  })

  test("does not mistake tools containing load_tool text for the gateway", async () => {
    const output = await transform("similar-name", [toolCall("preload_toolkit", '{"query":"x"}')])
    expect(emittedToolNames(output)).toEqual(["preload_toolkit"])
  })

  test("preserves ordinary content and reasoning deltas", async () => {
    const output = await transform("text", [
      content("visible "),
      content("thought", "reasoning_content"),
      content("answer"),
      finish(),
    ])
    const events = jsonEvents(output)

    expect(events[0].choices[0].delta.content).toBe("visible ")
    expect(events[1].choices[0].delta.reasoning_content).toBe("thought")
    expect(events[2].choices[0].delta.content).toBe("answer")
    expect(events[3].choices[0].finish_reason).toBe("stop")
  })

  test("converts DSML split across stream events without losing surrounding text", async () => {
    const dsml = [
      "<｜｜DSML｜｜tool_calls>",
      '<｜｜DSML｜｜invoke name="load_tool">',
      '<｜｜DSML｜｜parameter name="name" string="true">bash</｜｜DSML｜｜parameter>',
      "</｜｜DSML｜｜invoke>",
      "</｜｜DSML｜｜tool_calls>",
    ].join("")

    const output = await transform("dsml", [
      content("before <｜｜DS"),
      content(`ML｜｜tool_calls>${dsml.slice("<｜｜DSML｜｜tool_calls>".length, -12)}`),
      content(dsml.slice(-12) + " after"),
      finish(),
    ])
    const events = jsonEvents(output)

    expect(events.some((event) => event?.choices?.[0]?.delta?.content === "before ")).toBe(true)
    expect(emittedToolNames(output)).toHaveLength(1)
    expect(emittedToolNames(output)[0]).toContain("load_tool")
    expect(events.some((event) => event?.choices?.[0]?.delta?.content === " after")).toBe(true)
    expect(events.at(-1)?.choices?.[0]?.finish_reason).toBe("stop")
  })
})
