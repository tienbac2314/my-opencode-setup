import type { McpServerConfig } from '../types.js';
import type { SkillMcpManager } from '../skill-mcp-manager.js';
export interface SkillMcpInfo {
    name: string;
    mcpConfig: Record<string, McpServerConfig>;
}
/**
 * Format MCP capabilities for display
 */
export declare function formatMcpCapabilities(skill: SkillMcpInfo, manager: SkillMcpManager, sessionID: string): Promise<string | null>;
//# sourceMappingURL=skill.d.ts.map