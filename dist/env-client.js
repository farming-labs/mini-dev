/**
 * Client-side env util: reads vars from the dev server's /@env payload.
 * Add <script src="/@env"></script> (or with base e.g. /app/@env) before your app so
 * window.__MINI_DEV_ENV__ is set. Only vars with the configured prefix (e.g. PUBLIC_) are present.
 *
 * @example
 * ```ts
 * import { getEnv } from '@farming-labs/mini-dev';
 *
 * interface Env {
 *   PUBLIC_API_URL?: string;
 *   PUBLIC_APP_NAME?: string;
 * }
 *
 * const env = getEnv<Env>();
 * env.PUBLIC_API_URL; // string | undefined, type-safe
 * ```
 */
export function getEnv() {
    const g = globalThis;
    if (typeof g.window === 'undefined') {
        return {};
    }
    return (g.window.__MINI_DEV_ENV__ ?? {});
}
//# sourceMappingURL=env-client.js.map