import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { expect, test } from 'playwright/test';
import {
  THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT,
  buildThreeSignalWorkbenchExpectedQuery,
  buildThreeSignalWorkbenchSmokeRoutes
} from './three-signal-workbench-smoke-lib.mjs';

const baseUrl = process.env.THREE_SIGNAL_WORKBENCH_BROWSER_BASE_URL || 'http://127.0.0.1:4200';
const BROWSER_SMOKE_TIMEOUT = 900000;
const WORKBENCH_READY_TIMEOUT = 120000;
const LOG_ROW_VISIBLE_TIMEOUT = 60000;

type SignalRouteKey = keyof ReturnType<typeof buildThreeSignalWorkbenchSmokeRoutes>;

type ThreeSignalWorkbenchSmokeContext = typeof THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT;

function createSmokeContext(): ThreeSignalWorkbenchSmokeContext {
  return {
    ...THREE_SIGNAL_WORKBENCH_SMOKE_CONTEXT,
    traceId: randomBytes(16).toString('hex')
  };
}

function routeUrl(route: SignalRouteKey, context: ThreeSignalWorkbenchSmokeContext) {
  return `${baseUrl}${buildThreeSignalWorkbenchSmokeRoutes(context)[route]}`;
}

function assertUrlCarries(href: string | null, expectedPath: string, expectedQuery: Record<string, string>) {
  expect(href).toBeTruthy();
  const url = new URL(String(href), baseUrl);
  expect(url.pathname).toBe(expectedPath);
  Object.entries(expectedQuery).forEach(([key, value]) => {
    expect(url.searchParams.get(key)).toBe(value);
  });
  expect(url.searchParams.get('returnLabel')).toBeNull();
  return url;
}

function assertRelationEntityHref(
  href: string | null,
  expectedPath: string,
  context: ThreeSignalWorkbenchSmokeContext,
  expectedTarget: { entityId: string; entityName: string }
) {
  const url = assertUrlCarries(href, expectedPath, {
    entityId: expectedTarget.entityId,
    entityName: expectedTarget.entityName,
    serviceName: context.serviceName,
    serviceNamespace: context.serviceNamespace,
    environment: context.environment,
    collector: context.collector,
    template: context.template,
    source: context.source
  });
  expect(url.searchParams.get('returnTo')).toBe(`/entities/${context.entityId}`);
}

function logListApiUrl(context: ThreeSignalWorkbenchSmokeContext) {
  const params = new URLSearchParams({
    pageIndex: '0',
    pageSize: '8',
    traceId: context.traceId,
    spanId: context.spanId,
    entityId: context.entityId,
    serviceName: context.serviceName,
    serviceNamespace: context.serviceNamespace,
    environment: context.environment
  });
  return `${baseUrl}/api/logs/list?${params.toString()}`;
}

function traceListApiUrl(context: ThreeSignalWorkbenchSmokeContext) {
  const params = new URLSearchParams({
    pageIndex: '0',
    pageSize: '8',
    traceId: context.traceId,
    spanId: context.spanId,
    entityId: context.entityId,
    serviceName: context.serviceName,
    serviceNamespace: context.serviceNamespace,
    environment: context.environment
  });
  return `${baseUrl}/api/traces/list?${params.toString()}`;
}

async function expectSeededLogListReady(page: import('playwright/test').Page, context: ThreeSignalWorkbenchSmokeContext) {
  await expect
    .poll(
      async () => {
        const response = await page.request.get(logListApiUrl(context), { timeout: LOG_ROW_VISIBLE_TIMEOUT });
        if (!response.ok()) {
          return 0;
        }
        const message = await response.json();
        const rows = message?.data?.content;
        return Array.isArray(rows) ? rows.length : 0;
      },
      {
        timeout: WORKBENCH_READY_TIMEOUT,
        intervals: [1000, 2000, 5000, 10000]
      }
    )
    .toBeGreaterThan(0);
}

