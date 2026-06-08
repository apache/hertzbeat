import { describe, expect, it } from 'vitest';
import {
  THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT,
  THREE_SIGNAL_WORKBENCH_SMOKE_METRIC_QUERY,
  THREE_SIGNAL_WORKBENCH_SMOKE_SAVED_VIEW_CREATED_AT,
  THREE_SIGNAL_WORKBENCH_SMOKE_TRACE_ID,
  buildThreeSignalWorkbenchDashboardReplayExpectations,
  buildThreeSignalWorkbenchExpectedDashboardVariables,
  buildThreeSignalWorkbenchExpectedQuery,
  buildThreeSignalWorkbenchSavedQueryViews,
  buildThreeSignalWorkbenchSmokeRoutes,
  runThreeSignalWorkbenchDashboardReplaySmoke,
  runThreeSignalWorkbenchSmoke
} from './three-signal-workbench-smoke-lib.mjs';

describe('three-signal workbench smoke helpers', () => {
  it('keeps the seeded demo context and linked workbench routes explicit', () => {
    const routes = buildThreeSignalWorkbenchSmokeRoutes();

    expect(THREE_SIGNAL_WORKBENCH_SMOKE_TRACE_ID).toBe('6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b');
    expect(THREE_SIGNAL_WORKBENCH_SMOKE_METRIC_QUERY).toBe('hertzbeat_demo_checkout_latency_ms_milliseconds');
    expect(THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT).toEqual({
      traceId: THREE_SIGNAL_WORKBENCH_SMOKE_TRACE_ID,
      spanId: '1111222233334444',
      entityId: '4200',
      entityType: 'service',
      entityName: 'Checkout API',
      hostEntityId: '4201',
      hostEntityName: 'host:checkout-node-a',
      k8sEntityId: '4202',
      k8sEntityName: 'k8s_workload:payments/checkout-v1-78dfd',
      serviceName: 'checkout',
      serviceNamespace: 'hertzbeat-demo',
      environment: 'demo',
      collector: 'collector-demo-a',
      template: 'spring-boot',
      source: 'otlp'
    });
    expect(routes).toEqual({
      metrics:
        '/ingestion/otlp/metrics?traceId=6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b&spanId=1111222233334444&entityId=4200&entityType=service&entityName=Checkout+API&serviceName=checkout&serviceNamespace=hertzbeat-demo&environment=demo&collector=collector-demo-a&template=spring-boot&source=otlp&query=hertzbeat_demo_checkout_latency_ms_milliseconds',
      logs:
        '/log/manage?view=list&traceId=6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b&spanId=1111222233334444&entityId=4200&entityType=service&entityName=Checkout+API&serviceName=checkout&serviceNamespace=hertzbeat-demo&environment=demo&collector=collector-demo-a&template=spring-boot&source=otlp',
      trace:
        '/trace/manage?traceId=6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b&spanId=1111222233334444&entityId=4200&entityType=service&entityName=Checkout+API&serviceName=checkout&serviceNamespace=hertzbeat-demo&environment=demo&collector=collector-demo-a&template=spring-boot&source=otlp',
      entity:
        '/entities/4200?traceId=6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b&spanId=1111222233334444&entityId=4200&entityType=service&entityName=Checkout+API&serviceName=checkout&serviceNamespace=hertzbeat-demo&environment=demo&collector=collector-demo-a&template=spring-boot&source=otlp',
      topologyHost:
        '/topology?traceId=6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b&spanId=1111222233334444&entityId=4200&entityType=service&entityName=Checkout+API&serviceName=checkout&serviceNamespace=hertzbeat-demo&environment=demo&collector=collector-demo-a&template=spring-boot&source=otlp&topologyTargetId=4201&topologyTargetName=host%3Acheckout-node-a',
      topologyK8s:
        '/topology?traceId=6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b&spanId=1111222233334444&entityId=4200&entityType=service&entityName=Checkout+API&serviceName=checkout&serviceNamespace=hertzbeat-demo&environment=demo&collector=collector-demo-a&template=spring-boot&source=otlp&topologyTargetId=4202&topologyTargetName=k8s_workload%3Apayments%2Fcheckout-v1-78dfd',
      alert:
        '/alert?status=firing&signal=metrics&search=checkout&traceId=6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b&spanId=1111222233334444&entityId=4200&entityType=service&entityName=Checkout+API&serviceName=checkout&serviceNamespace=hertzbeat-demo&environment=demo&collector=collector-demo-a&template=spring-boot&source=otlp'
    });

    expect(routes.metrics).not.toContain('returnLabel=');
    expect(routes.logs).not.toContain('returnLabel=');
    expect(routes.trace).not.toContain('returnLabel=');
    expect(routes.topologyHost).not.toContain('returnLabel=');
    expect(routes.topologyK8s).not.toContain('returnLabel=');
  });

  it('keeps saved-view promotion and dashboard replay expectations source-backed for all three signals', () => {
    const savedViews = buildThreeSignalWorkbenchSavedQueryViews();
    const expectations = buildThreeSignalWorkbenchDashboardReplayExpectations();
    const dashboardVariables = buildThreeSignalWorkbenchExpectedDashboardVariables();

    expect(Object.keys(savedViews)).toEqual(['logs', 'traces', 'metrics']);
    expect(dashboardVariables).toEqual([
      { name: 'service.name', value: 'checkout' },
      { name: 'service.namespace', value: 'hertzbeat-demo' },
      { name: 'deployment.environment.name', value: 'demo' },
      { name: 'hertzbeat.entity_id', value: '4200' },
      { name: 'hertzbeat.entity_type', value: 'service' },
      { name: 'hertzbeat.entity_name', value: 'Checkout API' },
      { name: 'hertzbeat.source', value: 'otlp' },
      { name: 'hertzbeat.collector', value: 'collector-demo-a' },
      { name: 'hertzbeat.template', value: 'spring-boot' }
    ]);
    expect(savedViews.logs).toEqual(expect.objectContaining({
      signal: 'logs',
      id: 'logs-checkout-errors',
      label: 'Checkout error logs',
      createdAt: THREE_SIGNAL_WORKBENCH_SMOKE_SAVED_VIEW_CREATED_AT
    }));
    expect(savedViews.logs.route).toContain('/log/manage?');
    expect(savedViews.logs.route).toContain(`traceId=${THREE_SIGNAL_WORKBENCH_SMOKE_TRACE_ID}`);
    expect(savedViews.logs.route).toContain('severityText=ERROR');

    expect(savedViews.traces).toEqual(expect.objectContaining({
      signal: 'traces',
      id: 'traces-checkout-entrypoint',
      label: 'Checkout entrypoint traces',
      createdAt: THREE_SIGNAL_WORKBENCH_SMOKE_SAVED_VIEW_CREATED_AT
    }));
    expect(savedViews.traces.route).toContain('/trace/manage?');
    expect(savedViews.traces.route).toContain('operationName=POST+%2Fcheckout');
    expect(savedViews.traces.route).toContain('spanScope=all');

    expect(savedViews.metrics).toEqual(expect.objectContaining({
      signal: 'metrics',
      id: 'metrics-checkout-latency',
      label: 'Checkout latency p95',
      createdAt: THREE_SIGNAL_WORKBENCH_SMOKE_SAVED_VIEW_CREATED_AT
    }));
    expect(savedViews.metrics.route).toContain('/ingestion/otlp/metrics?');
    expect(savedViews.metrics.route).toContain(`query=${THREE_SIGNAL_WORKBENCH_SMOKE_METRIC_QUERY}`);
    expect(savedViews.metrics.route).toContain('relatedMetricSource=demo');

    expect(expectations.map(expectation => expectation.signal)).toEqual(['logs', 'traces', 'metrics']);
    expect(expectations[0]).toEqual(expect.objectContaining({
      signal: 'logs',
      panelDraft: expect.objectContaining({
        draftKey: 'logs-checkout-errors',
        title: 'Checkout error logs',
        visualization: 'list',
        source: 'signal-saved-view',
        expectedRouteSummary: expect.objectContaining({
          traceId: THREE_SIGNAL_WORKBENCH_SMOKE_TRACE_ID,
          spanId: '1111222233334444',
          entityId: '4200',
          entityType: 'service',
          entityName: 'Checkout API',
          serviceName: 'checkout',
          serviceNamespace: 'hertzbeat-demo',
          environment: 'demo',
          collector: 'collector-demo-a',
          template: 'spring-boot',
          source: 'otlp'
        })
      }),
      replay: expect.objectContaining({
        primaryPath: '/logs/list',
        expectedQuery: expect.objectContaining({
          pageIndex: '0',
          pageSize: '8',
          search: 'timeout',
          severityText: 'ERROR',
          traceId: THREE_SIGNAL_WORKBENCH_SMOKE_TRACE_ID,
          spanId: '1111222233334444',
          entityId: '4200',
          entityType: 'service',
          serviceName: 'checkout',
          serviceNamespace: 'hertzbeat-demo',
          environment: 'demo'
        })
      })
    }));
    expect(expectations[1]).toEqual(expect.objectContaining({
      signal: 'traces',
      panelDraft: expect.objectContaining({
        draftKey: 'traces-checkout-entrypoint',
        title: 'Checkout entrypoint traces',
        visualization: 'table',
        source: 'signal-saved-view',
        expectedRouteSummary: expect.objectContaining({
          traceId: THREE_SIGNAL_WORKBENCH_SMOKE_TRACE_ID,
          spanId: '1111222233334444',
          entityId: '4200',
          entityType: 'service',
          entityName: 'Checkout API',
          source: 'otlp'
        })
      }),
      replay: expect.objectContaining({
        primaryPath: '/traces/list',
        expectedQuery: expect.objectContaining({
          pageIndex: '0',
          pageSize: '8',
          traceId: THREE_SIGNAL_WORKBENCH_SMOKE_TRACE_ID,
          serviceName: 'checkout',
          operationName: 'POST /checkout',
          spanScope: 'all',
          entityId: '4200',
          entityType: 'service',
          serviceNamespace: 'hertzbeat-demo',
          environment: 'demo'
        })
      })
    }));
    expect(expectations[2]).toEqual(expect.objectContaining({
      signal: 'metrics',
      panelDraft: expect.objectContaining({
        draftKey: 'metrics-checkout-latency',
        title: 'Checkout latency p95',
        visualization: 'graph',
        source: 'signal-saved-view',
        expectedRouteSummary: expect.objectContaining({
          traceId: THREE_SIGNAL_WORKBENCH_SMOKE_TRACE_ID,
          spanId: '1111222233334444',
          entityId: '4200',
          entityType: 'service',
          entityName: 'Checkout API',
          source: 'otlp'
        })
      }),
      replay: expect.objectContaining({
        primaryPath: '/ingestion/otlp/metrics/console',
        expectedQuery: expect.objectContaining({
          query: THREE_SIGNAL_WORKBENCH_SMOKE_METRIC_QUERY,
          aggregation: 'p95',
          temporalAggregation: 'rate',
          groupBy: 'http.route',
          step: '60',
          traceId: THREE_SIGNAL_WORKBENCH_SMOKE_TRACE_ID,
          spanId: '1111222233334444',
          entityId: '4200',
          entityType: 'service',
          entityName: 'Checkout API',
          serviceName: 'checkout',
          serviceNamespace: 'hertzbeat-demo',
          environment: 'demo',
          collector: 'collector-demo-a',
          template: 'spring-boot',
          source: 'otlp'
        }),
        excludedQueryKeys: ['inspector', 'relatedMetricSource', 'warningThreshold', 'criticalThreshold']
      })
    }));
  });

  it('runs the dashboard replay smoke assertions in logs, traces, and metrics order', async () => {
    const calls: Array<{
      baseUrl: string;
      signal: string;
      primaryPath: string;
      expectedQuery: Record<string, string>;
    }> = [];

    const result = await runThreeSignalWorkbenchDashboardReplaySmoke({
      baseUrl: 'http://127.0.0.1:4200',
      assertReplay: async (baseUrl, expectation) => {
        calls.push({
          baseUrl,
          signal: expectation.signal,
          primaryPath: expectation.replay.primaryPath,
          expectedQuery: expectation.replay.expectedQuery
        });
        return {
          signal: expectation.signal,
          status: 200
        };
      }
    });

    expect(calls).toEqual([
      expect.objectContaining({
        baseUrl: 'http://127.0.0.1:4200',
        signal: 'logs',
        primaryPath: '/logs/list',
        expectedQuery: expect.objectContaining({ traceId: THREE_SIGNAL_WORKBENCH_SMOKE_TRACE_ID })
      }),
      expect.objectContaining({
        baseUrl: 'http://127.0.0.1:4200',
        signal: 'traces',
        primaryPath: '/traces/list',
        expectedQuery: expect.objectContaining({ operationName: 'POST /checkout' })
      }),
      expect.objectContaining({
        baseUrl: 'http://127.0.0.1:4200',
        signal: 'metrics',
        primaryPath: '/ingestion/otlp/metrics/console',
        expectedQuery: expect.objectContaining({ query: THREE_SIGNAL_WORKBENCH_SMOKE_METRIC_QUERY })
      })
    ]);
    expect(result.baseUrl).toBe('http://127.0.0.1:4200');
    expect(result.expectations).toHaveLength(3);
    expect(result.results).toEqual([
      { signal: 'logs', status: 200 },
      { signal: 'traces', status: 200 },
      { signal: 'metrics', status: 200 }
    ]);
  });

  it('checks metrics, logs, traces, entity, topology, and alert routes against the same entity-centered query contract', async () => {
    const calls: Array<{
      baseUrl: string;
      routePath: string;
      expectedPath: string | null;
      expectedQuery: Record<string, string> | null;
    }> = [];
    const routes = buildThreeSignalWorkbenchSmokeRoutes();
    const signalQuery = buildThreeSignalWorkbenchExpectedQuery();

    const result = await runThreeSignalWorkbenchSmoke({
      baseUrl: 'http://127.0.0.1:4200',
      assertRouteLoads: async (baseUrl, routePath, options = {}) => {
        calls.push({
          baseUrl,
          routePath,
          expectedPath: options.expectedPath ?? null,
          expectedQuery: options.expectedQuery ?? null
        });
        return {
          status: 200,
          finalUrl: `${baseUrl}${options.expectedPath ?? routePath}`
        };
      }
    });

    expect(calls).toEqual([
      {
        baseUrl: 'http://127.0.0.1:4200',
        routePath: routes.metrics,
        expectedPath: '/ingestion/otlp/metrics',
        expectedQuery: {
          ...signalQuery,
          query: THREE_SIGNAL_WORKBENCH_SMOKE_METRIC_QUERY
        }
      },
      {
        baseUrl: 'http://127.0.0.1:4200',
        routePath: routes.logs,
        expectedPath: '/log/manage',
        expectedQuery: {
          view: 'list',
          ...signalQuery
        }
      },
      {
        baseUrl: 'http://127.0.0.1:4200',
        routePath: routes.trace,
        expectedPath: '/trace/manage',
        expectedQuery: signalQuery
      },
      {
        baseUrl: 'http://127.0.0.1:4200',
        routePath: routes.entity,
        expectedPath: '/entities/4200',
        expectedQuery: signalQuery
      },
      {
        baseUrl: 'http://127.0.0.1:4200',
        routePath: routes.topologyHost,
        expectedPath: '/topology',
        expectedQuery: {
          ...signalQuery,
          topologyTargetId: THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT.hostEntityId,
          topologyTargetName: THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT.hostEntityName
        }
      },
      {
        baseUrl: 'http://127.0.0.1:4200',
        routePath: routes.topologyK8s,
        expectedPath: '/topology',
        expectedQuery: {
          ...signalQuery,
          topologyTargetId: THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT.k8sEntityId,
          topologyTargetName: THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT.k8sEntityName
        }
      },
      {
        baseUrl: 'http://127.0.0.1:4200',
        routePath: routes.alert,
        expectedPath: '/alert',
        expectedQuery: {
          status: 'firing',
          signal: 'metrics',
          search: 'checkout',
          ...signalQuery
        }
      }
    ]);
    expect(result.baseUrl).toBe('http://127.0.0.1:4200');
    expect(result.metrics.status).toBe(200);
    expect(result.logs.status).toBe(200);
    expect(result.trace.status).toBe(200);
    expect(result.entity.status).toBe(200);
    expect(result.topologyHost.status).toBe(200);
    expect(result.topologyK8s.status).toBe(200);
    expect(result.alert.status).toBe(200);
  });
});
