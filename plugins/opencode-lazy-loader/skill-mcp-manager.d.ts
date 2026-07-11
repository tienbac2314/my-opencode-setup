import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { McpClientInfo, McpContext, McpServerConfig } from './types.js';
export interface SkillMcpManager {
    getOrCreateClient(info: McpClientInfo, config: McpServerConfig): Promise<Client>;
    disconnectSession(sessionID: string): Promise<void>;
    disconnectAll(): Promise<void>;
    listTools(info: McpClientInfo, context: McpContext): Promise<unknown[]>;
    listResources(info: McpClientInfo, context: McpContext): Promise<unknown[]>;
    listPrompts(info: McpClientInfo, context: McpContext): Promise<unknown[]>;
    callTool(info: McpClientInfo, context: McpContext, name: string, args: Record<string, unknown>): Promise<unknown>;
    readResource(info: McpClientInfo, context: McpContext, uri: string): Promise<unknown>;
    getPrompt(info: McpClientInfo, context: McpContext, name: string, args: Record<string, string>): Promise<unknown>;
    getConnectedServers(): string[];
    isConnected(info: McpClientInfo): boolean;
}
/**
 * Create a SkillMcpManager instance
 *
 * Features:
 * - Connection pooling keyed by session/skill/server
 * - Lazy connection creation
 * - Idle cleanup after 5 minutes
 * - Session/process cleanup
 */
export declare function createSkillMcpManager(): SkillMcpManager;
//# sourceMappingURL=skill-mcp-manager.d.ts.map