async function expectSeededTraceListReady(page: import('playwright/test').Page, context: ThreeSignalWorkbenchSmokeContext) {
  await expect
    .poll(
      async () => {
        const response = await page.request.get(traceListApiUrl(context), { timeout: WORKBENCH_READY_TIMEOUT });
        if (!response.ok()) {
          return 0;
        }
        const message = await response.json();
        const rows = message?.data?.content;
        return Array.isArray(rows) ? rows.length : 0;
      },
      {
        timeout: WORKBENCH_READY_TIMEOUT,
        intervals: [1000, 2000, 5000, 10000]
      }
    )
    .toBeGreaterThan(0);
}

async function expectSeededLogRowVisible(page: import('playwright/test').Page, context: ThreeSignalWorkbenchSmokeContext) {
  const logRowAction = page.locator('[data-log-manage-row-detail-action="true"]').first();
  await expectSeededLogListReady(page, context);
  try {
    await expect(logRowAction).toBeVisible({ timeout: LOG_ROW_VISIBLE_TIMEOUT });
  } catch {
    await expectSeededLogListReady(page, context);
    await page.reload({ timeout: BROWSER_SMOKE_TIMEOUT, waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-log-manage-route="otlp-hertzbeat-ui-log-workbench"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(logRowAction).toBeVisible({ timeout: LOG_ROW_VISIBLE_TIMEOUT });
  }
}

async function expectSeededTraceDetailActionVisible(page: import('playwright/test').Page, context: ThreeSignalWorkbenchSmokeContext) {
  const traceDetailAction = page.locator('[data-trace-manage-open-detail-action="side-waterfall-modal"]').first();
  await expectSeededTraceListReady(page, context);
  try {
    await expect(traceDetailAction).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
  } catch {
    await expectSeededTraceListReady(page, context);
    await page.reload({ timeout: BROWSER_SMOKE_TIMEOUT, waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-trace-manage-route="otlp-hertzbeat-ui-trace-workbench"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(traceDetailAction).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
  }
}

async function closeTopOverlayDialog(page: import('playwright/test').Page) {
  const overlay = page.locator('[data-overlay-dialog="true"]').last();
  await expect(overlay).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
  await overlay.locator('header button').first().click();
}

async function expectLogRelatedTracePreviewFlow(
  page: import('playwright/test').Page,
  context: ThreeSignalWorkbenchSmokeContext,
  expectedQuery: Record<string, string>
) {
  const tracePreviewAction = page
    .locator('[data-log-stream-detail-dialog="true"] [data-log-manage-detail-dialog-action="trace"]')
    .first();
  await expect(tracePreviewAction).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
  await tracePreviewAction.click();

  const relatedTraceDialog = page.locator('[data-log-related-trace-dialog="true"]').first();
  await expect(relatedTraceDialog).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
  await expect(relatedTraceDialog).toContainText(context.traceId, { timeout: WORKBENCH_READY_TIMEOUT });
  const workspaceAction = page.locator('[data-log-related-trace-open-workspace-action="true"]').first();
  await expect(workspaceAction).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });

  const workspaceHref = await workspaceAction.getAttribute('href');
  expect(workspaceHref).toBeTruthy();
  const workspaceUrl = new URL(String(workspaceHref), baseUrl);
  expect(workspaceUrl.pathname).toBe('/trace/manage');
  Object.entries(expectedQuery).forEach(([key, value]) => {
    expect(workspaceUrl.searchParams.get(key)).toBe(value);
  });

  await closeTopOverlayDialog(page);
  await expect(relatedTraceDialog).toBeHidden({ timeout: WORKBENCH_READY_TIMEOUT });
}

async function expectLogDashboardDraftFlow(page: import('playwright/test').Page, context: ThreeSignalWorkbenchSmokeContext) {
  const draftRequests: Array<Record<string, unknown>> = [];
  const routeHandler = async (route: import('playwright/test').Route) => {
    const request = route.request();
    if (request.method().toUpperCase() !== 'PUT') {
      await route.continue();
      return;
    }
    const draft = request.postDataJSON() as Record<string, unknown>;
    draftRequests.push(draft);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data: draft })
    });
  };
  await page.route('**/api/signal/dashboard-panel-draft', routeHandler);
  try {
    await page.locator('[data-log-manage-dashboard-panel-draft-action="add-current"]').first().click();
    await expect(page.locator('[data-log-manage-dashboard-panel-draft-status="saved"]').first()).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
  } finally {
    await page.unroute('**/api/signal/dashboard-panel-draft', routeHandler);
  }

  expect(draftRequests).toHaveLength(1);
  const draft = draftRequests[0];
  const draftRoute = new URL(String(draft.route || ''), baseUrl);
  const draftPayload = JSON.parse(String(draft.payload || '{}')) as Record<string, unknown>;
  expect(draft.signal).toBe('logs');
  expect(draft.visualization).toBe('list');
  expect(draftRoute.pathname).toBe('/log/manage');
  expect(draftRoute.searchParams.get('view')).toBe('list');
  expect(draftRoute.searchParams.get('traceId')).toBe(context.traceId);
  expect(draftRoute.searchParams.get('spanId')).toBe(context.spanId);
  expect(draftRoute.searchParams.get('entityId')).toBe(context.entityId);
  expect(draftRoute.searchParams.get('entityName')).toBe(context.entityName);
  expect(draftRoute.searchParams.get('serviceName')).toBe(context.serviceName);
  expect(draftRoute.searchParams.get('serviceNamespace')).toBe(context.serviceNamespace);
  expect(draftRoute.searchParams.get('environment')).toBe(context.environment);
  expect(draftPayload.source).toBe('logs-explorer');
  expect(draftPayload.view).toBe('list');
}

