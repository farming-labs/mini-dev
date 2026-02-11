import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, extname, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require(join(dirname(fileURLToPath(import.meta.url)), '../package.json'));
import type { PreviewServerOptions, ProxyRule } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

/**
 * Static preview server. Serves pre-built files without HMR or transpilation.
 */
export class PreviewServer {
  private root: string;
  private port: number;
  private host: string;
  private base: string;
  private basePrefix: string;
  private proxyRules: ProxyRule[];
  private open: boolean;
  private silent: boolean;
  private label: string;
  private httpServer: ReturnType<typeof createServer> | null = null;

  constructor(options: PreviewServerOptions = {}) {
    this.root = resolve(options.root ?? join(process.cwd(), 'dist'));
    this.port = options.port ?? 4173;
    this.host = options.host ?? '127.0.0.1';
    this.open = options.open ?? false;
    this.silent = options.silent ?? process.env.CI === 'true';
    this.label = options.label ?? 'MINI-DEV preview';
    const rawBase = options.base ?? '';
    this.base = rawBase ? (rawBase.startsWith('/') ? rawBase : '/' + rawBase).replace(/\/?$/, '/') : '';
    this.basePrefix = this.base ? this.base.replace(/\/$/, '') : '';
    this.proxyRules = this.normalizeProxy(options.proxy);
  }

  private normalizeProxy(proxy: PreviewServerOptions['proxy']): ProxyRule[] {
    if (!proxy) return [];
    const entries = Array.isArray(proxy)
      ? proxy.map(({ path, target }) => ({ path, target }))
      : Object.entries(proxy).map(([path, target]) => ({ path, target }));
    const rules: ProxyRule[] = entries.map(({ path, target }) => ({
      path: path.startsWith('/') ? path : '/' + path,
      target: target.replace(/\/$/, ''),
    }));
    rules.sort((a, b) => b.path.length - a.path.length);
    return rules;
  }

  private getNetworkUrl(): string | null {
    if (this.host !== '0.0.0.0') return null;
    const nets = networkInterfaces();
    for (const addrs of Object.values(nets ?? {})) {
      for (const addr of addrs ?? []) {
        if (addr.family === 'IPv4' && !addr.internal) {
          return `http://${addr.address}:${this.port}${this.base}`;
        }
      }
    }
    return `http://0.0.0.0:${this.port}${this.base}`;
  }

  async start(): Promise<{ port: number; url: string }> {
    this.httpServer = createServer(this.handleRequest.bind(this));

    const startTime = Date.now();
    return new Promise((resolve) => {
      this.httpServer!.listen(this.port, this.host, () => {
        const readyMs = Date.now() - startTime;
        const localUrl = `http://localhost:${this.port}${this.base}`;
        const networkUrl = this.getNetworkUrl();
        const c = { dim: '\x1b[2m', cyan: '\x1b[36m', green: '\x1b[32m', bold: '\x1b[1m', reset: '\x1b[0m' };
        const version = pkg.version ?? '0.0.1';
        if (!this.silent) {
          let lines =
            `\n${c.bold}${c.cyan}  ${this.label}${c.reset} v${version} ${c.dim}ready in ${readyMs}ms${c.reset}\n\n` +
            `${c.green}  ➜${c.reset}  ${c.dim}Local:${c.reset}   ${localUrl}\n`;
          if (networkUrl) {
            lines += `${c.green}  ➜${c.reset}  ${c.dim}Network:${c.reset} ${networkUrl}\n`;
          } else {
            lines += `${c.green}  ➜${c.reset}  ${c.dim}Network:${c.reset} use --host to expose\n`;
          }
          console.log(lines);
        }
        if (this.open) {
          import('open').then(({ default: open }) => open(localUrl)).catch(() => {});
        }
        resolve({ port: this.port, url: localUrl });
      });
    });
  }

