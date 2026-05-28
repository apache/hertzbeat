import { describe, expect, it } from 'vitest';
import { buildTraceRouteUrl, buildTraceUrls, queryStateFromParams, readTraceManageRouteState } from './query-state';

describe('trace query state codec', () => {
  it('reads query state from search params', () => {
    const params = new URLSearchParams('traceId=abc123&spanId=span456&serviceName=checkout&errorOnly=true');
    expect(queryStateFromParams(params)).toEqual({
      traceId: 'abc123',
      spanId: 'span456',
      serviceName: 'checkout',
      errorOnly: true
    });
  });

  it('normalizes multi-value URL search params into the first trace manage query value', () => {
    const routeState = readTraceManageRouteState({
      traceId: [' trace-123 ', 'trace-ignored'],
      spanId: [' span-456 ', 'span-ignored'],
      serviceName: [' checkout ', 'payments'],
      errorOnly: ['true', 'false'],
      timeRange: ['last-1h', 'last-6h'],
      start: ['1713200000000.5', '1713200000000'],
      end: ['1713203600000', 'not-epoch'],
      entityId: ['7', '8'],
      entityName: ['Checkout API', 'Payments API'],
      serviceNamespace: ['payments', 'ignored'],
      environment: ['prod', 'staging'],
      returnTo: ['/overview?returnLabel=Overview', '/entities'],
      returnLabel: ['Overview', 'Entities']
    });

    expect(routeState.initialQuery).toEqual({
      traceId: 'trace-123',
      spanId: 'span-456',
      serviceName: 'checkout',
      errorOnly: true
    });
    expect(routeState.routeContext).toMatchObject({
      timeRange: 'last-1h',
      end: '1713203600000',
      entityId: '7',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      serviceNamespace: 'payments',
      environment: 'prod',
      returnTo: '/overview',
      traceId: 'trace-123',
      spanId: 'span-456'
    });
    expect(routeState.routeContext.start).toBeUndefined();
    expect(routeState.shouldCleanUrl).toBe(true);
  });

  it('builds a clean route url when empty', () => {
    expect(buildTraceRouteUrl({ traceId: '', spanId: '', serviceName: '', errorOnly: false })).toBe('/trace/manage');
  });

  it('preserves span selection in the route url only', () => {
    expect(buildTraceRouteUrl({ traceId: 'abc123', spanId: 'span456', serviceName: 'checkout', errorOnly: false })).toBe(
      '/trace/manage?traceId=abc123&spanId=span456&serviceName=checkout'
    );
  });

  it('builds list and overview urls from query state', () => {
    expect(
      buildTraceUrls({ traceId: 'abc123', spanId: 'span456', serviceName: 'checkout', errorOnly: true })
    ).toEqual({
      listUrl: '/traces/list?pageIndex=0&pageSize=8&traceId=abc123&serviceName=checkout&errorOnly=true',
      overviewUrl: '/traces/stats/overview?traceId=abc123&serviceName=checkout&errorOnly=true'
    });
  });

  it('preserves seeded signal-route context in trace list and overview urls when present', () => {
    expect(
      buildTraceUrls(
        { traceId: 'abc123', spanId: 'span456', serviceName: 'checkout', errorOnly: true },
        {
          entityId: '42',
          serviceNamespace: 'payments',
          environment: 'prod',
          timeRange: 'last-1h',
          start: '1713200000000',
          end: '1713203600000',
          refresh: '30',
          live: 'false',
          tz: 'Asia/Shanghai',
          returnTo: '/overview'
        }
      )
    ).toEqual({
      listUrl:
        '/traces/list?pageIndex=0&pageSize=8&traceId=abc123&serviceName=checkout&errorOnly=true&entityId=42&serviceNamespace=payments&environment=prod&start=1713200000000&end=1713203600000',
      overviewUrl:
        '/traces/stats/overview?traceId=abc123&serviceName=checkout&errorOnly=true&entityId=42&serviceNamespace=payments&environment=prod&start=1713200000000&end=1713203600000'
    });
  });

  it('rejects decimal route context time bounds instead of rounding them into trace API calls', () => {
    expect(
      buildTraceUrls(
        { traceId: 'd7929ee1f228c6b7260c0d474f2f5e05', spanId: 'c940851ebb7bb449', serviceName: 'HertzBeat', errorOnly: false },
        {
          start: '1777484896189.989',
          end: '1777485856189.989'
        }
      )
    ).toEqual({
      listUrl:
        '/traces/list?pageIndex=0&pageSize=8&traceId=d7929ee1f228c6b7260c0d474f2f5e05&serviceName=HertzBeat',
      overviewUrl:
        '/traces/stats/overview?traceId=d7929ee1f228c6b7260c0d474f2f5e05&serviceName=HertzBeat'
    });
  });
});
