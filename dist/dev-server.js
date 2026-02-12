import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync, statSync, readFileSync, realpathSync } from 'node:fs';
import { join, extname, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require(join(dirname(fileURLToPath(import.meta.url)), '../package.json'));
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import { transform } from 'esbuild';
import { getHMRClient } from './hmr-client.js';
import { loadPublicEnv } from './load-env.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
function escapeHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
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
    '.txt': 'text/plain',
    '.xml': 'application/xml',
    '.webmanifest': 'application/manifest+json',
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
    label;
    silent;
    open;
    base;
    basePrefix;
    proxyRules;
    envPrefix;
    publicEnv = {};
    moduleGraph = new Map();
    clients = new Set();
    httpServer = null;
    wss = null;
    watcher = null;
    constructor(options = {}) {
        this.root = resolve(options.root ?? process.cwd());
        this.port = options.port ?? 3000;
        this.host = options.host ?? '127.0.0.1';
        this.verbose = options.verbose ?? false;
        this.ignored = options.ignored ?? /node_modules/;
        this.label = options.label ?? 'MINI-DEV';
        this.silent = options.silent ?? process.env.CI === 'true';
        this.open = options.open ?? false;
        const rawBase = options.base ?? '';
        this.base = rawBase ? (rawBase.startsWith('/') ? rawBase : '/' + rawBase).replace(/\/?$/, '/') : '';
        this.basePrefix = this.base ? this.base.replace(/\/$/, '') : '';
        this.proxyRules = this.normalizeProxy(options.proxy);
        this.envPrefix =
            options.env === false || options.env === undefined
                ? null
                : (options.env?.prefix ?? 'PUBLIC_');
    }
    normalizeProxy(proxy) {
        if (!proxy)
            return [];
        const entries = Array.isArray(proxy)
            ? proxy.map(({ path, target }) => ({ path, target }))
            : Object.entries(proxy).map(([path, target]) => ({ path, target }));
        const rules = entries.map(({ path, target }) => ({
            path: path.startsWith('/') ? path : '/' + path,
            target: target.replace(/\/$/, ''),
        }));
        rules.sort((a, b) => b.path.length - a.path.length);
        return rules;
    }
    getNetworkUrl() {
        if (this.host !== '0.0.0.0')
            return null;
        const nets = networkInterfaces();
        for (const addrs of Object.values(nets ?? {})) {
            for (const addr of addrs ?? []) {
                if (addr.family === 'IPv4' && !addr.internal) {
                    return `http://${addr.address}:${this.port}/`;
                }
            }
        }
        return `http://0.0.0.0:${this.port}/`;
    }
    log(...args) {
        if (!this.silent && this.verbose) {
            console.log(`[${this.label}]`, ...args);
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
            if (!this.silent) {
                const c = { dim: '\x1b[2m', green: '\x1b[32m', reset: '\x1b[0m' };
                console.log(`${c.dim}[${this.label}] [HMR]${c.reset} ${c.green}client connected${c.reset} (${this.clients.size} total)`);
            }
            ws.on('close', () => {
                this.clients.delete(ws);
                this.log('client disconnected');
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
                const localUrl = `http://localhost:${this.port}${this.base}`;
                const networkUrl = this.getNetworkUrl();
                const c = {
                    dim: '\x1b[2m',
                    cyan: '\x1b[36m',
                    green: '\x1b[32m',
                    bold: '\x1b[1m',
                    reset: '\x1b[0m',
                };
                const version = pkg.version ?? '0.0.1';
                let lines = `\n${c.bold}${c.cyan}  ${this.label}${c.reset} v${version} ${c.dim}ready in ${readyMs}ms${c.reset}\n\n` +
                    `${c.green}  ➜${c.reset}  ${c.dim}Local:${c.reset}   ${localUrl}\n`;
                if (networkUrl) {
                    lines += `${c.green}  ➜${c.reset}  ${c.dim}Network:${c.reset} ${networkUrl}\n`;
                }
                else {
                    lines += `${c.green}  ➜${c.reset}  ${c.dim}Network:${c.reset} use --host to expose\n`;
                }
                console.log(lines);
                if (this.open) {
                    import('open').then(({ default: open }) => open(localUrl)).catch(() => { });
                }
                resolve({ port: this.port, url: localUrl });
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
        }
        else {
            if (pathname === '/') {
                return this.redirect(res, '/index.html');
            }
        }
        if (pathnameForLookup === '/@hmr-client') {
            return this.serveHMRClient(res);
        }
        if (pathnameForLookup === '/@env' && this.envPrefix !== null) {
            return await this.serveEnv(res);
        }
        if (pathnameForLookup === '/' || pathnameForLookup === '') {
            return this.redirect(res, this.base + 'index.html');
        }
        const proxyHandled = await this.tryProxy(pathnameForLookup, search ?? '', req, res);
        if (proxyHandled)
            return;
        const publicServed = await this.servePublic(pathnameForLookup, res);
        if (publicServed)
            return;
        if (pathnameForLookup.startsWith('/@node_modules/')) {
            const served = await this.serveNodeModule(pathnameForLookup, res);
            if (served)
                return;
        }
        try {
            const ext = extname(pathnameForLookup);
            if (ext === '.html') {
                await this.serveHtml(pathnameForLookup, res);
            }
            else if (ext === '.ts' || ext === '.tsx') {
                await this.serveTypeScript(pathnameForLookup, res);
            }
            else if (ext === '.css') {
                await this.serveCss(pathnameForLookup, res);
            }
            else {
                await this.serveStatic(pathnameForLookup, res);
            }
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.log('Error serving', pathnameForLookup, msg);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(msg);
        }
    }
    redirect(res, location) {
        res.writeHead(302, { Location: location });
        res.end();
    }
    async tryProxy(pathnameForLookup, search, req, res) {
        const rule = this.proxyRules.find((r) => pathnameForLookup === r.path || pathnameForLookup.startsWith(r.path + '/'));
        if (!rule)
            return false;
        const proxyUrl = rule.target + pathnameForLookup + (search ? '?' + search : '');
        const headers = {};
        for (const [key, value] of Object.entries(req.headers)) {
            if (value === undefined)
                continue;
            const k = key.toLowerCase();
            if (k === 'host' || k === 'connection')
                continue;
            headers[key] = Array.isArray(value) ? value.join(', ') : value;
        }
        try {
            const opts = {
                method: req.method ?? 'GET',
                headers,
                body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
            };
            const proxyRes = await fetch(proxyUrl, opts);
            const resHeaders = {};
            proxyRes.headers.forEach((v, k) => {
                const lower = k.toLowerCase();
                if (lower !== 'transfer-encoding')
                    resHeaders[k] = v;
            });
            res.writeHead(proxyRes.status, resHeaders);
            const buf = await proxyRes.arrayBuffer();
            res.end(Buffer.from(buf));
            this.log('Proxy', req.method, pathnameForLookup, '->', proxyRes.status, rule.target);
            return true;
        }
        catch (err) {
            this.log('Proxy error', pathnameForLookup, err);
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end('Bad Gateway');
            return true;
        }
    }
    findPackageDir(specifier) {
        const parts = specifier.startsWith('@') ? specifier.split('/') : [specifier.split('/')[0]];
        if (parts.length === 0 || !parts[0])
            return null;
        const packageName = parts.join('/');
        // 1) Resolve from node_modules (walk up to find node_modules/<packageName>)
        for (let dir = this.root; dir; dir = dirname(dir)) {
            const nm = join(dir, 'node_modules');
            if (!existsSync(nm))
                continue;
            const pkgDir = join(nm, ...parts);
            const pkgJsonPath = join(pkgDir, 'package.json');
            if (!existsSync(pkgJsonPath))
                continue;
            try {
                return realpathSync(pkgDir);
            }
            catch {
                return pkgDir;
            }
        }
        // 2) Fallback: when app lives inside the package (e.g. example/ in this repo),
        //    the package has no node_modules copy of itself; treat an ancestor dir as the package
        //    if its package.json has "name" === packageName.
        for (let dir = this.root; dir; dir = dirname(dir)) {
            const pkgJsonPath = join(dir, 'package.json');
            if (!existsSync(pkgJsonPath))
                continue;
            try {
                const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
                if (pkg.name === packageName)
                    return realpathSync(dir);
            }
            catch {
                /* ignore */
            }
        }
        return null;
    }
    resolveBareSpecifier(specifier, _importerPath) {
        try {
            const slash = specifier.indexOf('/');
            const packageName = slash > 0 && (specifier.startsWith('@') ? slash > 1 : true)
                ? specifier.slice(0, slash)
                : specifier;
            const exportSubpath = slash > 0 ? specifier.slice(slash + 1) : undefined;
            const packageDir = this.findPackageDir(packageName);
            if (!packageDir)
                return null;
            const pkgPath = join(packageDir, 'package.json');
            const pkgJson = readFileSync(pkgPath, 'utf-8');
            const pkg = JSON.parse(pkgJson);
            const exp = pkg.exports;
            let entry;
            const exportKey = exportSubpath ? './' + exportSubpath : '.';
            if (exp?.[exportKey]) {
                entry = exp[exportKey].import ?? exp[exportKey].default;
            }
            if (!entry && !exportSubpath) {
                if (exp?.['.'])
                    entry = exp['.'].import ?? exp['.'].default;
                if (!entry)
                    entry = pkg.main;
            }
            if (!entry)
                return null;
            const entrySubpath = entry.replace(/^\.\//, '').replace(/\\/g, '/');
            return { packageName, entrySubpath };
        }
        catch {
            return null;
        }
    }
    async serveNodeModule(pathnameForLookup, res) {
        const rest = pathnameForLookup.slice('/@node_modules/'.length).replace(/^\//, '');
        const parts = rest.split('/');
        let specifier;
        let subpath;
        if (parts[0]?.startsWith('@') && parts.length >= 2) {
            specifier = parts[0] + '/' + parts[1];
            subpath = parts.slice(2).join('/');
        }
        else if (parts.length >= 1) {
            specifier = parts[0];
            subpath = parts.slice(1).join('/');
        }
        else {
            return false;
        }
        try {
            const packageRoot = this.findPackageDir(specifier);
            if (!packageRoot)
                return false;
            const filePath = resolve(packageRoot, subpath);
            if (relative(packageRoot, filePath).startsWith('..')) {
                return false;
            }
            if (!existsSync(filePath) || !statSync(filePath).isFile())
                return false;
            const ext = extname(filePath);
            const contentType = MIME_TYPES[ext] ?? 'application/javascript';
            const data = await readFile(filePath);
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache',
            });
            res.end(data);
            return true;
        }
        catch {
            return false;
        }
    }
    async listVisitablePaths() {
        const paths = [];
        const skip = new Set(['node_modules', '.git', 'dist', 'public']);
        try {
            const entries = await readdir(this.root, { withFileTypes: true });
            for (const e of entries) {
                if (skip.has(e.name) || e.name.startsWith('.'))
                    continue;
                if (e.isFile())
                    paths.push('/' + e.name);
                if (e.isDirectory())
                    paths.push('/' + e.name + '/');
            }
        }
        catch {
            /* ignore */
        }
        const publicDir = join(this.root, 'public');
        if (existsSync(publicDir)) {
            const walk = async (dir, prefix) => {
                const entries = await readdir(dir, { withFileTypes: true });
                for (const e of entries) {
                    const rel = prefix + e.name;
                    if (e.isFile())
                        paths.push('/' + rel);
                    if (e.isDirectory())
                        await walk(join(dir, e.name), rel + '/');
                }
            };
            await walk(publicDir, '');
        }
        const sorted = paths.sort((a, b) => a.localeCompare(b));
        return this.basePrefix ? sorted.map((p) => this.basePrefix + p) : sorted;
    }
    async serve404(pathname, res) {
        const paths = await this.listVisitablePaths();
        const listHtml = paths
            .map((p) => `<li><a href="${escapeHtml(p)}">${escapeHtml(p)}</a></li>`)
            .join('\n');
        const displayPath = pathname;
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
  <p>The path <code>${escapeHtml(displayPath)}</code> does not exist.</p>
  <p>Available paths you can visit:</p>
  <ul>
${listHtml}
  </ul>
</body>
</html>`;
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(html);
    }
    async servePublic(pathname, res) {
        const publicDir = join(this.root, 'public');
        if (!existsSync(publicDir))
            return false;
        const subPath = pathname.slice(1) || '';
        const filePath = resolve(publicDir, subPath);
        if (relative(publicDir, filePath).startsWith('..'))
            return false;
        if (!existsSync(filePath))
            return false;
        if (!statSync(filePath).isFile())
            return false;
        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
        const data = await readFile(filePath);
        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
        });
        res.end(data);
        return true;
    }
    async serveHMRClient(res) {
        const code = getHMRClient('ws', this.label, this.silent);
        res.writeHead(200, {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'no-cache',
        });
        res.end(code);
    }
    async serveEnv(res) {
        if (Object.keys(this.publicEnv).length === 0 && this.envPrefix !== null) {
            this.publicEnv = await loadPublicEnv(this.root, this.envPrefix);
        }
        const json = JSON.stringify(this.publicEnv);
        const code = `window.__MINI_DEV_ENV__=${json};`;
        res.writeHead(200, {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'no-cache',
        });
        res.end(code);
    }
    async serveHtml(url, res) {
        const filePath = join(this.root, url.slice(1));
        if (!existsSync(filePath)) {
            return this.serve404(url, res);
        }
        let html = await readFile(filePath, 'utf-8');
        const hmrScript = `<script type="module" src="${this.base}@hmr-client"></script>`;
        if (this.base) {
            if (!html.includes('<base')) {
                html = html.replace('<head>', '<head>\n  <base href="' + this.base + '">');
            }
            const prefixNoLead = this.basePrefix.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const absPathRe = new RegExp(`\\s(href|src)=(["'])\\/(?!\\/)(?!${prefixNoLead}\\/)`, 'g');
            html = html.replace(absPathRe, ` $1=$2${this.basePrefix}/`);
        }
        if (!html.includes('@hmr-client') && !html.includes('</head>')) {
            html = html.replace('</html>', hmrScript + '</html>');
        }
        else if (!html.includes('@hmr-client')) {
            html = html.replace('</head>', hmrScript + '</head>');
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
            return this.serve404(cleanPath, res);
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
        const prefix = this.basePrefix;
        const withBase = (p) => (prefix ? prefix + p : p);
        const resolveImport = (path) => {
            if (path.startsWith('.') || path.startsWith('/')) {
                const resolved = this.resolveImportPath(path, importerDir, importerPath);
                return withBase(resolved) + '?t=' + timestamp;
            }
            const bare = this.resolveBareSpecifier(path, importerPath);
            if (bare) {
                return withBase('/@node_modules/' + bare.packageName + '/' + bare.entrySubpath) + '?t=' + timestamp;
            }
            return path;
        };
        code = code.replace(/from\s+['"]([^'"]+)['"]/g, (_match, path) => `from '${resolveImport(path)}'`);
        code = code.replace(/import\s+\(['"]([^'"]+)['"]\)/g, (_match, path) => `import('${resolveImport(path)}')`);
        code = code.replace(/import\s+['"]([^'"]+)['"]/g, (_match, path) => `import '${resolveImport(path)}'`);
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
            return this.serve404(url, res);
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
            return this.serve404(url, res);
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
        if (!this.silent) {
            const c = { dim: '\x1b[2m', cyan: '\x1b[36m', yellow: '\x1b[33m', reset: '\x1b[0m' };
            console.log(`${c.dim}[${this.label}] [HMR]${c.reset} ${c.yellow}file changed${c.reset} ${c.cyan}${url}${c.reset}`);
        }
        const pathForClient = this.basePrefix ? this.basePrefix + url : url;
        const msg = { type: 'update', path: pathForClient, timestamp: Date.now() };
        this.broadcast(msg);
        if (!this.silent) {
            const n = this.clients.size;
            if (n > 0) {
                const c = { dim: '\x1b[2m', reset: '\x1b[0m' };
                console.log(`${c.dim}[${this.label}] [HMR]${c.reset} update sent to ${n} client${n === 1 ? '' : 's'}`);
            }
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