/**
 * Parse a .env-style string into key-value pairs.
 * Supports KEY=value, optional double-quoted values, and # comments.
 */
export declare function parseEnvString(content: string): Record<string, string>;
/**
 * Load .env and .env.local from root. .env.local overrides .env.
 * Returns only keys that start with the given prefix (e.g. PUBLIC_).
 */
export declare function loadPublicEnv(root: string, prefix: string): Promise<Record<string, string>>;
//# sourceMappingURL=load-env.d.ts.map