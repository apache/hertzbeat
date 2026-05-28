import { describe, expect, it, vi } from 'vitest';
import { buildOtlpMetricsConsoleUrl, loadOtlpMetricsConsole, queryStateFromParams } from './controller';

describe('otlp metrics controller', () => {
  it('loads metrics console data from the existing endpoint', async () => {
    const apiGet = vi.fn().mockResolvedValue({ datasource: 'prometheus' });
    const result = await loadOtlpMetricsConsole(apiGet as any);
    expect(apiGet).toHaveBeenCalledWith('/ingestion/otlp/metrics/console');
    expect(result).toEqual({ datasource: 'prometheus' });
  });

  it('does not synthesize a zero-series metrics console when the endpoint is unavailable', async () => {
    const apiGet = vi.fn().mockRejectedValue(new Error('API request failed: 404'));

    await expect(loadOtlpMetricsConsole(apiGet as any, {
      entityId: '7',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod',
      start: '1712730000000',
      end: '1712733600000'
    })).rejects.toThrow('404');

    expect(apiGet).toHaveBeenCalledWith(
      '/ingestion/otlp/metrics/console?entityId=7&entityName=Checkout+API&serviceName=checkout&serviceNamespace=commerce&environment=prod&start=1712730000000&end=1712733600000'
    );
  });

  it('builds metrics console url from handoff state', () => {
    expect(
      buildOtlpMetricsConsoleUrl({
        query: 'http_server_duration_milliseconds_count',
        aggregation: 'sum',
        groupBy: 'service_name',
        traceId: 'trace-1',
        spanId: 'span-1',
        serviceName: 'checkout',
        start: '1000',
        end: '2000'
      })
    ).toBe('/ingestion/otlp/metrics/console?query=http_server_duration_milliseconds_count&aggregation=sum&groupBy=service_name&traceId=trace-1&spanId=span-1&serviceName=checkout&start=1000&end=2000');
  });

  it('rejects decimal time bounds before calling the metrics console endpoint', () => {
    expect(
      buildOtlpMetricsConsoleUrl({
        traceId: 'trace-1',
        serviceName: 'checkout',
        start: '1777484896189.989',
        end: '1777485856189.989'
      })
    ).toBe('/ingestion/otlp/metrics/console?traceId=trace-1&serviceName=checkout');
  });

  it('rejects decimal entity ids before calling the metrics console endpoint', async () => {
    const apiGet = vi.fn().mockRejectedValue(new Error('API request failed: 404'));
    const dirtyQuery = {
      entityId: '7.5',
      entityName: 'Checkout API',
      serviceName: 'checkout'
    };

    expect(buildOtlpMetricsConsoleUrl(dirtyQuery)).toBe(
      '/ingestion/otlp/metrics/console?entityName=Checkout+API&serviceName=checkout'
    );

    await expect(loadOtlpMetricsConsole(apiGet as any, dirtyQuery)).rejects.toThrow('404');

    expect(apiGet).toHaveBeenCalledWith('/ingestion/otlp/metrics/console?entityName=Checkout+API&serviceName=checkout');
    expect(queryStateFromParams(new URLSearchParams('entityId=7.5&entityName=Checkout'))).toMatchObject({
      entityId: undefined,
      entityName: 'Checkout'
    });
  });

  it('reads metrics query state from search params', () => {
    const params = new URLSearchParams(
      'query=http_server_duration_milliseconds_count&aggregation=sum&groupBy=service_name&timeRange=last-1h&collector=collector-a&template=spring-boot&traceId=trace-1&spanId=span-1&serviceName=checkout&returnTo=%2Flog%2Fmanage%3FreturnLabel%3DLogs&returnLabel=Metrics&environment=prod'
    );
    expect(queryStateFromParams(params)).toEqual({
      query: 'http_server_duration_milliseconds_count',
      aggregation: 'sum',
      groupBy: 'service_name',
      timeRange: 'last-1h',
      collector: 'collector-a',
      template: 'spring-boot',
      traceId: 'trace-1',
      spanId: 'span-1',
      serviceName: 'checkout',
      serviceNamespace: undefined,
      entityId: undefined,
      entityName: undefined,
      returnTo: '/log/manage',
      environment: 'prod',
      from: undefined,
      to: undefined,
      start: undefined,
      end: undefined,
      refresh: undefined,
      live: undefined,
      tz: undefined,
      timezone: undefined,
      codeRepo: undefined,
      codeProvider: undefined,
      codePath: undefined,
      codeSearch: undefined,
      codeLabel: undefined
    });
  });

  it('does not send localized return labels to the metrics console endpoint', () => {
    const dirtyQuery = {
      traceId: 'trace-1',
      returnTo: '/log/manage?returnLabel=Logs',
      returnLabel: 'Metrics Workbench',
      serviceName: 'checkout'
    } as unknown as Parameters<typeof buildOtlpMetricsConsoleUrl>[0];

    expect(
      buildOtlpMetricsConsoleUrl(dirtyQuery)
    ).toBe('/ingestion/otlp/metrics/console?traceId=trace-1&returnTo=%2Flog%2Fmanage&serviceName=checkout');
  });
});
