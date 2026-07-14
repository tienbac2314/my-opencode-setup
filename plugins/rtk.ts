import type { Plugin } from "@opencode-ai/plugin"
import { execFile } from "node:child_process"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

// RTK OpenCode plugin — rewrites commands to use rtk for token savings.
// Requires: rtk >= 0.23.0 in PATH.
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

function rtkCommand(): string {
  const userBinary = join(homedir(), ".local", "bin", process.platform === "win32" ? "rtk.exe" : "rtk")
  return existsSync(userBinary) ? userBinary : "rtk"
}

export const RtkOpenCodePlugin: Plugin = async (input) => {
  const $ = input?.$

  if (typeof $ === "function") {
    try {
      await $`where rtk`.quiet()
    } catch {
      console.warn("[rtk] rtk binary not found in PATH — plugin disabled")
      return {}
    }
  } else {
    try {
      await runFile(rtkCommand(), ["--version"])
    } catch {
      console.warn("[rtk] rtk binary not found in PATH — plugin disabled")
      return {}
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
          const result = await $`rtk rewrite ${command}`.quiet().nothrow()
          rewritten = String(result.stdout).trim()
        } else {
          rewritten = (await runFile(rtkCommand(), ["rewrite", command])).trim()
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
