import { expect, test, type Locator, type Page, type Route } from 'playwright/test';

const baseUrl = process.env.TIME_CONTEXT_BROWSER_BASE_URL || 'http://127.0.0.1:4200';
const WORKBENCH_READY_TIMEOUT = 120000;
const BROWSER_SMOKE_TIMEOUT = 300000;

const MONITOR_ID = '632051474676992';
const MONITOR_INSTANCE = 'example.com:443';
const MONITOR_ROUTE = '/monitors/632051474676992';
const API_MONITOR_DETAIL = '/api/monitor/632051474676992';
const API_MONITOR_FAVORITE = '/api/metrics/favorite/632051474676992';
const API_MONITOR_HISTORY_PREFIX = '/api/monitor/example.com%3A443/metric/';
const START = '1713200000000';
const END = '1713202700000';
const SHARED_TIME_QUERY = 'timeRange=last-1h&start=1713200000000&end=1713202700000&refresh=30&live=false&tz=Asia%2FShanghai';
const SHARED_CONTEXT_QUERY = [
  SHARED_TIME_QUERY,
  'entityId=42',
  'entityName=Checkout%20API',
  'serviceName=checkout',
  'serviceNamespace=payments',
  'environment=prod',
  'traceId=trace-smoke-123',
  'spanId=span-root-1',
  'source=monitor',
  'collector=collector-local',
  'template=website'
].join('&');

function apiMessage<T>(data: T) {
  return {
    code: 0,
    msg: 'success',
    data
  };
}

async function fulfillJson(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(data)
  });
}

function monitorDetailPayload() {
  return {
    monitor: {
      id: Number(MONITOR_ID),
      name: 'codex-monitor-time-context-smoke',
      app: 'website',
      instance: MONITOR_INSTANCE,
      intervals: 10,
      status: 1,
      gmtCreate: 1713100000000,
      gmtUpdate: 1713202000000,
      labels: {},
      annotations: {}
    },
    params: [
      { field: 'host', paramValue: MONITOR_INSTANCE, display: true },
      { field: 'port', paramValue: '443', display: true }
    ],
    metrics: [
      {
        name: 'summary',
        visible: true,
        fields: [
          { field: 'responseTime', type: 0, unit: 'ms' },
          { field: 'keyword', type: 0 }
        ]
      },
      {
        name: 'header',
        visible: true,
        fields: [
          { field: 'content_type', type: 0 },
          { field: 'content_length', type: 0 }
        ]
      }
    ]
  };
}

function appDefinePayload() {
  return {
    metrics: monitorDetailPayload().metrics
  };
}

function buildHistoryValues(count = 61) {
  const start = Number(START);
  const end = Number(END);
  const step = Math.floor((end - start) / Math.max(count - 1, 1));
  return Array.from({ length: count }, (_, index) => {
    const pulse = index === 24 ? 295 : index === 42 ? 218 : 0;
    const baseline = 148 + (index % 7);
    const value = baseline + pulse;
    return {
      origin: String(value),
      mean: String(value),
      min: String(Math.max(value - 6, 0)),
      max: String(value + 8),
      time: start + step * index
    };
  });
}

function monitorHistoryPayload(metric = 'responseTime') {
  return {
    instance: MONITOR_INSTANCE,
    app: 'website',
    metrics: 'summary',
    field: {
      name: metric,
      type: 0,
      unit: metric === 'responseTime' ? 'ms' : undefined,
      label: false
    },
    values: {
      origin: buildHistoryValues(),
      mean: buildHistoryValues()
    }
  };
}

function monitorRealtimePayload(metrics = 'summary') {
  return {
    id: Number(MONITOR_ID),
    app: 'website',
    metrics,
    time: Number(END),
    fields: [
      { name: 'responseTime', unit: 'ms', label: false },
      { name: 'keyword', label: false }
    ],
    valueRows: [
      {
        labels: { instance: MONITOR_INSTANCE },
        values: [
          { origin: '152', time: Number(END) },
          { origin: '0', time: Number(END) }
        ]
      }
    ]
  };
}

