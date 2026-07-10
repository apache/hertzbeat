import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  parseStartArgs,
  prepareStandaloneAssets,
  resolveStandalonePaths
} from './standalone-server.mjs';

describe('standalone-server', () => {
  const originalDistDir = process.env.NEXT_DIST_DIR;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalDistDir === undefined) {
      delete process.env.NEXT_DIST_DIR;
    } else {
      process.env.NEXT_DIST_DIR = originalDistDir;
    }
  });

  it('keeps npm start port flags compatible with the previous next start command', () => {
    expect(parseStartArgs(['-p', '4300'], {})).toEqual({
      port: '4300',
      hostname: '0.0.0.0'
    });
    expect(parseStartArgs(['--port=4400', '--host', '127.0.0.1'], {})).toEqual({
      port: '4400',
      hostname: '127.0.0.1'
    });
    expect(parseStartArgs([], { PORT: '4500', HOSTNAME: '127.0.0.2' })).toEqual({
      port: '4500',
      hostname: '127.0.0.2'
    });
  });

  it('copies public and next static assets into the standalone app tree', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'hertzbeat-standalone-'));
    await mkdir(path.join(root, 'public'), { recursive: true });
    await mkdir(path.join(root, '.next', 'static', 'chunks'), { recursive: true });
    await mkdir(path.join(root, '.next', 'standalone', 'web-next'), { recursive: true });
    await writeFile(path.join(root, 'public', 'placeholder'), '');
    await writeFile(path.join(root, '.next', 'static', 'chunks', 'main.js'), 'console.log("ready");');
    await writeFile(path.join(root, '.next', 'standalone', 'web-next', 'server.js'), 'server');

    const result = await prepareStandaloneAssets(root);

    expect(result.copiedStatic).toBe(true);
    expect(result.copiedPublic).toBe(true);
    expect(resolveStandalonePaths(root).targetStaticDir).toBe(path.join(root, '.next', 'standalone', 'web-next', '.next', 'static'));
  });
});
