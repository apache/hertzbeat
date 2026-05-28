import { describe, expect, it, vi } from 'vitest';
import type { LogEntry, PageResult, TraceListItem } from '@/lib/types';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { SUPPLEMENTAL_MESSAGES } from '../i18n-runtime-messages';
import { buildExplorerReadUrls, buildExplorerRouteUrl, loadExplorerReadData, normalizeExplorerReadData, readExplorerQueryState } from './controller';

const t = createTranslatorMock({ locale: 'zh-CN', overrides: SUPPLEMENTAL_MESSAGES['zh-CN'] });

function pageResult<T>(content: T[], totalElements = content.length): PageResult<T> {
  return {
    content,
    totalElements,
    pageIndex: 0,
    pageSize: 8
  };
}

describe('explorer read controller', () => {
  it('builds the read-only trace and log list URLs used by explorer', () => {
    expect(buildExplorerReadUrls()).toEqual({
      traces: '/traces/list?pageIndex=0&pageSize=8',
      logs: '/logs/list?pageIndex=0&pageSize=8',
      metrics: '/ingestion/otlp/metrics/console?aggregation=avg&groupBy=service_name&timeRange=last-30m'
    });
  });

  it('binds URL query and signal state to the trace/log BFF list URLs', () => {
    const query = readExplorerQueryState(new URLSearchParams('q=checkout&signal=trace'));

    expect(query).toEqual({ q: 'checkout', signal: 'trace' });
    expect(buildExplorerRouteUrl(query)).toBe('/explorer?q=checkout&signal=trace');
    expect(buildExplorerReadUrls(query)).toEqual({
      traces: '/traces/list?pageIndex=0&pageSize=8&serviceName=checkout',
      logs: null,
      metrics: null
    });
    expect(buildExplorerReadUrls({ q: 'payment failed', signal: 'log' })).toEqual({
      traces: null,
      logs: '/logs/list?pageIndex=0&pageSize=8&search=payment+failed',
      metrics: null
    });
    expect(buildExplorerReadUrls({ q: 'http.server.duration', signal: 'metric' })).toEqual({
      traces: null,
      logs: null,
      metrics: '/ingestion/otlp/metrics/console?query=http.server.duration&aggregation=avg&groupBy=service_name&timeRange=last-30m'
    });
  });

  it('maps metric console frames into explorer rows', () => {
    const data = normalizeExplorerReadData(
      {
        metrics: {
          query: 'http.server.duration',
          stats: {
            totalSeries: 1,
            nonEmptySeries: 1
          },
          results: {
            frames: [
              {
                schema: {
                  labels: {
                    __name__: 'http.server.duration',
                    'service.name': 'frontend'
                  }
                },
                data: [
                  [1712730000000, 0.88],
                  [1712730060000, 0.91]
                ]
              }
            ]
          }
        }
      },
      t,
      { q: 'http.server.duration', signal: 'metric' }
    );

    expect(data.apiState).toBe('ready');
    expect(data.metricTotal).toBe(1);
    expect(data.sourceUrls).toEqual({
      traces: null,
      logs: null,
      metrics: '/ingestion/otlp/metrics/console?query=http.server.duration&aggregation=avg&groupBy=service_name&timeRange=last-30m'
    });
    expect(data.rows[0]).toMatchObject({
      signalKey: 'metric',
      signalTone: 'metric',
      href: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=frontend',
      signal: '指标',
      service: 'frontend',
      operation: 'http.server.duration',
      status: '正常',
      duration: '0.91'
    });
  });

  it('maps trace and log API rows into the shared explorer table contract', () => {
    const data = normalizeExplorerReadData(
      {
        traces: pageResult<TraceListItem>([
          {
            traceId: 'trace-1',
            rootSpanName: 'POST /checkout',
            serviceName: 'checkout',
            status: 'STATUS_CODE_ERROR',
            durationNanos: 1_250_000_000,
            startTime: 1712730000000,
            errorSpanCount: 1
          }
        ]),
        logs: pageResult<LogEntry>([
          {
            timeUnixNano: 1_712_730_001_000_000_000,
            severityText: 'ERROR',
            body: 'payment failed',
            traceId: 'trace-1',
            resource: {
              'service.name': 'payment'
            }
          }
        ])
      },
      t,
      { q: 'checkout', signal: 'all' }
    );

    expect(data.apiOwner).toBe('trace-log-bff-query-api');
    expect(data.apiState).toBe('ready');
    expect(data.query).toEqual({ q: 'checkout', signal: 'all' });
    expect(data.sourceUrls).toEqual({
      traces: '/traces/list?pageIndex=0&pageSize=8&serviceName=checkout',
      logs: '/logs/list?pageIndex=0&pageSize=8&search=checkout',
      metrics: '/ingestion/otlp/metrics/console?query=checkout&aggregation=avg&groupBy=service_name&timeRange=last-30m'
    });
    expect(data.rows).toMatchObject([
      {
        key: 'trace:trace-1',
        signalKey: 'trace',
        signalTone: 'trace',
        href: '/trace/manage?traceId=trace-1',
        signal: '链路',
        service: 'checkout',
        operation: 'POST /checkout',
        status: '错误',
        duration: '1.25s'
      },
      {
        signalKey: 'log',
        signalTone: 'log',
        href: '/log/manage?traceId=trace-1',
        signal: '日志',
        service: 'payment',
        operation: 'payment failed',
        status: 'ERROR',
        duration: '-'
      }
    ]);
  });

  it('returns an API-owned empty state instead of static explorer examples', () => {
    const data = normalizeExplorerReadData({ traces: pageResult<TraceListItem>([]), logs: pageResult<LogEntry>([]) }, t);

    expect(data.apiState).toBe('empty');
    expect(data.rows).toEqual([]);
    expect(data.traceTotal).toBe(0);
    expect(data.logTotal).toBe(0);
    expect(data.metricTotal).toBe(0);
  });

  it('loads only the requested signal endpoint through the injected API getter', async () => {
    const apiGet = vi
      .fn()
      .mockResolvedValueOnce(pageResult<TraceListItem>([{ traceId: 'trace-2', serviceName: 'cart' }]))
      .mockResolvedValueOnce(pageResult<LogEntry>([]));

    const data = await loadExplorerReadData(t, apiGet, { q: 'cart', signal: 'trace' });

    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(apiGet).toHaveBeenNthCalledWith(1, '/traces/list?pageIndex=0&pageSize=8&serviceName=cart');
    expect(data.rows[0]).toMatchObject({
      key: 'trace:trace-2',
      service: 'cart',
      href: '/trace/manage?traceId=trace-2'
    });
  });

  it('loads only the metrics endpoint for the metric signal filter', async () => {
    const apiGet = vi.fn().mockResolvedValue({
      stats: { totalSeries: 0, nonEmptySeries: 0 },
      results: { frames: [] }
    });

    const data = await loadExplorerReadData(t, apiGet, { q: 'jvm.memory.used', signal: 'metric' });

    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(apiGet).toHaveBeenCalledWith('/ingestion/otlp/metrics/console?query=jvm.memory.used&aggregation=avg&groupBy=service_name&timeRange=last-30m');
    expect(data.apiState).toBe('empty');
    expect(data.metricTotal).toBe(0);
  });
});
