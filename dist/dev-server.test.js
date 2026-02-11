import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';
import { DevServer } from './dev-server.js';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
describe('DevServer', () => {
    let server;
    let root;
    const port = 3099;
    beforeAll(async () => {
        root = await mkdtemp(join(tmpdir(), 'mini-dev-test-'));
        await writeFile(join(root, 'index.html'), '<html><head></head><body>Hello</body></html>');
        await writeFile(join(root, 'main.ts'), "console.log('hi');");
        await writeFile(join(root, 'style.css'), 'body { color: red; }');
        server = new DevServer({ root, port, verbose: false });
        await server.start();
    });
    afterAll(async () => {
        await server.stop();
        await rm(root, { recursive: true, force: true });
    });
    it('serves HTML and injects HMR client', async () => {
        const res = await fetch(`http://localhost:${port}/`);
        expect(res.redirected).toBe(true);
        expect(res.url).toContain('index.html');
        const htmlRes = await fetch(`http://localhost:${port}/index.html`);
        const html = await htmlRes.text();
        expect(html).toContain('@hmr-client');
        expect(html).toContain('</head>');
    });
    it('serves TypeScript with transpilation', async () => {
        const res = await fetch(`http://localhost:${port}/main.ts`);
        expect(res.ok).toBe(true);
        const js = await res.text();
        expect(js).toContain('console.log');
        expect(js).toContain('import.meta.hot');
    });
    it('serves CSS', async () => {
        const res = await fetch(`http://localhost:${port}/style.css`);
        expect(res.ok).toBe(true);
        const css = await res.text();
        expect(css).toContain('color: red');
    });
    it('returns 404 for missing files', async () => {
        const res = await fetch(`http://localhost:${port}/nonexistent.html`);
        expect(res.status).toBe(404);
    });
    it('serves HMR client script', async () => {
        const res = await fetch(`http://localhost:${port}/@hmr-client`);
        expect(res.ok).toBe(true);
        const js = await res.text();
        expect(js).toContain('WebSocket');
        expect(js).toContain('__MINI_DEV_HOT__');
    });
});
describe('DevServer proxy', () => {
    const proxyPort = 3096;
    const backendPort = 3097;
    let devServer;
    let backend;
    let root;
    beforeAll(async () => {
        root = await mkdtemp(join(tmpdir(), 'mini-dev-proxy-'));
        await writeFile(join(root, 'index.html'), '<html><body>ok</body></html>');
        backend = createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json', 'X-Backend': 'true' });
            res.end(JSON.stringify({ path: req.url, method: req.method }));
        });
        await new Promise((resolve) => backend.listen(backendPort, () => resolve()));
        devServer = new DevServer({
            root,
            port: proxyPort,
            verbose: false,
            proxy: { '/api': `http://localhost:${backendPort}` },
        });
        await devServer.start();
    });
    afterAll(async () => {
        await devServer.stop();
        await new Promise((resolve) => backend.close(() => resolve()));
        await rm(root, { recursive: true, force: true });
    });
    it('forwards matching path to target and returns response', async () => {
        const res = await fetch(`http://localhost:${proxyPort}/api/users?foo=1`);
        expect(res.ok).toBe(true);
        expect(res.headers.get('x-backend')).toBe('true');
        const data = await res.json();
        expect(data.path).toBe('/api/users?foo=1');
        expect(data.method).toBe('GET');
    });
    it('forwards subpaths under proxy path', async () => {
        const res = await fetch(`http://localhost:${proxyPort}/api/v2/items`);
        expect(res.ok).toBe(true);
        const data = await res.json();
        expect(data.path).toBe('/api/v2/items');
    });
    it('does not proxy non-matching paths', async () => {
        const res = await fetch(`http://localhost:${proxyPort}/index.html`);
        expect(res.ok).toBe(true);
        const html = await res.text();
        expect(html).toContain('ok');
        expect(res.headers.get('x-backend')).toBeNull();
    });
});
//# sourceMappingURL=dev-server.test.js.map