function otlpMetricsPayload() {
  const points = buildHistoryValues().map(point => [point.time, Number(point.origin)]);
  return {
    query: 'summary.responseTime',
    datasource: 'HertzBeat OTLP',
    queryMode: 'promql',
    context: {
      entityId: 42,
      entityName: 'Checkout API',
      serviceName: 'checkout',
      serviceNamespace: 'payments',
      environment: 'prod',
      start: Number(START),
      end: Number(END)
    },
    stats: {
      totalSeries: 1,
      nonEmptySeries: 1,
      latestObservedAt: Number(END)
    },
    results: {
      status: 0,
      msg: 'query ok',
      refId: 'A',
      frames: [
        {
          schema: {
            fields: [
              { name: 'time', type: 'time' },
              { name: 'value', type: 'number' }
            ],
            labels: {
              __name__: 'summary.responseTime',
              'service.name': 'checkout',
              'service.namespace': 'payments',
              'deployment.environment.name': 'prod',
              'hertzbeat.entity_id': '42',
              'hertzbeat.entity_name': 'Checkout API',
              'hertzbeat.collector': 'collector-local',
              'hertzbeat.template': 'website',
              traceId: 'trace-smoke-123',
              spanId: 'span-root-1'
            }
          },
          data: points
        }
      ]
    }
  };
}

function logListPayload() {
  return {
    content: [
      {
        traceId: 'trace-smoke-123',
        spanId: 'span-root-1',
        severityText: 'ERROR',
        severityNumber: 17,
        body: 'checkout timeout',
        timeUnixNano: Number(END) * 1_000_000,
        resource: {
          'service.name': 'checkout',
          'service.namespace': 'payments',
          'deployment.environment.name': 'prod',
          'hertzbeat.entity_id': '42',
          'hertzbeat.entity_name': 'Checkout API'
        },
        attributes: {
          monitor_id: MONITOR_ID,
          monitor_instance: MONITOR_INSTANCE
        }
      }
    ],
    totalElements: 1,
    pageIndex: 0,
    pageSize: 8
  };
}

function traceListPayload() {
  return {
    content: [
      {
        traceId: 'trace-smoke-123',
        rootSpanId: 'span-root-1',
        rootSpanName: 'GET /checkout',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        durationNanos: 420000000,
        status: 'ERROR',
        startTime: Number(START)
      }
    ],
    totalElements: 1,
    pageIndex: 0,
    pageSize: 8
  };
}

function traceDetailPayload() {
  return {
    traceId: 'trace-smoke-123',
    rootSpanId: 'span-root-1',
    rootSpanName: 'GET /checkout',
    serviceName: 'checkout',
    serviceNamespace: 'payments',
    durationNanos: 420000000,
    status: 'ERROR',
    startTime: Number(START),
    resourceAttributes: {
      'service.name': 'checkout',
      'service.namespace': 'payments',
      'hertzbeat.entity_id': '42'
    },
    spans: [
      {
        traceId: 'trace-smoke-123',
        spanId: 'span-root-1',
        parentSpanId: null,
        spanName: 'GET /checkout',
        serviceName: 'checkout',
        status: 'ERROR',
        durationNanos: 420000000,
        startTime: Number(START),
        resourceAttributes: {
          'hertzbeat.entity_id': '42'
        },
        spanAttributes: {
          'http.route': '/checkout'
        },
        events: [],
        links: []
      }
    ]
  };
}

function alertSummaryPayload() {
  return {
    total: 1,
    dealNum: 0,
    rate: 0,
    priorityWarningNum: 0,
    priorityCriticalNum: 1,
    priorityEmergencyNum: 0
  };
}