async function expectTraceRelatedLogsPreviewFlow(
  page: import('playwright/test').Page,
  context: ThreeSignalWorkbenchSmokeContext,
  expectedQuery: Record<string, string>
) {
  const relatedLogsPanel = page.locator('[data-trace-manage-drawer-related-logs="backend-related-logs"]').first();
  await expect(relatedLogsPanel).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
  await expect(relatedLogsPanel).toHaveAttribute('data-trace-manage-drawer-related-logs-owner', 'hertzbeat-ui-detail-rows');
  await expect(relatedLogsPanel).toHaveAttribute('data-trace-manage-drawer-related-logs-state', 'ready', {
    timeout: WORKBENCH_READY_TIMEOUT
  });
  await expect(relatedLogsPanel).toContainText('checkout', { timeout: WORKBENCH_READY_TIMEOUT });

  const relatedLogsApiHref = await relatedLogsPanel.getAttribute('data-trace-manage-drawer-related-logs-url');
  const relatedLogsApiUrl = new URL(String(relatedLogsApiHref), baseUrl);
  expect(relatedLogsApiUrl.pathname).toBe('/logs/list');
  expect(relatedLogsApiUrl.searchParams.get('pageSize')).toBe('3');
  Object.entries(expectedQuery).forEach(([key, value]) => {
    expect(relatedLogsApiUrl.searchParams.get(key)).toBe(value);
  });

  const relatedLogAction = relatedLogsPanel.locator('[data-trace-manage-drawer-related-log-action="open-logs"]').first();
  await expect(relatedLogAction).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
  await expect(relatedLogAction).toHaveAttribute('data-trace-manage-drawer-related-log-trace', context.traceId);
  await expect(relatedLogAction).toHaveAttribute('data-trace-manage-drawer-related-log-span', context.spanId);
  const relatedLogHref = await relatedLogAction.getAttribute('href');
  const relatedLogUrl = new URL(String(relatedLogHref), baseUrl);
  expect(relatedLogUrl.pathname).toBe('/log/manage');
  Object.entries(expectedQuery).forEach(([key, value]) => {
    expect(relatedLogUrl.searchParams.get(key)).toBe(value);
  });
}

function topologyApiUrl(context: ThreeSignalWorkbenchSmokeContext) {
  const params = new URLSearchParams({
    focusEntityId: context.entityId,
    depth: '2',
    environment: context.environment
  });
  return `${baseUrl}/api/topology?${params.toString()}`;
}

