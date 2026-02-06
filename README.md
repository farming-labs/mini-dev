# mini-dev

A minimal dev server with HMR (Hot Module Replacement) for TypeScript, TSX, CSS, and HTML.

## Features

- **Zero config** — Works out of the box
- **TypeScript/TSX** — On-the-fly transpilation via esbuild
- **HMR** — Hot module replacement without full page reload
- **Simple API** — Programmatic and CLI usage

## Install

```bash
pnpm add mini-dev
```

## Quick Start

### CLI

```bash
npx mini-dev
# Server at http://localhost:3000

# Custom port and root
npx mini-dev -p 5173 -r ./my-app
```

### Programmatic API

```ts
import { createDevServer } from 'mini-dev';

const { url, stop } = await createDevServer({ port: 3000 });
console.log('Running at', url);
// await stop(); // when done
```

### DevServer Class

```ts
import { DevServer } from 'mini-dev';

const server = new DevServer({
  root: './src',
  port: 3000,
  host: '0.0.0.0',
  verbose: true,
});

const { port, url } = await server.start();
// await server.stop();
```

## Example

See the [example](./example) directory:

```bash
cd example
pnpm dev
```

Edit `App.tsx` or `style.css` and save — changes apply via HMR without a full reload.

## API Reference

See [docs/API.md](./docs/API.md) for full API documentation.

## Development

```bash
pnpm install
pnpm build
pnpm test
```