function groupAlertsPayload() {
  return {
    content: [
      {
        id: 1001,
        groupKey: 'checkout-critical',
        status: 'firing',
        groupLabels: {
          service: 'checkout',
          environment: 'prod'
        },
        commonLabels: {
          service: 'checkout',
          severity: 'critical',
          instance: MONITOR_INSTANCE
        },
        commonAnnotations: {
          summary: 'checkout latency high'
        },
        alerts: [
          {
            id: 2001,
            fingerprint: 'trace-smoke-123',
            labels: {
              service: 'checkout',
              severity: 'critical',
              instance: MONITOR_INSTANCE
            },
            annotations: {
              summary: 'checkout latency high'
            },
            content: 'checkout latency high',
            status: 'firing',
            startAt: Number(START),
            activeAt: Number(START),
            endAt: Number(END),
            triggerTimes: 3,
            creator: 'time-context-smoke',
            gmtCreate: Number(START),
            gmtUpdate: Number(END)
          }
        ],
        creator: 'time-context-smoke',
        gmtCreate: Number(START),
        gmtUpdate: Number(END)
      }
    ],
    totalElements: 1,
    pageIndex: 0,
    pageSize: 8
  };
}

function entityDetailPayload() {
  return {
    entity: {
      entity: {
        id: 42,
        name: 'checkout-api',
        displayName: 'Checkout API',
        type: 'service',
        status: 'healthy',
        owner: 'platform',
        environment: 'prod',
        namespace: 'payments',
        system: 'payments',
        source: 'otlp',
        description: 'Checkout API owned by the platform team.'
      },
      identities: [
        {
          id: 4201,
          key: 'service.name',
          value: 'checkout'
        }
      ],
      monitorBinds: [
        {
          monitorId: Number(MONITOR_ID),
          monitorName: 'codex-monitor-time-context-smoke',
          app: 'website',
          instance: MONITOR_INSTANCE
        }
      ],
      relations: [
        {
          sourceEntityId: 42,
          targetEntityId: 84,
          relationType: 'depends_on',
          description: 'checkout depends on orders database'
        }
      ]
    },
    evidenceSummary: {
      activeAlertCount: 1,
      downMonitorCount: 0,
      healthyMonitorCount: 2,
      identityCount: 1,
      logHintCount: 1,
      lastEvidenceAt: Number(END),
      collectorOnlineCount: 1,
      collectorOfflineCount: 0,
      collectorTaskCount: 2,
      collectorTotalCount: 1
    },
    alertSummary: {
      totalActiveAlerts: 1,
      latestStatusChangeAt: Number(END)
    },
    monitorSummary: {
      totalBoundMonitors: 2,
      latestStatusChangeAt: Number(END)
    },
    logSummary: {
      hintCount: 1,
      preferredQueryTitle: 'checkout errors',
      fallbackSearchTerm: 'checkout'
    },
    traceSummary: {
      recentTraceCount: 1,
      recentErrorTraceCount: 1,
      latestObservedAt: Number(END),
      active: true,
      latestTraceId: 'trace-smoke-123',
      p95LatencyMs: 420
    },
    boundMonitors: [
      {
        monitorId: Number(MONITOR_ID),
        monitorName: 'codex-monitor-time-context-smoke',
        app: 'website',
        instance: MONITOR_INSTANCE,
        status: 'up',
        latestAt: Number(END)
      }
    ],
    activeAlerts: groupAlertsPayload().content[0].alerts,
    nextActions: [
      {
        actionType: 'metrics',
        title: 'Open metrics',
        summary: 'Inspect current latency.',
        actionLabel: 'Open metrics',
        priority: 1
      }
    ],
    noiseControlSummary: {
      activeSilenceCount: 0,
      matchingInhibitCount: 0,
      activeSilences: [],
      matchingInhibits: [],
      possibleAlertSuppression: false
    }
  };
}

function emptyPage(pageSize = 8) {
  return {
    content: [],
    totalElements: 0,
    pageIndex: 0,
    pageSize
  };
}

