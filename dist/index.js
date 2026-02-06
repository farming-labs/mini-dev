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
/**
 * Create and start a dev server.
 *
 * @param options - Server configuration
 * @returns The started server instance and URL
 */
export async function createDevServer(options = {}) {
    const { DevServer } = await import('./dev-server.js');
    const server = new DevServer(options);
    const { port, url } = await server.start();
    return {
        server,
        port,
        url,
        async stop() {
            await server.stop();
        },
    };
}
//# sourceMappingURL=index.js.map