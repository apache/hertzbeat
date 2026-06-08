import { expect, test, type Page, type Route } from 'playwright/test';

const baseUrl = process.env.DASHBOARD_SOURCE_EDIT_BROWSER_BASE_URL || 'http://127.0.0.1:4200';
const BROWSER_SMOKE_TIMEOUT = 300000;
const WORKBENCH_READY_TIMEOUT = 120000;

const DASHBOARD_KEY = 'signals-overview';
const RETURN_TO = `/dashboard?dashboard=${DASHBOARD_KEY}`;
const RETURN_LABEL = 'Signals overview';

type SignalCase = {
  signal: 'logs' | 'traces' | 'metrics';
  panelId: string;
  draftKey: string;
  initialRoute: string;
  editedNeedle: string;
  previewMatcher: RegExp;
  sourceRouteSelector: string;
  sourceActionSelector: string;
  sourceReturnSelector: string;
  fieldSelector: string;
  runSelector: string;
  editField: (page: Page) => Promise<void>;
};

const SIGNAL_CASES: SignalCase[] = [
  {
    signal: 'logs',
    panelId: 'logs-errors',
    draftKey: 'logs-draft-errors',
    initialRoute: '/log/manage?view=list&search=timeout&serviceName=checkout&environment=prod&timeRange=last-1h',
    editedNeedle: 'search=latency',
    previewMatcher: /search=latency/,
    sourceRouteSelector: '[data-log-manage-route="otlp-hertzbeat-ui-log-workbench"]',
    sourceActionSelector: '[data-log-manage-dashboard-panel-draft-action="update-current"]',
    sourceReturnSelector: '[data-log-manage-dashboard-panel-draft-return-action="dashboard"]',
    fieldSelector: '[data-log-manage-query-search-input="true"]',
    runSelector: '[data-log-manage-run-query-action="true"]',
    editField: async page => {
      await page.locator('[data-log-manage-query-search-input="true"]').fill('latency');
    }
  },
  {
    signal: 'traces',
    panelId: 'trace-errors',
    draftKey: 'trace-draft-errors',
    initialRoute: '/trace/manage?view=table&serviceName=checkout&operationName=POST%20%2Fcheckout&errorOnly=true&environment=prod&timeRange=last-1h',
    editedNeedle: 'operationName=GET+%2Fbilling',
    previewMatcher: /operationName=GET\+%2Fbilling/,
    sourceRouteSelector: '[data-trace-manage-route="otlp-hertzbeat-ui-trace-workbench"]',
    sourceActionSelector: '[data-trace-manage-dashboard-panel-draft-action="update-current"]',
    sourceReturnSelector: '[data-trace-manage-dashboard-panel-draft-return-action="dashboard"]',
    fieldSelector: '[data-trace-manage-operation-input="true"]',
    runSelector: '[data-trace-manage-search-action="true"]',
    editField: async page => {
      await page.locator('[data-trace-manage-operation-input="true"]').fill('GET /billing');
    }
  },
  {
    signal: 'metrics',
    panelId: 'metrics-latency',
    draftKey: 'metrics-draft-latency',
    initialRoute: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&environment=prod&inspector=graph&timeRange=last-1h',
    editedNeedle: 'query=process.runtime.jvm.memory.used',
    previewMatcher: /query=process\.runtime\.jvm\.memory\.used/,
    sourceRouteSelector: '[data-otlp-metrics-route="otlp-hertzbeat-ui-metrics-workbench"]',
    sourceActionSelector: '[data-otlp-metrics-dashboard-panel-draft-action="update-current"]',
    sourceReturnSelector: '[data-otlp-metrics-dashboard-panel-draft-return-action="dashboard"]',
    fieldSelector: '[data-otlp-metrics-query-input="true"]',
    runSelector: '[data-otlp-metrics-run-query-action="true"]',
    editField: async page => {
      await page.locator('[data-otlp-metrics-query-input="true"]').fill('process.runtime.jvm.memory.used');
    }
  }
];

function apiMessage<T>(data: T) {
  return {
    code: 0,
    msg: 'success',
    data
  };
}

function titleFromRoute(signalCase: SignalCase, route: string) {
  if (signalCase.signal === 'logs') return route.includes('latency') ? 'latency' : 'timeout';
  if (signalCase.signal === 'traces') return route.includes('GET+%2Fbilling') ? 'GET /billing' : 'POST /checkout';
  return route.includes('process.runtime.jvm.memory.used') ? 'process.runtime.jvm.memory.used' : 'http.server.duration';
}

function visualizationFromRoute(signalCase: SignalCase, route: string) {
  if (signalCase.signal === 'logs') return route.includes('view=table') ? 'table' : 'list';
  if (signalCase.signal === 'traces') return route.includes('view=time-series') ? 'time-series' : 'table';
  return route.includes('inspector=table') ? 'table' : 'graph';
}

function buildDashboard(signalCase: SignalCase, route: string, payload?: Record<string, unknown>) {
  return {
    dashboardKey: DASHBOARD_KEY,
    title: 'Signals overview',
    description: 'Three signal dashboard source edit smoke',
    tags: signalCase.signal,
    layout: JSON.stringify([{ i: signalCase.panelId, x: 0, y: 0, w: 6, h: 4 }]),
    widgets: JSON.stringify([{
      id: signalCase.panelId,
      draftKey: signalCase.draftKey,
      signal: signalCase.signal,
      title: titleFromRoute(signalCase, route),
      description: `${signalCase.signal} panel smoke`,
      visualization: visualizationFromRoute(signalCase, route),
      route,
      querySnapshot: route,
      payload: payload ? JSON.stringify(payload) : null
    }]),
    panelMap: JSON.stringify({ [signalCase.panelId]: signalCase.draftKey }),
    version: 'v1'
  };
}

function buildVariableDashboard() {
  return {
    dashboardKey: DASHBOARD_KEY,
    title: 'Signals overview',
    description: 'Variable deep link smoke',
    tags: 'metrics',
    variables: JSON.stringify([
      {
        name: 'service.name',
        type: 'textbox',
        value: 'checkout',
        description: 'Service',
        options: ['checkout', 'billing'],
        multi: false
      },
      {
        name: 'deployment.environment.name',
        type: 'textbox',
        value: 'prod',
        description: 'Environment',
        options: ['prod'],
        multi: false
      }
    ]),
    layout: JSON.stringify([{ i: 'variable-metrics', x: 0, y: 0, w: 6, h: 4 }]),
    widgets: JSON.stringify([{
      id: 'variable-metrics',
      draftKey: 'variable-metrics-draft',
      signal: 'metrics',
      title: 'Service latency',
      description: 'Variable-backed metrics panel',
      visualization: 'graph',
      route: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=$service.name&environment=$deployment.environment.name&inspector=graph&timeRange=last-1h',
      querySnapshot: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=$service.name&environment=$deployment.environment.name&inspector=graph&timeRange=last-1h',
      payload: JSON.stringify({
        source: 'dashboard-variable-deep-link-smoke'
      })
    }]),
    panelMap: JSON.stringify({ 'variable-metrics': 'variable-metrics-draft' }),
    version: 'v1'
  };
}

function buildRuntimeBreakoutDashboard() {
  const widgets = [
    {
      id: 'runtime-metrics',
      draftKey: 'runtime-metrics-draft',
      signal: 'metrics',
      title: 'Runtime metrics',
      description: 'Runtime sync metrics panel',
      visualization: 'graph',
      route: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&environment=prod&inspector=graph&timeRange=last-1h',
      querySnapshot: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&environment=prod&inspector=graph&timeRange=last-1h',
      payload: JSON.stringify({ source: 'dashboard-runtime-breakout-smoke' })
    },
    {
      id: 'runtime-logs',
      draftKey: 'runtime-logs-draft',
      signal: 'logs',
      title: 'Runtime logs',
      description: 'Runtime sync logs panel',
      visualization: 'table',
      route: '/log/manage?view=table&serviceName=checkout&environment=prod&timeRange=last-1h',
      querySnapshot: '/log/manage?view=table&serviceName=checkout&environment=prod&timeRange=last-1h',
      payload: JSON.stringify({ source: 'dashboard-runtime-breakout-smoke' })
    },
    {
      id: 'runtime-traces',
      draftKey: 'runtime-traces-draft',
      signal: 'traces',
      title: 'Runtime traces',
      description: 'Runtime sync traces panel',
      visualization: 'table',
      route: '/trace/manage?view=table&serviceName=checkout&environment=prod&spanScope=all&timeRange=last-1h',
      querySnapshot: '/trace/manage?view=table&serviceName=checkout&environment=prod&spanScope=all&timeRange=last-1h',
      payload: JSON.stringify({ source: 'dashboard-runtime-breakout-smoke' })
    },
    {
      id: 'runtime-log-group',
      draftKey: 'runtime-log-group-draft',
      signal: 'logs',
      title: 'Logs by service version',
      description: 'Runtime log group panel',
      visualization: 'list',
      route: '/log/manage?view=list&serviceName=checkout&environment=prod&groupBy=resource:service.version&groupLimit=8&timeRange=last-1h',
      querySnapshot: '/log/manage?view=list&serviceName=checkout&environment=prod&groupBy=resource:service.version&groupLimit=8&timeRange=last-1h',
      payload: JSON.stringify({ source: 'dashboard-runtime-breakout-smoke' })
    },
    {
      id: 'runtime-trace-group',
      draftKey: 'runtime-trace-group-draft',
      signal: 'traces',
      title: 'Traces by service version',
      description: 'Runtime trace group panel',
      visualization: 'list',
      route: '/trace/manage?view=list&serviceName=checkout&environment=prod&spanScope=all&groupBy=resource:service.version&groupLimit=8&timeRange=last-1h',
      querySnapshot: '/trace/manage?view=list&serviceName=checkout&environment=prod&spanScope=all&groupBy=resource:service.version&groupLimit=8&timeRange=last-1h',
      payload: JSON.stringify({ source: 'dashboard-runtime-breakout-smoke' })
    }
  ];
  return {
    dashboardKey: 'runtime-breakout',
    title: 'Runtime breakout',
    description: 'Runtime breakout smoke',
    tags: 'metrics,logs,traces',
    layout: JSON.stringify([
      { i: 'runtime-metrics', x: 0, y: 0, w: 6, h: 4 },
      { i: 'runtime-logs', x: 6, y: 0, w: 6, h: 4 },
      { i: 'runtime-traces', x: 0, y: 4, w: 6, h: 4 },
      { i: 'runtime-log-group', x: 6, y: 4, w: 6, h: 4 },
      { i: 'runtime-trace-group', x: 0, y: 8, w: 6, h: 4 }
    ]),
    widgets: JSON.stringify(widgets),
    panelMap: JSON.stringify({
      'runtime-metrics': 'runtime-metrics-draft',
      'runtime-logs': 'runtime-logs-draft',
      'runtime-traces': 'runtime-traces-draft',
      'runtime-log-group': 'runtime-log-group-draft',
      'runtime-trace-group': 'runtime-trace-group-draft'
    }),
    version: 'v1'
  };
}

