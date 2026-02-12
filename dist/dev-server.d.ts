import type { DevServerOptions } from './types.js';
/**
 * Mini-DX Dev Server with HMR support.
 * Serves TypeScript/TSX/CSS/HTML with on-the-fly transpilation.
 */
export declare class DevServer {
    private root;
    private port;
    private host;
    private verbose;
    private ignored;
    private label;
    private silent;
    private open;
    private base;
    private basePrefix;
    private proxyRules;
    private envPrefix;
    private publicEnv;
    private moduleGraph;
    private clients;
    private httpServer;
    private wss;
    private watcher;
    constructor(options?: DevServerOptions);
    private normalizeProxy;
    private getNetworkUrl;
    private log;
    /**
     * Start the dev server.
     */
    start(): Promise<{
        port: number;
        url: string;
    }>;
    /**
     * Stop the dev server.
     */
    stop(): Promise<void>;
    private handleRequest;
    private redirect;
    private tryProxy;
    private findPackageDir;
    private resolveBareSpecifier;
    private serveNodeModule;
    private listVisitablePaths;
    private serve404;
    private servePublic;
    private serveHMRClient;
    private serveEnv;
    private serveHtml;
    private serveTypeScript;
    private transformImports;
    private resolveImportPath;
    private addExtension;
    private serveCss;
    private serveStatic;
    private handleFileChange;
    private broadcast;
}
//# sourceMappingURL=dev-server.d.ts.map