import { describe, it, expect, afterAll } from 'vitest';
import { createDevServer } from './index.js';
import { writeFile, rm } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('createDevServer API', () => {
  let instance: Awaited<ReturnType<typeof createDevServer>>;
  let root: string;

  it('starts server and returns url', async () => {
    root = await mkdtemp(join(tmpdir(), 'mini-dev-api-'));
    await writeFile(join(root, 'index.html'), '<html><body>ok</body></html>');

    instance = await createDevServer({ root, port: 3098 });

    expect(instance.port).toBe(3098);
    expect(instance.url).toContain('3098');
    expect(instance.server).toBeDefined();
    expect(typeof instance.stop).toBe('function');

    const res = await fetch(instance.url + '/index.html');
    expect(res.ok).toBe(true);
  });

  afterAll(async () => {
    if (instance) await instance.stop();
    if (root) await rm(root, { recursive: true, force: true });
  });
});