function emptyPage(content: unknown[] = []) {
  return {
    content,
    totalElements: content.length,
    pageIndex: 0,
    pageSize: 8
  };
}

function logOverviewPayload() {
  return {
    totalLogs: 1,
    errorLogs: 1,
    distinctTraceCount: 1,
    latestObservedAt: 1713200000000,
    hasActiveLog: true
  };
}

function logListPayload(options: { syncTimestamp?: boolean } = {}) {
  return emptyPage([{
    traceId: 'trace-smoke-123',
    spanId: 'span-log-1',
    severityText: 'ERROR',
    severityNumber: 17,
    body: 'checkout latency',
    timeUnixNano: options.syncTimestamp ? 1713200000000 : 1713200000000000000,
    resource: {
      'service.name': 'checkout',
      'deployment.environment.name': 'prod',
      'service.version': '1.2.3'
    },
    attributes: {
      'http.route': '/checkout'
    }
  }]);
}

function logGroupPayload() {
  return {
    groupBy: 'resource:service.version',
    groups: [{
      value: '1.2.3',
      count: 12
    }]
  };
}

function traceOverviewPayload() {
  return {
    totalTraceCount: 1,
    errorTraceCount: 1,
    latestObservedAt: 1713200000000,
    hasActiveTrace: true
  };
}

function traceListPayload() {
  return emptyPage([{
    traceId: 'trace-smoke-123',
    rootSpanId: 'span-root-1',
    rootSpanName: 'GET /billing',
    serviceName: 'checkout',
    serviceNamespace: 'payments',
    durationNanos: 420000000,
    status: 'ERROR',
    startTime: 1713200000000,
    resourceAttributes: {
      'service.name': 'checkout',
      'deployment.environment.name': 'prod',
      'service.version': '1.2.3'
    },
    attributes: {
      'http.route': '/billing'
    }
  }]);
}

function traceGroupPayload() {
  return {
    groupBy: 'resource:service.version',
    groups: [{
      value: '1.2.3',
      traceCount: 8,
      errorTraceCount: 2,
      latencyP95Ms: 220
    }]
  };
}

function metricsPayload(query: string) {
  return {
    datasource: 'prometheus',
    queryMode: 'builder',
    query,
    stats: {
      totalSeries: 1,
      nonEmptySeries: 1,
      latestObservedAt: 1713200000000
    },
    context: {
      serviceName: 'checkout',
      environment: 'prod',
      start: 1713196400000,
      end: 1713200000000
    },
    results: {
      msg: 'ok',
      frames: [{
        schema: {
          labels: {
            'service.name': 'checkout',
            'deployment.environment.name': 'prod'
          }
        },
        data: [
          [1713196400000, 100],
          [1713200000000, query === 'process.runtime.jvm.memory.used' ? 512 : 120]
        ]
      }]
    }
  };
}

async function fulfillJson(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(data)
  });
}

function routeUrl(route: string) {
  return `${baseUrl}${route}`;
}

async function installDashboardSourceEditMocks(page: Page, signalCase: SignalCase) {
  let dashboard = buildDashboard(signalCase, signalCase.initialRoute);
  const savedDashboardRoutes: string[] = [];

  await page.addInitScript(() => {
    window.localStorage.setItem('Authorization', 'dashboard-source-edit-smoke-token');
    window.localStorage.setItem('refresh-token', 'dashboard-source-edit-smoke-refresh');
    window.localStorage.setItem('hb.lang', 'en-US');
    window.localStorage.setItem('layout.lang', 'en-US');

    class DashboardSourceEditSmokeEventSource {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSED = 2;
      readyState = DashboardSourceEditSmokeEventSource.OPEN;
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      url: string;
      withCredentials = false;

      constructor(url: string) {
        this.url = url;
        window.setTimeout(() => this.onopen?.(new Event('open')), 0);
      }

      addEventListener() {}
      removeEventListener() {}
      dispatchEvent() {
        return true;
      }
      close() {
        this.readyState = DashboardSourceEditSmokeEventSource.CLOSED;
      }
    }

    window.EventSource = DashboardSourceEditSmokeEventSource as unknown as typeof EventSource;
  });

  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method().toUpperCase();

    if (!path.startsWith('/api/')) {
      await route.continue();
      return;
    }

    if (path === '/api/account/session') {
      await fulfillJson(route, {
        authenticated: true,
        user: { id: 1, name: 'admin' }
      });
      return;
    }

    if (path === '/api/account/auth/refresh') {
      await fulfillJson(route, apiMessage({
        token: 'dashboard-source-edit-smoke-token',
        refreshToken: 'dashboard-source-edit-smoke-refresh'
      }));
      return;
    }

    if (path.startsWith('/api/signal/dashboard-panel-draft/') && method === 'GET') {
      const signal = path.split('/').pop();
      await fulfillJson(route, apiMessage(signal === signalCase.signal ? [{
        signal: signalCase.signal,
        draftKey: signalCase.draftKey,
        title: titleFromRoute(signalCase, signalCase.initialRoute),
        description: `${signalCase.signal} panel smoke`,
        visualization: visualizationFromRoute(signalCase, signalCase.initialRoute),
        route: signalCase.initialRoute,
        querySnapshot: signalCase.initialRoute
      }] : []));
      return;
    }

    if (path === '/api/signal/dashboard-panel-draft' && method === 'PUT') {
      await fulfillJson(route, apiMessage(JSON.parse(request.postData() || '{}')));
      return;
    }

    if (path === '/api/signal/dashboard' && method === 'GET') {
      await fulfillJson(route, apiMessage([dashboard]));
      return;
    }

    if (path === '/api/signal/dashboard' && method === 'PUT') {
      dashboard = JSON.parse(request.postData() || '{}');
      const [widget] = JSON.parse(String(dashboard.widgets || '[]'));
      savedDashboardRoutes.push(String(widget?.route || ''));
      await fulfillJson(route, apiMessage(dashboard));
      return;
    }

    if (path.startsWith('/api/signal/saved-view/') && method === 'GET') {
      await fulfillJson(route, apiMessage([]));
      return;
    }

    if (path === '/api/logs/stats/overview') {
      await fulfillJson(route, apiMessage(logOverviewPayload()));
      return;
    }

    if (path === '/api/logs/list') {
      await fulfillJson(route, apiMessage(logListPayload()));
      return;
    }

    if (path === '/api/logs/stats/trend') {
      await fulfillJson(route, apiMessage({ hourlyStats: { '10:00': 1 } }));
      return;
    }

    if (path === '/api/logs/stats/trace-coverage') {
      await fulfillJson(route, apiMessage({ traceCoverage: { withTrace: 1, withSpan: 1, withBothTraceAndSpan: 1 } }));
      return;
    }

    if (path === '/api/logs/stats/group-by') {
      await fulfillJson(route, apiMessage({ groupBy: '', groups: [] }));
      return;
    }

    if (path === '/api/traces/stats/overview') {
      await fulfillJson(route, apiMessage(traceOverviewPayload()));
      return;
    }

    if (path === '/api/traces/list') {
      await fulfillJson(route, apiMessage(traceListPayload()));
      return;
    }

    if (path === '/api/traces/stats/group-by') {
      await fulfillJson(route, apiMessage({ groupBy: '', groups: [] }));
      return;
    }

    if (path === '/api/otlp/v1/metrics') {
      await fulfillJson(route, apiMessage(metricsPayload(url.searchParams.get('query') || 'http.server.duration')));
      return;
    }

    await fulfillJson(route, apiMessage({}));
  });

  return {
    savedDashboardRoutes
  };
}

