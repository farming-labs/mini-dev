/**
 * mini-dev - A minimal dev server with HMR for TypeScript/JS/CSS
 *
 * @example
 * ```ts
 * import { createDevServer } from 'mini-dev';
 *
 * const { server, url } = await createDevServer({ port: 3000 });
 * console.log('Server running at', url);
 *
 * // Later: await server.stop();
 * ```
 */
export { DevServer } from './dev-server.js';
export type { DevServerOptions, HMRMessage, ModuleInfo } from './types.js';
/**
 * Create and start a dev server.
 *
 * @param options - Server configuration
 * @returns The started server instance and URL
 */
export declare function createDevServer(options?: import('./types.js').DevServerOptions): Promise<{
    server: import("./dev-server.js").DevServer;
    port: number;
    url: string;
    stop(): Promise<void>;
}>;
//# sourceMappingURL=index.d.ts.map