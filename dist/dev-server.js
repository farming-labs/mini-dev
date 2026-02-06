import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require(join(dirname(fileURLToPath(import.meta.url)), '../package.json'));
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import { transform } from 'esbuild';
import { getHMRClient } from './hmr-client.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.ts': 'application/javascript',
    '.tsx': 'application/javascript',
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
};
/**
 * Mini-DX Dev Server with HMR support.
 * Serves TypeScript/TSX/CSS/HTML with on-the-fly transpilation.
 */
export class DevServer {
    root;
    port;
    host;
    verbose;
    ignored;
    moduleGraph = new Map();
    clients = new Set();
    httpServer = null;
    wss = null;
    watcher = null;
    constructor(options = {}) {
        this.root = resolve(options.root ?? process.cwd());
        this.port = options.port ?? 3000;
        this.host = options.host ?? '0.0.0.0';
        this.verbose = options.verbose ?? false;
        this.ignored = options.ignored ?? /node_modules/;
    }
    log(...args) {
        if (this.verbose) {
            console.log('[mini-dev]', ...args);
        }
    }
    /**
     * Start the dev server.
     */
    async start() {
        this.httpServer = createServer(this.handleRequest.bind(this));
        this.wss = new WebSocketServer({ server: this.httpServer });
        this.wss.on('connection', (ws) => {
            this.clients.add(ws);
            const c = { dim: '\x1b[2m', green: '\x1b[32m', reset: '\x1b[0m' };
            console.log(`${c.dim}[HMR]${c.reset} ${c.green}client connected${c.reset} (${this.clients.size} total)`);
            ws.on('close', () => {
                this.clients.delete(ws);
                if (this.verbose) {
                    console.log(`${c.dim}[HMR]${c.reset} client disconnected`);
                }
            });
        });
        this.watcher = chokidar.watch(this.root, {
            ignored: this.ignored,
            ignoreInitial: true,
        });
        this.watcher.on('change', this.handleFileChange.bind(this));
        const startTime = Date.now();
        return new Promise((resolve) => {
            this.httpServer.listen(this.port, this.host, () => {
                const readyMs = Date.now() - startTime;
                const url = `http://localhost:${this.port}/`;
                const c = {
                    dim: '\x1b[2m',
                    cyan: '\x1b[36m',
                    green: '\x1b[32m',
                    bold: '\x1b[1m',
                    reset: '\x1b[0m',
                };
                const version = pkg.version ?? '0.0.1';
                console.log(`\n${c.bold}${c.cyan}  mini-dev${c.reset} v${version} ${c.dim}ready in ${readyMs}ms${c.reset}\n\n` +
                    `${c.green}  ➜${c.reset}  ${c.dim}Local:${c.reset}   ${url}\n` +
                    `${c.green}  ➜${c.reset}  ${c.dim}Network:${c.reset} use --host to expose\n`);
                resolve({ port: this.port, url });
            });
        });
    }
    /**
     * Stop the dev server.
     */
    async stop() {
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
        }
        if (this.wss) {
            for (const client of this.clients) {
                client.close();
            }
            this.clients.clear();
            this.wss.close();
            this.wss = null;
        }
        if (this.httpServer) {
            return new Promise((resolve) => {
                this.httpServer.close(() => {
                    this.httpServer = null;
                    resolve();
                });
            });
        }
    }
    async handleRequest(req, res) {
        let url = req.url ?? '/';
        const [pathname, search] = url.split('?');
        if (pathname === '/') {
            return this.redirect(res, '/index.html');
        }
        if (pathname === '/@hmr-client') {
            return this.serveHMRClient(res);
        }
        try {
            const ext = extname(pathname);
            if (ext === '.html') {
                await this.serveHtml(pathname, res);
            }
            else if (ext === '.ts' || ext === '.tsx') {
                await this.serveTypeScript(pathname, res);
            }
            else if (ext === '.css') {
                await this.serveCss(pathname, res);
            }
            else {
                await this.serveStatic(pathname, res);
            }
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.log('Error serving', pathname, msg);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(msg);
        }
    }
    redirect(res, location) {
        res.writeHead(302, { Location: location });
        res.end();
    }
    async serveHMRClient(res) {
        const code = getHMRClient('ws');
        res.writeHead(200, {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'no-cache',
        });
        res.end(code);
    }
    async serveHtml(url, res) {
        const filePath = join(this.root, url.slice(1));
        if (!existsSync(filePath)) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        let html = await readFile(filePath, 'utf-8');
        if (!html.includes('@hmr-client') && !html.includes('</head>')) {
            html = html.replace('</html>', '<script type="module" src="/@hmr-client"></script></html>');
        }
        else if (!html.includes('@hmr-client')) {
            html = html.replace('</head>', '<script type="module" src="/@hmr-client"></script></head>');
        }
        res.writeHead(200, {
            'Content-Type': MIME_TYPES['.html'],
            'Cache-Control': 'no-cache',
        });
        res.end(html);
    }
    async serveTypeScript(url, res) {
        const cleanPath = url.split('?')[0];
        const filePath = join(this.root, cleanPath.slice(1));
        if (!existsSync(filePath)) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        const code = await readFile(filePath, 'utf-8');
        const ext = extname(filePath);
        const loader = ext === '.tsx' ? 'tsx' : 'ts';
        const result = await transform(code, {
            loader,
            sourcemap: 'inline',
            target: 'esnext',
            format: 'esm',
        });
        const importerDir = '/' + dirname(cleanPath.slice(1));
        const transformed = this.transformImports(result.code, importerDir, cleanPath);
        const timestamp = Date.now();
        this.moduleGraph.set(cleanPath, {
            code: transformed,
            timestamp,
            url: cleanPath,
        });
        res.writeHead(200, {
            'Content-Type': MIME_TYPES['.ts'],
            'Cache-Control': 'no-cache',
        });
        res.end(transformed);
    }
    transformImports(code, importerDir, importerPath) {
        const timestamp = Date.now();
        // Rewrite relative imports to include full path and cache-bust
        code = code.replace(/from\s+['"]([^'"]+)['"]/g, (_match, path) => {
            if (path.startsWith('.') || path.startsWith('/')) {
                const resolved = this.resolveImportPath(path, importerDir, importerPath);
                return `from '${resolved}?t=${timestamp}'`;
            }
            return `from '${path}'`;
        });
        code = code.replace(/import\s+\(['"]([^'"]+)['"]\)/g, (_match, path) => {
            if (path.startsWith('.') || path.startsWith('/')) {
                const resolved = this.resolveImportPath(path, importerDir, importerPath);
                return `import('${resolved}?t=${timestamp}')`;
            }
            return `import('${path}')`;
        });
        code = code.replace(/import\s+['"]([^'"]+)['"]/g, (_match, path) => {
            if (path.startsWith('.') || path.startsWith('/')) {
                const resolved = this.resolveImportPath(path, importerDir, importerPath);
                return `import '${resolved}?t=${timestamp}'`;
            }
            return `import '${path}'`;
        });
        // Inject HMR context at start (so import.meta.hot exists before user code runs)
        const hmrInject = `
if (typeof window !== 'undefined' && window.__MINI_DEV_HOT__) {
  import.meta.hot = window.__MINI_DEV_HOT__(import.meta.url);
}
`;
        code = hmrInject.trim() + '\n' + code;
        return code;
    }
    resolveImportPath(path, importerDir, importerPath) {
        if (path.startsWith('/')) {
            const resolved = path;
            if (!extname(resolved)) {
                return this.addExtension(resolved);
            }
            return resolved;
        }
        const base = importerDir === '/' ? '' : importerDir;
        let resolved = join(base, path).replace(/\\/g, '/');
        if (!resolved.startsWith('/'))
            resolved = '/' + resolved;
        if (!extname(resolved)) {
            return this.addExtension(resolved);
        }
        return resolved;
    }
    addExtension(path) {
        if (existsSync(join(this.root, path.slice(1) + '.tsx')))
            return path + '.tsx';
        if (existsSync(join(this.root, path.slice(1) + '.ts')))
            return path + '.ts';
        if (existsSync(join(this.root, path.slice(1) + '.js')))
            return path + '.js';
        return path + '.ts';
    }
    async serveCss(url, res) {
        const filePath = join(this.root, url.slice(1));
        if (!existsSync(filePath)) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        const css = await readFile(filePath, 'utf-8');
        res.writeHead(200, {
            'Content-Type': MIME_TYPES['.css'],
            'Cache-Control': 'no-cache',
        });
        res.end(css);
    }
    async serveStatic(url, res) {
        const filePath = join(this.root, url.slice(1));
        if (!existsSync(filePath)) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
        const data = await readFile(filePath);
        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
        });
        res.end(data);
    }
    handleFileChange(file) {
        const relative = file.replace(this.root, '').replace(/\\/g, '/');
        const url = relative.startsWith('/') ? relative : '/' + relative;
        this.moduleGraph.delete(url);
        const c = { dim: '\x1b[2m', cyan: '\x1b[36m', yellow: '\x1b[33m', reset: '\x1b[0m' };
        console.log(`${c.dim}[HMR]${c.reset} ${c.yellow}file changed${c.reset} ${c.cyan}${url}${c.reset}`);
        const msg = { type: 'update', path: url, timestamp: Date.now() };
        this.broadcast(msg);
        const n = this.clients.size;
        if (n > 0) {
            console.log(`${c.dim}[HMR]${c.reset} update sent to ${n} client${n === 1 ? '' : 's'}`);
        }
    }
    broadcast(message) {
        const data = JSON.stringify(message);
        for (const client of this.clients) {
            if (client.readyState === 1) {
                client.send(data);
            }
        }
    }
}
//# sourceMappingURL=dev-server.js.map