async function installDashboardVariableMocks(page: Page) {
  const dashboard = buildVariableDashboard();
  const executedMetricServices: string[] = [];
  const runtimeEvidenceDrafts: Array<Record<string, unknown>> = [];
  const savedDashboards: Array<Record<string, unknown>> = [];

  await page.addInitScript(() => {
    window.localStorage.setItem('Authorization', 'dashboard-variable-smoke-token');
    window.localStorage.setItem('refresh-token', 'dashboard-variable-smoke-refresh');
    window.localStorage.setItem('hb.lang', 'en-US');
    window.localStorage.setItem('layout.lang', 'en-US');
  });

  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method().toUpperCase();

    if (!path.startsWith('/api/')) {
      await route.continue();
      return;
    }

    if (path === '/api/account/session') {
      await fulfillJson(route, {
        authenticated: true,
        user: { id: 1, name: 'admin' }
      });
      return;
    }

    if (path === '/api/account/auth/refresh') {
      await fulfillJson(route, apiMessage({
        token: 'dashboard-variable-smoke-token',
        refreshToken: 'dashboard-variable-smoke-refresh'
      }));
      return;
    }

    if (path.startsWith('/api/signal/dashboard-panel-draft/') && method === 'GET') {
      await fulfillJson(route, apiMessage([]));
      return;
    }

    if (path === '/api/signal/dashboard-panel-draft' && method === 'PUT') {
      const draft = JSON.parse(request.postData() || '{}') as Record<string, unknown>;
      runtimeEvidenceDrafts.push(draft);
      await fulfillJson(route, apiMessage(draft));
      return;
    }

    if (path === '/api/signal/dashboard' && method === 'GET') {
      await fulfillJson(route, apiMessage([dashboard]));
      return;
    }

    if (path === '/api/signal/dashboard' && method === 'PUT') {
      const nextDashboard = JSON.parse(request.postData() || '{}') as Record<string, unknown>;
      savedDashboards.push(nextDashboard);
      await fulfillJson(route, apiMessage(nextDashboard));
      return;
    }

    if (path === '/api/ingestion/otlp/metrics/console') {
      executedMetricServices.push(url.searchParams.get('serviceName') || '');
      await fulfillJson(route, apiMessage(metricsPayload(url.searchParams.get('query') || 'http.server.duration')));
      return;
    }

    if (path === '/api/alerts/group') {
      await fulfillJson(route, apiMessage({
        content: [{
          id: 7,
          status: 'firing',
          groupKey: 'checkout-alerts',
          commonLabels: {
            alertname: 'HighErrorRate',
            'service.name': 'checkout',
            severity: 'critical'
          },
          commonAnnotations: {
            summary: 'Checkout error rate is high'
          },
          gmtUpdate: 1713200000000
        }],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      }));
      return;
    }

    if (path === '/api/alerts/summary') {
      await fulfillJson(route, apiMessage({
        total: 4,
        dealNum: 1,
        rate: 25,
        priorityWarningNum: 1,
        priorityCriticalNum: 2,
        priorityEmergencyNum: 1
      }));
      return;
    }

    await fulfillJson(route, apiMessage({}));
  });

  return {
    executedMetricServices,
    runtimeEvidenceDrafts,
    savedDashboards
  };
}

async function installDashboardServiceOverviewMocks(page: Page) {
  let dashboard: Record<string, unknown> | null = null;
  const savedDashboards: Array<Record<string, unknown>> = [];
  const executedUrls: string[] = [];

  await page.addInitScript(() => {
    window.localStorage.setItem('Authorization', 'dashboard-service-overview-smoke-token');
    window.localStorage.setItem('refresh-token', 'dashboard-service-overview-smoke-refresh');
    window.localStorage.setItem('hb.lang', 'en-US');
    window.localStorage.setItem('layout.lang', 'en-US');
  });

  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method().toUpperCase();

    if (!path.startsWith('/api/')) {
      await route.continue();
      return;
    }

    if (path === '/api/account/session') {
      await fulfillJson(route, {
        authenticated: true,
        user: { id: 1, name: 'admin' }
      });
      return;
    }

    if (path === '/api/account/auth/refresh') {
      await fulfillJson(route, apiMessage({
        token: 'dashboard-service-overview-smoke-token',
        refreshToken: 'dashboard-service-overview-smoke-refresh'
      }));
      return;
    }

    if (path.startsWith('/api/signal/dashboard-panel-draft/') && method === 'GET') {
      await fulfillJson(route, apiMessage([]));
      return;
    }

    if (path.startsWith('/api/signal/saved-view/') && method === 'GET') {
      await fulfillJson(route, apiMessage([]));
      return;
    }

    if (path === '/api/signal/dashboard' && method === 'GET') {
      await fulfillJson(route, apiMessage(dashboard ? [dashboard] : []));
      return;
    }

    if (path === '/api/signal/dashboard' && method === 'PUT') {
      dashboard = JSON.parse(request.postData() || '{}') as Record<string, unknown>;
      savedDashboards.push(dashboard);
      await fulfillJson(route, apiMessage(dashboard));
      return;
    }

    if (path === '/api/ingestion/otlp/metrics/console') {
      executedUrls.push(`${path}${url.search}`);
      await fulfillJson(route, apiMessage(metricsPayload(url.searchParams.get('query') || 'http.server.duration')));
      return;
    }

    if (path === '/api/logs/list') {
      executedUrls.push(`${path}${url.search}`);
      await fulfillJson(route, apiMessage(logListPayload()));
      return;
    }

    if (path === '/api/logs/stats/overview') {
      await fulfillJson(route, apiMessage(logOverviewPayload()));
      return;
    }

    if (path === '/api/logs/stats/trend') {
      await fulfillJson(route, apiMessage({ hourlyStats: { '10:00': 1 } }));
      return;
    }

    if (path === '/api/logs/stats/trace-coverage') {
      await fulfillJson(route, apiMessage({ traceCoverage: { withTrace: 1, withSpan: 1, withBothTraceAndSpan: 1 } }));
      return;
    }

    if (path === '/api/logs/stats/group-by') {
      executedUrls.push(`${path}${url.search}`);
      await fulfillJson(route, apiMessage(logGroupPayload()));
      return;
    }

    if (path === '/api/traces/list') {
      executedUrls.push(`${path}${url.search}`);
      await fulfillJson(route, apiMessage(traceListPayload()));
      return;
    }

    if (path === '/api/traces/stats/overview') {
      await fulfillJson(route, apiMessage(traceOverviewPayload()));
      return;
    }

    if (path === '/api/traces/stats/group-by') {
      executedUrls.push(`${path}${url.search}`);
      await fulfillJson(route, apiMessage(traceGroupPayload()));
      return;
    }

    if (path === '/api/alerts/group') {
      executedUrls.push(`${path}${url.search}`);
      await fulfillJson(route, apiMessage({
        content: [{
          id: 7,
          status: 'firing',
          groupKey: 'checkout-alerts',
          commonLabels: {
            alertname: 'HighErrorRate',
            'service.name': 'checkout',
            severity: 'critical'
          },
          commonAnnotations: {
            summary: 'Checkout error rate is high'
          },
          gmtUpdate: 1713200000000
        }],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      }));
      return;
    }

    if (path === '/api/alerts/summary') {
      await fulfillJson(route, apiMessage({
        total: 4,
        dealNum: 1,
        rate: 25,
        priorityWarningNum: 1,
        priorityCriticalNum: 2,
        priorityEmergencyNum: 1
      }));
      return;
    }

    await fulfillJson(route, apiMessage({}));
  });

  return {
    executedUrls,
    savedDashboards
  };
}

async function installDashboardRuntimeBreakoutMocks(page: Page) {
  const dashboard = buildRuntimeBreakoutDashboard();
  const runtimeBreakoutDrafts: Array<Record<string, unknown>> = [];

  await page.addInitScript(() => {
    window.localStorage.setItem('Authorization', 'dashboard-runtime-breakout-smoke-token');
    window.localStorage.setItem('refresh-token', 'dashboard-runtime-breakout-smoke-refresh');
    window.localStorage.setItem('hb.lang', 'en-US');
    window.localStorage.setItem('layout.lang', 'en-US');
  });

  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method().toUpperCase();

    if (!path.startsWith('/api/')) {
      await route.continue();
      return;
    }

    if (path === '/api/account/session') {
      await fulfillJson(route, {
        authenticated: true,
        user: { id: 1, name: 'admin' }
      });
      return;
    }

    if (path === '/api/account/auth/refresh') {
      await fulfillJson(route, apiMessage({
        token: 'dashboard-runtime-breakout-smoke-token',
        refreshToken: 'dashboard-runtime-breakout-smoke-refresh'
      }));
      return;
    }

    if (path.startsWith('/api/signal/dashboard-panel-draft/') && method === 'GET') {
      await fulfillJson(route, apiMessage([]));
      return;
    }

    if (path === '/api/signal/dashboard-panel-draft' && method === 'PUT') {
      const draft = JSON.parse(request.postData() || '{}') as Record<string, unknown>;
      runtimeBreakoutDrafts.push(draft);
      await fulfillJson(route, apiMessage(draft));
      return;
    }

    if (path === '/api/signal/dashboard' && method === 'GET') {
      await fulfillJson(route, apiMessage([dashboard]));
      return;
    }

    if (path === '/api/ingestion/otlp/metrics/console') {
      await fulfillJson(route, apiMessage(metricsPayload(url.searchParams.get('query') || 'http.server.duration')));
      return;
    }

    if (path === '/api/logs/list') {
      await fulfillJson(route, apiMessage(logListPayload({ syncTimestamp: true })));
      return;
    }

    if (path === '/api/logs/stats/group-by') {
      await fulfillJson(route, apiMessage(logGroupPayload()));
      return;
    }

    if (path === '/api/traces/list') {
      await fulfillJson(route, apiMessage(traceListPayload()));
      return;
    }

    if (path === '/api/traces/stats/group-by') {
      await fulfillJson(route, apiMessage(traceGroupPayload()));
      return;
    }

    if (path === '/api/logs/stats/overview') {
      await fulfillJson(route, apiMessage(logOverviewPayload()));
      return;
    }

    if (path === '/api/traces/stats/overview') {
      await fulfillJson(route, apiMessage(traceOverviewPayload()));
      return;
    }

    await fulfillJson(route, apiMessage({}));
  });

  return {
    runtimeBreakoutDrafts
  };
}

