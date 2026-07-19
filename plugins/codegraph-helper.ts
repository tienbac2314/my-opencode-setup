/**
 * opencode-codegraph-helper
 *
 * Integrates CodeGraph dynamically:
 * 1. Requires one CodeGraph attempt before broad grep/glob search in indexed repositories.
 */

import type { Plugin } from "@opencode-ai/plugin";
import * as fs from "fs";
import * as path from "path";

const BROAD_SEARCH_TOOLS = new Set(["grep", "glob", "grep_search", "glob_search"]);

function isCodeGraphExplore(toolName: string): boolean {
  return toolName === "codegraph_explore" || toolName.endsWith("_codegraph_explore");
}

export const CodeGraphHelperPlugin: Plugin = async ({ directory }) => {
  const workspaceRoot = path.resolve(directory || process.cwd());
  const codeGraphAttempts = new Set<string>();

  const hasCodeGraph = () => fs.existsSync(path.join(workspaceRoot, ".codegraph", "codegraph.db"));
  const sessionKey = (input: any) => `${workspaceRoot}\0${input?.sessionID ?? "__global__"}`;

  return {
    async config(config: any) {
      const codeGraph = config?.mcp?.codegraph;
      if (codeGraph) codeGraph.enabled = hasCodeGraph();
    },

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
    }
  };
};

export default {
  id: "opencode-codegraph-helper",
  server: CodeGraphHelperPlugin,
};
