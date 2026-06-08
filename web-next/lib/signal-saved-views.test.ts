import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildSignalSavedViewRouteSummary,
  buildSignalSavedViewKey,
  createSignalDashboardPanelDraftFromSavedView,
  deleteSignalSavedQueryView,
  formatSignalSavedViewRouteSummary,
  loadAllSignalSavedQueryViews,
  loadAllSignalSavedQueryViewsWithDiagnostics,
  loadSignalSavedQueryViews,
  mapServerSignalSavedView,
  saveSignalSavedQueryView
} from './signal-saved-views';

describe('signal saved views API client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-06T10:00:00Z'));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('maps server views to route-safe client views', () => {
    expect(mapServerSignalSavedView('logs', {
      id: 12,
      viewKey: 'logs-checkout-errors',
      label: 'Checkout errors',
      description: 'ERROR logs',
      route: '/log/manage?search=error',
      payload: JSON.stringify({ createdAt: 1780740000000 })
    })).toEqual({
      id: 'logs-checkout-errors',
      label: 'Checkout errors',
      description: 'ERROR logs',
      route: '/log/manage?search=error',
      createdAt: 1780740000000
    });
  });

  it('rejects server views for a different signal route', () => {
    expect(mapServerSignalSavedView('traces', {
      viewKey: 'trace-cross-route',
      label: 'Wrong route',
      route: '/log/manage?search=error'
    })).toBeNull();
  });

  it('uses stable route keys for repeated saves', () => {
    const route = '/ingestion/otlp/metrics?query=http.server.duration&aggregation=p95';

    expect(buildSignalSavedViewKey('metrics', route)).toBe(buildSignalSavedViewKey('metrics', route));
    expect(buildSignalSavedViewKey('metrics', route)).toMatch(/^metrics-[a-z0-9]+$/);
  });

  it('promotes saved query views into reusable dashboard panel drafts', () => {
    const draft = createSignalDashboardPanelDraftFromSavedView('metrics', {
      id: 'metrics-checkout-p95',
      label: 'Checkout p95',
      description: 'Latency by service',
      route: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&inspector=graph',
      createdAt: 1780740000000
    });

    expect(draft).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Checkout p95',
      description: 'Latency by service',
      visualization: 'graph',
      route: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&inspector=graph',
      querySnapshot: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&inspector=graph'
    }));
    expect(draft.draftKey).toMatch(/^metrics-panel-[a-z0-9]+$/);
    expect(JSON.parse(String(draft.payload))).toEqual(expect.objectContaining({
      source: 'signal-saved-view',
      savedViewId: 'metrics-checkout-p95',
      savedViewLabel: 'Checkout p95',
      savedViewCreatedAt: 1780740000000,
      savedViewRouteSummary: {
        query: 'http.server.duration',
        serviceName: 'checkout',
        inspector: 'graph'
      },
      savedViewRouteSummaryText: 'query=http.server.duration, serviceName=checkout, inspector=graph'
    }));
  });

  it('summarizes saved-view route context for dashboard panel composition', () => {
    const summary = buildSignalSavedViewRouteSummary(
      'traces',
      '/trace/manage?view=time-series&serviceName=checkout&serviceNamespace=payments&operationName=GET+%2Fcheckout&environment=prod&entityId=7&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&minDurationMs=500&maxDurationMs=2000&errorOnly=true&spanScope=entrypoint&groupBy=resource%3Aservice.version&groupLimit=7&groupOrder=latency-p95-desc&groupMinCount=2&columns=start%2Cservice%2Cduration&unrelated=ignored'
    );

    expect(summary).toEqual({
      view: 'time-series',
      serviceName: 'checkout',
      serviceNamespace: 'payments',
      operationName: 'GET /checkout',
      environment: 'prod',
      entityId: '7',
      entityName: 'Checkout API',
      source: 'otlp',
      collector: 'collector-a',
      template: 'spring-boot',
      minDurationMs: '500',
      maxDurationMs: '2000',
      errorOnly: 'true',
      spanScope: 'entrypoint',
      groupBy: 'resource:service.version',
      groupLimit: '7',
      groupOrder: 'latency-p95-desc',
      groupMinCount: '2',
      columns: 'start,service,duration'
    });
    expect(formatSignalSavedViewRouteSummary(summary)).toBe(
      'view=time-series, serviceName=checkout, serviceNamespace=payments, operationName=GET /checkout, environment=prod, entityId=7, entityName=Checkout API, source=otlp, collector=collector-a, template=spring-boot, minDurationMs=500, maxDurationMs=2000, errorOnly=true, spanScope=entrypoint, groupBy=resource:service.version, groupLimit=7, groupOrder=latency-p95-desc, groupMinCount=2, columns=start,service,duration'
    );
  });

  it('preserves real logs, traces, and metrics entity route fields in dashboard panel draft summaries', () => {
    const logsDraft = createSignalDashboardPanelDraftFromSavedView('logs', {
      id: 'logs-errors',
      label: 'Errors',
      description: '',
      route: '/log/manage?view=table&search=timeout&severityText=ERROR&serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=7&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&traceId=trace-1&spanId=span-1&resourceFilter=service.version%3D1.2.3&attributeFilter=region%3Dus&groupBy=resource%3Aservice.version&groupLimit=7&groupOrder=count-asc&groupMinCount=2&columns=time%2Cseverity%2Cbody&format=column&maxLines=3&listPageSize=20&listPageIndex=1&timeRange=last-1h',
      createdAt: 1780740000000
    });
    const tracesDraft = createSignalDashboardPanelDraftFromSavedView('traces', {
      id: 'traces-errors',
      label: 'Trace errors',
      description: '',
      route: '/trace/manage?view=table&serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=7&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&traceId=trace-1&spanId=span-1&operationName=POST+%2Fcheckout&spanScope=entrypoint&timeRange=last-1h',
      createdAt: 1780740000000
    });
    const metricsDraft = createSignalDashboardPanelDraftFromSavedView('metrics', {
      id: 'metrics-latency',
      label: 'Latency',
      description: '',
      route: '/ingestion/otlp/metrics?query=http.server.duration&series=checkout_latency-0&filter=service.name%3D%22checkout%22&traceId=trace-1&spanId=span-1&serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=7&entityType=service&entityName=Checkout+API&source=otlp&collector=collector-a&template=spring-boot&aggregation=p95&temporalAggregation=rate&groupBy=route&legendFormat=%7B%7Bservice.name%7D%7D+-+p95&formula=A+*+1000&step=60&limit=10&inspector=table&warningThreshold=75&criticalThreshold=90&expectedRange=on&relatedMetricSource=pod&relatedMetricFamily=latency&relatedMetricReason=resource-filter&relatedMetricMatchedLabels=k8s_pod_name&relatedMetricResourceMatch=%7B%22k8s_pod_name%22%3A%22checkout-7d9%22%7D&timeRange=last-1h',
      createdAt: 1780740000000
    });

    const logsPayload = JSON.parse(String(logsDraft.payload));
    expect(logsPayload.savedViewRouteSummary).toEqual(expect.objectContaining({
      entityId: '7',
      entityName: 'Checkout API',
      source: 'otlp',
      collector: 'collector-a',
      template: 'spring-boot',
      traceId: 'trace-1',
      spanId: 'span-1',
      groupLimit: '7',
      groupOrder: 'count-asc',
      groupMinCount: '2',
      columns: 'time,severity,body',
      format: 'column',
      maxLines: '3',
      listPageSize: '20',
      listPageIndex: '1'
    }));
    expect(logsDraft.description).toContain('columns=time,severity,body');
    expect(logsDraft.description).toContain('format=column');

    const tracesPayload = JSON.parse(String(tracesDraft.payload));
    expect(tracesPayload.savedViewRouteSummary).toEqual(expect.objectContaining({
      entityId: '7',
      entityName: 'Checkout API',
      source: 'otlp',
      collector: 'collector-a',
      template: 'spring-boot',
      traceId: 'trace-1',
      spanId: 'span-1',
      operationName: 'POST /checkout',
      spanScope: 'entrypoint'
    }));
    expect(tracesDraft.description).toContain('entityName=Checkout API');
    expect(tracesDraft.description).toContain('operationName=POST /checkout');

    const metricsPayload = JSON.parse(String(metricsDraft.payload));
    expect(metricsPayload.savedViewRouteSummary).toEqual(expect.objectContaining({
      entityId: '7',
      entityType: 'service',
      entityName: 'Checkout API',
      source: 'otlp',
      collector: 'collector-a',
      template: 'spring-boot',
      traceId: 'trace-1',
      spanId: 'span-1',
      series: 'checkout_latency-0',
      filter: 'service.name="checkout"',
      temporalAggregation: 'rate',
      legendFormat: '{{service.name}} - p95',
      warningThreshold: '75',
      criticalThreshold: '90',
      expectedRange: 'on',
      relatedMetricSource: 'pod',
      relatedMetricFamily: 'latency',
      relatedMetricReason: 'resource-filter',
      relatedMetricMatchedLabels: 'k8s_pod_name',
      relatedMetricResourceMatch: '{"k8s_pod_name":"checkout-7d9"}'
    }));
    expect(metricsDraft.description).toContain('temporalAggregation=rate');
    expect(metricsDraft.description).toContain('legendFormat={{service.name}} - p95');
    expect(metricsDraft.description).toContain('relatedMetricSource=pod');
  });

  it('uses the saved-view route summary as the panel description when the saved view has no description', () => {
    const draft = createSignalDashboardPanelDraftFromSavedView('logs', {
      id: 'logs-errors',
      label: 'Errors',
      description: '',
      route: '/log/manage?view=table&search=timeout&severityText=ERROR&serviceName=checkout',
      createdAt: 1780740000000
    });

    expect(draft.description).toBe('view=table, search=timeout, severityText=ERROR, serviceName=checkout');
  });

  it('uses route context to choose saved-view panel visualization', () => {
    expect(createSignalDashboardPanelDraftFromSavedView('logs', {
      id: 'logs-table',
      label: 'Error table',
      description: '',
      route: '/log/manage?view=table&severityText=ERROR',
      createdAt: 1780740000000
    }).visualization).toBe('table');
    expect(createSignalDashboardPanelDraftFromSavedView('traces', {
      id: 'traces-latency',
      label: 'Trace latency',
      description: '',
      route: '/trace/manage?view=time-series&serviceName=checkout',
      createdAt: 1780740000000
    }).visualization).toBe('time-series');
    expect(createSignalDashboardPanelDraftFromSavedView('metrics', {
      id: 'metrics-table',
      label: 'Metric table',
      description: '',
      route: '/ingestion/otlp/metrics?query=cpu&inspector=table',
      createdAt: 1780740000000
    }).visualization).toBe('table');
  });

  it('loads signal saved views through the backend message API', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      code: 0,
      data: [{
        viewKey: 'traces-checkout',
        label: 'Checkout trace',
        description: 'Slow checkout',
        route: '/trace/manage?serviceName=checkout',
        payload: JSON.stringify({ createdAt: 1780740000000 })
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    await expect(loadSignalSavedQueryViews('traces')).resolves.toEqual([{
      id: 'traces-checkout',
      label: 'Checkout trace',
      description: 'Slow checkout',
      route: '/trace/manage?serviceName=checkout',
      createdAt: 1780740000000
    }]);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/signal/saved-view/traces', expect.objectContaining({
      credentials: 'same-origin',
      cache: 'no-store'
    }));
  });

  it('loads all signal saved views in signal order for dashboard promotion', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const signal = String(input).split('/').pop();
      return new Response(JSON.stringify({
        code: 0,
        data: [{
          viewKey: `${signal}-saved-view`,
          label: `${signal} saved view`,
          description: '',
          route: signal === 'metrics' ? '/ingestion/otlp/metrics?query=cpu' : `/${signal === 'logs' ? 'log' : 'trace'}/manage`,
          payload: JSON.stringify({ createdAt: 1780740000000 })
        }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    await expect(loadAllSignalSavedQueryViews()).resolves.toEqual([
      expect.objectContaining({ signal: 'logs', id: 'logs-saved-view' }),
      expect.objectContaining({ signal: 'traces', id: 'traces-saved-view' }),
      expect.objectContaining({ signal: 'metrics', id: 'metrics-saved-view' })
    ]);
  });

  it('keeps available signal saved views when one signal API fails', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const signal = String(input).split('/').pop();
      if (signal === 'traces') {
        return new Response(JSON.stringify({ code: 500, msg: 'Trace saved views unavailable' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({
        code: 0,
        data: [{
          viewKey: `${signal}-saved-view`,
          label: `${signal} saved view`,
          description: '',
          route: signal === 'metrics' ? '/ingestion/otlp/metrics?query=cpu' : '/log/manage',
          payload: JSON.stringify({ createdAt: 1780740000000 })
        }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    await expect(loadAllSignalSavedQueryViews()).resolves.toEqual([
      expect.objectContaining({ signal: 'logs', id: 'logs-saved-view' }),
      expect.objectContaining({ signal: 'metrics', id: 'metrics-saved-view' })
    ]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('reports failed signals while keeping available saved views for dashboard diagnostics', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const signal = String(input).split('/').pop();
      if (signal === 'logs') {
        return new Response(JSON.stringify({ code: 500, msg: 'Log saved views unavailable' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({
        code: 0,
        data: [{
          viewKey: `${signal}-saved-view`,
          label: `${signal} saved view`,
          description: '',
          route: signal === 'metrics' ? '/ingestion/otlp/metrics?query=cpu' : '/trace/manage',
          payload: JSON.stringify({ createdAt: 1780740000000 })
        }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    await expect(loadAllSignalSavedQueryViewsWithDiagnostics()).resolves.toEqual({
      failedSignals: ['logs'],
      views: [
        expect.objectContaining({ signal: 'traces', id: 'traces-saved-view' }),
        expect.objectContaining({ signal: 'metrics', id: 'metrics-saved-view' })
      ]
    });
  });

  it('upserts saved views with route snapshots and created-at metadata', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      code: 0,
      data: {
        viewKey: 'logs-route-key',
        label: 'Errors',
        description: 'ERROR logs',
        route: '/log/manage?severityText=ERROR',
        payload: JSON.stringify({ createdAt: 1780740000000 })
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    await saveSignalSavedQueryView('logs', {
      id: 'logs-route-key',
      label: 'Errors',
      description: 'ERROR logs',
      route: '/log/manage?severityText=ERROR',
      createdAt: 1780740000000
    });

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] || [];
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toEqual(expect.objectContaining({
      signal: 'logs',
      viewKey: 'logs-route-key',
      querySnapshot: '/log/manage?severityText=ERROR',
      payload: JSON.stringify({ createdAt: 1780740000000 })
    }));
  });

  it('deletes saved views by encoded view key', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      code: 0,
      data: null
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    await deleteSignalSavedQueryView('metrics', 'metrics:key/with?reserved');

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/signal/saved-view/metrics/metrics%3Akey%2Fwith%3Freserved', expect.objectContaining({
      method: 'DELETE'
    }));
  });
});