async function handleSmokeApiRoute(route: Route) {
  const url = new URL(route.request().url());
  const path = url.pathname;

  if (path === '/api/config/system') {
    return fulfillJson(route, apiMessage({ locale: 'en-US' }));
  }
  if (path.startsWith('/api/i18n/')) {
    return fulfillJson(route, apiMessage({}));
  }
  if (path === '/api/account/auth/refresh') {
    return fulfillJson(route, apiMessage({ token: 'time-context-smoke-token', refreshToken: 'time-context-smoke-refresh' }));
  }

  if (path === API_MONITOR_DETAIL) {
    return fulfillJson(route, apiMessage(monitorDetailPayload()));
  }
  if (path.startsWith(`${API_MONITOR_DETAIL}/metrics/`)) {
    return fulfillJson(route, apiMessage(monitorRealtimePayload(path.split('/').pop() || 'summary')));
  }
  if (path === API_MONITOR_FAVORITE) {
    return fulfillJson(route, apiMessage(['summary.responseTime']));
  }
  if (path.startsWith(`${API_MONITOR_FAVORITE}/`)) {
    return fulfillJson(route, apiMessage(null));
  }
  if (path === '/api/grafana/dashboard') {
    return fulfillJson(route, apiMessage({ enabled: false }));
  }
  if (path === '/api/warehouse/storage/status') {
    return fulfillJson(route, apiMessage({ available: true }));
  }
  if (path === '/api/apps/website/define') {
    return fulfillJson(route, apiMessage(appDefinePayload()));
  }
  if (path.startsWith(API_MONITOR_HISTORY_PREFIX)) {
    const metric = path.includes('keyword') ? 'keyword' : 'responseTime';
    return fulfillJson(route, apiMessage(monitorHistoryPayload(metric)));
  }

  if (path === '/api/ingestion/otlp/metrics/console') {
    return fulfillJson(route, apiMessage(otlpMetricsPayload()));
  }

  if (path === '/api/logs/list') {
    return fulfillJson(route, apiMessage(logListPayload()));
  }
  if (path === '/api/logs/stats/overview') {
    return fulfillJson(route, apiMessage({
      totalLogs: 1,
      errorLogs: 1,
      distinctTraceCount: 1,
      latestObservedAt: Number(END),
      hasActiveLog: true
    }));
  }
  if (path === '/api/logs/stats/trend') {
    return fulfillJson(route, apiMessage({ hourlyStats: { '09:00': 1 } }));
  }
  if (path === '/api/logs/stats/trace-coverage') {
    return fulfillJson(route, apiMessage({
      traceCoverage: {
        withBothTraceAndSpan: 1,
        withTrace: 1,
        withoutTrace: 0,
        withSpan: 1
      }
    }));
  }

  if (path === '/api/traces/list') {
    return fulfillJson(route, apiMessage(traceListPayload()));
  }
  if (path === '/api/traces/stats/overview') {
    return fulfillJson(route, apiMessage({
      totalTraceCount: 1,
      errorTraceCount: 1,
      latestObservedAt: Number(END),
      hasActiveTrace: true
    }));
  }
  if (path === '/api/traces/trace-smoke-123' || path === '/api/traces/trace-smoke-123/spans') {
    return fulfillJson(route, apiMessage(traceDetailPayload()));
  }

  if (path === '/api/alerts/summary') {
    return fulfillJson(route, apiMessage(alertSummaryPayload()));
  }
  if (path === '/api/alerts' || path === '/api/alerts/group') {
    return fulfillJson(route, apiMessage(groupAlertsPayload()));
  }
  if (path === '/api/entities/42/detail') {
    return fulfillJson(route, apiMessage(entityDetailPayload()));
  }
  if (path === '/api/monitors' || path === '/api/collector') {
    return fulfillJson(route, emptyPage(1));
  }
  if (path === '/api/entities') {
    return fulfillJson(route, emptyPage(40));
  }
  if (path === '/api/entities/definition-activities' || path === '/api/entities/discovery/governance-presets') {
    return fulfillJson(route, []);
  }
  return fulfillJson(route, apiMessage({}));
}

