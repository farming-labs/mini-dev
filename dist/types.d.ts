/**
 * Configuration options for the dev server.
 */
export interface DevServerOptions {
    /** Root directory to serve files from. Defaults to `process.cwd()` */
    root?: string;
    /** Port to listen on. Defaults to `3000` */
    port?: number;
    /** Host to bind to. Defaults to `0.0.0.0` */
    host?: string;
    /** Enable verbose logging */
    verbose?: boolean;
    /** Paths/patterns to ignore when watching. Defaults to `node_modules` */
    ignored?: string | RegExp | (string | RegExp)[];
}
/**
 * Module metadata stored in the module graph.
 */
export interface ModuleInfo {
    code: string;
    timestamp: number;
    url: string;
}
/**
 * WebSocket message types for HMR.
 */
export interface HMRUpdateMessage {
    type: 'update';
    path: string;
    timestamp: number;
}
export type HMRMessage = HMRUpdateMessage;
//# sourceMappingURL=types.d.ts.map