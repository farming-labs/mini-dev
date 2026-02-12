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
  /**
   * Proxy specific paths to another server.
   * Object form: `{ '/api': 'http://localhost:8080' }`.
   * Array form: `[{ path: '/api', target: 'http://localhost:8080' }]`.
   * First matching path (longest first) is used. Path is matched against the logical path (under base if set).
   */
  proxy?: Record<string, string> | Array<{ path: string; target: string }>;
  /**
   * Load .env and .env.local from root and expose vars to the client.
   * Only keys starting with the given prefix are exposed (security: avoid leaking secrets).
   * Set to `false` to disable. Default when enabled: `{ prefix: 'PUBLIC_' }`.
   */
  env?: false | { prefix?: string };
}

/** Normalized proxy rule used internally. */
export interface ProxyRule {
  path: string;
  target: string;
}

/** Options for the preview server (static file serving only, no HMR). */
export interface PreviewServerOptions {
  /** Root directory to serve. Defaults to `./dist` for preview. */
  root?: string;
  /** Port. Defaults to `4173` */
  port?: number;
  /** Host. Defaults to `127.0.0.1` */
  host?: string;
  /** Base path, e.g. `/app/` */
  base?: string;
  /** Proxy paths to another server */
  proxy?: Record<string, string> | Array<{ path: string; target: string }>;
  /** Open browser on start */
  open?: boolean;
  /** Disable logs */
  silent?: boolean;
  /** Label in logs. Defaults to `MINI-DEV preview` */
  label?: string;
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