async function installTimeContextSmokeMocks(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('Authorization', 'time-context-smoke-token');
    window.localStorage.setItem('refresh-token', 'time-context-smoke-refresh');
    window.localStorage.setItem('hb.lang', 'en-US');
    window.localStorage.setItem('layout.lang', 'en-US');

    class TimeContextSmokeEventSource {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSED = 2;
      readyState = TimeContextSmokeEventSource.OPEN;
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
        this.readyState = TimeContextSmokeEventSource.CLOSED;
      }
    }

    window.EventSource = TimeContextSmokeEventSource as unknown as typeof EventSource;
  });

  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) {
      await handleSmokeApiRoute(route);
      return;
    }
    await route.continue();
  });
}

function routeUrl(route: string) {
  return `${baseUrl}${route}`;
}

function expectSharedTimeParams(href: string | null) {
  expect(href).toBeTruthy();
  const url = new URL(String(href), baseUrl);
  expect(url.searchParams.get('timeRange')).toBe('last-1h');
  expect(url.searchParams.get('start')).toBe(START);
  expect(url.searchParams.get('end')).toBe(END);
  expect(url.searchParams.get('refresh')).toBe('30');
  expect(url.searchParams.get('live')).toBe('false');
  expect(url.searchParams.get('tz')).toBe('Asia/Shanghai');
  return url;
}

async function expectNoRawI18nKeys(scope: Locator) {
  const text = (await scope.textContent()) || '';
  expect(text).not.toMatch(/\b(?:time\.range|monitor\.detail|signal\.context|topology|entities\.detail)\./);
}

async function expectNoChineseOperatorCopy(scope: Locator) {
  const text = (await scope.textContent()) || '';
  expect(text).not.toMatch(/[\u4e00-\u9fff]/);
}

async function expectNoFakeStateCopy(scope: Locator) {
  const text = (await scope.textContent()) || '';
  expect(text).not.toMatch(/fake zero|fake status|fake health|fake evidence/i);
}

async function expectNarrowTimeRailFits(scope: Locator) {
  const rail = scope.locator('[data-time-range-control-overflow="fit-without-scroll"]').first();
  await expect(rail).toBeVisible();

  const metrics = await rail.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return {
      clippedRight: rect.right > window.innerWidth + 1,
      height: rect.height,
      internalScroll: element.scrollWidth > element.clientWidth + 1,
      overflowX: style.overflowX
    };
  });

  expect(metrics.clippedRight).toBe(false);
  expect(metrics.internalScroll).toBe(false);
  expect(metrics.overflowX).not.toBe('auto');
  expect(metrics.height).toBeLessThanOrEqual(42);
}

async function expectEvidenceHandoffLinksPreserveTime(scope: Locator, selector: string) {
  const links = scope.locator(selector);
  const count = await links.count();
  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    expectSharedTimeParams(await links.nth(index).getAttribute('href'));
  }
}