async function expectTopologyApiReady(page: import('playwright/test').Page, context: ThreeSignalWorkbenchSmokeContext) {
  await expect
    .poll(
      async () => {
        const response = await page.request.get(topologyApiUrl(context), { timeout: WORKBENCH_READY_TIMEOUT });
        if (!response.ok()) {
          return 'unavailable';
        }
        const message = await response.json();
        const graph = message?.data || message;
        const nodes = Array.isArray(graph?.nodes) ? graph.nodes.length : 0;
        const edges = Array.isArray(graph?.edges) ? graph.edges.length : 0;
        return nodes > 0 && edges > 0 ? 'ready' : `empty:${nodes}:${edges}`;
      },
      {
        timeout: WORKBENCH_READY_TIMEOUT,
        intervals: [1000, 2000, 5000, 10000]
      }
    )
    .toBe('ready');
}

async function expectTopologyRouteReady(page: import('playwright/test').Page, context: ThreeSignalWorkbenchSmokeContext) {
  const topologyRoute = page.locator('[data-topology-route="hertzbeat-entity-topology"]').first();
  await expect(topologyRoute).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await expect(topologyRoute).toHaveAttribute('data-topology-api-settle-state', 'ready', {
        timeout: WORKBENCH_READY_TIMEOUT
      });
      return;
    } catch (error) {
      if (attempt > 0) {
        throw error;
      }
      await expectTopologyApiReady(page, context);
      await page.reload({ timeout: BROWSER_SMOKE_TIMEOUT, waitUntil: 'domcontentloaded' });
      await expect(topologyRoute).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    }
  }
}

async function expectEntityResourceHandoffs(
  page: import('playwright/test').Page,
  expected: {
    metricsFilter: string;
    resourceFilter: string;
    serviceName?: string;
  }
) {
  const metricsHref = await page.locator('[data-entity-detail-context-link="metrics"]').first().getAttribute('href');
  const logsHref = await page.locator('[data-entity-detail-context-link="logs"]').first().getAttribute('href');
  const tracesHref = await page.locator('[data-entity-detail-context-link="traces"]').first().getAttribute('href');
  const metricsUrl = new URL(String(metricsHref), baseUrl);
  const logsUrl = new URL(String(logsHref), baseUrl);
  const tracesUrl = new URL(String(tracesHref), baseUrl);

  expect(metricsUrl.searchParams.get('filter')).toBe(expected.metricsFilter);
  expect(logsUrl.searchParams.get('resourceFilter')).toBe(expected.resourceFilter);
  expect(tracesUrl.searchParams.get('resourceFilter')).toBe(expected.resourceFilter);
  if (expected.serviceName) {
    expect(metricsUrl.searchParams.get('serviceName')).toBe(expected.serviceName);
    expect(logsUrl.searchParams.get('serviceName')).toBe(expected.serviceName);
    expect(tracesUrl.searchParams.get('serviceName')).toBe(expected.serviceName);
  }
}

