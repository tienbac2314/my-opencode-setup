/**
 * opencode-codegraph-helper
 *
 * Integrates CodeGraph:
 * Auto-updates CodeGraph index after file write/edit in CodeGraph-indexed repos.
 *
 * No hooks returned when .codegraph doesn't exist — completely inert.
 *
 * NOTE: No `tool.execute.before` blocks — that pattern cascades differently in
 * Electron vs Bun (0% tool calls on desktop). Enforcement is advisory-only via
 * the codegraph_explore tool description / AGENTS.md guidance.
 */

import type { Plugin } from "@opencode-ai/plugin";
import * as fs from "fs";
import * as path from "path";

export const CodeGraphHelperPlugin: Plugin = async ({ $, directory }) => {
  if ((globalThis as any).__codegraph_helper_loaded__) return {}
  ;(globalThis as any).__codegraph_helper_loaded__ = true

  const shell = $
  const workspaceRoot = directory || process.cwd();
  const hasCodeGraph = fs.existsSync(path.join(workspaceRoot, ".codegraph"));

  // Completely inert when not in a CodeGraph-indexed repo
  if (!hasCodeGraph) return {}

  return {
    async "tool.execute.after"(input, output) {
      const toolName = input.tool;

      // Auto-update CodeGraph index after successful file writes/edits
      if (["edit", "write", "apply_patch"].includes(toolName)) {
        try {
          if (shell) { shell\`codegraph index\`.catch(() => {}) }
        } catch {
          // Ignore background runner issues
        }
      }
    }
  };
};
};

export default {
  id: "opencode-codegraph-helper",
  server: CodeGraphHelperPlugin,
};
