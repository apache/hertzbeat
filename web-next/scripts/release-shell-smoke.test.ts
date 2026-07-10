import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { resolve } from 'node:path';
import {
  buildExpectedQueryEntries,
  findMismatchedQueryEntries,
  resolveNextRedirectDigestUrl
} from './release-shell-smoke.mjs';
import { resolveLocalReleaseLaunch } from './release-shell.mjs';

describe('release-shell smoke helpers', () => {
  it('normalizes expected query entries into string pairs', () => {
    expect(buildExpectedQueryEntries({ redirect: '/monitors?app=website', source: 'guard', empty: null })).toEqual([
      ['redirect', '/monitors?app=website'],
      ['source', 'guard']
    ]);
  });

  it('finds only query entries that do not match the resolved final URL', () => {
    const actualUrl = new URL(
      'http://127.0.0.1:1157/passport/login?redirect=%2Fmonitors%3Fapp%3Dwebsite&source=guard'
    );

    expect(findMismatchedQueryEntries(actualUrl, { redirect: '/monitors?app=website', source: 'guard' })).toEqual([]);
    expect(findMismatchedQueryEntries(actualUrl, { redirect: '/overview', source: 'guard' })).toEqual([
      ['redirect', '/overview']
    ]);
  });

  it('extracts next redirect digests into canonical urls for dev-mode smoke checks', () => {
    expect(
      resolveNextRedirectDigestUrl(
        '<script>self.__next_f.push([1,"35:E{\\"digest\\":\\"NEXT_REDIRECT;replace;/log/manage?search=checkout+timeout\\\\u0026view=stream;307;\\"}"])</script>',
        'http://127.0.0.1:4200'
      )
    ).toBe('http://127.0.0.1:4200/log/manage?search=checkout+timeout&view=stream');
    expect(resolveNextRedirectDigestUrl('<html><body>no redirect digest</body></html>', 'http://127.0.0.1:4200')).toBeNull();
  });

  it('runs release checks through the standalone server when a production build exists', async () => {
    const rootDir = await mkdtemp(resolve(os.tmpdir(), 'hertzbeat-release-shell-'));
    try {
      const appDir = resolve(rootDir, '.next', 'standalone', 'web-next');
      const serverFile = resolve(appDir, 'server.js');
      await mkdir(appDir, { recursive: true });
      await writeFile(resolve(rootDir, '.next', 'BUILD_ID'), 'build-id');
      await writeFile(serverFile, 'server');

      expect(resolveLocalReleaseLaunch({ port: 4300, rootDir })).toEqual({
        args: [serverFile],
        cwd: appDir,
        env: { PORT: '4300', HOSTNAME: '127.0.0.1' }
      });
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it('keeps the release route browser smoke on the required route and console contracts', () => {
    const source = readFileSync(resolve(process.cwd(), 'scripts/release-route-browser-smoke.spec.ts'), 'utf8');

    [
      '/overview',
      '/entities',
      '/entities/4200',
      '/ingestion/otlp/metrics',
      '/log/manage',
      '/trace/manage',
      '/topology',
      '/alert',
      '/ui-lab'
    ].forEach(route => {
      expect(source).toContain(route);
    });
    expect(source).toContain('Maximum update depth exceeded');
    expect(source).toContain('hydration failed');
    expect(source).toContain('data-theme');
    expect(source).toContain('dark-ops');
    expect(source).toContain('expectReleaseRouteReady');
    expect(source).toContain('Load failed');
    expect(source).toContain("currentUrl.pathname).not.toBe('/passport/login')");
  });
});
