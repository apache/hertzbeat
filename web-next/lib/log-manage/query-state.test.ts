import { describe, expect, it } from 'vitest';
import {
  buildLogCompatRouteUrl,
  buildLogRouteUrl,
  buildLogStreamUrl,
  buildLogUrls,
  copyLogRouteContextParams,
  queryStateFromParams,
  resolveBrowserLogStreamUrl,
  resolveLogWorkbenchView
} from './query-state';

describe('log query state codec', () => {
  it('reads query state from search params', () => {
    const params = new URLSearchParams('search=timeout&logContent=db%20down&traceId=abc123&spanId=span456&severityNumber=17&severityText=ERROR');
    expect(queryStateFromParams(params)).toEqual({
      search: 'timeout',
      logContent: 'db down',
      traceId: 'abc123',
      spanId: 'span456',
      severityNumber: '17',
      severityText: 'ERROR'
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

  it('falls back to legacy content for the primary search field', () => {
    expect(queryStateFromParams(new URLSearchParams('content=legacy%20message'))).toEqual({
      search: 'legacy message',
      logContent: '',
      traceId: '',
      spanId: '',
      severityNumber: '',
      severityText: ''
    });
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
  });

  it('builds list and stats urls from query state', () => {
    expect(buildLogUrls({ search: 'timeout', logContent: 'db down', traceId: 'abc123', spanId: 'span456', severityNumber: '17', severityText: 'ERROR' })).toEqual({
      listUrl: '/logs/list?pageIndex=0&pageSize=8&search=timeout&traceId=abc123&spanId=span456&severityNumber=17&severityText=ERROR',
      overviewUrl: '/logs/stats/overview?search=timeout&traceId=abc123&spanId=span456&severityNumber=17&severityText=ERROR',
      trendUrl: '/logs/stats/trend?search=timeout&traceId=abc123&spanId=span456&severityNumber=17&severityText=ERROR',
      coverageUrl: '/logs/stats/trace-coverage?search=timeout&traceId=abc123&spanId=span456&severityNumber=17&severityText=ERROR'
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
          serviceName: 'checkout'
        }
      )
    ).toEqual({
      listUrl: '/logs/list?pageIndex=0&pageSize=8&search=timeout&start=1713200000000&end=1713203600000',
      overviewUrl: '/logs/stats/overview?search=timeout&start=1713200000000&end=1713203600000',
      trendUrl: '/logs/stats/trend?search=timeout&start=1713200000000&end=1713203600000',
      coverageUrl: '/logs/stats/trace-coverage?search=timeout&start=1713200000000&end=1713203600000'
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
      coverageUrl: '/logs/stats/trace-coverage?search=timeout'
    });
  });

  it('builds stream subscribe url from current query model', () => {
    expect(buildLogStreamUrl({ search: 'timeout', logContent: 'db down', traceId: 'abc123', spanId: 'span456', severityNumber: '17', severityText: 'ERROR' })).toBe(
      '/api/logs/sse/subscribe?logContent=db+down&traceId=abc123&spanId=span456&severityNumber=17&severityText=ERROR'
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
