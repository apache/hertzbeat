export const THREE_SIGNAL_WORKBENCH_SMOKE_TRACE_ID = '6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b6b';
export const THREE_SIGNAL_WORKBENCH_SMOKE_METRIC_QUERY = 'hertzbeat_demo_checkout_latency_ms_milliseconds';
export const THREE_SIGNAL_WORKBENCH_SMOKE_SAVED_VIEW_CREATED_AT = 1713200000000;

export const THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT = {
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
    entityType: context.entityType,
    entityName: context.entityName,
    serviceName: context.serviceName,
    serviceNamespace: context.serviceNamespace,
    environment: context.environment,
    collector: context.collector,
    template: context.template,
    source: context.source
  };
}

export function buildThreeSignalWorkbenchExpectedDashboardVariables(context = THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT) {
  return [
    { name: 'service.name', value: context.serviceName },
    { name: 'service.namespace', value: context.serviceNamespace },
    { name: 'deployment.environment.name', value: context.environment },
    { name: 'hertzbeat.entity_id', value: context.entityId },
    { name: 'hertzbeat.entity_type', value: context.entityType },
    { name: 'hertzbeat.entity_name', value: context.entityName },
    { name: 'hertzbeat.source', value: context.source },
    { name: 'hertzbeat.collector', value: context.collector },
    { name: 'hertzbeat.template', value: context.template }
  ];
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
    topologyHost: buildRoutePath('/topology', {
      ...signalQuery,
      topologyTargetId: context.hostEntityId,
      topologyTargetName: context.hostEntityName
    }),
    topologyK8s: buildRoutePath('/topology', {
      ...signalQuery,
      topologyTargetId: context.k8sEntityId,
      topologyTargetName: context.k8sEntityName
    }),
    alert: buildRoutePath('/alert', {
      status: 'firing',
      signal: 'metrics',
      search: context.serviceName,
      ...signalQuery
    })
  };
}

export function buildThreeSignalWorkbenchSavedQueryViews(context = THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT) {
  const signalQuery = buildThreeSignalWorkbenchExpectedQuery(context);

  return {
    logs: {
      signal: 'logs',
      id: 'logs-checkout-errors',
      label: 'Checkout error logs',
      description: 'Demo checkout error logs with trace context.',
      route: buildRoutePath('/log/manage', {
        view: 'list',
        search: 'timeout',
        severityText: 'ERROR',
        listPageSize: '8',
        ...signalQuery
      }),
      createdAt: THREE_SIGNAL_WORKBENCH_SMOKE_SAVED_VIEW_CREATED_AT
    },
    traces: {
      signal: 'traces',
      id: 'traces-checkout-entrypoint',
      label: 'Checkout entrypoint traces',
      description: 'Demo checkout traces with the same service and trace context.',
      route: buildRoutePath('/trace/manage', {
        view: 'list',
        operationName: 'POST /checkout',
        spanScope: 'all',
        listPageSize: '8',
        ...signalQuery
      }),
      createdAt: THREE_SIGNAL_WORKBENCH_SMOKE_SAVED_VIEW_CREATED_AT
    },
    metrics: {
      signal: 'metrics',
      id: 'metrics-checkout-latency',
      label: 'Checkout latency p95',
      description: 'Demo checkout latency metric scoped to the same entity.',
      route: buildRoutePath('/ingestion/otlp/metrics', {
        query: THREE_SIGNAL_WORKBENCH_SMOKE_METRIC_QUERY,
        aggregation: 'p95',
        temporalAggregation: 'rate',
        groupBy: 'http.route',
        step: '60',
        inspector: 'graph',
        warningThreshold: '750',
        criticalThreshold: '1000',
        relatedMetricSource: 'demo',
        ...signalQuery
      }),
      createdAt: THREE_SIGNAL_WORKBENCH_SMOKE_SAVED_VIEW_CREATED_AT
    }
  };
}

