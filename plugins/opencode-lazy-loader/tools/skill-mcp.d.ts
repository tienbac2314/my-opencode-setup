import { type ToolDefinition } from '@opencode-ai/plugin/tool';
import type { McpServerConfig } from '../types.js';
import type { SkillMcpManager } from '../skill-mcp-manager.js';
type ServerEntry = {
    config: McpServerConfig;
    skillName: string;
};
export interface CreateSkillMcpToolOptions {
    manager: SkillMcpManager;
    getServerMap: () => Map<string, ServerEntry>;
    getSessionID: () => string;
}
/**
 * Create the skill_mcp tool
 */
export declare function createSkillMcpTool(options: CreateSkillMcpToolOptions): ToolDefinition;
export {};
//# sourceMappingURL=skill-mcp.d.ts.map