async function installDashboardSavedViewPromotionMocks(page: Page) {
  const promotedDrafts: Array<Record<string, unknown>> = [];
  const updatedSavedViews: Array<Record<string, unknown>> = [];
  const deletedSavedViews: string[] = [];
  const savedViews: Array<Record<string, unknown>> = [{
    signal: 'metrics',
    viewKey: 'metrics-checkout-p95',
    label: 'Checkout p95',
    description: 'Latency by service',
    route: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&inspector=graph',
    querySnapshot: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&inspector=graph',
    payload: JSON.stringify({ createdAt: 1713200000000 })
  }];

  await page.addInitScript(() => {
    window.localStorage.setItem('Authorization', 'dashboard-saved-view-smoke-token');
    window.localStorage.setItem('refresh-token', 'dashboard-saved-view-smoke-refresh');
    window.localStorage.setItem('hb.lang', 'en-US');
    window.localStorage.setItem('layout.lang', 'en-US');
  });

  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method().toUpperCase();

    if (!path.startsWith('/api/')) {
      await route.continue();
      return;
    }

    if (path === '/api/account/session') {
      await fulfillJson(route, {
        authenticated: true,
        user: { id: 1, name: 'admin' }
      });
      return;
    }

    if (path === '/api/account/auth/refresh') {
      await fulfillJson(route, apiMessage({
        token: 'dashboard-saved-view-smoke-token',
        refreshToken: 'dashboard-saved-view-smoke-refresh'
      }));
      return;
    }

    if (path.startsWith('/api/signal/dashboard-panel-draft/') && method === 'GET') {
      await fulfillJson(route, apiMessage([]));
      return;
    }

    if (path === '/api/signal/dashboard-panel-draft' && method === 'PUT') {
      const draft = JSON.parse(request.postData() || '{}') as Record<string, unknown>;
      promotedDrafts.push(draft);
      await fulfillJson(route, apiMessage(draft));
      return;
    }

    if (path === '/api/signal/dashboard' && method === 'GET') {
      await fulfillJson(route, apiMessage([]));
      return;
    }

    if (path === '/api/signal/saved-view' && method === 'PUT') {
      const updated = JSON.parse(request.postData() || '{}') as Record<string, unknown>;
      updatedSavedViews.push(updated);
      const index = savedViews.findIndex(view => view.viewKey === updated.viewKey);
      if (index >= 0) {
        savedViews[index] = {
          ...savedViews[index],
          ...updated
        };
      }
      await fulfillJson(route, apiMessage(index >= 0 ? savedViews[index] : updated));
      return;
    }

    if (path.startsWith('/api/signal/saved-view/') && method === 'GET') {
      const signal = path.split('/').pop();
      await fulfillJson(route, apiMessage(signal === 'metrics' ? savedViews : []));
      return;
    }

    if (path.startsWith('/api/signal/saved-view/') && method === 'DELETE') {
      const [, , , , signal, viewKey] = path.split('/');
      deletedSavedViews.push(`${signal}:${decodeURIComponent(viewKey || '')}`);
      const index = savedViews.findIndex(view => String(view.viewKey) === decodeURIComponent(viewKey || ''));
      if (index >= 0) savedViews.splice(index, 1);
      await fulfillJson(route, apiMessage(null));
      return;
    }

    await fulfillJson(route, apiMessage({}));
  });

  return {
    promotedDrafts,
    updatedSavedViews,
    deletedSavedViews
  };
}

