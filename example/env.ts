/**
 * Local env helper so the example works without relying on node_modules resolution.
 * In apps using a bundler, use: import { getEnv } from '@farming-labs/mini-dev/client'
 */
export function getEnv<T extends object = Record<string, string | undefined>>(): T {
  const g = globalThis as { window?: { __MINI_DEV_ENV__?: Record<string, string> } };
  if (typeof g.window === 'undefined') return {} as T;
  return (g.window.__MINI_DEV_ENV__ ?? {}) as T;
}
