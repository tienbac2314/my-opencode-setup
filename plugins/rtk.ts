import type { Plugin } from "@opencode-ai/plugin"
import { execFile } from "node:child_process"

// RTK OpenCode plugin — rewrites commands to use rtk for token savings.
// Requires: rtk >= 0.23.0 in PATH or the Windows system directory.
//
// This is a thin delegating plugin: all rewrite logic lives in `rtk rewrite`,
// which is the single source of truth (src/discover/registry.rs).
// To add or change rewrite rules, edit the Rust registry — not this file.

function runFile(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true }, (error, stdout) => {
      if (error && !stdout) reject(error)
      else resolve(String(stdout))
    })
  })
}

export const RtkOpenCodePlugin: Plugin = async (input) => {
  const $ = input?.$
  let rtkCommand = "rtk"
  const fallback = `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\rtk.exe`

  if (typeof $ === "function") {
    try {
      await $`where rtk`.quiet()
    } catch {
      try {
        await $`${fallback} --version`.quiet()
        rtkCommand = fallback
      } catch {
        console.warn("[rtk] rtk binary not found in PATH or Windows system directory — plugin disabled")
        return {}
      }
    }
  } else {
    try {
      await runFile(rtkCommand, ["--version"])
    } catch {
      try {
        await runFile(fallback, ["--version"])
        rtkCommand = fallback
      } catch {
        console.warn("[rtk] rtk binary not found in PATH or Windows system directory — plugin disabled")
        return {}
      }
    }
  }

  return {
    "tool.execute.before": async (input, output) => {
      const tool = String(input?.tool ?? "").toLowerCase()
      if (tool !== "bash" && tool !== "shell") return

      const args = output?.args
      if (!args || typeof args !== "object") return

      const command = (args as Record<string, unknown>).command
      if (typeof command !== "string" || !command) return

      try {
        let rewritten = ""
        if (typeof $ === "function") {
          const result = await $`${rtkCommand} rewrite ${command}`.quiet().nothrow()
          rewritten = String(result.stdout).trim()
        } else {
          rewritten = (await runFile(rtkCommand, ["rewrite", command])).trim()
        }
        if (rewritten && rewritten !== command) {
          ;(args as Record<string, unknown>).command = rewritten
        }
      } catch {
        // rtk rewrite failed — pass through unchanged
      }
    },
  }
}

export default {
  id: "opencode-rtk",
  server: RtkOpenCodePlugin,
}
