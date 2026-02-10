/**
 * Configuration options for the dev server.
 */
export interface DevServerOptions {
  /** Root directory to serve files from. Defaults to `process.cwd()` */
  root?: string;
  /** Port to listen on. Defaults to `3000` */
  port?: number;
  /** Host to bind to. Defaults to `127.0.0.1`; use `0.0.0.0` to expose to network */
  host?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Paths/patterns to ignore when watching. Defaults to `node_modules` */
  ignored?: string | RegExp | (string | RegExp)[];
  /** Label for the dev server in logs/UI. Defaults to `MINI-DEV` */
  label?: string;
  /** Disable all logs (terminal + browser HMR). Defaults to `process.env.CI === 'true'` */
  silent?: boolean;
  /** Open browser on start */
  open?: boolean;
  /** Base path for serving under a subpath, e.g. `/app/` for https://example.com/app/ */
  base?: string;
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
