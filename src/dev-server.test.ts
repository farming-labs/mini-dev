import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { DevServer } from './dev-server.js';
import { PreviewServer } from './preview-server.js';
import { parseEnvString, loadPublicEnv } from './load-env.js';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

describe('DevServer', () => {
  let server: DevServer;
  let root: string;
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
  let devServer: DevServer;
  let backend: Server;
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mini-dev-proxy-'));
    await writeFile(join(root, 'index.html'), '<html><body>ok</body></html>');

    backend = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Backend': 'true' });
      res.end(JSON.stringify({ path: req.url, method: req.method }));
    });
    await new Promise<void>((resolve) => backend.listen(backendPort, () => resolve()));

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
    await new Promise<void>((resolve) => backend.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  });

  it('forwards matching path to target and returns response', async () => {
    const res = await fetch(`http://localhost:${proxyPort}/api/users?foo=1`);
    expect(res.ok).toBe(true);
    expect(res.headers.get('x-backend')).toBe('true');
    const data = await res.json() as { path: string; method: string };
    expect(data.path).toBe('/api/users?foo=1');
    expect(data.method).toBe('GET');
  });

  it('forwards subpaths under proxy path', async () => {
    const res = await fetch(`http://localhost:${proxyPort}/api/v2/items`);
    expect(res.ok).toBe(true);
    const data = await res.json() as { path: string; method: string };
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

describe('PreviewServer', () => {
  const port = 3095;
  let server: PreviewServer;
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mini-dev-preview-'));
    await writeFile(join(root, 'index.html'), '<html><body>Preview</body></html>');
    await writeFile(join(root, 'asset.js'), 'console.log("built");');

    server = new PreviewServer({ root, port });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
    await rm(root, { recursive: true, force: true });
  });

  it('serves static files without HMR', async () => {
    const res = await fetch(`http://localhost:${port}/index.html`);
    expect(res.ok).toBe(true);
    const html = await res.text();
    expect(html).toContain('Preview');
    expect(html).not.toContain('@hmr-client');
  });

  it('serves other static assets', async () => {
    const res = await fetch(`http://localhost:${port}/asset.js`);
    expect(res.ok).toBe(true);
    expect(await res.text()).toContain('built');
  });

  it('redirects / to index.html', async () => {
    const res = await fetch(`http://localhost:${port}/`, { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('index.html');
  });

  it('returns 404 for missing files', async () => {
    const res = await fetch(`http://localhost:${port}/nonexistent.html`);
    expect(res.status).toBe(404);
  });
});

describe('DevServer env', () => {
  const port = 3094;
  let server: DevServer;
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mini-dev-env-'));
    await writeFile(join(root, 'index.html'), '<html><head></head><body>App</body></html>');
    const envPath = join(root, '.env');
    await writeFile(
      envPath,
      'PUBLIC_API_URL=http://localhost:8080\nSECRET_KEY=do-not-expose\nPUBLIC_APP_NAME=my-app'
    );
    expect(existsSync(envPath)).toBe(true);

    server = new DevServer({ root: resolve(root), port, verbose: false, env: {} });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
    await rm(root, { recursive: true, force: true });
  });

  it('serves /@env with only PUBLIC_ prefixed vars', async () => {
    const res = await fetch(`http://localhost:${port}/@env`);
    expect(res.ok).toBe(true);
    expect(res.headers.get('content-type')).toContain('javascript');
    const js = await res.text();
    expect(js).toContain('__MINI_DEV_ENV__');
    expect(js).toContain('PUBLIC_API_URL');
    expect(js).toContain('http://localhost:8080');
    expect(js).toContain('PUBLIC_APP_NAME');
    expect(js).toContain('my-app');
    expect(js).not.toContain('SECRET_KEY');
    expect(js).not.toContain('do-not-expose');
  });

  it('does not auto-inject env script into HTML (users add script tag if using getEnv)', async () => {
    const res = await fetch(`http://localhost:${port}/index.html`);
    expect(res.ok).toBe(true);
    const html = await res.text();
    expect(html).not.toContain('@env');
  });

  it('does not serve /@env when env is false', async () => {
    const noEnvRoot = await mkdtemp(join(tmpdir(), 'mini-dev-no-env-'));
    await writeFile(join(noEnvRoot, 'index.html'), '<html><head></head><body>App</body></html>');
    const noEnvServer = new DevServer({ root: noEnvRoot, port: 3093, verbose: false, env: false });
    await noEnvServer.start();

    const envRes = await fetch('http://localhost:3093/@env');
    expect(envRes.status).toBe(404);

    const htmlRes = await fetch('http://localhost:3093/index.html');
    const html = await htmlRes.text();
    expect(html).not.toContain('@env');

    await noEnvServer.stop();
    await rm(noEnvRoot, { recursive: true, force: true });
  });
});

describe('load-env', () => {
  it('parseEnvString parses KEY=value and strips quotes', () => {
    const out = parseEnvString('A=1\nB="two"\n# comment\nC=\n');
    expect(out).toEqual({ A: '1', B: 'two', C: '' });
  });

  it('loadPublicEnv returns only keys with prefix', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mini-dev-load-env-'));
    await writeFile(join(root, '.env'), 'PUBLIC_X=1\nPRIVATE_Y=2\nPUBLIC_Z=3\n');
    const env = await loadPublicEnv(root, 'PUBLIC_');
    await rm(root, { recursive: true, force: true });
    expect(env).toEqual({ PUBLIC_X: '1', PUBLIC_Z: '3' });
  });
});