export function buildThreeSignalWorkbenchDashboardReplayExpectations(context = THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT) {
  const signalQuery = buildThreeSignalWorkbenchExpectedQuery(context);
  const savedViews = buildThreeSignalWorkbenchSavedQueryViews(context);
  const expectedRouteSummary = {
    traceId: context.traceId,
    spanId: context.spanId,
    entityId: context.entityId,
    entityType: context.entityType,
    entityName: context.entityName,
    serviceName: context.serviceName,
    serviceNamespace: context.serviceNamespace,
    environment: context.environment,
    collector: context.collector,
    template: context.template,
    source: context.source
  };

  return [
    {
      signal: 'logs',
      savedView: savedViews.logs,
      panelDraft: {
        draftKey: savedViews.logs.id,
        title: savedViews.logs.label,
        visualization: 'list',
        route: savedViews.logs.route,
        source: 'signal-saved-view',
        expectedRouteSummary
      },
      replay: {
        primaryPath: '/logs/list',
        expectedQuery: {
          pageIndex: '0',
          pageSize: '8',
          search: 'timeout',
          severityText: 'ERROR',
          traceId: context.traceId,
          spanId: context.spanId,
          entityId: context.entityId,
          entityType: context.entityType,
          serviceName: context.serviceName,
          serviceNamespace: context.serviceNamespace,
          environment: context.environment
        }
      }
    },
    {
      signal: 'traces',
      savedView: savedViews.traces,
      panelDraft: {
        draftKey: savedViews.traces.id,
        title: savedViews.traces.label,
        visualization: 'table',
        route: savedViews.traces.route,
        source: 'signal-saved-view',
        expectedRouteSummary
      },
      replay: {
        primaryPath: '/traces/list',
        expectedQuery: {
          pageIndex: '0',
          pageSize: '8',
          traceId: context.traceId,
          serviceName: context.serviceName,
          operationName: 'POST /checkout',
          spanScope: 'all',
          entityId: context.entityId,
          entityType: context.entityType,
          serviceNamespace: context.serviceNamespace,
          environment: context.environment
        }
      }
    },
    {
      signal: 'metrics',
      savedView: savedViews.metrics,
      panelDraft: {
        draftKey: savedViews.metrics.id,
        title: savedViews.metrics.label,
        visualization: 'graph',
        route: savedViews.metrics.route,
        source: 'signal-saved-view',
        expectedRouteSummary
      },
      replay: {
        primaryPath: '/ingestion/otlp/metrics/console',
        expectedQuery: {
          query: THREE_SIGNAL_WORKBENCH_SMOKE_METRIC_QUERY,
          aggregation: 'p95',
          temporalAggregation: 'rate',
          groupBy: 'http.route',
          step: '60',
          traceId: context.traceId,
          spanId: context.spanId,
          entityId: context.entityId,
          entityType: context.entityType,
          entityName: context.entityName,
          serviceName: context.serviceName,
          serviceNamespace: context.serviceNamespace,
          environment: context.environment,
          collector: context.collector,
          template: context.template,
          source: context.source
        },
        excludedQueryKeys: ['inspector', 'relatedMetricSource', 'warningThreshold', 'criticalThreshold']
      }
    }
  ];
}

export async function runThreeSignalWorkbenchDashboardReplaySmoke({
  baseUrl,
  assertReplay
}) {
  const expectations = buildThreeSignalWorkbenchDashboardReplayExpectations();
  const results = [];

  for (const expectation of expectations) {
    results.push(await assertReplay(baseUrl, expectation));
  }

  return {
    baseUrl,
    expectations,
    results
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
  const topologyHost = await assertRouteLoads(baseUrl, routes.topologyHost, {
    expectedPath: '/topology',
    expectedQuery: {
      ...signalQuery,
      topologyTargetId: THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT.hostEntityId,
      topologyTargetName: THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT.hostEntityName
    }
  });
  const topologyK8s = await assertRouteLoads(baseUrl, routes.topologyK8s, {
    expectedPath: '/topology',
    expectedQuery: {
      ...signalQuery,
      topologyTargetId: THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT.k8sEntityId,
      topologyTargetName: THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT.k8sEntityName
    }
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
    topologyHost,
    topologyK8s,
    alert
  };
}