  async stop(): Promise<void> {
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer!.close(() => {
          this.httpServer = null;
          resolve();
        });
      });
    }
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let url = req.url ?? '/';
    const [pathname, search] = url.split('?');

    let pathnameForLookup = pathname;
    if (this.basePrefix) {
      if (pathname === '/') {
        return this.redirect(res, this.base);
      }
      if (pathname === this.basePrefix) {
        return this.redirect(res, this.base);
      }
      if (!pathname.startsWith(this.basePrefix + '/')) {
        return this.serve404(pathname, res);
      }
      pathnameForLookup = pathname.slice(this.basePrefix.length) || '/';
    } else {
      if (pathname === '/') {
        return this.redirect(res, '/index.html');
      }
    }

    const proxyHandled = await this.tryProxy(pathnameForLookup, search ?? '', req, res);
    if (proxyHandled) return;

    const publicServed = await this.servePublic(pathnameForLookup, res);
    if (publicServed) return;

    const filePath = join(this.root, pathnameForLookup.slice(1) || '');
    if (!existsSync(filePath)) {
      return this.serve404(pathnameForLookup, res);
    }
    if (!statSync(filePath).isFile()) {
      const indexPath = join(filePath, 'index.html');
      if (existsSync(indexPath)) {
        return this.serveFile(join(pathnameForLookup, 'index.html').replace(/\/+/g, '/'), res);
      }
      return this.serve404(pathnameForLookup, res);
    }

    await this.serveFile(pathnameForLookup, res);
  }

  private redirect(res: ServerResponse, location: string): void {
    res.writeHead(302, { Location: location });
    res.end();
  }

  private async tryProxy(
    pathnameForLookup: string,
    search: string,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    const rule = this.proxyRules.find(
      (r) => pathnameForLookup === r.path || pathnameForLookup.startsWith(r.path + '/')
    );
    if (!rule) return false;

    const proxyUrl = rule.target + pathnameForLookup + (search ? '?' + search : '');
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      const k = key.toLowerCase();
      if (k === 'host' || k === 'connection') continue;
      headers[key] = Array.isArray(value) ? value.join(', ') : value;
    }

    try {
      const opts: RequestInit = {
        method: req.method ?? 'GET',
        headers,
        body:
          req.method !== 'GET' && req.method !== 'HEAD'
            ? (req as unknown as ReadableStream)
            : undefined,
      };
      const proxyRes = await fetch(proxyUrl, opts);
      const resHeaders: Record<string, string | string[]> = {};
      proxyRes.headers.forEach((v, k) => {
        const lower = k.toLowerCase();
        if (lower !== 'transfer-encoding') resHeaders[k] = v;
      });
      res.writeHead(proxyRes.status, resHeaders);
      const buf = await proxyRes.arrayBuffer();
      res.end(Buffer.from(buf));
      return true;
    } catch {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway');
      return true;
    }
  }

  private async serveFile(pathnameForLookup: string, res: ServerResponse): Promise<void> {
    const filePath = join(this.root, pathnameForLookup.slice(1) || '');
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=0',
    });
    res.end(data);
  }

  private async servePublic(pathname: string, res: ServerResponse): Promise<boolean> {
    const publicDir = join(this.root, 'public');
    if (!existsSync(publicDir)) return false;

    const subPath = pathname.slice(1) || '';
    const filePath = resolve(publicDir, subPath);
    if (relative(publicDir, filePath).startsWith('..')) return false;
    if (!existsSync(filePath)) return false;
    if (!statSync(filePath).isFile()) return false;

    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=0',
    });
    res.end(data);
    return true;
  }

  private async listVisitablePaths(): Promise<string[]> {
    const paths: string[] = [];
    const skip = new Set(['node_modules', '.git']);

    try {
      const entries = await readdir(this.root, { withFileTypes: true });
      for (const e of entries) {
        if (skip.has(e.name) || e.name.startsWith('.')) continue;
        if (e.name === 'public') continue;
        if (e.isFile()) paths.push('/' + e.name);
        if (e.isDirectory()) paths.push('/' + e.name + '/');
      }
    } catch {
      /* ignore */
    }

    const publicDir = join(this.root, 'public');
    if (existsSync(publicDir)) {
      const walk = async (dir: string, prefix: string) => {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const e of entries) {
          const rel = prefix + e.name;
          if (e.isFile()) paths.push('/' + rel);
          if (e.isDirectory()) await walk(join(dir, e.name), rel + '/');
        }
      };
      await walk(publicDir, '');
    }

    const sorted = paths.sort((a, b) => a.localeCompare(b));
    return this.basePrefix ? sorted.map((p) => this.basePrefix + p) : sorted;
  }

  private async serve404(pathname: string, res: ServerResponse): Promise<void> {
    const paths = await this.listVisitablePaths();
    const listHtml = paths
      .map((p) => `<li><a href="${escapeHtml(p)}">${escapeHtml(p)}</a></li>`)
      .join('\n');
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - Not Found</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 2rem; max-width: 640px; line-height: 1.6; color: #333; }
    h1 { font-size: 1.25rem; color: #c00; }
    code { background: #f0f0f0; padding: 0.2em 0.4em; border-radius: 4px; }
    ul { margin: 1rem 0; padding-left: 1.5rem; }
    a { color: #0066cc; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>404 - Not Found</h1>
  <p>The path <code>${escapeHtml(pathname)}</code> does not exist.</p>
  <p>Available paths:</p>
  <ul>
${listHtml}
  </ul>
</body>
</html>`;
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(html);
  }
}
