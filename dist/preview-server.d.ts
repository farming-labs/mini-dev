import type { PreviewServerOptions } from './types.js';
/**
 * Static preview server. Serves pre-built files without HMR or transpilation.
 */
export declare class PreviewServer {
    private root;
    private port;
    private host;
    private base;
    private basePrefix;
    private proxyRules;
    private open;
    private silent;
    private label;
    private httpServer;
    constructor(options?: PreviewServerOptions);
    private normalizeProxy;
    private getNetworkUrl;
    start(): Promise<{
        port: number;
        url: string;
    }>;
    stop(): Promise<void>;
    private handleRequest;
    private redirect;
    private tryProxy;
    private serveFile;
    private servePublic;
    private listVisitablePaths;
    private serve404;
}
//# sourceMappingURL=preview-server.d.ts.map