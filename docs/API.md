# mini-dev API Reference

## Config File

Optional `mini-dev.config.ts` or `mini-dev.config.js` in project root. CLI options override config.

## Static assets (public/)

Files in `public/` are served at `/` (e.g. `public/favicon.ico` → `/favicon.ico`). No `public/` directory is required.

## 404 page

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

### Methods

- **`start(): Promise<{ port, url }>`** — Start the server. Returns port and URL.
- **`stop(): Promise<void>`** — Stop the server and clean up.

## CLI

```bash
mini-dev [options]
```

| Flag         | Description                |
| ------------ | -------------------------- |
| `-p, --port` | Port (default: 3000)       |
| `-r, --root` | Root directory (default: cwd) |
| `-l, --label` | Dev server label (default: MINI-DEV) |
| `-o, --open` | Open browser on start |
| `--host [addr]` | Expose to network (0.0.0.0) |
| `-s, --silent` | Disable all logs |
| `-v, --verbose` | Verbose logging        |
| `-h, --help` | Show help                  |

## HMR

- HTML pages get the HMR client injected before `</head>`.
- TypeScript/TSX modules are transpiled on-the-fly and get `import.meta.hot.accept()`.
- On file change, connected clients receive a WebSocket message and re-import the updated module.