async function expectTopologyResourceTarget(
  page: import('playwright/test').Page,
  context: ThreeSignalWorkbenchSmokeContext,
  expected: {
    targetEntityId: string;
    relationType: string;
  }
) {
  const topologyRoute = page.locator('[data-topology-route="hertzbeat-entity-topology"]').first();
  await expectTopologyRouteReady(page, context);
  await expect(topologyRoute).toHaveAttribute('data-topology-active-view-mode', 'resource-dependency', {
    timeout: WORKBENCH_READY_TIMEOUT
  });
  await expect(topologyRoute).toHaveAttribute('data-topology-active-edge-id', /relation-|entity-/, {
    timeout: WORKBENCH_READY_TIMEOUT
  });

  const selectedResourceEdge = page
    .locator('[data-topology-edge-relationship-type="resource-ownership"][data-topology-edge-selected="true"]')
    .first();
  await expect(selectedResourceEdge).toBeAttached({ timeout: WORKBENCH_READY_TIMEOUT });

  const detail = page
    .locator(
      `[data-hz-topology-detail-relation-type="resource-ownership"][data-hz-topology-detail-target-id="entity-${expected.targetEntityId}"]`
    )
    .first();
  await expect(detail).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
  await expect(detail).toContainText(expected.relationType);

  const metricsHref = await detail.locator('[data-topology-edge-link="metrics"]').first().getAttribute('href');
  const logsHref = await detail.locator('[data-topology-edge-link="logs"]').first().getAttribute('href');
  const tracesHref = await detail.locator('[data-topology-edge-link="traces"]').first().getAttribute('href');
  [metricsHref, logsHref, tracesHref].forEach(href => {
    const url = new URL(String(href), baseUrl);
    expect(url.searchParams.get('entityId')).toBe(context.entityId);
    expect(url.searchParams.get('entityName')).toBe(context.entityName);
    expect(url.searchParams.get('serviceName')).toBe(context.serviceName);
    expect(url.searchParams.get('serviceNamespace')).toBe(context.serviceNamespace);
    expect(url.searchParams.get('environment')).toBe(context.environment);
    expect(url.searchParams.get('collector')).toBe(context.collector);
    expect(url.searchParams.get('template')).toBe(context.template);
    expect(url.searchParams.get('viewMode')).toBe('resource-dependency');
    expect(url.searchParams.get('edgeId')).toBeTruthy();
  });
}

async function expectTraceRelatedMetricDashboardDraftFlow(
  page: import('playwright/test').Page,
  context: ThreeSignalWorkbenchSmokeContext
) {
  const relatedMetricAction = page
    .locator('[data-trace-manage-drawer-related-metric-query="container.cpu.usage"]')
    .first();
  await expect(relatedMetricAction).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
  await expect(relatedMetricAction).toHaveAttribute('data-trace-manage-drawer-related-metric-source', 'pod');
  await expect(relatedMetricAction).toHaveAttribute('data-trace-manage-drawer-related-metric-family', 'cpu');
  await expect(relatedMetricAction).toHaveAttribute('data-trace-manage-drawer-related-metric-reason', 'resource-filter');

  const relatedMetricHref = await relatedMetricAction.getAttribute('href');
  const relatedMetricUrl = new URL(String(relatedMetricHref), baseUrl);
  expect(relatedMetricUrl.pathname).toBe('/ingestion/otlp/metrics');
  expect(relatedMetricUrl.searchParams.get('query')).toBe('container.cpu.usage');
  expect(relatedMetricUrl.searchParams.get('relatedMetricSource')).toBe('pod');
  expect(relatedMetricUrl.searchParams.get('relatedMetricFamily')).toBe('cpu');
  expect(relatedMetricUrl.searchParams.get('relatedMetricReason')).toBe('resource-filter');
  expect(relatedMetricUrl.searchParams.get('relatedMetricMatchedLabels')).toContain('k8s_pod_name');
  const relatedMetricResourceMatch = JSON.parse(relatedMetricUrl.searchParams.get('relatedMetricResourceMatch') || '{}');
  expect(relatedMetricResourceMatch.k8s_pod_name).toBe('checkout-v1-78dfd');
  expect(relatedMetricUrl.searchParams.get('serviceName')).toBe(context.serviceName);
  expect(relatedMetricUrl.searchParams.get('serviceNamespace')).toBe(context.serviceNamespace);
  expect(relatedMetricUrl.searchParams.get('environment')).toBe(context.environment);
  expect(relatedMetricUrl.searchParams.get('traceId')).toBe(context.traceId);
  expect(relatedMetricUrl.searchParams.get('spanId')).toBe(context.spanId);

  const draftRequests: Array<Record<string, unknown>> = [];
  await page.route('**/api/signal/dashboard-panel-draft', async route => {
    const request = route.request();
    if (request.method().toUpperCase() !== 'PUT') {
      await route.continue();
      return;
    }
    const draft = request.postDataJSON() as Record<string, unknown>;
    draftRequests.push(draft);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data: draft })
    });
  });

  await page.goto(relatedMetricUrl.toString(), {
    timeout: BROWSER_SMOKE_TIMEOUT,
    waitUntil: 'domcontentloaded'
  });
  await expect(page.locator('[data-otlp-metrics-route="otlp-hertzbeat-ui-metrics-workbench"]')).toBeVisible({
    timeout: WORKBENCH_READY_TIMEOUT
  });
  const relatedCandidatePanel = page.locator('[data-otlp-metrics-related-candidate-context="backend-related-metric-candidate"]').first();
  await expect(relatedCandidatePanel).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
  await expect(relatedCandidatePanel).toHaveAttribute('data-otlp-metrics-related-candidate-source', 'pod');
  await expect(relatedCandidatePanel).toHaveAttribute('data-otlp-metrics-related-candidate-family', 'cpu');
  await expect(relatedCandidatePanel).toHaveAttribute('data-otlp-metrics-related-candidate-reason', 'resource-filter');
  await expect(relatedCandidatePanel).toContainText('checkout-v1-78dfd');

  await page.locator('[data-otlp-metrics-dashboard-panel-draft-action="add-current"]').first().click();
  await expect(page.locator('[data-otlp-metrics-dashboard-panel-draft-status="saved"]').first()).toBeVisible({
    timeout: WORKBENCH_READY_TIMEOUT
  });
  expect(draftRequests).toHaveLength(1);
  const savedRoute = String(draftRequests[0]?.route || '');
  const savedUrl = new URL(savedRoute, baseUrl);
  expect(draftRequests[0]?.signal).toBe('metrics');
  expect(savedUrl.searchParams.get('query')).toBe('container.cpu.usage');
  expect(savedUrl.searchParams.get('relatedMetricSource')).toBe('pod');
  expect(savedUrl.searchParams.get('relatedMetricFamily')).toBe('cpu');
  expect(savedUrl.searchParams.get('relatedMetricReason')).toBe('resource-filter');
  expect(savedUrl.searchParams.get('relatedMetricMatchedLabels')).toContain('k8s_pod_name');
  expect(JSON.parse(savedUrl.searchParams.get('relatedMetricResourceMatch') || '{}').k8s_pod_name).toBe('checkout-v1-78dfd');
  expect(savedUrl.searchParams.get('traceId')).toBe(context.traceId);
  expect(savedUrl.searchParams.get('spanId')).toBe(context.spanId);
}

