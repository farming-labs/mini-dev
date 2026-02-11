#!/usr/bin/env node

import { resolve, join } from 'node:path';
import { DevServer } from './dev-server.js';
import { PreviewServer } from './preview-server.js';
import { loadConfig } from './load-config.js';

const args = process.argv.slice(2);
const isPreview = args[0] === 'preview';
if (isPreview) args.shift();

let port = isPreview ? 4173 : 3000;
let root = isPreview ? join(process.cwd(), 'dist') : process.cwd();
let verbose = false;
let silent: boolean | undefined;
let label: string | undefined;
let open = false;
let host: string | undefined;
let base: string | undefined;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '-p':
    case '--port':
      port = parseInt(args[++i] ?? String(isPreview ? 4173 : 3000), 10);
      break;
    case '-r':
    case '--root':
      root = resolve(args[++i] ?? (isPreview ? join(process.cwd(), 'dist') : process.cwd()));
      break;
    case '-l':
    case '--label':
      label = args[++i];
      break;
    case '-o':
    case '--open':
      open = true;
      break;
    case '--host':
      host = args[i + 1] && !args[i + 1].startsWith('-') ? args[++i] : '0.0.0.0';
      break;
    case '--base':
      base = args[++i] ?? '';
      break;
    case '-s':
    case '--silent':
      silent = true;
      break;
    case '-v':
    case '--verbose':
      verbose = true;
      break;
    case '-h':
    case '--help':
      if (isPreview) {
        console.log(`
mini-dev preview - Serve static build output

Usage:
  mini-dev preview [options]

Options:
  -p, --port <number>  Port to listen on (default: 4173)
  -r, --root <path>    Root directory to serve (default: ./dist)
  -l, --label <name>   Label in logs (default: MINI-DEV preview)
  -o, --open           Open browser on start
  --host [addr]        Expose to network (default: 0.0.0.0)
  --base <path>        Base path, e.g. /app/
  -s, --silent         Disable all logs
  -h, --help           Show this help
`);
      } else {
        console.log(`
mini-dev - Minimal dev server with HMR

Usage:
  mini-dev [options]
  mini-dev preview [options]

Commands:
  (default)  Start dev server with HMR
  preview    Serve static build (e.g. ./dist) without HMR

Options:
  -p, --port <number>  Port to listen on (default: 3000 / 4173 for preview)
  -r, --root <path>    Root directory (default: cwd / ./dist for preview)
  -l, --label <name>   Dev server label in logs (default: MINI-DEV)
  -o, --open           Open browser on start
  --host [addr]        Expose to network (default: 0.0.0.0)
  --base <path>        Base path, e.g. /app/ for serving under /app/
  -s, --silent         Disable all logs (auto-enabled when CI=true)
  -v, --verbose        Enable verbose logging
  -h, --help           Show this help
`);
      }
      process.exit(0);
  }
}

if (isPreview) {
  const config = await loadConfig(process.cwd());
  const server = new PreviewServer({
    ...config,
    root,
    port,
    ...(host !== undefined && { host }),
    ...(base !== undefined && { base }),
    open: open || config.open,
    ...(label && { label }),
    ...(silent !== undefined && { silent }),
  });
  await server.start();
} else {
  const config = await loadConfig(root);
  const server = new DevServer({
    ...config,
    root,
    port,
    ...(host !== undefined && { host }),
    ...(base !== undefined && { base }),
    verbose: verbose || config.verbose,
    open: open || config.open,
    ...(label && { label }),
    ...(silent !== undefined && { silent }),
  });
  await server.start();
}
