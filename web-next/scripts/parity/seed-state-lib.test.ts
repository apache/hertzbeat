import { describe, expect, it, vi } from 'vitest';
import {
  applySeedContextToRoutePair,
  resolveSeedContext,
  routePairNeedsSeedContext,
  runTraceRichDemoSeed
} from './seed-state-lib.mjs';

describe('parity seed-state helpers', () => {
  it('rewrites trace-manage parity routes to the seeded rich-demo deep link', () => {
    expect(
      applySeedContextToRoutePair(
        {
          seedState: 'trace-rich-demo',
          nextRoute: '/trace/manage',
          referenceRoute: '/trace/manage'
        },
        {
          traceManageDeepLinkRoute:
            '/trace/manage?traceId=trace-ui-rich-demo-1776751800000&serviceName=checkout-service&errorOnly=true&start=1776751200000&end=1776751800000&returnTo=%2Foverview&serviceNamespace=storefront&environment=dev'
        }
      )
    ).toMatchObject({
      nextRoute:
        '/trace/manage?traceId=trace-ui-rich-demo-1776751800000&serviceName=checkout-service&errorOnly=true&start=1776751200000&end=1776751800000&returnTo=%2Foverview&serviceNamespace=storefront&environment=dev',
      referenceRoute:
        '/trace/manage?traceId=trace-ui-rich-demo-1776751800000&serviceName=checkout-service&errorOnly=true&start=1776751200000&end=1776751800000&returnTo=%2Foverview&serviceNamespace=storefront&environment=dev'
    });
  });

  it('can drop the seeded trace selection from the reference deep link when parity needs a stable list-state route', () => {
    expect(
      applySeedContextToRoutePair(
        {
          seedState: 'trace-rich-demo',
          referenceRouteMode: 'drop-trace-selection',
          nextRoute: '/trace/manage',
          referenceRoute: '/trace/manage'
        },
        {
          traceManageDeepLinkRoute:
            '/trace/manage?traceId=trace-ui-rich-demo-1776751800000&spanId=trace-ui-rich-demo-1776751800000-db&serviceName=checkout-service&errorOnly=true&start=1776751200000&end=1776751800000&returnTo=%2Foverview&serviceNamespace=storefront&environment=dev'
        }
      )
    ).toMatchObject({
      nextRoute:
        '/trace/manage?traceId=trace-ui-rich-demo-1776751800000&spanId=trace-ui-rich-demo-1776751800000-db&serviceName=checkout-service&errorOnly=true&start=1776751200000&end=1776751800000&returnTo=%2Foverview&serviceNamespace=storefront&environment=dev',
      referenceRoute:
        '/trace/manage?serviceName=checkout-service&errorOnly=true&start=1776751200000&end=1776751800000&returnTo=%2Foverview&serviceNamespace=storefront&environment=dev'
    });
  });

  it('replaces hardcoded monitor fixture ids with the live monitor id', () => {
    expect(
      applySeedContextToRoutePair(
        {
          seedState: 'monitor-fixture',
          nextRoute: '/monitors/1/edit',
          referenceRoute: '/monitors/1'
        },
        { monitorId: '42' }
      )
    ).toMatchObject({
      nextRoute: '/monitors/42/edit',
      referenceRoute: '/monitors/42'
    });
  });

  it('loads the first live monitor id for monitor-fixture routes', async () => {
    const loginWithPasswordImpl = vi.fn(async () => ({
      token: 'token',
      refreshToken: 'refresh'
    }));
    const requestMessageImpl = vi.fn(async () => ({
      code: 0,
      data: {
        content: [{ id: 42 }]
      }
    }));
    const requireMessageDataImpl = vi.fn(payload => payload.data);

    await expect(
      resolveSeedContext({
        seedState: 'monitor-fixture',
        authState: 'session',
        baseUrl: 'http://127.0.0.1:4200',
        identifier: 'admin',
        credential: 'hertzbeat',
        loginWithPasswordImpl,
        requestMessageImpl,
        requireMessageDataImpl
      })
    ).resolves.toEqual({ monitorId: '42' });

    expect(loginWithPasswordImpl).toHaveBeenCalledWith('http://127.0.0.1:4200', 'admin', 'hertzbeat', 0);
    expect(requestMessageImpl).toHaveBeenCalledWith('http://127.0.0.1:4200', '/api/monitors?pageIndex=0&pageSize=1', {
      token: 'token'
    });
  });

  it('skips auth-backed resolution for routes without a live seed requirement', async () => {
    const loginWithPasswordImpl = vi.fn();

    await expect(
      resolveSeedContext({
        seedState: 'none',
        authState: 'public',
        baseUrl: 'http://127.0.0.1:4200',
        identifier: 'admin',
        credential: 'hertzbeat',
        loginWithPasswordImpl
      })
    ).resolves.toEqual({});

    expect(loginWithPasswordImpl).not.toHaveBeenCalled();
  });

  it('does not require a live entity seed when the route pair has no entity-id placeholder', () => {
    expect(
      routePairNeedsSeedContext({
        seedState: 'entity-fixture',
        nextRoute: '/entities',
        referenceRoute: '/entities'
      })
    ).toBe(false);

    expect(
      routePairNeedsSeedContext({
        seedState: 'entity-fixture',
        nextRoute: '/entities/1/edit',
        referenceRoute: '/entities/1/edit'
      })
    ).toBe(true);
  });

  it('always requires a live trace rich-demo seed even though the route path has no placeholder id', () => {
    expect(
      routePairNeedsSeedContext({
        seedState: 'trace-rich-demo',
        nextRoute: '/trace/manage',
        referenceRoute: '/trace/manage'
      })
    ).toBe(true);
  });

  it('falls back to the placeholder entity id when the live entity list endpoint returns 404', async () => {
    const loginWithPasswordImpl = vi.fn(async () => ({
      token: 'token',
      refreshToken: 'refresh'
    }));
    const requestMessageImpl = vi.fn(async () => {
      throw new Error('GET /api/entities?pageIndex=0&pageSize=1 failed with HTTP 404: not found');
    });
    const requireMessageDataImpl = vi.fn();

    await expect(
      resolveSeedContext({
        seedState: 'entity-fixture',
        authState: 'session',
        baseUrl: 'http://127.0.0.1:4200',
        identifier: 'admin',
        credential: 'hertzbeat',
        loginWithPasswordImpl,
        requestMessageImpl,
        requireMessageDataImpl
      })
    ).resolves.toEqual({ entityId: '1' });

    expect(requireMessageDataImpl).not.toHaveBeenCalled();
  });

  it('seeds a deterministic trace rich-demo route for populated parity screenshots', async () => {
    const runTraceRichDemoSeedImpl = vi.fn(async () => undefined);

    await expect(
      resolveSeedContext({
        seedState: 'trace-rich-demo',
        authState: 'session',
        baseUrl: 'http://127.0.0.1:4200',
        identifier: 'admin',
        credential: 'hertzbeat',
        nowMs: 1_776_751_800_000,
        runTraceRichDemoSeedImpl
      })
    ).resolves.toEqual({
      traceManageDeepLinkRoute:
        '/trace/manage?traceId=trace-ui-rich-demo-1776751800000&serviceName=checkout-service&errorOnly=true&start=1776751200000&end=1776751800000&returnTo=%2Foverview&serviceNamespace=storefront&environment=dev'
    });

    expect(runTraceRichDemoSeedImpl).toHaveBeenCalledWith({
      traceWindowEndMs: '1776751800000'
    });
  });

  it('skips the external trace rich-demo seed when parity stubs own both capture surfaces', async () => {
    const runTraceRichDemoSeedImpl = vi.fn(async () => undefined);

    await expect(
      resolveSeedContext({
        seedState: 'trace-rich-demo',
        authState: 'session',
        baseUrl: 'http://127.0.0.1:4200',
        identifier: 'admin',
        credential: 'hertzbeat',
        nowMs: 1_776_751_800_000,
        skipExternalSeed: true,
        runTraceRichDemoSeedImpl
      })
    ).resolves.toEqual({
      traceManageDeepLinkRoute:
        '/trace/manage?traceId=trace-ui-rich-demo-1776751800000&serviceName=checkout-service&errorOnly=true&start=1776751200000&end=1776751800000&returnTo=%2Foverview&serviceNamespace=storefront&environment=dev'
    });

    expect(runTraceRichDemoSeedImpl).not.toHaveBeenCalled();
  });

  it('pins the parity rich-demo seeding call to the mapped local Greptime HTTP endpoint', async () => {
    const execFileSyncImpl = vi.fn(() => '');

    await runTraceRichDemoSeed({
      traceWindowEndMs: '1776751800000',
      execFileSyncImpl
    });

    expect(execFileSyncImpl).toHaveBeenCalledWith(
      'bash',
      [expect.stringContaining('seed-trace-rich-demo.sh')],
      expect.objectContaining({
        cwd: expect.stringContaining('/Users/zhaoqingran/IdeaProjects/hertzbeat'),
        encoding: 'utf8',
        stdio: 'pipe',
        env: expect.objectContaining({
          TRACE_WINDOW_END_MS: '1776751800000',
          GREPTIME_HTTP: 'http://127.0.0.1:14000'
        })
      })
    );
  });
});