async function authenticateViaApi(page: import('playwright/test').Page) {
  const response = await page.request.post(`${baseUrl}/api/account/auth/form`, {
    data: {
      type: 0,
      identifier: 'admin',
      credential: 'hertzbeat'
    },
    timeout: WORKBENCH_READY_TIMEOUT
  });
  expect(response.ok()).toBe(true);
  const message = await response.json();
  expect(message?.code).toBe(0);
  expect(message?.data?.authenticated).toBe(true);

  if (message?.data?.token) {
    await page.context().addInitScript(({ token, refreshToken }) => {
      window.localStorage.setItem('Authorization', token);
      if (refreshToken) {
        window.localStorage.setItem('refresh-token', refreshToken);
      }
    }, {
      token: message.data.token,
      refreshToken: message.data.refreshToken
    });
  } else {
    expect(message?.data?.tokenBoundary).toBe('bff-cookie');
  }
}

function seedThreeSignalDemo(context: ThreeSignalWorkbenchSmokeContext) {
  execFileSync(resolve(process.cwd(), '../script/dev/seed-otlp-three-signal-demo.sh'), ['--ensure-entity'], {
    cwd: resolve(process.cwd(), '..'),
    env: {
      ...process.env,
      TRACE_ID: context.traceId
    },
    stdio: 'pipe'
  });
}

async function expectWorkbenchText(page: import('playwright/test').Page, context: ThreeSignalWorkbenchSmokeContext) {
  const body = page.locator('body');
  await expect(body).toContainText(context.entityName, {
    timeout: WORKBENCH_READY_TIMEOUT
  });
  await expect(body).toContainText(context.traceId, {
    timeout: WORKBENCH_READY_TIMEOUT
  });
  await expect(body).toContainText(context.collector, {
    timeout: WORKBENCH_READY_TIMEOUT
  });
  await expect(body).toContainText(context.template, {
    timeout: WORKBENCH_READY_TIMEOUT
  });
}