test.describe('dashboard source edit browser smoke', () => {
  test('promotes a saved query view into a reusable dashboard panel draft', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);
    const smokeState = await installDashboardSavedViewPromotionMocks(page);

    await page.goto(routeUrl('/dashboard?timeRange=last-1h'), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });

    const savedViewRow = page.locator('[data-dashboard-saved-view-row="metrics-checkout-p95"]').first();
    await expect(savedViewRow).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(savedViewRow).toHaveAttribute('data-dashboard-saved-view-signal', 'metrics');
    await expect(savedViewRow).toHaveAttribute('data-dashboard-saved-view-route', /query=http\.server\.duration/);

    await savedViewRow.locator('[data-dashboard-saved-view-label-input="metrics-checkout-p95"]').fill('Checkout p99');
    await savedViewRow.locator('[data-dashboard-saved-view-description-input="metrics-checkout-p95"]').fill('Latency p99 by service');
    await savedViewRow.locator('[data-dashboard-saved-view-action="update"]').click();
    await expect.poll(() => smokeState.updatedSavedViews, {
      timeout: WORKBENCH_READY_TIMEOUT
    }).toHaveLength(1);
    expect(smokeState.updatedSavedViews[0]).toEqual(expect.objectContaining({
      signal: 'metrics',
      viewKey: 'metrics-checkout-p95',
      label: 'Checkout p99',
      description: 'Latency p99 by service'
    }));
    await expect(savedViewRow).toHaveAttribute('data-dashboard-saved-view-label', 'Checkout p99', {
      timeout: WORKBENCH_READY_TIMEOUT
    });

    await savedViewRow.locator('[data-dashboard-saved-view-action="add-panel"]').click();
    await expect.poll(() => smokeState.promotedDrafts, {
      timeout: WORKBENCH_READY_TIMEOUT
    }).toHaveLength(1);
    expect(smokeState.promotedDrafts[0]).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Checkout p99',
      description: 'Latency p99 by service',
      visualization: 'graph',
      route: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&inspector=graph',
      querySnapshot: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&inspector=graph'
    }));
    expect(JSON.parse(String(smokeState.promotedDrafts[0].payload))).toEqual(expect.objectContaining({
      savedViewRouteSummary: {
        query: 'http.server.duration',
        serviceName: 'checkout',
        inspector: 'graph'
      },
      savedViewRouteSummaryText: 'query=http.server.duration, serviceName=checkout, inspector=graph'
    }));

    const panelDraftRow = page.locator('[data-dashboard-panel-draft-row]').filter({ hasText: 'Checkout p99' }).first();
    await expect(panelDraftRow).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(panelDraftRow).toHaveAttribute('data-dashboard-panel-draft-signal', 'metrics');
    await expect(panelDraftRow).toHaveAttribute('data-dashboard-panel-draft-visualization', 'graph');
    await expect(panelDraftRow).toHaveAttribute(
      'data-dashboard-panel-draft-source-summary',
      'query=http.server.duration, serviceName=checkout, inspector=graph'
    );

    await panelDraftRow.locator('[data-dashboard-panel-draft-action="duplicate"]').click();
    await expect.poll(() => smokeState.promotedDrafts, {
      timeout: WORKBENCH_READY_TIMEOUT
    }).toHaveLength(2);
    const duplicatedPayload = JSON.parse(String(smokeState.promotedDrafts[1].payload));
    expect(smokeState.promotedDrafts[1]).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Checkout p99 Copy',
      description: 'Latency p99 by service',
      visualization: 'graph',
      route: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&inspector=graph',
      querySnapshot: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&inspector=graph'
    }));
    expect(duplicatedPayload).toEqual(expect.objectContaining({
      source: 'signal-dashboard-panel-duplicate',
      duplicatedFromSource: 'signal-saved-view',
      duplicatedFromDraftKey: smokeState.promotedDrafts[0].draftKey,
      savedViewRouteSummaryText: 'query=http.server.duration, serviceName=checkout, inspector=graph'
    }));
    const duplicatePanelDraftRow = page.locator('[data-dashboard-panel-draft-row]').filter({ hasText: 'Checkout p99 Copy' }).first();
    await expect(duplicatePanelDraftRow).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(duplicatePanelDraftRow).toHaveAttribute(
      'data-dashboard-panel-draft-source-summary',
      'query=http.server.duration, serviceName=checkout, inspector=graph'
    );

    await savedViewRow.locator('[data-dashboard-saved-view-action="delete"]').click();
    await expect.poll(() => smokeState.deletedSavedViews, {
      timeout: WORKBENCH_READY_TIMEOUT
    }).toContain('metrics:metrics-checkout-p95');
    await expect(page.locator('[data-dashboard-saved-view-row="metrics-checkout-p95"]')).toHaveCount(0, {
      timeout: WORKBENCH_READY_TIMEOUT
    });
  });

  test('applies dashboard variable URL overrides to preview routes and runtime execution', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);
    const smokeState = await installDashboardVariableMocks(page);

    await page.goto(routeUrl('/dashboard?dashboard=signals-overview&timeRange=last-1h&var-service.name=billing'), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });

    const filterVariable = page.locator('[data-dashboard-composition-filter-variable="service.name"]').first();
    await expect(filterVariable).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(filterVariable).toHaveAttribute('data-dashboard-composition-filter-variable-value', 'billing');

    const previewPanel = page.locator('[data-dashboard-composition-preview-panel="variable-metrics"]').first();
    await expect(previewPanel).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(previewPanel).toHaveAttribute('data-dashboard-composition-preview-raw-route', /\$service\.name/);
    await expect(previewPanel).toHaveAttribute('data-dashboard-composition-preview-route', /serviceName=billing/);
    await expect(previewPanel).toHaveAttribute('data-dashboard-composition-preview-route', /environment=prod/);
    await expect(previewPanel).toHaveAttribute('data-dashboard-composition-preview-edit-href', /returnTo=/);
    await expect(previewPanel).toHaveAttribute('data-dashboard-composition-preview-edit-href', /var-service\.name%3Dbilling/);
    await expect.poll(() => smokeState.executedMetricServices, {
      timeout: WORKBENCH_READY_TIMEOUT
    }).toContain('billing');

    await page.locator('[data-dashboard-composition-time-range-input="preset"]').fill('last-30m');
    await expect(page).toHaveURL(/timeRange=last-30m/, {
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page).toHaveURL(/var-service\.name=billing/);

    await page.locator('[data-dashboard-composition-filter-option="checkout"]').first().click();
    await expect(page).toHaveURL(/var-service\.name=checkout/, {
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(filterVariable).toHaveAttribute('data-dashboard-composition-filter-variable-value', 'checkout');
    await expect(previewPanel).toHaveAttribute('data-dashboard-composition-preview-route', /serviceName=checkout/);
    await expect.poll(() => smokeState.executedMetricServices, {
      timeout: WORKBENCH_READY_TIMEOUT
    }).toContain('checkout');

    await filterVariable.locator('[data-dashboard-composition-filter-variable-action="add-panel-draft"]').click();
    await expect(filterVariable.locator('[data-dashboard-composition-filter-variable-action="add-panel-draft"]')).toHaveAttribute(
      'data-dashboard-composition-filter-variable-action-templates',
      '18'
    );
    await expect(filterVariable.locator('[data-dashboard-composition-filter-variable-action="add-panel-draft"]')).toHaveAttribute(
      'data-dashboard-composition-filter-variable-action-compose',
      'dashboard'
    );
    await expect.poll(() => smokeState.runtimeEvidenceDrafts, {
      timeout: WORKBENCH_READY_TIMEOUT
    }).toHaveLength(18);
    expect(smokeState.runtimeEvidenceDrafts[0]).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Filter panel: service.name=checkout',
      description: 'service.name=checkout',
      visualization: 'graph'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[0].route)).toContain('serviceName=checkout');
    expect(String(smokeState.runtimeEvidenceDrafts[0].route)).toContain('inspector=graph');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[0].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      sourcePanelId: 'variable-metrics',
      variableName: 'service.name',
      variableValue: 'checkout',
      variableType: 'textbox',
      templateKey: 'metrics-graph'
    }));
    expect(smokeState.runtimeEvidenceDrafts[1]).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Filter panel table: service.name=checkout',
      description: 'service.name=checkout · table',
      visualization: 'table'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[1].route)).toContain('serviceName=checkout');
    expect(String(smokeState.runtimeEvidenceDrafts[1].route)).toContain('inspector=table');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[1].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-table'
    }));
    expect(smokeState.runtimeEvidenceDrafts[2]).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Filter panel latency p95: service.name=checkout',
      description: 'service.name=checkout · latency p95',
      visualization: 'graph'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[2].route)).toContain('query=http.server.duration');
    expect(String(smokeState.runtimeEvidenceDrafts[2].route)).toContain('aggregation=p95');
    expect(String(smokeState.runtimeEvidenceDrafts[2].route)).toContain('groupBy=route');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[2].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-latency-p95'
    }));
    expect(smokeState.runtimeEvidenceDrafts[3]).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Filter panel request rate: service.name=checkout',
      description: 'service.name=checkout · request rate',
      visualization: 'graph'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[3].route)).toContain('query=http_server_duration_milliseconds_count');
    expect(String(smokeState.runtimeEvidenceDrafts[3].route)).toContain('temporalAggregation=rate');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[3].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-request-rate'
    }));
    expect(smokeState.runtimeEvidenceDrafts[4]).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Filter panel error rate: service.name=checkout',
      description: 'service.name=checkout · error rate',
      visualization: 'graph'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[4].route)).toContain('query=http_server_duration_milliseconds_count');
    expect(String(smokeState.runtimeEvidenceDrafts[4].route)).toContain('status_code%3D%22STATUS_CODE_ERROR%22');
    expect(String(smokeState.runtimeEvidenceDrafts[4].route)).toContain('groupBy=status_code');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[4].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-error-rate'
    }));
    expect(smokeState.runtimeEvidenceDrafts[5]).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Filter panel apdex: service.name=checkout',
      description: 'service.name=checkout · apdex',
      visualization: 'graph'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[5].route)).toContain('query=http.server.duration.bucket');
    expect(String(smokeState.runtimeEvidenceDrafts[5].route)).toContain('template=service-apdex');
    expect(String(smokeState.runtimeEvidenceDrafts[5].route)).toContain('groupBy=service.name');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[5].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-apdex'
    }));
    expect(smokeState.runtimeEvidenceDrafts[6]).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Filter panel db calls rate: service.name=checkout',
      description: 'service.name=checkout · db calls rate',
      visualization: 'graph'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[6].route)).toContain('query=signoz_db_latency_count');
    expect(String(smokeState.runtimeEvidenceDrafts[6].route)).toContain('temporalAggregation=rate');
    expect(String(smokeState.runtimeEvidenceDrafts[6].route)).toContain('groupBy=db.system');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[6].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-db-call-rate'
    }));
    expect(smokeState.runtimeEvidenceDrafts[7]).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Filter panel db call duration: service.name=checkout',
      description: 'service.name=checkout · db call duration',
      visualization: 'graph'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[7].route)).toContain('query=signoz_db_latency_sum');
    expect(String(smokeState.runtimeEvidenceDrafts[7].route)).toContain('template=service-db-call-duration');
    expect(String(smokeState.runtimeEvidenceDrafts[7].route)).toContain('groupBy=db.system');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[7].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-db-call-duration'
    }));
    expect(smokeState.runtimeEvidenceDrafts[8]).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Filter panel external calls rate: service.name=checkout',
      description: 'service.name=checkout · external calls rate',
      visualization: 'graph'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[8].route)).toContain('query=signoz_external_call_latency_count');
    expect(String(smokeState.runtimeEvidenceDrafts[8].route)).toContain('temporalAggregation=rate');
    expect(String(smokeState.runtimeEvidenceDrafts[8].route)).toContain('groupBy=external.service.address');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[8].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-external-call-rate'
    }));
    expect(smokeState.runtimeEvidenceDrafts[9]).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Filter panel external call duration: service.name=checkout',
      description: 'service.name=checkout · external call duration',
      visualization: 'graph'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[9].route)).toContain('query=signoz_external_call_latency_sum');
    expect(String(smokeState.runtimeEvidenceDrafts[9].route)).toContain('template=service-external-call-duration');
    expect(String(smokeState.runtimeEvidenceDrafts[9].route)).toContain('groupBy=external.service.address');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[9].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-external-call-duration'
    }));
    expect(smokeState.runtimeEvidenceDrafts[10]).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Filter panel key operations: service.name=checkout',
      description: 'service.name=checkout · key operations',
      visualization: 'graph'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[10].route)).toContain('query=http.server.duration');
    expect(String(smokeState.runtimeEvidenceDrafts[10].route)).toContain('groupBy=operation');
    expect(String(smokeState.runtimeEvidenceDrafts[10].route)).toContain('limit=10');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[10].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'metrics-key-operations'
    }));
    expect(smokeState.runtimeEvidenceDrafts[11]).toEqual(expect.objectContaining({
      signal: 'logs',
      title: 'Filter panel logs: service.name=checkout',
      description: 'service.name=checkout · logs',
      visualization: 'list'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[11].route)).toContain('/log/manage?');
    expect(String(smokeState.runtimeEvidenceDrafts[11].route)).toContain('serviceName=checkout');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[11].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'logs-list'
    }));
    expect(smokeState.runtimeEvidenceDrafts[12]).toEqual(expect.objectContaining({
      signal: 'logs',
      title: 'Filter panel log errors: service.name=checkout',
      description: 'service.name=checkout · log errors',
      visualization: 'table'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[12].route)).toContain('/log/manage?');
    expect(String(smokeState.runtimeEvidenceDrafts[12].route)).toContain('serviceName=checkout');
    expect(String(smokeState.runtimeEvidenceDrafts[12].route)).toContain('severityText=ERROR');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[12].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'logs-errors'
    }));
    expect(smokeState.runtimeEvidenceDrafts[13]).toEqual(expect.objectContaining({
      signal: 'traces',
      title: 'Filter panel traces: service.name=checkout',
      description: 'service.name=checkout · traces',
      visualization: 'table'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[13].route)).toContain('/trace/manage?');
    expect(String(smokeState.runtimeEvidenceDrafts[13].route)).toContain('serviceName=checkout');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[13].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'traces-table'
    }));
    expect(smokeState.runtimeEvidenceDrafts[14]).toEqual(expect.objectContaining({
      signal: 'traces',
      title: 'Filter panel trace errors: service.name=checkout',
      description: 'service.name=checkout · trace errors',
      visualization: 'table'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[14].route)).toContain('/trace/manage?');
    expect(String(smokeState.runtimeEvidenceDrafts[14].route)).toContain('serviceName=checkout');
    expect(String(smokeState.runtimeEvidenceDrafts[14].route)).toContain('errorOnly=true');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[14].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'traces-errors'
    }));
    expect(smokeState.runtimeEvidenceDrafts[15]).toEqual(expect.objectContaining({
      signal: 'traces',
      title: 'Filter panel exceptions: service.name=checkout',
      description: 'service.name=checkout · exceptions',
      visualization: 'list'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[15].route)).toContain('/trace/manage?');
    expect(String(smokeState.runtimeEvidenceDrafts[15].route)).toContain('serviceName=checkout');
    expect(String(smokeState.runtimeEvidenceDrafts[15].route)).toContain('template=service-exceptions');
    expect(String(smokeState.runtimeEvidenceDrafts[15].route)).toContain('errorOnly=true');
    expect(String(smokeState.runtimeEvidenceDrafts[15].route)).toContain('spanScope=all');
    expect(String(smokeState.runtimeEvidenceDrafts[15].route)).toContain('groupBy=exception.type');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[15].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'traces-exceptions'
    }));
    expect(smokeState.runtimeEvidenceDrafts[16]).toEqual(expect.objectContaining({
      signal: 'traces',
      title: 'Filter panel exception messages: service.name=checkout',
      description: 'service.name=checkout · exception messages',
      visualization: 'list'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[16].route)).toContain('/trace/manage?');
    expect(String(smokeState.runtimeEvidenceDrafts[16].route)).toContain('serviceName=checkout');
    expect(String(smokeState.runtimeEvidenceDrafts[16].route)).toContain('template=service-exception-messages');
    expect(String(smokeState.runtimeEvidenceDrafts[16].route)).toContain('errorOnly=true');
    expect(String(smokeState.runtimeEvidenceDrafts[16].route)).toContain('spanScope=all');
    expect(String(smokeState.runtimeEvidenceDrafts[16].route)).toContain('groupBy=exception.message');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[16].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'traces-exception-messages'
    }));
    expect(smokeState.runtimeEvidenceDrafts[17]).toEqual(expect.objectContaining({
      signal: 'alerts',
      title: 'Filter panel firing alerts: service.name=checkout',
      description: 'service.name=checkout · firing alerts',
      visualization: 'list'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[17].route)).toContain('/alert?');
    expect(String(smokeState.runtimeEvidenceDrafts[17].route)).toContain('serviceName=checkout');
    expect(String(smokeState.runtimeEvidenceDrafts[17].route)).toContain('search=checkout');
    expect(String(smokeState.runtimeEvidenceDrafts[17].route)).toContain('status=firing');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[17].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-filter-selection',
      templateKey: 'alerts-firing'
    }));
    await expect.poll(() => smokeState.savedDashboards, {
      timeout: WORKBENCH_READY_TIMEOUT
    }).toHaveLength(1);
    const savedDashboardWidgets = JSON.parse(String(smokeState.savedDashboards[0].widgets || '[]')) as Array<Record<string, unknown>>;
    expect(savedDashboardWidgets.map(widget => widget.title)).toEqual([
      'Service latency',
      'Filter panel: service.name=checkout',
      'Filter panel table: service.name=checkout',
      'Filter panel latency p95: service.name=checkout',
      'Filter panel request rate: service.name=checkout',
      'Filter panel error rate: service.name=checkout',
      'Filter panel apdex: service.name=checkout',
      'Filter panel db calls rate: service.name=checkout',
      'Filter panel db call duration: service.name=checkout',
      'Filter panel external calls rate: service.name=checkout',
      'Filter panel external call duration: service.name=checkout',
      'Filter panel key operations: service.name=checkout',
      'Filter panel logs: service.name=checkout',
      'Filter panel log errors: service.name=checkout',
      'Filter panel traces: service.name=checkout',
      'Filter panel trace errors: service.name=checkout',
      'Filter panel exceptions: service.name=checkout',
      'Filter panel exception messages: service.name=checkout',
      'Filter panel firing alerts: service.name=checkout'
    ]);
    expect(JSON.parse(String(smokeState.savedDashboards[0].layout || '[]'))).toEqual(expect.arrayContaining([
      expect.objectContaining({ x: 0, y: 4, w: 6, h: 4 }),
      expect.objectContaining({ x: 6, y: 4, w: 6, h: 4 }),
      expect.objectContaining({ x: 0, y: 8, w: 6, h: 4 }),
      expect.objectContaining({ x: 6, y: 8, w: 6, h: 4 }),
      expect.objectContaining({ x: 0, y: 12, w: 6, h: 4 }),
      expect.objectContaining({ x: 6, y: 12, w: 6, h: 4 }),
      expect.objectContaining({ x: 0, y: 16, w: 6, h: 4 }),
      expect.objectContaining({ x: 6, y: 16, w: 6, h: 4 }),
      expect.objectContaining({ x: 0, y: 20, w: 6, h: 4 }),
      expect.objectContaining({ x: 6, y: 20, w: 6, h: 4 }),
      expect.objectContaining({ x: 0, y: 24, w: 6, h: 4 }),
      expect.objectContaining({ x: 6, y: 24, w: 6, h: 4 }),
      expect.objectContaining({ x: 0, y: 28, w: 6, h: 4 }),
      expect.objectContaining({ x: 6, y: 28, w: 6, h: 4 }),
      expect.objectContaining({ x: 0, y: 32, w: 6, h: 4 }),
      expect.objectContaining({ x: 6, y: 32, w: 6, h: 4 }),
      expect.objectContaining({ x: 0, y: 36, w: 6, h: 4 }),
      expect.objectContaining({ x: 6, y: 36, w: 6, h: 4 })
    ]));

    const alertRuntimeHandoffRow = page.locator('[data-dashboard-composition-runtime-preview-row-related-signal="alerts"]').first();
    await expect(alertRuntimeHandoffRow).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(alertRuntimeHandoffRow).toHaveAttribute('data-dashboard-composition-runtime-preview-row-related-handoff', /\/alert/);
    await expect(alertRuntimeHandoffRow).toHaveAttribute('data-dashboard-composition-runtime-preview-row-related-handoff', /status=firing/);
    await expect(alertRuntimeHandoffRow.locator('[data-dashboard-composition-runtime-preview-row-action="open-related"]')).toHaveAttribute(
      'data-dashboard-composition-runtime-preview-row-action-href',
      /\/alert/
    );
    const alertCriticalHandoffRow = page.locator('[data-dashboard-composition-runtime-preview-row-related-signal="alerts"][data-dashboard-composition-runtime-preview-row-related-handoff*="severity=critical"]').first();
    await expect(alertCriticalHandoffRow).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });

    const metricPoint = page.locator('[data-dashboard-runtime-metrics-chart-point-timestamp="1713200000000"]').first();
    await expect(metricPoint).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await metricPoint.click();

    const runtimeTooltipRow = page.locator('[data-dashboard-composition-runtime-sync-tooltip-row-source="metrics-point"]').first();
    await expect(runtimeTooltipRow).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(runtimeTooltipRow).toHaveAttribute('data-dashboard-composition-runtime-sync-tooltip-row-handoff', /serviceName=checkout/);
    await expect(runtimeTooltipRow).toHaveAttribute('data-dashboard-composition-runtime-sync-tooltip-row-related-handoff', /\/trace\/manage/);
    await expect(runtimeTooltipRow).toHaveAttribute('data-dashboard-composition-runtime-sync-tooltip-row-related-handoff', /serviceName=checkout/);
    await expect(runtimeTooltipRow).toHaveAttribute('data-dashboard-composition-runtime-sync-tooltip-row-related-handoff', /spanScope=all/);
    await expect(runtimeTooltipRow).toHaveAttribute('data-dashboard-composition-runtime-sync-tooltip-row-breakout-attributes', /[1-9]/);
    await expect(runtimeTooltipRow.locator('[data-dashboard-composition-runtime-sync-tooltip-row-action="open-related"]')).toHaveAttribute(
      'data-dashboard-composition-runtime-sync-tooltip-row-action-href',
      /\/trace\/manage/
    );
    await expect(runtimeTooltipRow.locator('[data-dashboard-composition-runtime-sync-tooltip-row-action="breakout-panel-draft"]').first()).toHaveAttribute(
      'data-dashboard-composition-runtime-sync-tooltip-row-action-attribute',
      'service.name'
    );
    await runtimeTooltipRow.locator('[data-dashboard-composition-runtime-sync-tooltip-row-action="add-panel-draft"]').click();
    await expect.poll(() => smokeState.runtimeEvidenceDrafts, {
      timeout: WORKBENCH_READY_TIMEOUT
    }).toHaveLength(19);
    expect(smokeState.runtimeEvidenceDrafts[18]).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Evidence panel: http.server.duration',
      description: 'metrics-point · 120 · 1713200000000',
      visualization: 'graph'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[18].route)).toContain('serviceName=checkout');
    expect(String(smokeState.runtimeEvidenceDrafts[18].route)).toContain('start=');
    expect(String(smokeState.runtimeEvidenceDrafts[18].route)).toContain('end=');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[18].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-runtime-evidence',
      sourcePanelId: 'variable-metrics',
      evidenceSource: 'metrics-point',
      evidenceLabel: 'http.server.duration',
      evidenceValue: '120'
    }));
    await runtimeTooltipRow.locator('[data-dashboard-composition-runtime-sync-tooltip-row-action="breakout-panel-draft"]').first().click();
    await expect.poll(() => smokeState.runtimeEvidenceDrafts, {
      timeout: WORKBENCH_READY_TIMEOUT
    }).toHaveLength(20);
    expect(smokeState.runtimeEvidenceDrafts[19]).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Breakout panel: service.name',
      description: 'breakout by service.name · checkout',
      visualization: 'graph'
    }));
    expect(String(smokeState.runtimeEvidenceDrafts[19].route)).toContain('serviceName=checkout');
    expect(String(smokeState.runtimeEvidenceDrafts[19].route)).toContain('groupBy=service.name');
    expect(JSON.parse(String(smokeState.runtimeEvidenceDrafts[19].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-runtime-breakout',
      sourcePanelId: 'variable-metrics',
      evidenceSource: 'metrics-point',
      evidenceLabel: 'http.server.duration',
      evidenceValue: '120',
      breakoutAttribute: 'service.name',
      breakoutAttributeValue: 'checkout'
    }));
    const runtimeEvidenceDraftRow = page.locator('[data-dashboard-panel-draft-row]').filter({ hasText: 'Evidence panel: http.server.duration' }).first();
    await expect(runtimeEvidenceDraftRow).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(runtimeEvidenceDraftRow).toHaveAttribute('data-dashboard-panel-draft-signal', 'metrics');
    const runtimeBreakoutDraftRow = page.locator('[data-dashboard-panel-draft-row]').filter({ hasText: 'Breakout panel: service.name' }).first();
    await expect(runtimeBreakoutDraftRow).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(runtimeBreakoutDraftRow).toHaveAttribute('data-dashboard-panel-draft-signal', 'metrics');
  });

  test('creates logs and traces breakout drafts from synchronized dashboard evidence', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);
    const smokeState = await installDashboardRuntimeBreakoutMocks(page);

    await page.goto(routeUrl('/dashboard?dashboard=runtime-breakout&timeRange=last-1h'), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });

    await expect(page.locator('[data-dashboard-composition-preview-panel="runtime-metrics"]').first()).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(page.locator('[data-dashboard-composition-preview-panel="runtime-logs"]').first()).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(page.locator('[data-dashboard-composition-preview-panel="runtime-traces"]').first()).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(page.locator('[data-dashboard-composition-preview-panel="runtime-log-group"]').first()).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(page.locator('[data-dashboard-composition-preview-panel="runtime-trace-group"]').first()).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });

    const logGroupRow = page.locator('[data-dashboard-runtime-object-panel="runtime-log-group"] [data-dashboard-composition-runtime-preview-row-related-signal="logs"]').first();
    await expect(logGroupRow).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(logGroupRow).toHaveAttribute('data-dashboard-composition-runtime-preview-row-related-handoff', /\/log\/manage/);
    await expect(logGroupRow).toHaveAttribute('data-dashboard-composition-runtime-preview-row-related-handoff', /resourceFilter=service.version%3D1.2.3/);
    await expect(logGroupRow.locator('[data-dashboard-composition-runtime-preview-row-action="open-related"]')).toHaveAttribute(
      'data-dashboard-composition-runtime-preview-row-action-href',
      /resourceFilter=service.version%3D1.2.3/
    );

    const traceGroupRow = page.locator('[data-dashboard-runtime-object-panel="runtime-trace-group"] [data-dashboard-composition-runtime-preview-row-related-signal="traces"]').first();
    await expect(traceGroupRow).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(traceGroupRow).toHaveAttribute('data-dashboard-composition-runtime-preview-row-related-handoff', /\/trace\/manage/);
    await expect(traceGroupRow).toHaveAttribute('data-dashboard-composition-runtime-preview-row-related-handoff', /resourceFilter=service.version%3D1.2.3/);
    await expect(traceGroupRow.locator('[data-dashboard-composition-runtime-preview-row-action="open-related"]')).toHaveAttribute(
      'data-dashboard-composition-runtime-preview-row-action-href',
      /resourceFilter=service.version%3D1.2.3/
    );

    const metricPoint = page.locator('[data-dashboard-runtime-metrics-chart-point-timestamp="1713200000000"]').first();
    await expect(metricPoint).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await metricPoint.click();

    const logRuntimeRow = page.locator(
      '[data-dashboard-composition-runtime-sync-tooltip-row-signal="logs"][data-dashboard-composition-runtime-sync-tooltip-row-source="table-row"]'
    ).first();
    await expect(logRuntimeRow).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(logRuntimeRow).toHaveAttribute('data-dashboard-composition-runtime-sync-tooltip-row-breakout-attributes', /[1-9]/);
    await expect(logRuntimeRow.locator('[data-dashboard-composition-runtime-sync-tooltip-row-action="breakout-panel-draft"]').first()).toHaveAttribute(
      'data-dashboard-composition-runtime-sync-tooltip-row-action-attribute',
      'resource:service.name'
    );
    await logRuntimeRow.locator('[data-dashboard-composition-runtime-sync-tooltip-row-action="breakout-panel-draft"]').first().click();
    await expect.poll(() => smokeState.runtimeBreakoutDrafts, {
      timeout: WORKBENCH_READY_TIMEOUT
    }).toHaveLength(1);
    expect(smokeState.runtimeBreakoutDrafts[0]).toEqual(expect.objectContaining({
      signal: 'logs',
      title: 'Breakout panel: resource:service.name',
      description: 'breakout by resource:service.name · checkout',
      visualization: 'list'
    }));
    expect(String(smokeState.runtimeBreakoutDrafts[0].route)).toContain('/log/manage?');
    expect(String(smokeState.runtimeBreakoutDrafts[0].route)).toContain('view=list');
    expect(String(smokeState.runtimeBreakoutDrafts[0].route)).toContain('serviceName=checkout');
    expect(String(smokeState.runtimeBreakoutDrafts[0].route)).toContain('groupBy=resource%3Aservice.name');
    expect(String(smokeState.runtimeBreakoutDrafts[0].route)).not.toContain('traceId=');
    expect(String(smokeState.runtimeBreakoutDrafts[0].route)).not.toContain('spanId=');
    expect(JSON.parse(String(smokeState.runtimeBreakoutDrafts[0].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-runtime-breakout',
      sourcePanelId: 'runtime-logs',
      evidenceSource: 'table-row',
      breakoutAttribute: 'resource:service.name',
      breakoutAttributeValue: 'checkout'
    }));

    const traceRuntimeRow = page.locator(
      '[data-dashboard-composition-runtime-sync-tooltip-row-signal="traces"][data-dashboard-composition-runtime-sync-tooltip-row-source="table-row"]'
    ).first();
    await expect(traceRuntimeRow).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(traceRuntimeRow).toHaveAttribute('data-dashboard-composition-runtime-sync-tooltip-row-breakout-attributes', /[1-9]/);
    await expect(traceRuntimeRow.locator('[data-dashboard-composition-runtime-sync-tooltip-row-action="breakout-panel-draft"]').first()).toHaveAttribute(
      'data-dashboard-composition-runtime-sync-tooltip-row-action-attribute',
      'resource:service.name'
    );
    await traceRuntimeRow.locator('[data-dashboard-composition-runtime-sync-tooltip-row-action="breakout-panel-draft"]').first().click();
    await expect.poll(() => smokeState.runtimeBreakoutDrafts, {
      timeout: WORKBENCH_READY_TIMEOUT
    }).toHaveLength(2);
    expect(smokeState.runtimeBreakoutDrafts[1]).toEqual(expect.objectContaining({
      signal: 'traces',
      title: 'Breakout panel: resource:service.name',
      description: 'breakout by resource:service.name · checkout',
      visualization: 'list'
    }));
    expect(String(smokeState.runtimeBreakoutDrafts[1].route)).toContain('/trace/manage?');
    expect(String(smokeState.runtimeBreakoutDrafts[1].route)).toContain('view=list');
    expect(String(smokeState.runtimeBreakoutDrafts[1].route)).toContain('serviceName=checkout');
    expect(String(smokeState.runtimeBreakoutDrafts[1].route)).toContain('spanScope=all');
    expect(String(smokeState.runtimeBreakoutDrafts[1].route)).toContain('groupBy=resource%3Aservice.name');
    expect(String(smokeState.runtimeBreakoutDrafts[1].route)).not.toContain('traceId=');
    expect(String(smokeState.runtimeBreakoutDrafts[1].route)).not.toContain('spanId=');
    expect(JSON.parse(String(smokeState.runtimeBreakoutDrafts[1].payload))).toEqual(expect.objectContaining({
      source: 'signal-dashboard-runtime-breakout',
      sourcePanelId: 'runtime-traces',
      evidenceSource: 'table-row',
      breakoutAttribute: 'resource:service.name',
      breakoutAttributeValue: 'checkout'
    }));
  });

  test('saves a service overview dashboard from URL service and entity context', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);
    const smokeState = await installDashboardServiceOverviewMocks(page);

    await page.goto(routeUrl('/dashboard?serviceName=checkout&serviceNamespace=payments&environment=prod&entityId=4200&entityType=service&entityName=Checkout%20API&source=otlp&collector=collector-a&template=spring-boot&timeRange=last-1h&refresh=30&live=true'), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });

    const serviceOverviewAction = page.locator('[data-dashboard-service-overview-action="save"]').first();
    await expect(page.locator('[data-dashboard-service-overview-context="ready"]')).toHaveAttribute(
      'data-dashboard-service-overview-service',
      'checkout',
      { timeout: WORKBENCH_READY_TIMEOUT }
    );
    await expect(serviceOverviewAction).toHaveAttribute('data-dashboard-service-overview-action-state', 'ready');
    await expect(serviceOverviewAction).toHaveAttribute('data-dashboard-service-overview-action-service', 'checkout');
    await serviceOverviewAction.click();

    await expect.poll(() => smokeState.savedDashboards, {
      timeout: WORKBENCH_READY_TIMEOUT
    }).toHaveLength(1);
    const [savedDashboard] = smokeState.savedDashboards;
    const savedWidgets = JSON.parse(String(savedDashboard.widgets || '[]')) as Array<Record<string, unknown>>;
    const savedVariables = JSON.parse(String(savedDashboard.variables || '[]')) as Array<Record<string, unknown>>;
    expect(savedDashboard).toEqual(expect.objectContaining({
      dashboardKey: 'service-checkout-overview',
      title: 'Checkout API service overview',
      tags: 'service,apm,metrics,logs,traces,alerts'
    }));
    expect(savedWidgets).toHaveLength(18);
    expect(savedWidgets.map(widget => widget.title)).toEqual(expect.arrayContaining([
      'Service overview request rate: service.name=checkout',
      'Service overview error rate: service.name=checkout',
      'Service overview apdex: service.name=checkout',
      'Service overview log errors: service.name=checkout',
      'Service overview exceptions: service.name=checkout',
      'Service overview firing alerts: service.name=checkout'
    ]));
    expect(savedVariables).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'service.name', type: 'query', value: 'checkout' }),
      expect.objectContaining({ name: 'service.namespace', type: 'query', value: 'payments' }),
      expect.objectContaining({ name: 'hertzbeat.entity_id', type: 'dynamic', value: '4200' }),
      expect.objectContaining({ name: 'hertzbeat.entity_type', type: 'dynamic', value: 'service' }),
      expect.objectContaining({ name: 'hertzbeat.template', type: 'dynamic', value: 'spring-boot' })
    ]));

    await expect(page).toHaveURL(/dashboard=service-checkout-overview/, {
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('[data-dashboard-composition-preview-panel]')).toHaveCount(18, {
      timeout: WORKBENCH_READY_TIMEOUT
    });

    const requestRatePanel = page.locator('[data-dashboard-composition-preview-panel]').filter({ hasText: 'Service overview request rate' }).first();
    await expect(requestRatePanel).toHaveAttribute('data-dashboard-composition-preview-signal', 'metrics');
    await expect(requestRatePanel).toHaveAttribute('data-dashboard-composition-execution-primary-url', /query=http_server_duration_milliseconds_count/);
    await expect(requestRatePanel).toHaveAttribute('data-dashboard-composition-execution-primary-url', /temporalAggregation=rate/);
    await expect(requestRatePanel).toHaveAttribute('data-dashboard-composition-execution-primary-url', /entityType=service/);

    const apdexPanel = page.locator('[data-dashboard-composition-preview-panel]').filter({ hasText: 'Service overview apdex' }).first();
    await expect(apdexPanel).toHaveAttribute('data-dashboard-composition-execution-endpoints', '3');
    await expect(apdexPanel).toHaveAttribute('data-dashboard-composition-execution-primary-url', /template=service-apdex/);

    const logErrorsPanel = page.locator('[data-dashboard-composition-preview-panel]').filter({ hasText: 'Service overview log errors' }).first();
    await expect(logErrorsPanel).toHaveAttribute('data-dashboard-composition-preview-signal', 'logs');
    await expect(logErrorsPanel).toHaveAttribute('data-dashboard-composition-execution-primary-url', /\/logs\/list\?/);
    await expect(logErrorsPanel).toHaveAttribute('data-dashboard-composition-execution-primary-url', /severityText=ERROR/);

    const exceptionPanel = page.locator('[data-dashboard-composition-preview-panel]').filter({ hasText: 'Service overview exceptions' }).first();
    await expect(exceptionPanel).toHaveAttribute('data-dashboard-composition-preview-signal', 'traces');
    await expect(exceptionPanel).toHaveAttribute('data-dashboard-composition-execution-primary-url', /\/traces\/stats\/group-by\?/);
    await expect(exceptionPanel).toHaveAttribute('data-dashboard-composition-execution-primary-url', /groupBy=exception.type/);

    const alertPanel = page.locator('[data-dashboard-composition-preview-panel]').filter({ hasText: 'Service overview firing alerts' }).first();
    await expect(alertPanel).toHaveAttribute('data-dashboard-composition-preview-signal', 'alerts');
    await expect(alertPanel).toHaveAttribute('data-dashboard-composition-execution-primary-url', /\/alerts\/group\?/);
    await expect(alertPanel).toHaveAttribute('data-dashboard-composition-execution-primary-url', /status=firing/);

    await expect.poll(() => smokeState.executedUrls.some(url => url.includes('/api/ingestion/otlp/metrics/console') && url.includes('entityType=service')), {
      timeout: WORKBENCH_READY_TIMEOUT
    }).toBe(true);
    expect(smokeState.executedUrls).toEqual(expect.arrayContaining([
      expect.stringContaining('/api/logs/list'),
      expect.stringContaining('/api/traces/stats/group-by'),
      expect.stringContaining('/api/alerts/group')
    ]));
  });

  for (const signalCase of SIGNAL_CASES) {
    test(`edits a ${signalCase.signal} dashboard panel from the source workbench and returns to the updated dashboard preview`, async ({ page }) => {
      test.setTimeout(BROWSER_SMOKE_TIMEOUT);
      const smokeState = await installDashboardSourceEditMocks(page, signalCase);

      await page.goto(routeUrl('/dashboard?timeRange=last-1h'), {
        timeout: BROWSER_SMOKE_TIMEOUT,
        waitUntil: 'domcontentloaded'
      });

      const previewPanel = page.locator(`[data-dashboard-composition-preview-panel="${signalCase.panelId}"]`).first();
      await expect(previewPanel).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
      await expect(previewPanel).toHaveAttribute('data-dashboard-composition-preview-route', new RegExp(signalCase.initialRoute.split('?')[0].replaceAll('/', '\\/')));
      await expect(previewPanel).toHaveAttribute('data-dashboard-composition-preview-edit-source', 'none');

      const editAction = page.locator('[data-dashboard-composition-preview-action="edit-source"]').first();
      await expect(editAction).toHaveAttribute('href', /intent=edit-panel/);
      await expect(editAction).toHaveAttribute('href', new RegExp(`panelId=${signalCase.panelId}`));
      await editAction.click();

      await expect(page.locator(signalCase.sourceRouteSelector)).toBeVisible({
        timeout: WORKBENCH_READY_TIMEOUT
      });
      await expect(page.locator(signalCase.sourceActionSelector)).toHaveAttribute(
        `data-${signalCase.signal === 'metrics' ? 'otlp-metrics' : signalCase.signal === 'traces' ? 'trace-manage' : 'log-manage'}-dashboard-panel-draft-action-panel`,
        signalCase.panelId
      );
      await expect(page.locator(signalCase.fieldSelector)).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });

      await signalCase.editField(page);
      await page.locator(signalCase.runSelector).click();
      await expect(page).toHaveURL(signalCase.previewMatcher, {
        timeout: WORKBENCH_READY_TIMEOUT
      });

      await page.locator(signalCase.sourceActionSelector).click();
      await expect(page.locator(`${signalCase.sourceActionSelector.replace('action="update-current"', 'status="saved"')}`)).toBeVisible({
        timeout: WORKBENCH_READY_TIMEOUT
      });
      expect(smokeState.savedDashboardRoutes).toContainEqual(expect.stringContaining(signalCase.editedNeedle));

      await page.locator(signalCase.sourceReturnSelector).click();
      const returnedPreviewPanel = page.locator(`[data-dashboard-composition-preview-panel="${signalCase.panelId}"]`).first();
      await expect(returnedPreviewPanel).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
      await expect(returnedPreviewPanel).toHaveAttribute('data-dashboard-composition-preview-route', signalCase.previewMatcher);
      await expect(returnedPreviewPanel).toHaveAttribute('data-dashboard-composition-preview-edit-source', 'edit-panel');
      await expect(returnedPreviewPanel).toHaveAttribute('data-dashboard-composition-preview-edit-source-dashboard', DASHBOARD_KEY);
      await expect(returnedPreviewPanel).toHaveAttribute('data-dashboard-composition-preview-edit-source-panel', signalCase.panelId);
      await expect(returnedPreviewPanel).toHaveAttribute('data-dashboard-composition-preview-edit-source-draft', signalCase.draftKey);
    });
  }
});
