import { describe, expect, it, vi } from 'vitest';
import { buildTraceRelatedLogsUrlFromHref, loadRelatedLogs, loadTraceDetailBundle } from './controller';

describe('trace controller', () => {
  it('loads detail and spans together for a trace id', async () => {
    const apiGet = vi.fn()
      .mockResolvedValueOnce({ traceId: 't-1', serviceName: 'checkout' })
      .mockResolvedValueOnce([{ spanId: 's-1', traceId: 't-1' }]);

    const result = await loadTraceDetailBundle(apiGet, 't-1');

    expect(apiGet).toHaveBeenNthCalledWith(1, '/traces/t-1');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/traces/t-1/spans');
    expect(result).toEqual({
      detail: { traceId: 't-1', serviceName: 'checkout' },
      spans: [{ spanId: 's-1', traceId: 't-1' }]
    });
  });

  it('loads related logs for the selected trace id', async () => {
    const apiGet = vi.fn().mockResolvedValue({ content: [{ traceId: 't-1', body: 'log' }] });

    const result = await loadRelatedLogs(apiGet, 't-1');

    const url = new URL(String(apiGet.mock.calls[0]?.[0]), 'https://example.test');
    expect(url.pathname).toBe('/logs/list');
    expect(url.searchParams.get('traceId')).toBe('t-1');
    expect(url.searchParams.get('pageIndex')).toBe('0');
    expect(url.searchParams.get('pageSize')).toBe('5');
    expect(result).toEqual([{ traceId: 't-1', body: 'log' }]);
  });

  it('loads related logs with selected span and entity context', async () => {
    const apiGet = vi.fn().mockResolvedValue({ content: [{ traceId: 't-1', spanId: 's-1', body: 'span log' }] });

    const result = await loadRelatedLogs(apiGet, {
      traceId: 't-1',
      spanId: 's-1',
      serviceName: 'checkout',
      serviceNamespace: 'payments',
      environment: 'prod',
      entityId: 42,
      entityName: 'checkout',
      collector: 'collector-a',
      template: 'spring-boot',
      source: 'otlp',
      start: 1713200000000,
      end: 1713203600000,
      pageSize: 3
    });

    expect(apiGet).toHaveBeenCalledWith(
      '/logs/list?traceId=t-1&spanId=s-1&serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=42&entityName=checkout&collector=collector-a&template=spring-boot&source=otlp&start=1713200000000&end=1713203600000&pageIndex=0&pageSize=3'
    );
    expect(result).toEqual([{ traceId: 't-1', spanId: 's-1', body: 'span log' }]);
  });

  it('builds related log urls from trace handoff hrefs', () => {
    expect(buildTraceRelatedLogsUrlFromHref(
      '/log/manage?traceId=t-1&spanId=s-1&serviceName=checkout&serviceNamespace=payments&returnTo=%2Ftrace%2Fmanage',
      { pageSize: '3' }
    )).toBe('/logs/list?traceId=t-1&spanId=s-1&serviceName=checkout&serviceNamespace=payments&pageIndex=0&pageSize=3');
  });
});
