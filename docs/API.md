# mini-dev API Reference

## Config File

Optional `mini-dev.config.ts` or `mini-dev.config.js` in project root. CLI options override config.

## Static assets (public/)

Files in `public/` are served at `/` (e.g. `public/favicon.ico` → `/favicon.ico`). No `public/` directory is required.

### 404 page

When a path is not found, the server returns an HTML 404 page that lists available paths (root files and `public/` contents) as clickable links.

## `createDevServer(options?)`

Create and start a dev server. Returns a promise that resolves to `{ server, port, url, stop }`.

```ts
import { createDevServer } from '@farming-labs/mini-dev';

const { server, port, url, stop } = await createDevServer({ port: 3000 });
console.log(`Server at ${url}`);
// Later: await stop();
```

## `DevServer`

Class for programmatic control.

### Constructor

```ts
new DevServer(options?: DevServerOptions)
```

### Options (`DevServerOptions`)

| Option   | Type                     | Default         | Description                    |
| -------- | ------------------------ | --------------- | ------------------------------ |
| `root`   | `string`                 | `process.cwd()` | Root directory to serve        |
| `port`   | `number`                 | `3000`          | Port to listen on              |
| `host`   | `string`                 | `'0.0.0.0'`     | Host to bind to                |
| `verbose`| `boolean`                | `false`         | Enable verbose logging         |
| `ignored`| `string \| RegExp \| []`  | `node_modules`  | Paths to ignore when watching  |
| `label`  | `string`                 | `'MINI-DEV'`    | Custom label for terminal + HMR logs |
| `silent` | `boolean`                | `process.env.CI === 'true'` | Disable all logs (terminal + browser) |
| `open`   | `boolean`                | `false`                     | Open browser on start |
| `base`   | `string`                 | —                           | Base path (e.g. `'/app/'`) so the app is served at `https://example.com/app/`; assets and routes use this path |
| `proxy`  | `Record<string, string> \| Array<{ path, target }>` | — | Forward matching paths to another server (e.g. `{ '/api': 'http://localhost:8080' }`). Longest path match wins. |

### Proxy

Forward specific paths to a backend so the frontend can call the same origin in dev:

```ts
// Object form
proxy: {
  '/api': 'http://localhost:8080',
  '/ws': 'http://localhost:8081',
}

// Array form (same effect)
proxy: [
  { path: '/api', target: 'http://localhost:8080' },
  { path: '/ws', target: 'http://localhost:8081' },
]
```

Requests to `/api/...` are proxied to `http://localhost:8080/api/...`. Path is matched against the logical path (under `base` if set). First matching rule (longest path first) is used. Returns 502 if the target is unreachable.

### Methods

- **`start(): Promise<{ port, url }>`** — Start the server. Returns port and URL.
- **`stop(): Promise<void>`** — Stop the server and clean up.

## `createPreviewServer(options?)`

Create and start a preview server for static build output (no HMR, no transpilation).

```ts
import { createPreviewServer } from '@farming-labs/mini-dev';

const { server, port, url, stop } = await createPreviewServer({ root: './dist', port: 4173 });
```

### `PreviewServer` options

| Option   | Type     | Default | Description |
| -------- | -------- | ------- | ----------- |
| `root`   | `string` | `./dist` | Root directory to serve |
| `port`   | `number` | `4173` | Port |
| `host`   | `string` | `127.0.0.1` | Host |
| `base`   | `string` | — | Base path |
| `proxy`  | same as DevServer | — | Proxy paths |
| `open`   | `boolean` | `false` | Open browser on start |
| `silent` | `boolean` | `process.env.CI === 'true'` | Disable logs |
| `label`  | `string` | `'MINI-DEV preview'` | Label in logs |

## CLI

```bash
mini-dev [options]
mini-dev preview [options]
```

**Commands:** `(default)` — dev server with HMR; `preview` — static build server.

| Flag         | Description                |
| ------------ | -------------------------- |
| `-p, --port` | Port (default: 3000)       |
| `-r, --root` | Root directory (default: cwd) |
| `-l, --label` | Dev server label (default: MINI-DEV) |
| `-o, --open` | Open browser on start |
| `--host [addr]` | Expose to network (0.0.0.0) |
| `--base <path>` | Base path (e.g. `/app/`) for serving under a subpath |
| `-s, --silent` | Disable all logs |
| `-v, --verbose` | Verbose logging        |
| `-h, --help` | Show help                  |

## HMR

- HTML pages get the HMR client injected before `</head>`.
- TypeScript/TSX modules are transpiled on-the-fly and get `import.meta.hot.accept()`.
- On file change, connected clients receive a WebSocket message and re-import the updated module.