test.describe('time-context browser smoke pack', () => {
  test.beforeEach(async ({ page }) => {
    await installTimeContextSmokeMocks(page);
  });

  test('monitor history keeps angular-like layout, shared time controls, and local dataZoom', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);

    await page.goto(routeUrl(`${MONITOR_ROUTE}?app=website&pageIndex=0&pageSize=8&returnTo=%2Fmonitors&${SHARED_CONTEXT_QUERY}`), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });
    await expect(page.locator('[data-monitor-workbench-stage="angular-layout"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });

    await page.locator('[data-tab="history"]').click();
    await expect(page.locator('[data-monitor-history-time-toolbar="shared-time-context-control"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('[data-monitor-history-datazoom-state="local-observation"]')).toBeVisible();
    await expect(page.getByText('Apply as query time').first()).toBeVisible();
    await expect(page.locator('[data-monitor-history-zoom-apply="local-to-query-time"]').first()).toHaveAttribute(
      'data-monitor-history-zoom-apply-state',
      /idle|ready/
    );

    expectSharedTimeParams(page.url());
    await expectNoRawI18nKeys(page.locator('[data-monitor-workbench-stage="angular-layout"]'));
    await expectNoChineseOperatorCopy(page.locator('[data-monitor-history-time-toolbar="shared-time-context-control"]'));
    await expectNoFakeStateCopy(page.locator('[data-monitor-workbench-stage="angular-layout"]'));

    expectSharedTimeParams(await page.locator('[data-monitor-signal-handoff-link="metrics"]').first().getAttribute('href'));
    expectSharedTimeParams(await page.locator('[data-monitor-signal-handoff-link="logs"]').first().getAttribute('href'));
    expectSharedTimeParams(await page.locator('[data-monitor-signal-handoff-link="traces"]').first().getAttribute('href'));
  });

  test('OTLP metrics, logs, and traces inherit one shared paused time window', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);

    await page.goto(routeUrl(`/ingestion/otlp/metrics?query=summary.responseTime&aggregation=avg&groupBy=service.name&${SHARED_CONTEXT_QUERY}`), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });
    await expect(page.locator('[data-otlp-metrics-route="otlp-cold-metrics-workbench"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('[data-otlp-metrics-time-control="shared-time-context-control"]')).toBeVisible();
    await expectNarrowTimeRailFits(page.locator('[data-otlp-metrics-time-control="shared-time-context-control"]'));
    await expect(page.locator('[data-otlp-metrics-chart-datazoom-state="local-observation"]')).toBeVisible();
    await expect(page.locator('[data-otlp-metrics-series-row="selectable-series"]').first()).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await page.locator('[data-otlp-metrics-series-row="selectable-series"]').first().click();

    expectSharedTimeParams(page.url());
    await expectNoRawI18nKeys(page.locator('[data-otlp-metrics-route="otlp-cold-metrics-workbench"]'));
    await expectNoChineseOperatorCopy(page.locator('[data-otlp-metrics-time-control="shared-time-context-control"]'));
    await expectNoFakeStateCopy(page.locator('[data-otlp-metrics-route="otlp-cold-metrics-workbench"]'));
    expectSharedTimeParams(await page.locator('[data-otlp-metrics-logs-action="true"]').first().getAttribute('href'));
    expectSharedTimeParams(await page.locator('[data-otlp-metrics-traces-action="true"]').first().getAttribute('href'));

    await page.goto(routeUrl(`/log/manage?view=stream&search=checkout&${SHARED_CONTEXT_QUERY}`), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });
    await expect(page.locator('[data-log-manage-route="otlp-cold-log-workbench"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('[data-log-manage-time-control="shared-time-context-control"]')).toBeVisible();
    await expectNarrowTimeRailFits(page.locator('[data-log-manage-time-control="shared-time-context-control"]'));
    await expect(page.locator('[data-log-manage-stream-live-state="paused"]')).toBeVisible();
    await expect(page.locator('[data-time-range-live-toggle="paused"]').first()).toBeVisible();
    expectSharedTimeParams(page.url());
    await expectNoRawI18nKeys(page.locator('[data-log-manage-route="otlp-cold-log-workbench"]'));
    await expectNoChineseOperatorCopy(page.locator('[data-log-manage-time-control="shared-time-context-control"]'));
    await expectNoFakeStateCopy(page.locator('[data-log-manage-route="otlp-cold-log-workbench"]'));

    await page.goto(routeUrl(`/trace/manage?traceId=trace-smoke-123&spanId=span-root-1&serviceName=checkout&${SHARED_CONTEXT_QUERY}`), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });
    await expect(page.locator('[data-trace-manage-route="otlp-cold-trace-workbench"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('[data-trace-manage-time-control="shared-time-context-control"]')).toBeVisible();
    await expectNarrowTimeRailFits(page.locator('[data-trace-manage-time-control="shared-time-context-control"]'));
    await expect(page.locator('[data-time-range-live-toggle="paused"]').first()).toBeVisible();
    expectSharedTimeParams(page.url());
    await expectNoRawI18nKeys(page.locator('[data-trace-manage-route="otlp-cold-trace-workbench"]'));
    await expectNoChineseOperatorCopy(page.locator('[data-trace-manage-time-control="shared-time-context-control"]'));
    await expectNoFakeStateCopy(page.locator('[data-trace-manage-route="otlp-cold-trace-workbench"]'));
    expectSharedTimeParams(await page.locator('[data-trace-manage-open-logs-action="true"]').first().getAttribute('href'));
  });

  test('alert evidence, entity detail, and topology preserve inherited evidence time context', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);

    await page.goto(
      routeUrl(`/alert?signal=metrics&search=checkout&status=firing&severity=critical&returnTo=%2Fingestion%2Fotlp%2Fmetrics&${SHARED_CONTEXT_QUERY}`),
      {
        timeout: BROWSER_SMOKE_TIMEOUT,
        waitUntil: 'domcontentloaded'
      }
    );
    await expect(page.locator('[data-alert-center-surface="otlp-cold-center-console"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('[data-alert-evidence-closure="otlp-alert-evidence-workbench"]')).toBeVisible();
    await expect(page.locator('[data-alert-evidence-context="inherited-time-context"]')).toBeVisible();
    expectSharedTimeParams(page.url());
    await expectNoRawI18nKeys(page.locator('[data-alert-evidence-closure="otlp-alert-evidence-workbench"]'));
    await expectNoFakeStateCopy(page.locator('[data-alert-center-surface="otlp-cold-center-console"]'));
    await expectEvidenceHandoffLinksPreserveTime(
      page.locator('[data-alert-evidence-closure="otlp-alert-evidence-workbench"]'),
      '[data-alert-evidence-link]'
    );

    await page.goto(
      routeUrl(
        `/entities/42?${SHARED_CONTEXT_QUERY}&monitorId=${MONITOR_ID}&monitorName=codex-monitor-time-context-smoke&monitorApp=website&monitorInstance=${encodeURIComponent(MONITOR_INSTANCE)}`
      ),
      {
        timeout: BROWSER_SMOKE_TIMEOUT,
        waitUntil: 'domcontentloaded'
      }
    );
    await expect(page.locator('[data-entity-detail-surface="otlp-cold-entity-detail"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('[data-entity-detail-context-center="hertzbeat-entity-context"]')).toBeVisible();
    await expect(page.locator('[data-entity-detail-inherited-context="route-context"]')).toBeVisible();
    expectSharedTimeParams(page.url());
    await expectNoRawI18nKeys(page.locator('[data-entity-detail-context-center="hertzbeat-entity-context"]'));
    await expectNoFakeStateCopy(page.locator('[data-entity-detail-surface="otlp-cold-entity-detail"]'));
    await expectEvidenceHandoffLinksPreserveTime(
      page.locator('[data-entity-detail-context-center="hertzbeat-entity-context"]'),
      '[data-entity-detail-context-link]'
    );

    await page.goto(
      routeUrl(`/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db&${SHARED_CONTEXT_QUERY}`),
      {
        timeout: BROWSER_SMOKE_TIMEOUT,
        waitUntil: 'domcontentloaded'
      }
    );
    await expect(page.locator('[data-topology-route="hertzbeat-entity-topology"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('[data-topology-fault-context="incoming-evidence"]')).toBeVisible();
    await expect(page.locator('[data-topology-edge-link="alert-impact"]')).toBeVisible();
    expectSharedTimeParams(page.url());
    await expectNoRawI18nKeys(page.locator('[data-topology-route="hertzbeat-entity-topology"]'));
    await expectNoChineseOperatorCopy(page.locator('[data-topology-route="hertzbeat-entity-topology"]'));
    await expectNoFakeStateCopy(page.locator('[data-topology-route="hertzbeat-entity-topology"]'));
    await expectEvidenceHandoffLinksPreserveTime(
      page.locator('[data-topology-route="hertzbeat-entity-topology"]'),
      [
        '[data-topology-edge-link="metrics"]',
        '[data-topology-edge-link="logs"]',
        '[data-topology-edge-link="traces"]',
        '[data-topology-edge-link="alert-impact"]',
        '[data-topology-context-link="entity"]',
        '[data-topology-context-link="metrics"]',
        '[data-topology-context-link="logs"]',
        '[data-topology-context-link="traces"]'
      ].join(', ')
    );
  });
});
