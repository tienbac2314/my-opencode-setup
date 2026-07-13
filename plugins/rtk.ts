import type { Plugin } from "@opencode-ai/plugin"

export const RtkOpenCodePlugin: Plugin = async (input) => {
  if ((globalThis as any).__rtk_opencode_loaded__) return {}

  const $ = input?.$
  if (typeof $ !== "function") {
    console.warn("[rtk] Bun shell '$' is not available — plugin disabled")
    return {}
  }

  try {
    await $`where rtk`.quiet()
  } catch {
    console.warn("[rtk] rtk binary not found in PATH — plugin disabled")
    return {}
  }

  ;(globalThis as any).__rtk_opencode_loaded__ = true

  return {
    "tool.execute.before": async (input, output) => {
      const tool = String(input?.tool ?? "").toLowerCase()
      if (tool !== "bash" && tool !== "shell") return

      const args = output?.args
      if (!args || typeof args !== "object") return

      const command = (args as Record<string, unknown>).command
      if (typeof command !== "string" || !command) return

      try {
        const result = await $`rtk rewrite ${command}`.quiet().nothrow()
        const rewritten = String(result.stdout).trim()
        if (rewritten && rewritten !== command) {
          ;(args as Record<string, unknown>).command = rewritten
        }
      } catch {
        // Rewrite failure leaves original command unchanged.
      }
    },
  }
}

export default {
  id: "opencode-rtk",
  server: RtkOpenCodePlugin,
}
