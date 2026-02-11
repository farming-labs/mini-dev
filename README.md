# mini-dev

A minimal dev server with HMR (Hot Module Replacement) for TypeScript, TSX, CSS, and HTML.

## Features

- **Zero config** — Works out of the box
- **Config file** — Optional `mini-dev.config.ts` or `mini-dev.config.js`
- **public/ directory** — Static assets (favicon, images, robots.txt) served at `/`
- **404 page** — Custom 404 with a list of visitable paths when a route is not found
- **Proxy** — Forward paths (e.g. `/api`) to another server so frontend and backend can run separately
- **Preview** — `mini-dev preview` to serve static build output (e.g. `./dist`) without HMR
- **TypeScript/TSX** — On-the-fly transpilation via esbuild
- **HMR** — Hot module replacement without full page reload
- **Simple API** — Programmatic and CLI usage

## Install

```bash
pnpm add @farming-labs/mini-dev
```

## Quick Start

### CLI

```bash
npx @farming-labs/mini-dev
# Server at http://localhost:3000

# Custom port and root
npx @farming-labs/mini-dev -p 5173 -r ./my-app

# Custom label (default: MINI-DEV)
npx @farming-labs/mini-dev -l MY-APP

# Open browser on start
npx @farming-labs/mini-dev -o

# Expose to network (access from other devices)
npx @farming-labs/mini-dev --host

# Serve under a subpath (e.g. https://example.com/app/)
npx @farming-labs/mini-dev --base /app/

# Silent mode (no logs; auto-enabled when CI=true)
npx @farming-labs/mini-dev -s

# Preview: serve static build (default: ./dist on port 4173)
npx @farming-labs/mini-dev preview
npx @farming-labs/mini-dev preview -r ./dist -p 4173
```

### Programmatic API

```ts
import { createDevServer } from '@farming-labs/mini-dev';

const { url, stop } = await createDevServer({ port: 3000 });
console.log('Running at', url);
// await stop(); // when done
```

### DevServer Class

```ts
import { DevServer } from '@farming-labs/mini-dev';

const server = new DevServer({
  root: './src',
  port: 3000,
  host: '0.0.0.0',
  verbose: true,
  label: 'MY-APP', // optional, defaults to MINI-DEV
});

const { port, url } = await server.start();
// await server.stop();
```

### Preview server

```ts
import { createPreviewServer } from '@farming-labs/mini-dev';

const { url, stop } = await createPreviewServer({ root: './dist', port: 4173 });
console.log('Preview at', url);
// await stop();
```

## Config

Optional config file in project root (`mini-dev.config.ts` or `mini-dev.config.js`):

```ts
// mini-dev.config.ts
import type { DevServerOptions } from '@farming-labs/mini-dev';

export default {
  port: 5173,
  open: true,
  label: 'MY-APP',
  // base: '/app/',  // serve at https://example.com/app/
  // proxy: { '/api': 'http://localhost:8080' },  // forward /api to backend
} satisfies Partial<DevServerOptions>;
```

CLI options override config.

## Static assets (public/)

Place files in a `public/` folder at the project root; they are served at `/`:

- `public/favicon.ico` → `/favicon.ico`
- `public/robots.txt` → `/robots.txt`
- `public/images/logo.png` → `/images/logo.png`

If `public/` does not exist, it is ignored.

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
