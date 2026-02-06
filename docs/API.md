# mini-dev API Reference

## `createDevServer(options?)`

Create and start a dev server. Returns a promise that resolves to `{ server, port, url, stop }`.

```ts
import { createDevServer } from '@kinfish/mini-dev';

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
| `-v, --verbose` | Verbose logging        |
| `-h, --help` | Show help                  |

## HMR

- HTML pages get the HMR client injected before `</head>`.
- TypeScript/TSX modules are transpiled on-the-fly and get `import.meta.hot.accept()`.
- On file change, connected clients receive a WebSocket message and re-import the updated module.
