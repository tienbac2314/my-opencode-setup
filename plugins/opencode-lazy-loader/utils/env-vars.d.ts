import type { McpServerConfig, NormalizedCommand, NormalizedEnv } from '../types.js';
/**
 * Expand environment variables in a string
 * Supports ${VAR} and ${VAR:-default} syntax
 */
export declare function expandEnvVars(value: string): string;
/**
 * Recursively expand environment variables in an object
 */
export declare function expandEnvVarsInObject<T>(obj: T): T;
/**
 * Create a clean environment for MCP processes
 * Merges process.env with custom env vars, expanding variables
 */
export declare function createCleanMcpEnvironment(customEnv?: Record<string, string>): Record<string, string>;
export declare function normalizeCommand(config: McpServerConfig): NormalizedCommand;
export declare function normalizeEnv(config: McpServerConfig): NormalizedEnv;
//# sourceMappingURL=env-vars.d.ts.map