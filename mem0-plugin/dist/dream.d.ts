/**
 * Auto-dream: gated automatic memory consolidation for the Mem0 OpenCode plugin.
 *
 * Ported from the (stable) pi-agent plugin's dream module and adapted to
 * OpenCode's hook model. When the cheap gates (time since last consolidation +
 * sessions since) and the memory-count gate all pass, the plugin injects the
 * DREAM_PROTOCOL into the agent's context so it consolidates memories (merge
 * duplicates, drop stale/sensitive entries, rewrite vague ones) before
 * answering. A filesystem lock prevents concurrent sessions from dreaming at
 * once, and completion is recorded so it won't re-trigger until the next cycle.
 *
 * State + lock live in ~/.mem0/ alongside settings.json. Opt out with
 * MEM0_DREAM=false, or tune via the `dream` block in ~/.mem0/settings.json.
 */
export interface DreamConfig {
    enabled: boolean;
    auto: boolean;
    minHours: number;
    minSessions: number;
    minMemories: number;
}
export declare const DREAM_DEFAULTS: DreamConfig;
/**
 * Load dream config from ~/.mem0/settings.json (`dream` block), applying
 * defaults. MEM0_DREAM=false (or 0/no/off) force-disables regardless.
 */
export declare function loadDreamConfig(settingsDir: string): DreamConfig;
/** Count a new session toward the dream gate (once per distinct sessionId). */
export declare function incrementSessionCount(stateDir: string, sessionId: string): void;
/** Cheap gates that don't need an API call: time since last + sessions since. */
export declare function checkCheapGates(stateDir: string, config: Partial<DreamConfig>): {
    proceed: boolean;
    reason?: string;
};
/** Memory-count gate (uses the count already fetched at session init). */
export declare function checkMemoryGate(memoryCount: number, config: Partial<DreamConfig>): {
    pass: boolean;
    reason?: string;
};
/** Acquire an exclusive dream lock (stale locks > 1h are reclaimed). */
export declare function acquireDreamLock(stateDir: string): boolean;
export declare function releaseDreamLock(stateDir: string): void;
/** Reset the gates after a successful consolidation. */
export declare function recordDreamCompletion(stateDir: string): void;
/**
 * Consolidation protocol injected into the agent context when a dream is
 * triggered. Uses the plugin's native OpenCode memory tools (get_memories /
 * add_memory / delete_memory) rather than an MCP tool.
 */
export declare const DREAM_PROTOCOL = "<mem0-dream>\nYou are running memory consolidation. Complete these steps using the mem0 memory tools (get_memories, add_memory, delete_memory):\n\n1. ORIENT \u2014 Call get_memories to list all memories. Count by category. Note oldest/newest.\n\n2. GATHER TARGETS \u2014 Review each memory. Classify as:\n   - DELETE: sensitive information (API keys, passwords, tokens), expired/stale entries, noise, redundant operational details\n   - MERGE: near-duplicates (same fact stated differently). Keep the better-worded one, delete the other.\n   - REWRITE: vague, first-person, or poorly-categorized entries. add_memory with improved text, then delete_memory the old one.\n   - KEEP: everything else.\n   Skip any memory starting with \"[PINNED]\".\n\n3. CONSOLIDATE \u2014 Execute the changes:\n   - Delete stale/duplicate entries with delete_memory\n   - For merges: add_memory the merged text, delete_memory both originals\n   - For rewrites: add_memory the improved version, delete_memory the original\n\n4. REPORT \u2014 Summarize: how many reviewed, deleted, merged, rewritten, final count.\n\nQuality targets: zero sensitive data stored, zero duplicates, all entries are atomic (one fact each), 15-50 words each.\nAfter consolidation, respond to the user's message normally.\n</mem0-dream>";
