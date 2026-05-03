import { describe, expect, it } from 'vitest';
import {
  buildStatusPublicDemoArgs,
  resolveStatusPublicSmokeApiBase,
  STATUS_PUBLIC_SMOKE_ALIAS_ROUTE,
  STATUS_PUBLIC_SMOKE_ROUTE
} from './status-public-smoke-lib.mjs';

describe('status-public smoke helpers', () => {
  it('keeps the status route and legacy public alias explicit', () => {
    expect(STATUS_PUBLIC_SMOKE_ROUTE).toBe('/status');
    expect(STATUS_PUBLIC_SMOKE_ALIAS_ROUTE).toBe('/status/public');
  });

  it('prefers the explicit API base over backend origin and route base', () => {
    expect(
      resolveStatusPublicSmokeApiBase('http://127.0.0.1:4200', 'http://127.0.0.1:1157', 'http://127.0.0.1:9999')
    ).toBe('http://127.0.0.1:1157');
    expect(resolveStatusPublicSmokeApiBase('http://127.0.0.1:4200', null, 'http://127.0.0.1:1157')).toBe(
      'http://127.0.0.1:1157'
    );
    expect(resolveStatusPublicSmokeApiBase('http://127.0.0.1:4200')).toBe('http://127.0.0.1:4200');
  });

  it('builds the status demo command arguments in the expected order', () => {
    expect(
      buildStatusPublicDemoArgs(
        '/repo/script/dev/status-public-demo.py',
        'http://127.0.0.1:1157',
        'admin',
        'hertzbeat'
      )
    ).toEqual([
      '/repo/script/dev/status-public-demo.py',
      'seed-and-verify',
      'http://127.0.0.1:1157',
      'admin',
      'hertzbeat'
    ]);
  });
});
