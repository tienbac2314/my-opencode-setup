/**
 * opencode-codegraph-helper
 *
 * Integrates CodeGraph dynamically:
 * 1. Prefers CodeGraph search: Injects a system hint encouraging use of codegraph_explore
 *    over grep/glob when .codegraph exists (injected via experimental.chat.system.transform).
 * 2. Auto-updates CodeGraph: Automatically updates the CodeGraph index after any file write/edit tool finishes.
 *
 * NOTE: `tool.execute.before` no longer throws to block grep/glob — that pattern cascades
 * differently in the desktop app (Electron) vs TUI (Bun), causing 0% tool calls on Electron.
 * Enforcement is advisory via system prompt instead.
 */

import type { Plugin } from "@opencode-ai/plugin";
import * as fs from "fs";
import * as path from "path";

export const CodeGraphHelperPlugin: Plugin = async ({ client, $, directory }) => {
  if ((globalThis as any).__codegraph_helper_loaded__) return {}
  ;(globalThis as any).__codegraph_helper_loaded__ = true

  const shell = $
  const workspaceRoot = directory || process.cwd();
  const hasCodeGraph = fs.existsSync(path.join(workspaceRoot, ".codegraph"));

  return {
    async "experimental.chat.system.transform"(system) {
      if (!hasCodeGraph) return system
      return system + (
        `\n\n[CodeGraph] This repository is indexed by CodeGraph. ` +
        `Prefer the 'codegraph_explore' tool over 'grep'/'glob' for code search — ` +
        `it returns verbatim source with call paths in one call.`
      );
    },

    async "tool.execute.after"(input, output) {
      const toolName = input.tool;
      const workspaceRoot = directory || process.cwd();
      const hasCodeGraph = fs.existsSync(path.join(workspaceRoot, ".codegraph"));

      // Auto-update CodeGraph index after successful file writes/edits
      if (hasCodeGraph && ["edit", "write", "apply_patch"].includes(toolName)) {
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
