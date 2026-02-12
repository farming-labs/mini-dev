import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
/**
 * Parse a .env-style string into key-value pairs.
 * Supports KEY=value, optional double-quoted values, and # comments.
 */
export function parseEnvString(content) {
    const out = {};
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0)
            continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
        else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
        }
        out[key] = value;
    }
    return out;
}
/**
 * Load .env and .env.local from root. .env.local overrides .env.
 * Returns only keys that start with the given prefix (e.g. PUBLIC_).
 */
export async function loadPublicEnv(root, prefix) {
    const merged = {};
    const files = ['.env', '.env.local'];
    for (const name of files) {
        const path = join(root, name);
        if (!existsSync(path))
            continue;
        try {
            let content = await readFile(path, 'utf-8');
            content = content.replace(/^\uFEFF/, '');
            const parsed = parseEnvString(content);
            for (const [key, value] of Object.entries(parsed)) {
                merged[key] = value;
            }
        }
        catch {
            /* ignore read errors */
        }
    }
    if (!prefix)
        return merged;
    const out = {};
    for (const [key, value] of Object.entries(merged)) {
        if (key.startsWith(prefix))
            out[key] = value;
    }
    return out;
}
//# sourceMappingURL=load-env.js.map