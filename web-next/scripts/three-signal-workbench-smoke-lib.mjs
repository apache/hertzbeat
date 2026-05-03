export const THREE_SIGNAL_WORKBENCH_SMOKE_TRACE_ID = '6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b';
export const THREE_SIGNAL_WORKBENCH_SMOKE_METRIC_QUERY = 'hertzbeat_demo_checkout_latency_ms_milliseconds';

export const THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT = {
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
};

function buildRoutePath(routePath, query) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  });
  const queryString = params.toString();
  return queryString ? `${routePath}?${queryString}` : routePath;
}

export function buildThreeSignalWorkbenchExpectedQuery(context = THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT) {
  return {
    traceId: context.traceId,
    spanId: context.spanId,
    entityId: context.entityId,
    entityName: context.entityName,
    serviceName: context.serviceName,
    serviceNamespace: context.serviceNamespace,
    environment: context.environment,
    collector: context.collector,
    template: context.template,
    source: context.source
  };
}

export function buildThreeSignalWorkbenchSmokeRoutes(context = THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT) {
  const signalQuery = buildThreeSignalWorkbenchExpectedQuery(context);

  return {
    metrics: buildRoutePath('/ingestion/otlp/metrics', {
      ...signalQuery,
      query: THREE_SIGNAL_WORKBENCH_SMOKE_METRIC_QUERY
    }),
    logs: buildRoutePath('/log/manage', {
      view: 'list',
      ...signalQuery
    }),
    trace: buildRoutePath('/trace/manage', signalQuery),
    entity: buildRoutePath(`/entities/${context.entityId}`, signalQuery),
    alert: buildRoutePath('/alert', {
      status: 'firing',
      signal: 'metrics',
      search: context.serviceName,
      ...signalQuery
    })
  };
}

export async function runThreeSignalWorkbenchSmoke({ baseUrl, assertRouteLoads }) {
  const routes = buildThreeSignalWorkbenchSmokeRoutes();
  const signalQuery = buildThreeSignalWorkbenchExpectedQuery();
  const metrics = await assertRouteLoads(baseUrl, routes.metrics, {
    expectedPath: '/ingestion/otlp/metrics',
    expectedQuery: {
      ...signalQuery,
      query: THREE_SIGNAL_WORKBENCH_SMOKE_METRIC_QUERY
    }
  });
  const logs = await assertRouteLoads(baseUrl, routes.logs, {
    expectedPath: '/log/manage',
    expectedQuery: {
      view: 'list',
      ...signalQuery
    }
  });
  const trace = await assertRouteLoads(baseUrl, routes.trace, {
    expectedPath: '/trace/manage',
    expectedQuery: signalQuery
  });
  const entity = await assertRouteLoads(baseUrl, routes.entity, {
    expectedPath: `/entities/${THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT.entityId}`,
    expectedQuery: signalQuery
  });
  const alert = await assertRouteLoads(baseUrl, routes.alert, {
    expectedPath: '/alert',
    expectedQuery: {
      status: 'firing',
      signal: 'metrics',
      search: THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT.serviceName,
      ...signalQuery
    }
  });

  return {
    baseUrl,
    routes,
    metrics,
    logs,
    trace,
    entity,
    alert
  };
}
