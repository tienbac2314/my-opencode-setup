/**
 * opencode-codegraph-helper
 *
 * Integrates CodeGraph dynamically:
 * 1. Requires one CodeGraph attempt before broad grep/glob search in indexed repositories.
 * 2. Debounces CodeGraph index updates after file writes/edits.
 */

import type { Plugin } from "@opencode-ai/plugin";
import * as fs from "fs";
import * as path from "path";

const BROAD_SEARCH_TOOLS = new Set(["grep_search", "glob_search"]);
const EDIT_TOOLS = new Set([
  "apply_patch",
  "edit",
  "multi_replace_file_content",
  "patch",
  "replace_file_content",
  "write",
  "write_to_file",
]);

function isCodeGraphExplore(toolName: string): boolean {
  return toolName === "codegraph_explore" || toolName.endsWith("_codegraph_explore");
}

export const CodeGraphHelperPlugin: Plugin = async ({ $, directory }) => {
  const workspaceRoot = path.resolve(directory || process.cwd());
  const codeGraphAttempts = new Set<string>();
  let indexTimer: ReturnType<typeof setTimeout> | undefined;

  const hasCodeGraph = () => fs.existsSync(path.join(workspaceRoot, ".codegraph"));
  const sessionKey = (input: any) => `${workspaceRoot}\0${input?.sessionID ?? "__global__"}`;

  return {
    async "tool.execute.before"(input, output) {
      if (!hasCodeGraph()) return;

      const toolName = String(input.tool ?? "");
      const key = sessionKey(input);
      const command = (output?.args as Record<string, unknown> | undefined)?.command;

      if (isCodeGraphExplore(toolName) || (
        ["bash", "shell"].includes(toolName) &&
        typeof command === "string" &&
        /\bcodegraph\s+explore\b/i.test(command)
      )) {
        codeGraphAttempts.add(key);
        return;
      }

      if (BROAD_SEARCH_TOOLS.has(toolName) && !codeGraphAttempts.has(key)) {
        throw new Error(
          `This repository is indexed by CodeGraph. Try CodeGraph first, then retry '${toolName}' ` +
          "for exact search or fallback."
        );
      }
    },

    async "tool.execute.after"(input) {
      if (!hasCodeGraph() || !EDIT_TOOLS.has(String(input.tool ?? ""))) return;

      if (indexTimer) clearTimeout(indexTimer);
      indexTimer = setTimeout(() => {
        indexTimer = undefined;

        try {
          $`codegraph sync`.catch(() => {});
        } catch {
          // Keep successful edits successful when background indexing fails.
        }
      }, 250);

      (indexTimer as any).unref?.();
    }
  };
};

export default {
  id: "opencode-codegraph-helper",
  server: CodeGraphHelperPlugin,
};
