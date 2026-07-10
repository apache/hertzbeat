import { describe, expect, it } from 'vitest';
import { DEFAULT_TRACE_TABLE_COLUMNS, buildTraceRouteUrl, buildTraceUrls, queryStateFromParams, readTraceManageRouteState, resolveTraceExplorerView, resolveTraceListPageSize, resolveTraceSpanScope, resolveTraceTableColumns } from './query-state';

describe('trace query state codec', () => {
  it('reads query state from search params', () => {
    const params = new URLSearchParams('traceId=abc123&spanId=span456&serviceName=checkout&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route%20CONTAINS%20checkout&operationName=GET%20%2Fcheckout&minDurationMs=100&maxDurationMs=500&groupBy=resource%3Aservice.version&groupLimit=7&groupOrder=latency-p95-desc&groupMinCount=5&errorOnly=true');
    expect(queryStateFromParams(params)).toEqual({
      traceId: 'abc123',
      spanId: 'span456',
      serviceName: 'checkout',
      resourceFilter: 'service.version=1.2.3',
      attributeFilter: 'http.route CONTAINS checkout',
      operationName: 'GET /checkout',
      minDurationMs: '100',
      maxDurationMs: '500',
      groupBy: 'resource:service.version',
      groupLimit: '7',
      groupOrder: 'latency-p95-desc',
      groupMinCount: '5',
      errorOnly: true,
      spanScope: 'root',
      listPageSize: '8',
      listPageIndex: '0',
      columns: DEFAULT_TRACE_TABLE_COLUMNS
    });
  });

  it('normalizes multi-value URL search params into the first trace manage query value', () => {
    const routeState = readTraceManageRouteState({
      traceId: [' trace-123 ', 'trace-ignored'],
      spanId: [' span-456 ', 'span-ignored'],
      serviceName: [' checkout ', 'payments'],
      resourceFilter: [' service.version=1.2.3 ', 'service.version=ignored'],
      attributeFilter: [' http.route CONTAINS checkout ', 'http.route CONTAINS ignored'],
      groupBy: [' resource:service.version ', 'resource:host.name'],
      groupLimit: [' 7 ', '12'],
      groupOrder: [' error-count-desc ', 'latency-p95-desc'],
      groupMinCount: [' 5 ', '9'],
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
      resourceFilter: 'service.version=1.2.3',
      attributeFilter: 'http.route CONTAINS checkout',
      operationName: '',
      minDurationMs: '',
      maxDurationMs: '',
      groupBy: 'resource:service.version',
      groupLimit: '7',
      groupOrder: 'error-count-desc',
      groupMinCount: '5',
      errorOnly: true,
      spanScope: 'root',
      listPageSize: '8',
      listPageIndex: '0',
      columns: DEFAULT_TRACE_TABLE_COLUMNS
    });
    expect(routeState.currentView).toBe('list');
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
    expect(buildTraceRouteUrl({ traceId: '', spanId: '', serviceName: '', errorOnly: false, spanScope: 'root' })).toBe('/trace/manage');
    expect(buildTraceRouteUrl({ traceId: '', spanId: '', serviceName: '', errorOnly: false, spanScope: 'root' }, { view: 'time-series' })).toBe(
      '/trace/manage?view=time-series'
    );
  });

  it('preserves span selection in the route url only', () => {
    expect(buildTraceRouteUrl({ traceId: 'abc123', spanId: 'span456', serviceName: 'checkout', groupBy: 'resource:service.version', errorOnly: false, spanScope: 'root' })).toBe(
      '/trace/manage?traceId=abc123&spanId=span456&serviceName=checkout&groupBy=resource%3Aservice.version'
    );
    expect(buildTraceRouteUrl({ traceId: 'abc123', spanId: 'span456', serviceName: 'checkout', errorOnly: false, spanScope: 'root' }, { view: 'table' })).toBe(
      '/trace/manage?traceId=abc123&spanId=span456&serviceName=checkout&view=table'
    );
    expect(buildTraceRouteUrl({ traceId: 'abc123', spanId: 'span456', serviceName: 'checkout', errorOnly: false, spanScope: 'all' }, { view: 'table' })).toBe(
      '/trace/manage?traceId=abc123&spanId=span456&serviceName=checkout&spanScope=all&view=table'
    );
    expect(buildTraceRouteUrl({ traceId: 'abc123', spanId: 'span456', serviceName: 'checkout', errorOnly: false, spanScope: 'all', columns: ['service', 'duration', 'trace-id'] }, { view: 'table' })).toBe(
      '/trace/manage?traceId=abc123&spanId=span456&serviceName=checkout&spanScope=all&columns=start%2Cservice%2Cduration%2Ctrace-id&view=table'
    );
  });

  it('resolves explorer view aliases from route params', () => {
    expect(resolveTraceExplorerView(new URLSearchParams())).toBe('list');
    expect(resolveTraceExplorerView(new URLSearchParams('view=trace'))).toBe('trace');
    expect(resolveTraceExplorerView(new URLSearchParams('view=traces'))).toBe('trace');
    expect(resolveTraceExplorerView(new URLSearchParams('view=time-series'))).toBe('time-series');
    expect(resolveTraceExplorerView(new URLSearchParams('view=timeseries'))).toBe('time-series');
    expect(resolveTraceExplorerView(new URLSearchParams('view=table'))).toBe('table');
  });

  it('resolves span scope aliases from route params', () => {
    expect(resolveTraceSpanScope(new URLSearchParams())).toBe('root');
    expect(resolveTraceSpanScope(new URLSearchParams('spanScope=root'))).toBe('root');
    expect(resolveTraceSpanScope(new URLSearchParams('spanScope=all'))).toBe('all');
    expect(resolveTraceSpanScope(new URLSearchParams('spanScope=all-spans'))).toBe('all');
    expect(resolveTraceSpanScope(new URLSearchParams('spanScope=entrypoint'))).toBe('entrypoint');
    expect(resolveTraceSpanScope(new URLSearchParams('spanScope=entrypoint-spans'))).toBe('entrypoint');
    expect(resolveTraceSpanScope(new URLSearchParams('spanScope=entry'))).toBe('entrypoint');
  });

  it('resolves list page size aliases from route params', () => {
    expect(resolveTraceListPageSize(new URLSearchParams())).toBe('8');
    expect(resolveTraceListPageSize(new URLSearchParams('listPageSize=50'))).toBe('50');
    expect(resolveTraceListPageSize(new URLSearchParams('spansPerPage=200'))).toBe('200');
    expect(resolveTraceListPageSize(new URLSearchParams('listPageSize=500'))).toBe('8');
    expect(resolveTraceListPageSize(new URLSearchParams('listPageSize=12'))).toBe('8');
  });

  it('resolves trace table column aliases from route params', () => {
    expect(resolveTraceTableColumns(new URLSearchParams())).toEqual(DEFAULT_TRACE_TABLE_COLUMNS);
    expect(resolveTraceTableColumns(new URLSearchParams('columns=duration,service,traceId,unknown,service'))).toEqual(['start', 'service', 'duration', 'trace-id']);
    expect(resolveTraceTableColumns(new URLSearchParams('columns=unknown'))).toEqual(DEFAULT_TRACE_TABLE_COLUMNS);
  });

  it('builds list and overview urls from query state', () => {
    expect(
      buildTraceUrls({
        traceId: 'abc123',
        spanId: 'span456',
        serviceName: 'checkout',
        resourceFilter: 'service.version=1.2.3',
        attributeFilter: 'http.route CONTAINS checkout',
        operationName: 'GET /checkout',
        minDurationMs: '100',
        maxDurationMs: '500',
        groupBy: 'resource:service.version',
        groupLimit: '7',
        groupOrder: 'latency-p95-desc',
        groupMinCount: '5',
        errorOnly: true,
        spanScope: 'root',
        listPageSize: '50',
        listPageIndex: '2'
      })
    ).toEqual({
      listUrl: '/traces/list?pageIndex=2&pageSize=50&traceId=abc123&serviceName=checkout&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route+CONTAINS+checkout&operationName=GET+%2Fcheckout&minDurationMs=100&maxDurationMs=500&errorOnly=true&spanScope=root',
      overviewUrl: '/traces/stats/overview?traceId=abc123&serviceName=checkout&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route+CONTAINS+checkout&operationName=GET+%2Fcheckout&minDurationMs=100&maxDurationMs=500&errorOnly=true&spanScope=root',
      groupByUrl: '/traces/stats/group-by?traceId=abc123&serviceName=checkout&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route+CONTAINS+checkout&operationName=GET+%2Fcheckout&minDurationMs=100&maxDurationMs=500&errorOnly=true&spanScope=root&groupBy=resource%3Aservice.version&limit=7&orderBy=latency-p95-desc&minCount=5'
    });
    expect(buildTraceRouteUrl({ traceId: 'abc123', spanId: 'span456', serviceName: 'checkout', errorOnly: false, spanScope: 'root', listPageSize: '50', listPageIndex: '2' })).toBe(
      '/trace/manage?traceId=abc123&spanId=span456&serviceName=checkout&listPageSize=50&listPageIndex=2'
    );
    expect(queryStateFromParams(new URLSearchParams('listPageIndex=3&listPageSize=100')).listPageIndex).toBe('3');
    expect(queryStateFromParams(new URLSearchParams('listPageIndex=-1&listPageSize=100')).listPageIndex).toBe('0');
    expect(buildTraceUrls({ traceId: 'abc123', spanId: 'span456', serviceName: 'checkout', errorOnly: true, spanScope: 'entrypoint' })).toMatchObject({
      listUrl: '/traces/list?pageIndex=0&pageSize=8&traceId=abc123&serviceName=checkout&errorOnly=true&spanScope=entrypoint',
      overviewUrl: '/traces/stats/overview?traceId=abc123&serviceName=checkout&errorOnly=true&spanScope=entrypoint'
    });
    expect(
      buildTraceUrls({ traceId: '', spanId: '', serviceName: 'checkout', minDurationMs: '-1', maxDurationMs: '12.5', errorOnly: false, spanScope: 'root' })
    ).toEqual({
      listUrl: '/traces/list?pageIndex=0&pageSize=8&serviceName=checkout&spanScope=root',
      overviewUrl: '/traces/stats/overview?serviceName=checkout&spanScope=root'
    });
  });

  it('preserves signal-route context for exact trace list and overview urls', () => {
    expect(
      buildTraceUrls(
        { traceId: 'abc123', spanId: 'span456', serviceName: 'checkout', errorOnly: true, spanScope: 'root' },
        {
          entityId: '42',
          entityType: 'service',
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
        '/traces/list?pageIndex=0&pageSize=8&traceId=abc123&serviceName=checkout&errorOnly=true&spanScope=root&entityId=42&entityType=service&serviceNamespace=payments&environment=prod&start=1713200000000&end=1713203600000',
      overviewUrl:
        '/traces/stats/overview?traceId=abc123&serviceName=checkout&errorOnly=true&spanScope=root&entityId=42&entityType=service&serviceNamespace=payments&environment=prod&start=1713200000000&end=1713203600000'
    });
  });

  it('keeps entity context as a broad trace filter when no exact trace id is present', () => {
    expect(
      buildTraceUrls(
        { traceId: '', spanId: '', serviceName: 'checkout', errorOnly: true, spanScope: 'root' },
        {
          entityId: '42',
          entityType: 'service',
          serviceNamespace: 'payments',
          environment: 'prod'
        }
      )
    ).toEqual({
      listUrl:
        '/traces/list?pageIndex=0&pageSize=8&serviceName=checkout&errorOnly=true&spanScope=root&entityId=42&entityType=service&serviceNamespace=payments&environment=prod',
      overviewUrl:
        '/traces/stats/overview?serviceName=checkout&errorOnly=true&spanScope=root&entityId=42&entityType=service&serviceNamespace=payments&environment=prod'
    });
  });

  it('rejects decimal route context time bounds instead of rounding them into trace API calls', () => {
    expect(
      buildTraceUrls(
        { traceId: 'd7929ee1f228c6b7260c0d474f2f5e05', spanId: 'c940851ebb7bb449', serviceName: 'HertzBeat', errorOnly: false, spanScope: 'root' },
        {
          start: '1777484896189.989',
          end: '1777485856189.989'
        }
      )
    ).toEqual({
      listUrl:
        '/traces/list?pageIndex=0&pageSize=8&traceId=d7929ee1f228c6b7260c0d474f2f5e05&serviceName=HertzBeat&spanScope=root',
      overviewUrl:
        '/traces/stats/overview?traceId=d7929ee1f228c6b7260c0d474f2f5e05&serviceName=HertzBeat&spanScope=root'
    });
  });
});
