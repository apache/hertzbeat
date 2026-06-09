import { describe, expect, it } from 'vitest';
import {
  buildLogCompatRouteUrl,
  buildLogCompatRouteUrlFromSearchParams,
  buildLogRouteUrl,
  buildLogStreamUrl,
  buildLogUrls,
  DEFAULT_LOG_DISPLAY_FORMAT,
  DEFAULT_LOG_MAX_LINES,
  copyLogRouteContextParams,
  DEFAULT_LOG_TABLE_COLUMNS,
  queryStateFromParams,
  readLogManageRouteState,
  resolveBrowserLogStreamUrl,
  resolveLogDisplayFormat,
  resolveLogFieldColumns,
  resolveLogMaxLines,
  resolveLogTableColumns,
  resolveLogWorkbenchView
} from './query-state';

describe('log query state codec', () => {
  it('reads query state from search params', () => {
    const params = new URLSearchParams('search=timeout&logContent=db%20down&traceId=abc123&spanId=span456&logTimeUnixNano=1713200000000000000&severityNumber=17&severityText=ERROR&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route%3A%2Fcheckout&groupBy=resource%3Aservice.version&groupLimit=7&groupOrder=count-asc&groupMinCount=5');
    expect(queryStateFromParams(params)).toEqual({
      search: 'timeout',
      logContent: 'db down',
      traceId: 'abc123',
      spanId: 'span456',
      logTimeUnixNano: '1713200000000000000',
      severityNumber: '17',
      severityText: 'ERROR',
      resourceFilter: 'service.version=1.2.3',
      attributeFilter: 'http.route:/checkout',
      groupBy: 'resource:service.version',
      groupLimit: '7',
      groupOrder: 'count-asc',
      groupMinCount: '5',
      columns: DEFAULT_LOG_TABLE_COLUMNS,
      displayFormat: DEFAULT_LOG_DISPLAY_FORMAT,
      maxLines: DEFAULT_LOG_MAX_LINES,
      listPageSize: '8',
      listPageIndex: '0'
    });
  });

  it('drops backend-incompatible severityNumber route params before building log APIs', () => {
    expect(queryStateFromParams(new URLSearchParams('severityNumber=17.8')).severityNumber).toBe('');
    expect(queryStateFromParams(new URLSearchParams('severityNumber=not-a-number')).severityNumber).toBe('');
    expect(queryStateFromParams(new URLSearchParams('severityNumber=25')).severityNumber).toBe('');

    const dirtyQuery = { search: '', logContent: '', traceId: '', spanId: '', severityNumber: 'not-a-number', severityText: '' };
    expect(buildLogRouteUrl(dirtyQuery)).toBe('/log/manage');
    expect(buildLogStreamUrl(dirtyQuery)).toBe('/api/logs/sse/subscribe');
  });

  it('keeps log line identity in routes without forwarding it to log APIs', () => {
    expect(queryStateFromParams(new URLSearchParams('logTimeUnixNano=1713200000000000000')).logTimeUnixNano).toBe('1713200000000000000');
    expect(queryStateFromParams(new URLSearchParams('logTimeUnixNano=1713200000000000000.5')).logTimeUnixNano).toBeUndefined();
    expect(queryStateFromParams(new URLSearchParams('logTimeUnixNano=not-time')).logTimeUnixNano).toBeUndefined();

    const query = {
      search: 'timeout',
      logContent: '',
      traceId: 'trace-123',
      spanId: 'span-456',
      logTimeUnixNano: '1713200000000000000',
      severityNumber: '',
      severityText: ''
    };
    expect(buildLogRouteUrl(query, { view: 'table' })).toBe('/log/manage?search=timeout&traceId=trace-123&spanId=span-456&logTimeUnixNano=1713200000000000000&view=table');
    expect(buildLogUrls(query).listUrl).toBe('/logs/list?pageIndex=0&pageSize=8&search=timeout&traceId=trace-123&spanId=span-456');
    expect(buildLogStreamUrl(query)).toBe('/api/logs/sse/subscribe?logContent=timeout&traceId=trace-123&spanId=span-456');
  });

  it('falls back to legacy content for the primary search field', () => {
    expect(queryStateFromParams(new URLSearchParams('content=legacy%20message'))).toEqual({
      search: 'legacy message',
      logContent: '',
      traceId: '',
      spanId: '',
      severityNumber: '',
      severityText: '',
      columns: DEFAULT_LOG_TABLE_COLUMNS,
      displayFormat: DEFAULT_LOG_DISPLAY_FORMAT,
      maxLines: DEFAULT_LOG_MAX_LINES,
      listPageSize: '8',
      listPageIndex: '0'
    });
  });

  it('normalizes route-backed log display settings without affecting log API loading', () => {
    expect(resolveLogDisplayFormat(new URLSearchParams('format=raw'))).toBe('raw');
    expect(resolveLogDisplayFormat(new URLSearchParams('format=columns'))).toBe('column');
    expect(resolveLogDisplayFormat(new URLSearchParams('format=unknown'))).toBe(DEFAULT_LOG_DISPLAY_FORMAT);
    expect(resolveLogMaxLines(new URLSearchParams('maxLines=3'))).toBe('3');
    expect(resolveLogMaxLines(new URLSearchParams('maxLines=0'))).toBe(DEFAULT_LOG_MAX_LINES);
    expect(resolveLogMaxLines(new URLSearchParams('maxLines=11'))).toBe(DEFAULT_LOG_MAX_LINES);
    expect(queryStateFromParams(new URLSearchParams('listPageSize=50&listPageIndex=2'))).toMatchObject({
      listPageSize: '50',
      listPageIndex: '2'
    });
    expect(queryStateFromParams(new URLSearchParams('listPageSize=7&listPageIndex=-1'))).toMatchObject({
      listPageSize: '8',
      listPageIndex: '0'
    });

    const query = {
      search: 'timeout',
      logContent: '',
      traceId: '',
      spanId: '',
      severityNumber: '',
      severityText: '',
      columns: DEFAULT_LOG_TABLE_COLUMNS,
      displayFormat: 'raw' as const,
      maxLines: '3'
    };
    expect(buildLogRouteUrl({ ...query, listPageSize: '50', listPageIndex: '2' }, { view: 'table' })).toBe('/log/manage?search=timeout&format=raw&maxLines=3&listPageSize=50&listPageIndex=2&view=table');
    expect(buildLogUrls(query).listUrl).toBe('/logs/list?pageIndex=0&pageSize=8&search=timeout');
    expect(buildLogStreamUrl(query)).toBe('/api/logs/sse/subscribe?logContent=timeout');
  });

  it('normalizes route-backed log table columns without affecting log API loading', () => {
    expect(resolveLogTableColumns(new URLSearchParams('columns=service,message,traceId,unknown,service'))).toEqual([
      'service',
      'body',
      'trace-id'
    ]);
    expect(resolveLogTableColumns(new URLSearchParams('columns=unknown'))).toEqual(DEFAULT_LOG_TABLE_COLUMNS);

    expect(
      buildLogRouteUrl(
        {
          search: 'timeout',
          logContent: '',
          traceId: '',
          spanId: '',
          severityNumber: '',
          severityText: '',
          columns: ['service', 'body', 'trace-id']
        },
        { view: 'table' }
      )
    ).toBe('/log/manage?search=timeout&columns=service%2Cbody%2Ctrace-id&view=table');

    expect(
      buildLogUrls({
        search: 'timeout',
        logContent: '',
        traceId: '',
        spanId: '',
        severityNumber: '',
        severityText: '',
        columns: ['service', 'body', 'trace-id']
      }).listUrl
    ).toBe('/logs/list?pageIndex=0&pageSize=8&search=timeout');
  });

  it('normalizes route-backed log field columns without affecting log API loading', () => {
    expect(
      resolveLogFieldColumns(
        new URLSearchParams(
          'fieldColumns=resource:hertzbeat.entity_id,attribute:region,invalid,resource:hertzbeat.entity_id,attribute:http.route,resource:bad/slash,attribute:tenant-id,resource:service.version,attribute:cloud.provider,resource:k8s.pod.name'
        )
      )
    ).toEqual([
      'resource:hertzbeat.entity_id',
      'attribute:region',
      'attribute:http.route',
      'attribute:tenant-id',
      'resource:service.version',
      'attribute:cloud.provider'
    ]);

    expect(queryStateFromParams(new URLSearchParams('fieldColumns=resource:hertzbeat.entity_id,attribute:region'))).toMatchObject({
      fieldColumns: ['resource:hertzbeat.entity_id', 'attribute:region']
    });

    const query = {
      search: 'timeout',
      logContent: '',
      traceId: '',
      spanId: '',
      severityNumber: '',
      severityText: '',
      columns: ['service', 'body'] as const,
      fieldColumns: ['resource:hertzbeat.entity_id', 'attribute:region'] as const
    };
    expect(buildLogRouteUrl(query, { view: 'table' })).toBe(
      '/log/manage?search=timeout&columns=service%2Cbody&fieldColumns=resource%3Ahertzbeat.entity_id%2Cattribute%3Aregion&view=table'
    );
    expect(buildLogUrls(query).listUrl).toBe('/logs/list?pageIndex=0&pageSize=8&search=timeout');
    expect(buildLogStreamUrl(query)).toBe('/api/logs/sse/subscribe?logContent=timeout');
  });

  it('builds a clean route url when empty', () => {
    expect(buildLogRouteUrl({ search: '', logContent: '', traceId: '', spanId: '', severityNumber: '', severityText: '' })).toBe('/log/manage');
  });

  it('tracks stream view inside the route url', () => {
    expect(
      buildLogRouteUrl(
        { search: 'timeout', logContent: '', traceId: '', spanId: '', severityNumber: '', severityText: '' },
        { view: 'stream' }
      )
    ).toBe('/log/manage?search=timeout&view=stream');
    expect(
      buildLogRouteUrl(
        { search: 'timeout', logContent: '', traceId: '', spanId: '', severityNumber: '', severityText: '' },
        { view: 'time-series' }
      )
    ).toBe('/log/manage?search=timeout&view=time-series');
    expect(
      buildLogRouteUrl(
        { search: 'timeout', logContent: '', traceId: '', spanId: '', severityNumber: '', severityText: '' },
        { view: 'table' }
      )
    ).toBe('/log/manage?search=timeout&view=table');
  });

  it('builds list and stats urls from query state', () => {
    expect(buildLogUrls({
      search: 'timeout',
      logContent: 'db down',
      traceId: 'abc123',
      spanId: 'span456',
      severityNumber: '17',
      severityText: 'ERROR',
      resourceFilter: 'service.version=1.2.3',
      attributeFilter: 'http.route:/checkout',
      groupBy: 'resource:service.version',
      groupLimit: '7',
      groupOrder: 'count-asc',
      groupMinCount: '5',
      listPageSize: '50',
      listPageIndex: '2'
    })).toEqual({
      listUrl: '/logs/list?pageIndex=2&pageSize=50&search=timeout&traceId=abc123&spanId=span456&severityNumber=17&severityText=ERROR&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route%3A%2Fcheckout',
      overviewUrl: '/logs/stats/overview?search=timeout&traceId=abc123&spanId=span456&severityNumber=17&severityText=ERROR&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route%3A%2Fcheckout',
      trendUrl: '/logs/stats/trend?search=timeout&traceId=abc123&spanId=span456&severityNumber=17&severityText=ERROR&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route%3A%2Fcheckout',
      coverageUrl: '/logs/stats/trace-coverage?search=timeout&traceId=abc123&spanId=span456&severityNumber=17&severityText=ERROR&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route%3A%2Fcheckout',
      groupByUrl: '/logs/stats/group-by?search=timeout&traceId=abc123&spanId=span456&severityNumber=17&severityText=ERROR&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route%3A%2Fcheckout&groupBy=resource%3Aservice.version&limit=7&orderBy=count-asc&minCount=5'
    });
  });

  it('threads the shared absolute time context into log search and stats APIs', () => {
    expect(
      buildLogUrls(
        { search: 'timeout', logContent: '', traceId: '', spanId: '', severityNumber: '', severityText: '' },
        {
          timeRange: 'last-1h',
          start: '1713200000000',
          end: '1713203600000',
          refresh: '30',
          live: 'false',
          tz: 'Asia/Shanghai',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          environment: 'prod'
        }
      )
    ).toEqual({
      listUrl: '/logs/list?pageIndex=0&pageSize=8&search=timeout&serviceName=checkout&serviceNamespace=payments&environment=prod&start=1713200000000&end=1713203600000',
      overviewUrl: '/logs/stats/overview?search=timeout&serviceName=checkout&serviceNamespace=payments&environment=prod&start=1713200000000&end=1713203600000',
      trendUrl: '/logs/stats/trend?search=timeout&serviceName=checkout&serviceNamespace=payments&environment=prod&start=1713200000000&end=1713203600000',
      coverageUrl: '/logs/stats/trace-coverage?search=timeout&serviceName=checkout&serviceNamespace=payments&environment=prod&start=1713200000000&end=1713203600000',
      groupByUrl: '/logs/stats/group-by?search=timeout&serviceName=checkout&serviceNamespace=payments&environment=prod&start=1713200000000&end=1713203600000'
    });
  });

  it('threads the strong entity id into log list and stats APIs', () => {
    expect(
      buildLogUrls(
        { search: 'timeout', logContent: '', traceId: '', spanId: '', severityNumber: '', severityText: '' },
        {
          entityId: '42',
          entityType: 'service',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          environment: 'prod'
        }
      )
    ).toEqual({
      listUrl: '/logs/list?pageIndex=0&pageSize=8&search=timeout&entityId=42&entityType=service&serviceName=checkout&serviceNamespace=payments&environment=prod',
      overviewUrl: '/logs/stats/overview?search=timeout&entityId=42&entityType=service&serviceName=checkout&serviceNamespace=payments&environment=prod',
      trendUrl: '/logs/stats/trend?search=timeout&entityId=42&entityType=service&serviceName=checkout&serviceNamespace=payments&environment=prod',
      coverageUrl: '/logs/stats/trace-coverage?search=timeout&entityId=42&entityType=service&serviceName=checkout&serviceNamespace=payments&environment=prod',
      groupByUrl: '/logs/stats/group-by?search=timeout&entityId=42&entityType=service&serviceName=checkout&serviceNamespace=payments&environment=prod'
    });
  });

  it('rejects dirty shared time bounds before building log APIs', () => {
    expect(
      buildLogUrls(
        { search: 'timeout', logContent: '', traceId: '', spanId: '', severityNumber: '', severityText: '' },
        {
          start: '1713200000000.25',
          end: '1713203600000.75'
        }
      )
    ).toEqual({
      listUrl: '/logs/list?pageIndex=0&pageSize=8&search=timeout',
      overviewUrl: '/logs/stats/overview?search=timeout',
      trendUrl: '/logs/stats/trend?search=timeout',
      coverageUrl: '/logs/stats/trace-coverage?search=timeout',
      groupByUrl: '/logs/stats/group-by?search=timeout'
    });
  });

  it('builds stream subscribe url from current query model', () => {
    expect(buildLogStreamUrl({ search: 'timeout', logContent: 'db down', traceId: 'abc123', spanId: 'span456', severityNumber: '17', severityText: 'ERROR' })).toBe(
      '/api/logs/sse/subscribe?logContent=db+down&traceId=abc123&spanId=span456&severityNumber=17&severityText=ERROR'
    );
    expect(
      buildLogStreamUrl(
        { search: 'timeout', logContent: '', traceId: '', spanId: '', severityNumber: '', severityText: 'ERROR' },
        {
          entityId: '42',
          entityType: 'service',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          environment: 'prod'
        }
      )
    ).toBe(
      '/api/logs/sse/subscribe?logContent=timeout&severityText=ERROR&entityId=42&entityType=service&serviceName=checkout&serviceNamespace=payments&environment=prod'
    );
  });

  it('falls back to search when stream-specific log content is empty', () => {
    expect(buildLogStreamUrl({ search: 'timeout', logContent: '', traceId: '', spanId: '', severityNumber: '', severityText: '' })).toBe(
      '/api/logs/sse/subscribe?logContent=timeout'
    );
  });

  it('uses the source backend for browser EventSource during the 4200 to 1157 dev loop', () => {
    expect(
      resolveBrowserLogStreamUrl('/api/logs/sse/subscribe?logContent=timeout', {
        protocol: 'http:',
        hostname: 'localhost',
        port: '4200'
      })
    ).toBe('http://localhost:1157/api/logs/sse/subscribe?logContent=timeout');
    expect(
      resolveBrowserLogStreamUrl('/api/logs/sse/subscribe', {
        protocol: 'http:',
        hostname: '127.0.0.1',
        port: '4200'
      })
    ).toBe('http://127.0.0.1:1157/api/logs/sse/subscribe');
    expect(
      resolveBrowserLogStreamUrl('/api/logs/sse/subscribe?severityText=ERROR', {
        protocol: 'http:',
        hostname: '203.0.113.10',
        port: '4200'
      })
    ).toBe('http://203.0.113.10:1157/api/logs/sse/subscribe?severityText=ERROR');
    expect(
      resolveBrowserLogStreamUrl('/api/logs/sse/subscribe', {
        protocol: 'http:',
        hostname: 'ops-public.example.com',
        port: '4200'
      })
    ).toBe('http://ops-public.example.com:1157/api/logs/sse/subscribe');
    expect(
      resolveBrowserLogStreamUrl('/api/logs/sse/subscribe', {
        protocol: 'https:',
        hostname: 'ops.example.com',
        port: ''
      })
    ).toBe('/api/logs/sse/subscribe');
  });

  it('resolves workbench view from search params', () => {
    expect(resolveLogWorkbenchView(new URLSearchParams('view=stream'))).toBe('stream');
    expect(resolveLogWorkbenchView(new URLSearchParams('view=list'))).toBe('list');
    expect(resolveLogWorkbenchView(new URLSearchParams('view=time-series'))).toBe('time-series');
    expect(resolveLogWorkbenchView(new URLSearchParams('view=timeseries'))).toBe('time-series');
    expect(resolveLogWorkbenchView(new URLSearchParams('view=table'))).toBe('table');
    expect(resolveLogWorkbenchView(new URLSearchParams('search=timeout'))).toBe('list');
    expect(resolveLogWorkbenchView(new URLSearchParams('content=legacy'))).toBe('list');
    expect(resolveLogWorkbenchView(new URLSearchParams())).toBe('stream');
  });

  it('maps legacy integration routes into compatible log workbench urls', () => {
    expect(
      buildLogCompatRouteUrl(
        {
          get(name: string) {
            if (name === 'search') return '';
            if (name === 'traceId') return 'trace-1';
            return null;
          }
        },
        { view: 'stream', fallbackSearch: 'webhook' }
      )
    ).toBe('/log/manage?search=webhook&traceId=trace-1&view=stream');
  });

  it('rewrites legacy content filters plus full route context into canonical log-manage query state', () => {
    expect(
      buildLogCompatRouteUrl(
        new URLSearchParams(
          'content=checkout%20timeout&traceId=trace-123&spanId=span-456&severityText=ERROR&timeRange=last-1h&start=10&end=20&refresh=30&live=false&tz=Asia%2FShanghai&entityId=7&entityName=Checkout%20API&returnTo=%2Foverview&returnLabel=Overview&serviceName=checkout&serviceNamespace=payments&environment=prod'
        ),
        { view: 'stream' }
      )
    ).toBe(
      '/log/manage?search=checkout+timeout&traceId=trace-123&spanId=span-456&severityText=ERROR&view=stream&start=10&end=20&timeRange=last-1h&refresh=30&live=false&tz=Asia%2FShanghai&entityId=7&entityName=Checkout+API&returnTo=%2Foverview&serviceName=checkout&serviceNamespace=payments&environment=prod'
    );
  });

  it('maps raw Next search params through the log compatibility owner', () => {
    expect(
      buildLogCompatRouteUrlFromSearchParams(
        {
          content: ' checkout timeout ',
          traceId: ' trace-123 ',
          severityNumber: '17',
          start: '10',
          end: '20',
          entityId: '7',
          entityName: 'Checkout API',
          returnTo: '/overview?returnLabel=Overview',
          returnLabel: 'Overview',
          serviceName: 'checkout',
          environment: ['prod', 'ignored']
        },
        { view: 'list' }
      )
    ).toBe(
      '/log/manage?search=checkout+timeout&traceId=trace-123&severityNumber=17&view=list&start=10&end=20&entityId=7&entityName=Checkout+API&returnTo=%2Foverview&serviceName=checkout&environment=prod'
    );
  });

  it('normalizes multi-value URL search params into the first log manage query value', () => {
    const routeState = readLogManageRouteState({
      search: [' checkout timeout ', 'ignored'],
      logContent: [' raw timeout ', 'ignored raw'],
      traceId: ['trace-123', 'trace-ignored'],
      spanId: ['span-456', 'span-ignored'],
      severityNumber: ['17', '25'],
      severityText: ['ERROR', 'WARN'],
      columns: ['service,spanId', 'time'],
      view: ['list', 'stream'],
      timeRange: ['last-1h', 'last-6h'],
      start: ['10', 'not-epoch'],
      end: ['20', 'not-epoch'],
      entityId: ['7', '8'],
      entityName: ['Checkout API', 'Payments API'],
      serviceName: ['checkout', 'payments'],
      environment: ['prod', 'staging'],
      returnTo: ['/overview?returnLabel=Overview', '/entities'],
      returnLabel: ['Overview', 'Entities']
    });

    expect(routeState.initialQuery).toEqual({
      search: 'checkout timeout',
      logContent: 'raw timeout',
      traceId: 'trace-123',
      spanId: 'span-456',
      severityNumber: '17',
      severityText: 'ERROR',
      columns: ['service', 'span-id'],
      displayFormat: DEFAULT_LOG_DISPLAY_FORMAT,
      maxLines: DEFAULT_LOG_MAX_LINES,
      listPageSize: '8',
      listPageIndex: '0'
    });
    expect(routeState.currentView).toBe('list');
    expect(routeState.routeContext).toMatchObject({
      timeRange: 'last-1h',
      start: '10',
      end: '20',
      entityId: '7',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      environment: 'prod',
      returnTo: '/overview'
    });
    expect(routeState.shouldCleanUrl).toBe(true);
  });

  it('preserves machine log route context params while rewriting the canonical query string', () => {
    const next = new URLSearchParams('search=timeout');
    copyLogRouteContextParams(
      new URLSearchParams(
        'timeRange=last-1h&start=10&end=20&refresh=30&live=false&tz=Asia%2FShanghai&entityId=7&returnTo=%2Fmonitors%3FreturnLabel%3DMonitors&returnLabel=Monitors&serviceName=checkout&codeRepo=https://github.com/apache/hertzbeat'
      ),
      next
    );

    expect(next.toString()).toBe(
      'search=timeout&start=10&end=20&timeRange=last-1h&refresh=30&live=false&tz=Asia%2FShanghai&entityId=7&returnTo=%2Fmonitors&serviceName=checkout&codeRepo=https%3A%2F%2Fgithub.com%2Fapache%2Fhertzbeat'
    );
    expect(next.get('returnLabel')).toBeNull();
  });
});
