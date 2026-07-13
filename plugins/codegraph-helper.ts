import type { Plugin } from "@opencode-ai/plugin";
import * as fs from "fs";
import * as path from "path";

export const CodeGraphHelperPlugin: Plugin = async ({ $, directory }) => {
  if ((globalThis as any).__codegraph_helper_loaded__) return {}
  ;(globalThis as any).__codegraph_helper_loaded__ = true

  const workspaceRoot = directory || process.cwd();
  const hasCodeGraph = fs.existsSync(path.join(workspaceRoot, ".codegraph"));

  // Completely inert when not in a CodeGraph-indexed repo
  if (!hasCodeGraph) return {}

  return {
    async "tool.execute.after"(input, output) {
      const toolName = input.tool;

      // Auto-update CodeGraph index after successful file writes/edits
      // Handle the tool names of OpenCode v1.17.18 (replace_file_content, write_to_file, multi_replace_file_content, edit, write, apply_patch)
      const isWrite = ["replace_file_content", "write_to_file", "multi_replace_file_content", "edit", "write", "apply_patch"].includes(toolName);
      if (isWrite) {
        try {
          $`codegraph index`.catch(() => {});
        } catch {
          // Ignore background runner issues
        }
      }
    }
  };
};

export default {
  id: "opencode-codegraph-helper",
  server: CodeGraphHelperPlugin,
};
