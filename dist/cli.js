#!/usr/bin/env node
import { resolve } from 'node:path';
import { DevServer } from './dev-server.js';
const args = process.argv.slice(2);
let port = 3000;
let root = process.cwd();
let verbose = false;
let silent;
let label;
for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '-p':
        case '--port':
            port = parseInt(args[++i] ?? '3000', 10);
            break;
        case '-r':
        case '--root':
            root = resolve(args[++i] ?? process.cwd());
            break;
        case '-l':
        case '--label':
            label = args[++i];
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
            console.log(`
mini-dev - Minimal dev server with HMR

Usage:
  mini-dev [options]

Options:
  -p, --port <number>  Port to listen on (default: 3000)
  -r, --root <path>    Root directory to serve (default: cwd)
  -l, --label <name>   Dev server label in logs (default: MINI-DEV)
  -s, --silent         Disable all logs (auto-enabled when CI=true)
  -v, --verbose        Enable verbose logging
  -h, --help           Show this help
`);
            process.exit(0);
    }
}
const server = new DevServer({
    root,
    port,
    verbose,
    ...(label && { label }),
    ...(silent !== undefined && { silent }),
});
await server.start();
//# sourceMappingURL=cli.js.map