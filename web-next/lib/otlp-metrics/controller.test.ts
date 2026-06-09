import { describe, expect, it, vi } from 'vitest';
import {
  buildOtlpMetricsConsoleUrl,
  buildOtlpMetricsInventoryUrl,
  loadOtlpMetricsConsole,
  loadOtlpMetricsInventory,
  queryStateFromParams
} from './controller';

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
      entityType: 'service',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod',
      start: '1712730000000',
      end: '1712733600000'
    })).rejects.toThrow('404');

    expect(apiGet).toHaveBeenCalledWith(
      '/ingestion/otlp/metrics/console?entityId=7&entityType=service&entityName=Checkout+API&serviceName=checkout&serviceNamespace=commerce&environment=prod&start=1712730000000&end=1712733600000'
    );
  });

  it('builds metrics console url from handoff state', () => {
    expect(
      buildOtlpMetricsConsoleUrl({
        query: 'http_server_duration_milliseconds_count',
        filter: 'service.name="checkout"',
        aggregation: 'sum',
        temporalAggregation: 'rate',
        groupBy: 'service_name',
        step: '60',
        limit: '25',
        traceId: 'trace-1',
        spanId: 'span-1',
        serviceName: 'checkout',
        start: '1000',
        end: '2000'
      })
    ).toBe('/ingestion/otlp/metrics/console?query=http_server_duration_milliseconds_count&filter=service.name%3D%22checkout%22&aggregation=sum&temporalAggregation=rate&groupBy=service_name&step=60&limit=25&traceId=trace-1&spanId=span-1&serviceName=checkout&start=1000&end=2000');
  });

  it('builds and loads metrics inventory from entity and service context only', async () => {
    const apiGet = vi.fn().mockResolvedValue({
      source: 'promql-inventory',
      items: [{ metricName: 'http_server_duration', family: 'latency' }]
    });
    const query = {
      entityId: '7',
      entityType: 'service',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod',
      start: '1000',
      end: '2000',
      limit: '20',
      query: 'ignored',
      filter: 'ignored',
      inventorySearch: 'ignored',
      inventorySort: 'time-series',
      relatedMetricSource: 'ignored'
    } as const;

    expect(buildOtlpMetricsInventoryUrl(query)).toBe(
      '/ingestion/otlp/metrics/inventory?entityId=7&entityType=service&serviceName=checkout&serviceNamespace=commerce&environment=prod&start=1000&end=2000&limit=20'
    );
    await expect(loadOtlpMetricsInventory(apiGet as any, query)).resolves.toEqual({
      source: 'promql-inventory',
      items: [{ metricName: 'http_server_duration', family: 'latency' }]
    });
    expect(apiGet).toHaveBeenCalledWith(
      '/ingestion/otlp/metrics/inventory?entityId=7&entityType=service&serviceName=checkout&serviceNamespace=commerce&environment=prod&start=1000&end=2000&limit=20'
    );
  });

  it('rejects invalid inventory entity, time, and limit params before calling the endpoint', () => {
    expect(
      buildOtlpMetricsInventoryUrl({
        entityId: '7.5',
        entityType: 'service',
        serviceName: 'checkout',
        start: '1777484896189.989',
        end: '1777485856189.989',
        limit: '0'
      })
    ).toBe('/ingestion/otlp/metrics/inventory?entityType=service&serviceName=checkout');
  });

  it('keeps client-only metrics inspector and selected series state out of the console endpoint', () => {
    expect(queryStateFromParams(new URLSearchParams('query=http.server.duration&inspector=table&series=http.server.duration-1&inventorySearch=checkout&inventorySort=time-series&inventoryPageSize=20&inventoryPageIndex=2&seriesAttributeSearch=deployment'))).toMatchObject({
      query: 'http.server.duration',
      inspector: 'table',
      series: 'http.server.duration-1',
      inventorySearch: 'checkout',
      inventorySort: 'time-series',
      inventoryPageSize: '20',
      inventoryPageIndex: '2',
      seriesAttributeSearch: 'deployment'
    });
    expect(queryStateFromParams(new URLSearchParams('inventoryPageSize=7&inventoryPageIndex=-1'))).toMatchObject({
      inventoryPageSize: undefined,
      inventoryPageIndex: undefined
    });
    expect(queryStateFromParams(new URLSearchParams('inspector=heatmap'))).toMatchObject({
      inspector: 'graph'
    });

    expect(
      buildOtlpMetricsConsoleUrl({
      query: 'http.server.duration',
      inspector: 'table',
      series: 'http.server.duration-1',
      inventorySearch: 'checkout',
      inventorySort: 'time-series',
      inventoryPageSize: '20',
      inventoryPageIndex: '2',
      seriesAttributeSearch: 'deployment'
    })
    ).toBe('/ingestion/otlp/metrics/console?query=http.server.duration');
  });

  it('keeps chart display settings in route state but out of the metrics console endpoint', () => {
    expect(queryStateFromParams(new URLSearchParams('warningThreshold=75.5&criticalThreshold=90&expectedRange=on&legendFormat=%7B%7Bservice.name%7D%7D+-+p95&formula=A+*+1000'))).toMatchObject({
      warningThreshold: '75.5',
      criticalThreshold: '90',
      expectedRange: 'on',
      legendFormat: '{{service.name}} - p95',
      formula: 'A * 1000'
    });
    expect(queryStateFromParams(new URLSearchParams('warningThreshold=abc&criticalThreshold=Infinity&expectedRange=yes'))).toMatchObject({
      warningThreshold: undefined,
      criticalThreshold: undefined,
      expectedRange: undefined
    });

    expect(
      buildOtlpMetricsConsoleUrl({
        query: 'http.server.duration',
      warningThreshold: '75.5',
      criticalThreshold: '90',
      expectedRange: 'on',
      legendFormat: '{{service.name}} - p95',
      formula: 'A * 1000'
    })
    ).toBe('/ingestion/otlp/metrics/console?query=http.server.duration');
  });

  it('rejects invalid metrics builder numeric controls before calling the console endpoint', () => {
    expect(
      buildOtlpMetricsConsoleUrl({
        query: 'http_server_duration_milliseconds_count',
        step: '0',
        limit: '12.5',
        filter: 'service.name="checkout"'
      })
    ).toBe('/ingestion/otlp/metrics/console?query=http_server_duration_milliseconds_count&filter=service.name%3D%22checkout%22');

    expect(queryStateFromParams(new URLSearchParams('step=0&limit=12.5&filter=service.name%3D%22checkout%22'))).toMatchObject({
      step: undefined,
      limit: undefined,
      filter: 'service.name="checkout"'
    });
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
      'query=http_server_duration_milliseconds_count&filter=service.name%3D%22checkout%22&aggregation=sum&temporalAggregation=rate&groupBy=service_name&legendFormat=%7B%7Bservice.name%7D%7D+-+p95&formula=A+*+1000&step=60&limit=25&timeRange=last-1h&collector=collector-a&template=spring-boot&traceId=trace-1&spanId=span-1&entityType=service&serviceName=checkout&returnTo=%2Flog%2Fmanage%3FreturnLabel%3DLogs&returnLabel=Metrics&environment=prod'
    );
    expect(queryStateFromParams(params)).toEqual({
      query: 'http_server_duration_milliseconds_count',
      filter: 'service.name="checkout"',
      aggregation: 'sum',
      temporalAggregation: 'rate',
      groupBy: 'service_name',
      legendFormat: '{{service.name}} - p95',
      formula: 'A * 1000',
      step: '60',
      limit: '25',
      inventorySearch: undefined,
      inventorySort: undefined,
      seriesAttributeSearch: undefined,
      relatedMetricSource: undefined,
      relatedMetricFamily: undefined,
      relatedMetricReason: undefined,
      relatedMetricMatchedLabels: undefined,
      relatedMetricResourceMatch: undefined,
      inspector: 'graph',
      warningThreshold: undefined,
      criticalThreshold: undefined,
      timeRange: 'last-1h',
      source: undefined,
      collector: 'collector-a',
      template: 'spring-boot',
      traceId: 'trace-1',
      spanId: 'span-1',
      entityType: 'service',
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

  it('keeps related metric candidate metadata out of the metrics console endpoint', () => {
    const query = queryStateFromParams(new URLSearchParams(
      'query=container.cpu.usage&filter=k8s.pod.name%3D%22checkout-7d9%22&relatedMetricSource=pod&relatedMetricFamily=cpu&relatedMetricReason=resource-filter&relatedMetricMatchedLabels=k8s_pod_name&relatedMetricResourceMatch=%7B%22k8s_pod_name%22%3A%22checkout-7d9%22%7D'
    ));
    expect(query).toMatchObject({
      query: 'container.cpu.usage',
      filter: 'k8s.pod.name="checkout-7d9"',
      relatedMetricSource: 'pod',
      relatedMetricFamily: 'cpu',
      relatedMetricReason: 'resource-filter',
      relatedMetricMatchedLabels: 'k8s_pod_name',
      relatedMetricResourceMatch: '{"k8s_pod_name":"checkout-7d9"}'
    });
    expect(buildOtlpMetricsConsoleUrl(query)).toBe(
      '/ingestion/otlp/metrics/console?query=container.cpu.usage&filter=k8s.pod.name%3D%22checkout-7d9%22'
    );
  });
});
