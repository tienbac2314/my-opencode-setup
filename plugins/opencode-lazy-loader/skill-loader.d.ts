import type { McpServerConfig } from './types.js';
/**
 * Load MCP config from a skill directory.
 * Checks mcp.json first, then falls back to SKILL.md frontmatter.
 */
export declare function loadMcpConfigFromSkillDir(skillDir: string): Promise<Record<string, McpServerConfig> | undefined>;
//# sourceMappingURL=skill-loader.d.ts.map