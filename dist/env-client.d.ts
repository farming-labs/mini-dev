/**
 * Client-side env: reads vars exposed by the dev server's /@env script.
 * Only vars with the configured prefix (e.g. PUBLIC_) are present.
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
export declare function getEnv<T extends object = Record<string, string | undefined>>(): T;
//# sourceMappingURL=env-client.d.ts.map