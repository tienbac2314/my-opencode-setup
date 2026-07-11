/**
 * Expand environment variables in a string
 * Supports ${VAR} and ${VAR:-default} syntax
 */
export function expandEnvVars(value) {
    return value.replace(/\$\{([^}:]+)(?::-([^}]*))?\}/g, (_, varName, defaultValue) => {
        return process.env[varName] ?? defaultValue ?? '';
    });
}
/**
 * Recursively expand environment variables in an object
 */
export function expandEnvVarsInObject(obj) {
    if (typeof obj === 'string') {
        return expandEnvVars(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(expandEnvVarsInObject);
    }
    if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = expandEnvVarsInObject(value);
        }
        return result;
    }
    return obj;
}
/**
 * Create a clean environment for MCP processes
 * Merges process.env with custom env vars, expanding variables
 */
export function createCleanMcpEnvironment(customEnv) {
    const baseEnv = {};
    const isWin = process.platform === 'win32';
    const essentialVars = [
        'PATH',
        'NODE_ENV',
        'npm_config_registry',
        'npm_config_cache',
        // Unix
        'HOME',
        'USER',
        'SHELL',
        'TERM',
        'TMPDIR',
        'LANG',
        'LC_ALL',
        // Windows
        ...(isWin ? [
            'APPDATA',
            'LOCALAPPDATA',
            'USERPROFILE',
            'SystemRoot',
            'ComSpec',
            'TEMP',
            'TMP',
            'PATHEXT'
        ] : [])
    ];
    for (const varName of essentialVars) {
        const val = process.env[varName];
        if (val) {
            baseEnv[varName] = val;
        }
    }
    // Merge custom env vars with expansion
    if (customEnv) {
        for (const [key, value] of Object.entries(customEnv)) {
            baseEnv[key] = expandEnvVars(value);
        }
    }
    return baseEnv;
}
export function normalizeCommand(config) {
    if (Array.isArray(config.command)) {
        if (config.command.length === 0) {
            throw new Error('Invalid MCP command configuration: command array must not be empty');
        }
        const [cmd, ...cmdArgs] = config.command.map(String);
        return { command: cmd, args: cmdArgs };
    }
    if (typeof config.command === 'string') {
        return {
            command: config.command,
            args: config.args?.map(String) ?? []
        };
    }
    throw new Error('Invalid MCP command configuration: command must be a string or array');
}
export function normalizeEnv(config) {
    const envConfig = config.env ?? config.environment;
    if (!envConfig) {
        return { env: {} };
    }
    if (Array.isArray(envConfig)) {
        const env = {};
        for (const entry of envConfig) {
            const eqIndex = entry.indexOf('=');
            if (eqIndex > 0) {
                const key = entry.slice(0, eqIndex);
                const value = entry.slice(eqIndex + 1);
                env[key] = value;
            }
        }
        return { env };
    }
    if (typeof envConfig === 'object') {
        return { env: envConfig };
    }
    return { env: {} };
}
//# sourceMappingURL=env-vars.js.map