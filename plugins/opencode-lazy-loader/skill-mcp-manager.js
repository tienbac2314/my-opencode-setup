import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { expandEnvVarsInObject, createCleanMcpEnvironment, normalizeCommand, normalizeEnv } from './utils/env-vars.js';
import { debugLog } from './utils/debug.js';
/**
 * Create a SkillMcpManager instance
 *
 * Features:
 * - Connection pooling keyed by session/skill/server
 * - Lazy connection creation
 * - Idle cleanup after 5 minutes
 * - Session/process cleanup
 */
export function createSkillMcpManager() {
    const clients = new Map();
    const pendingConnections = new Map();
    let cleanupRegistered = false;
    let cleanupInterval = null;
    const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    const getClientKey = (info) => {
        return `${info.sessionID}:${info.skillName}:${info.serverName}`;
    };
    let shuttingDown = false;
    const cleanup = async () => {
        if (shuttingDown)
            return;
        shuttingDown = true;
        const allClients = Array.from(clients.values());
        clients.clear();
        pendingConnections.clear();
        for (const managed of allClients) {
            try {
                await managed.client.close();
            }
            catch (e) {
                debugLog(`cleanup: client.close() error: ${e}`);
            }
            try {
                await managed.transport.close();
            }
            catch (e) {
                debugLog(`cleanup: transport.close() error: ${e}`);
            }
        }
    };
    const registerProcessCleanup = () => {
        if (cleanupRegistered)
            return;
        cleanupRegistered = true;
        const onSignal = async () => {
            await cleanup();
            process.exit(0);
        };
        process.on('SIGINT', onSignal);
        process.on('SIGTERM', onSignal);
        // SIGBREAK on Windows is equivalent to SIGTERM
        process.on('SIGBREAK', onSignal);
    };
    const createClient = async (info, config) => {
        const key = getClientKey(info);
        if (!config.command) {
            throw new Error(`MCP server "${info.serverName}" is missing required 'command' field.\n\n` +
                `The MCP configuration in skill "${info.skillName}" must specify a command to execute.\n\n` +
                `Supported formats:\n` +
                `  Format A (array):  command: ["npx", "-y", "@some/mcp-server"]\n` +
                `  Format B (string): command: "npx", args: ["-y", "@some/mcp-server"]`);
        }
        const { command, args } = normalizeCommand(config);
        const { env } = normalizeEnv(config);
        const mergedEnv = createCleanMcpEnvironment(env);
        registerProcessCleanup();
        const transport = new StdioClientTransport({
            command,
            args,
            env: mergedEnv,
            stderr: 'ignore'
        });
        const client = new Client({ name: `skill-mcp-${info.skillName}-${info.serverName}`, version: '1.0.0' }, { capabilities: {} });
        try {
            await client.connect(transport);
        }
        catch (error) {
            try {
                await transport.close();
            }
            catch (e) {
                debugLog(`createClient: transport.close() after connect failure: ${e}`);
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to connect to MCP server "${info.serverName}".\n\n` +
                `Command: ${command} ${args.join(' ')}\n` +
                `Reason: ${errorMessage}\n\n` +
                `Hints:\n` +
                `  - Ensure the command is installed and available in PATH\n` +
                `  - Check if the MCP server package exists\n` +
                `  - Verify the args are correct for this server`);
        }
        clients.set(key, {
            client,
            transport,
            skillName: info.skillName,
            lastUsedAt: Date.now()
        });
        startCleanupTimer();
        return client;
    };
    const getOrCreateClient = async (info, config) => {
        const key = getClientKey(info);
        const existing = clients.get(key);
        if (existing) {
            existing.lastUsedAt = Date.now();
            return existing.client;
        }
        const pending = pendingConnections.get(key);
        if (pending) {
            return pending;
        }
        const expandedConfig = expandEnvVarsInObject(config);
        const connectionPromise = createClient(info, expandedConfig);
        pendingConnections.set(key, connectionPromise);
        try {
            const client = await connectionPromise;
            return client;
        }
        finally {
            pendingConnections.delete(key);
        }
    };
    const disconnectSession = async (sessionID) => {
        const toClose = [];
        for (const [key, managed] of clients.entries()) {
            if (key.startsWith(`${sessionID}:`)) {
                toClose.push([key, managed]);
            }
        }
        for (const [key, managed] of toClose) {
            clients.delete(key);
            try {
                await managed.client.close();
            }
            catch (e) {
                debugLog(`disconnectSession: client.close() error: ${e}`);
            }
            try {
                await managed.transport.close();
            }
            catch (e) {
                debugLog(`disconnectSession: transport.close() error: ${e}`);
            }
        }
    };
    const disconnectAll = async () => {
        stopCleanupTimer();
        const allClients = Array.from(clients.values());
        clients.clear();
        for (const managed of allClients) {
            try {
                await managed.client.close();
            }
            catch (e) {
                debugLog(`disconnectAll: client.close() error: ${e}`);
            }
            try {
                await managed.transport.close();
            }
            catch (e) {
                debugLog(`disconnectAll: transport.close() error: ${e}`);
            }
        }
    };
    const startCleanupTimer = () => {
        if (cleanupInterval) {
            return;
        }
        cleanupInterval = setInterval(() => {
            cleanupIdleClients().catch((e) => debugLog(`cleanupIdleClients: ${e}`));
        }, 60000);
        cleanupInterval.unref();
    };
    const stopCleanupTimer = () => {
        if (cleanupInterval) {
            clearInterval(cleanupInterval);
            cleanupInterval = null;
        }
    };
    const cleanupIdleClients = async () => {
        const now = Date.now();
        for (const [key, managed] of clients) {
            if (now - managed.lastUsedAt > IDLE_TIMEOUT) {
                clients.delete(key);
                try {
                    await managed.client.close();
                }
                catch (e) {
                    debugLog(`cleanupIdleClients: client.close() error: ${e}`);
                }
                try {
                    await managed.transport.close();
                }
                catch (e) {
                    debugLog(`cleanupIdleClients: transport.close() error: ${e}`);
                }
            }
        }
    };
    const getOrCreateClientWithRetry = async (info, config) => {
        try {
            return await getOrCreateClient(info, config);
        }
        catch (error) {
            const key = getClientKey(info);
            const existing = clients.get(key);
            if (existing) {
                clients.delete(key);
                try {
                    await existing.client.close();
                }
                catch (e) {
                    debugLog(`getOrCreateClientWithRetry: client.close() error: ${e}`);
                }
                try {
                    await existing.transport.close();
                }
                catch (e) {
                    debugLog(`getOrCreateClientWithRetry: transport.close() error: ${e}`);
                }
                return await getOrCreateClient(info, config);
            }
            throw error;
        }
    };
    const listTools = async (info, context) => {
        const client = await getOrCreateClientWithRetry(info, context.config);
        const result = await client.listTools();
        return result.tools;
    };
    const listResources = async (info, context) => {
        const client = await getOrCreateClientWithRetry(info, context.config);
        const result = await client.listResources();
        return result.resources;
    };
    const listPrompts = async (info, context) => {
        const client = await getOrCreateClientWithRetry(info, context.config);
        const result = await client.listPrompts();
        return result.prompts;
    };
    const callTool = async (info, context, name, args) => {
        const client = await getOrCreateClientWithRetry(info, context.config);
        const result = await client.callTool({ name, arguments: args });
        return result.content;
    };
    const readResource = async (info, context, uri) => {
        const client = await getOrCreateClientWithRetry(info, context.config);
        const result = await client.readResource({ uri });
        return result.contents;
    };
    const getPrompt = async (info, context, name, args) => {
        const client = await getOrCreateClientWithRetry(info, context.config);
        const result = await client.getPrompt({ name, arguments: args });
        return result.messages;
    };
    const getConnectedServers = () => {
        return Array.from(clients.keys());
    };
    const isConnected = (info) => {
        return clients.has(getClientKey(info));
    };
    return {
        getOrCreateClient,
        disconnectSession,
        disconnectAll,
        listTools,
        listResources,
        listPrompts,
        callTool,
        readResource,
        getPrompt,
        getConnectedServers,
        isConnected
    };
}
//# sourceMappingURL=skill-mcp-manager.js.map