/**
 * opencode-codegraph-helper
 *
 * Integrates CodeGraph dynamically:
 * 1. Enforces CodeGraph search: If a repository is indexed by CodeGraph (.codegraph directory exists),
 *    blocks standard grep_search / glob_search tools and instructs the LLM to use codegraph_explore instead.
 * 2. Auto-updates CodeGraph: Automatically updates the CodeGraph index after any file write/edit tool finishes.
 */

import type { Plugin } from "@opencode-ai/plugin";
import * as fs from "fs";
import * as path from "path";

export const CodeGraphHelperPlugin: Plugin = async ({ client, $, directory }) => {
  if ((globalThis as any).__codegraph_helper_loaded__) return {}
  ;(globalThis as any).__codegraph_helper_loaded__ = true

  const shell = $
  return {
    async "tool.execute.before"(input, output) {
      const toolName = input.tool;
      const workspaceRoot = directory || process.cwd();
      const hasCodeGraph = fs.existsSync(path.join(workspaceRoot, ".codegraph"));

      // Intercept and redirect exploration tools in indexed repositories
      if (hasCodeGraph && ["grep_search", "glob_search"].includes(toolName)) {
        throw new Error(
          `This repository is indexed by CodeGraph. Standard '${toolName}' is blocked. ` +
          `You MUST use the 'codegraph_explore' tool or run 'codegraph explore' command instead.`
        );
      }
    },

    async "tool.execute.after"(input, output) {
      const toolName = input.tool;
      const workspaceRoot = directory || process.cwd();
      const hasCodeGraph = fs.existsSync(path.join(workspaceRoot, ".codegraph"));

      // Auto-update CodeGraph index after successful file writes/edits
      if (hasCodeGraph && ["replace_file_content", "write_to_file", "multi_replace_file_content"].includes(toolName)) {
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
