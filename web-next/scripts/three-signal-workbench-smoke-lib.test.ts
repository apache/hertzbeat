import { describe, expect, it } from 'vitest';
import {
  THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT,
  THREE_SIGNAL_WORKBENCH_SMOKE_METRIC_QUERY,
  THREE_SIGNAL_WORKBENCH_SMOKE_TRACE_ID,
  buildThreeSignalWorkbenchExpectedQuery,
  buildThreeSignalWorkbenchSmokeRoutes,
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
      entityName: 'Checkout API',
      serviceName: 'checkout',
      serviceNamespace: 'hertzbeat-demo',
      environment: 'demo',
      collector: 'collector-demo-a',
      template: 'spring-boot',
      source: 'otlp'
    });
    expect(routes).toEqual({
      metrics:
        '/ingestion/otlp/metrics?traceId=6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b&spanId=1111222233334444&entityId=4200&entityName=Checkout+API&serviceName=checkout&serviceNamespace=hertzbeat-demo&environment=demo&collector=collector-demo-a&template=spring-boot&source=otlp&query=hertzbeat_demo_checkout_latency_ms_milliseconds',
      logs:
        '/log/manage?view=list&traceId=6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b&spanId=1111222233334444&entityId=4200&entityName=Checkout+API&serviceName=checkout&serviceNamespace=hertzbeat-demo&environment=demo&collector=collector-demo-a&template=spring-boot&source=otlp',
      trace:
        '/trace/manage?traceId=6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b&spanId=1111222233334444&entityId=4200&entityName=Checkout+API&serviceName=checkout&serviceNamespace=hertzbeat-demo&environment=demo&collector=collector-demo-a&template=spring-boot&source=otlp',
      entity:
        '/entities/4200?traceId=6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b&spanId=1111222233334444&entityId=4200&entityName=Checkout+API&serviceName=checkout&serviceNamespace=hertzbeat-demo&environment=demo&collector=collector-demo-a&template=spring-boot&source=otlp',
      alert:
        '/alert?status=firing&signal=metrics&search=checkout&traceId=6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b&spanId=1111222233334444&entityId=4200&entityName=Checkout+API&serviceName=checkout&serviceNamespace=hertzbeat-demo&environment=demo&collector=collector-demo-a&template=spring-boot&source=otlp'
    });

    expect(routes.metrics).not.toContain('returnLabel=');
    expect(routes.logs).not.toContain('returnLabel=');
    expect(routes.trace).not.toContain('returnLabel=');
  });

  it('checks metrics, logs, traces, entity, and alert routes against the same entity-centered query contract', async () => {
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
    expect(result.alert.status).toBe(200);
  });
});