test.describe('three-signal workbench browser smoke', () => {
  test('keeps seeded metrics, logs, and traces connected by the same entity-centered context', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);

    const smokeContext = createSmokeContext();
    seedThreeSignalDemo(smokeContext);
    await authenticateViaApi(page);

    const signalQuery = buildThreeSignalWorkbenchExpectedQuery(smokeContext);

    await page.goto(routeUrl('metrics', smokeContext), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });
    await expect(page.locator('[data-otlp-metrics-route="otlp-hertzbeat-ui-metrics-workbench"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('[data-otlp-metrics-series-row="selectable-series"]').first()).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('[data-otlp-metrics-selected-series-context="selected-series-attribution"]')).toBeVisible();
    await expect(page.locator('[data-otlp-metrics-linked-record-summary="log-trace-alert-links"]')).toBeVisible();
    await expectWorkbenchText(page, smokeContext);

    assertUrlCarries(
      await page.locator('[data-otlp-metrics-logs-action="true"]').first().getAttribute('href'),
      '/log/manage',
      signalQuery
    );
    assertUrlCarries(
      await page.locator('[data-otlp-metrics-traces-action="true"]').first().getAttribute('href'),
      '/trace/manage',
      signalQuery
    );
    assertUrlCarries(
      await page.locator('[data-otlp-metrics-entity-action="true"]').first().getAttribute('href'),
      `/entities/${smokeContext.entityId}`,
      signalQuery
    );
    assertUrlCarries(
      await page.locator('[data-otlp-metrics-alert-handling-action="true"]').first().getAttribute('href'),
      '/alert',
      {
        status: 'firing',
        signal: 'metrics',
        search: smokeContext.serviceName,
        ...signalQuery
      }
    );

    await page.goto(routeUrl('logs', smokeContext), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });
    await expect(page.locator('[data-log-manage-route="otlp-hertzbeat-ui-log-workbench"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expectSeededLogRowVisible(page, smokeContext);
    await expect(page.locator('[data-log-manage-entity-context="hertzbeat-signal-entity-context"]')).toBeVisible();
    await expectWorkbenchText(page, smokeContext);

    const detailDialog = page.locator('[data-log-stream-detail-dialog="true"]').first();
    if ((await detailDialog.count()) === 0 || !(await detailDialog.isVisible())) {
      await page.locator('[data-log-manage-row-detail-action="true"]').first().click();
      await expect(detailDialog).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    }
    const logTraceAction = page.locator('[data-log-stream-detail-dialog="true"] [data-log-manage-results-open-trace-action="true"]').first();
    await expect(logTraceAction).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(logTraceAction).toBeEnabled();
    await expectLogRelatedTracePreviewFlow(page, smokeContext, signalQuery);
    await closeTopOverlayDialog(page);
    await expect(page.locator('[data-log-stream-detail-dialog="true"]').first()).toBeHidden({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expectLogDashboardDraftFlow(page, smokeContext);

    await page.goto(routeUrl('trace', smokeContext), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });
    await expect(page.locator('[data-trace-manage-route="otlp-hertzbeat-ui-trace-workbench"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expectSeededTraceDetailActionVisible(page, smokeContext);
    const traceDetailDrawer = page.locator('[data-trace-manage-detail-drawer="waterfall-side-modal"]').first();
    if ((await traceDetailDrawer.count()) === 0 || !(await traceDetailDrawer.isVisible())) {
      await page.locator('[data-trace-manage-open-detail-action="side-waterfall-modal"]').first().click();
    }
    await expect(traceDetailDrawer).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('[data-trace-manage-entity-context="hertzbeat-signal-entity-context"]').first()).toBeVisible();
    const spanEventAction = page
      .locator(
        '[data-waterfall-event-marker="true"][data-waterfall-event-marker-action="select-span-event"]:not([data-waterfall-minimap-event-marker])'
      )
      .first();
    await expect(spanEventAction).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(spanEventAction.locator('[data-waterfall-event-marker-source="lucide"]').first()).toBeVisible();
    await spanEventAction.click();
    const spanEventDetail = page.locator('[data-trace-manage-event-detail="span-event-detail"]').first();
    await expect(spanEventDetail).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(spanEventDetail).toHaveAttribute('data-trace-manage-event-detail-type', 'span-event');
    await expectWorkbenchText(page, smokeContext);
    assertUrlCarries(
      await page.locator('[data-trace-manage-open-logs-action="true"]').first().getAttribute('href'),
      '/log/manage',
      signalQuery
    );
    await expectTraceRelatedLogsPreviewFlow(page, smokeContext, signalQuery);
    await expectTraceRelatedMetricDashboardDraftFlow(page, smokeContext);

    await page.goto(routeUrl('entity', smokeContext), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });
    await expect(page.locator('[data-entity-detail-surface="otlp-hertzbeat-ui-entity-detail"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('[data-entity-detail-relationships-panel="upstream-downstream"]')).toBeVisible();
    const hostRelation = page.locator(`[data-entity-detail-relationships-panel="upstream-downstream"] a[href*="/entities/${smokeContext.hostEntityId}"]`).first();
    await expect(hostRelation).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(hostRelation).toContainText('runs_on');
    await expect(hostRelation).toContainText(smokeContext.hostEntityName);
    const hostRelationHref = await hostRelation.getAttribute('href');
    assertRelationEntityHref(hostRelationHref, `/entities/${smokeContext.hostEntityId}`, smokeContext, {
      entityId: smokeContext.hostEntityId,
      entityName: smokeContext.hostEntityName
    });

    const k8sRelation = page.locator(`[data-entity-detail-relationships-panel="upstream-downstream"] a[href*="/entities/${smokeContext.k8sEntityId}"]`).first();
    await expect(k8sRelation).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    await expect(k8sRelation).toContainText('deployed_on');
    await expect(k8sRelation).toContainText(smokeContext.k8sEntityName);
    const k8sRelationHref = await k8sRelation.getAttribute('href');
    assertRelationEntityHref(k8sRelationHref, `/entities/${smokeContext.k8sEntityId}`, smokeContext, {
      entityId: smokeContext.k8sEntityId,
      entityName: smokeContext.k8sEntityName
    });

    await page.goto(routeUrl('topologyHost', smokeContext), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });
    await expectTopologyResourceTarget(page, smokeContext, {
      targetEntityId: smokeContext.hostEntityId,
      relationType: 'runs_on'
    });

    await page.goto(routeUrl('topologyK8s', smokeContext), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });
    await expectTopologyResourceTarget(page, smokeContext, {
      targetEntityId: smokeContext.k8sEntityId,
      relationType: 'deployed_on'
    });

    await page.goto(new URL(String(hostRelationHref), baseUrl).toString(), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });
    await expect(page.locator('[data-entity-detail-surface="otlp-hertzbeat-ui-entity-detail"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('body')).toContainText('Checkout Node A', { timeout: WORKBENCH_READY_TIMEOUT });
    await expectEntityResourceHandoffs(page, {
      metricsFilter: 'host.name="checkout-node-a"',
      resourceFilter: 'host.name="checkout-node-a"',
      serviceName: smokeContext.serviceName
    });

    await page.goto(new URL(String(k8sRelationHref), baseUrl).toString(), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });
    await expect(page.locator('[data-entity-detail-surface="otlp-hertzbeat-ui-entity-detail"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('body')).toContainText('Checkout Pod', { timeout: WORKBENCH_READY_TIMEOUT });
    await expectEntityResourceHandoffs(page, {
      metricsFilter: 'k8s.namespace.name="payments" and k8s.pod.name="checkout-v1-78dfd" and container.name="checkout"',
      resourceFilter: 'k8s.namespace.name="payments" and k8s.pod.name="checkout-v1-78dfd" and container.name="checkout"',
      serviceName: smokeContext.serviceName
    });
  });
});
