/**
 * Plugin telemetry for the Mem0 OpenCode plugin — anonymous usage tracking
 * via PostHog.
 *
 * Emits the SAME event schema as the Mem0 editor plugin's telemetry.py
 * (event names prefixed `plugin.`, `source: "plugin"`, `platform: "opencode"`,
 * `distinct_id = sha256(apiKey)[:32]`) so OpenCode shows up as just another
 * `platform` value in the shared plugin dashboard instead of a separate
 * event namespace.
 *
 * Fire-and-forget: never throws, never blocks, failures are swallowed. Only
 * fires when an API key is present (same as the editor plugin — anonymous
 * installs without a key emit nothing). Disable with MEM0_TELEMETRY=false.
 *
 * Never sends: memory content, API keys, raw user/project IDs. Only sends:
 * event type, platform, plugin version, and anonymized hashes of the API key
 * and project ID.
 */
export declare function isTelemetryEnabled(): boolean;
/**
 * Build the PostHog event payload, or null when telemetry is disabled or no
 * API key is available. Pure (aside from env/version reads) and exported for
 * testing. System-controlled properties are applied last so a caller cannot
 * override `source`/`platform`/etc.
 */
export declare function buildEvent(eventType: string, properties: Record<string, unknown>, apiKey: string | undefined, projectId?: string): Record<string, unknown> | null;
/** Send a usage event, fire-and-forget. Never throws, never blocks. */
export declare function captureEvent(eventType: string, properties: Record<string, unknown>, apiKey: string | undefined, projectId?: string): void;
