import { randomBytes } from 'node:crypto';
import { expect, test, type APIRequestContext, type Page } from 'playwright/test';
import {
  buildSignalDashboardCompositionFromDrafts,
  buildSignalDashboardExecutionPlans,
  createSignalDashboardPanelDraftFromRuntimeBreakout,
  createSignalDashboardPanelDraftFromRuntimeEvidence,
  type SignalDashboardRuntimeSyncTooltipRow
} from '../lib/signal-dashboards';
import {
  buildThreeSignalWorkbenchDashboardReplayExpectations,
  buildThreeSignalWorkbenchExpectedDashboardVariables
} from './three-signal-workbench-smoke-lib.mjs';

const baseUrl = process.env.DASHBOARD_SOURCE_EDIT_LIVE_BROWSER_BASE_URL || 'http://127.0.0.1:4200';
const BROWSER_SMOKE_TIMEOUT = 300000;
const WORKBENCH_READY_TIMEOUT = 120000;
const DASHBOARD_KEY_PREFIX = 'codex-live-source-edit';

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

type DashboardDraftSignal = SignalCase['signal'] | 'alerts';

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

type ApiMessage<T> = {
  code: number;
  msg?: string;
  data?: T;
};

type SignalDashboard = {
  dashboardKey: string;
  title: string;
  description: string;
  tags: string;
  variables?: string;
  layout: string;
  widgets: string;
  panelMap: string;
  version: string;
};

type SignalDashboardWidget = {
  id: string;
  draftKey?: string;
  signal: string;
  title: string;
  visualization: string;
  route: string;
  querySnapshot?: string;
  payload?: unknown;
};

type SignalDashboardVariable = {
  name: string;
  value: string;
};

type SignalDashboardPanelDraft = {
  signal: DashboardDraftSignal;
  draftKey: string;
  title: string;
  description: string;
  visualization: string;
  route: string;
  querySnapshot: string;
  payload?: string;
};

type SignalSavedView = {
  signal: SignalCase['signal'];
  viewKey: string;
  label: string;
  description: string;
  route: string;
  querySnapshot: string;
  payload?: string;
};

function uniqueDashboardKey(signal: SignalCase['signal']) {
  return `${DASHBOARD_KEY_PREFIX}-${signal}-${randomBytes(4).toString('hex')}`;
}

function uniqueVariableDashboardKey() {
  return `${DASHBOARD_KEY_PREFIX}-variables-${randomBytes(4).toString('hex')}`;
}

function uniqueSavedViewKey() {
  return `${DASHBOARD_KEY_PREFIX}-saved-view-${randomBytes(4).toString('hex')}`;
}

function uniqueSavedViewReplayDashboardKey() {
  return `${DASHBOARD_KEY_PREFIX}-saved-view-replay-${randomBytes(4).toString('hex')}`;
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

function buildPanelDraft(signalCase: SignalCase, route: string): SignalDashboardPanelDraft {
  return {
    signal: signalCase.signal,
    draftKey: signalCase.draftKey,
    title: titleFromRoute(signalCase, route),
    description: `${signalCase.signal} live smoke panel`,
    visualization: visualizationFromRoute(signalCase, route),
    route,
    querySnapshot: route,
    payload: JSON.stringify({
      source: 'dashboard-source-edit-live-smoke'
    })
  };
}

function buildDashboard(signalCase: SignalCase, dashboardKey: string, route: string): SignalDashboard {
  return {
    dashboardKey,
    title: `Live ${signalCase.signal} source edit`,
    description: 'Live dashboard source edit smoke',
    tags: signalCase.signal,
    layout: JSON.stringify([{ i: signalCase.panelId, x: 0, y: 0, w: 6, h: 4 }]),
    widgets: JSON.stringify([{
      id: signalCase.panelId,
      draftKey: signalCase.draftKey,
      signal: signalCase.signal,
      title: titleFromRoute(signalCase, route),
      description: `${signalCase.signal} live smoke panel`,
      visualization: visualizationFromRoute(signalCase, route),
      route,
      querySnapshot: route,
      payload: JSON.stringify({
        source: 'dashboard-source-edit-live-smoke'
      })
    }]),
    panelMap: JSON.stringify({ [signalCase.panelId]: signalCase.draftKey }),
    version: 'v1'
  };
}

function buildVariableDashboard(dashboardKey: string): SignalDashboard {
  const route = '/ingestion/otlp/metrics?query=http.server.duration&serviceName=$service.name&environment=$deployment.environment.name&inspector=graph&timeRange=last-1h';
  return {
    dashboardKey,
    title: 'Live variable dashboard',
    description: 'Live dashboard variable deep link smoke',
    tags: 'metrics,variables',
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
      route,
      querySnapshot: route,
      payload: JSON.stringify({
        source: 'dashboard-variable-live-smoke'
      })
    }]),
    panelMap: JSON.stringify({ 'variable-metrics': 'variable-metrics-draft' }),
    version: 'v1'
  };
}

function parseWidgets(dashboard: SignalDashboard): SignalDashboardWidget[] {
  const widgets = JSON.parse(dashboard.widgets) as unknown;
  expect(Array.isArray(widgets)).toBe(true);
  return widgets as SignalDashboardWidget[];
}

function parseVariables(dashboard: SignalDashboard): SignalDashboardVariable[] {
  const variables = JSON.parse(dashboard.variables || '[]') as unknown;
  expect(Array.isArray(variables)).toBe(true);
  return variables as SignalDashboardVariable[];
}

function parsePayload(payload: unknown): Record<string, unknown> {
  if (typeof payload === 'string') {
    const parsed = JSON.parse(payload) as unknown;
    expect(parsed && typeof parsed === 'object' && !Array.isArray(parsed)).toBe(true);
    return parsed as Record<string, unknown>;
  }
  expect(payload && typeof payload === 'object' && !Array.isArray(payload)).toBe(true);
  return payload as Record<string, unknown>;
}

async function requestJson<T>(
  api: APIRequestContext,
  method: 'GET' | 'PUT' | 'DELETE' | 'POST',
  path: string,
  data?: unknown
) {
  const response = await api.fetch(`${baseUrl}${path}`, {
    method,
    data,
    failOnStatusCode: false
  });
  const bodyText = await response.text();
  expect(response.ok(), `${method} ${path}: ${bodyText}`).toBe(true);
  const message = (bodyText ? JSON.parse(bodyText) : {}) as ApiMessage<T>;
  expect(message.code, `${method} ${path}: ${bodyText}`).toBe(0);
  return message.data as T;
}

async function authenticate(page: Page) {
  const message = await requestJson<{ authenticated?: boolean; tokenBoundary?: string }>(
    page.context().request,
    'POST',
    '/api/account/auth/form',
    {
      type: 0,
      identifier: process.env.DASHBOARD_SOURCE_EDIT_LIVE_IDENTIFIER || 'admin',
      credential: process.env.DASHBOARD_SOURCE_EDIT_LIVE_CREDENTIAL || 'hertzbeat'
    }
  );
  expect(message).toEqual(expect.objectContaining({
    authenticated: true,
    tokenBoundary: 'bff-cookie'
  }));

  await page.addInitScript(() => {
    window.localStorage.setItem('hb.lang', 'en-US');
    window.localStorage.setItem('layout.lang', 'en-US');
  });
}

async function seedDashboard(api: APIRequestContext, signalCase: SignalCase, dashboardKey: string) {
  await requestJson<SignalDashboardPanelDraft>(
    api,
    'PUT',
    '/api/signal/dashboard-panel-draft',
    buildPanelDraft(signalCase, signalCase.initialRoute)
  );
  await requestJson<SignalDashboard>(
    api,
    'PUT',
    '/api/signal/dashboard',
    buildDashboard(signalCase, dashboardKey, signalCase.initialRoute)
  );
}

async function cleanupDashboard(api: APIRequestContext, signalCase: SignalCase, dashboardKey: string) {
  await api.delete(`${baseUrl}/api/signal/dashboard/${encodeURIComponent(dashboardKey)}`, { failOnStatusCode: false });
  await api.delete(
    `${baseUrl}/api/signal/dashboard-panel-draft/${encodeURIComponent(signalCase.signal)}/${encodeURIComponent(signalCase.draftKey)}`,
    { failOnStatusCode: false }
  );
}

async function loadDashboard(api: APIRequestContext, dashboardKey: string) {
  const dashboards = await requestJson<SignalDashboard[]>(api, 'GET', '/api/signal/dashboard');
  const dashboard = dashboards.find(item => item.dashboardKey === dashboardKey);
  expect(dashboard, `dashboard ${dashboardKey} should be persisted`).toBeTruthy();
  return dashboard as SignalDashboard;
}

async function loadPanelDrafts(api: APIRequestContext, signal: DashboardDraftSignal) {
  return requestJson<SignalDashboardPanelDraft[]>(api, 'GET', `/api/signal/dashboard-panel-draft/${signal}`);
}

async function loadSavedViews(api: APIRequestContext, signal: SignalCase['signal']) {
  return requestJson<SignalSavedView[]>(api, 'GET', `/api/signal/saved-view/${signal}`);
}

async function seedSavedView(api: APIRequestContext, viewKey: string) {
  const route = '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&inspector=graph&timeRange=last-1h';
  await requestJson<SignalSavedView>(
    api,
    'PUT',
    '/api/signal/saved-view',
    {
      signal: 'metrics',
      viewKey,
      label: 'Live checkout p95',
      description: 'Live saved view promotion smoke',
      route,
      querySnapshot: route,
      payload: JSON.stringify({
        source: 'dashboard-saved-view-live-smoke',
        createdAt: Date.now()
      })
    }
  );
}

function appendProofParam(route: string, proofKey: string) {
  const url = new URL(route, baseUrl);
  url.searchParams.set('liveProof', proofKey);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

async function seedReplaySavedView(
  api: APIRequestContext,
  expectation: ReturnType<typeof buildThreeSignalWorkbenchDashboardReplayExpectations>[number],
  proofKey: string
) {
  const viewKey = `${expectation.signal}-${proofKey}`;
  const label = `${expectation.savedView.label} ${proofKey}`;
  const route = appendProofParam(expectation.savedView.route, proofKey);
  await requestJson<SignalSavedView>(
    api,
    'PUT',
    '/api/signal/saved-view',
    {
      signal: expectation.signal,
      viewKey,
      label,
      description: expectation.savedView.description,
      route,
      querySnapshot: route,
      payload: JSON.stringify({
        source: 'dashboard-saved-view-replay-live-smoke',
        createdAt: expectation.savedView.createdAt,
        proofKey
      })
    }
  );
  return {
    ...expectation,
    seededViewKey: viewKey,
    seededLabel: label,
    seededRoute: route
  };
}

async function cleanupSavedViewPromotion(api: APIRequestContext, viewKey: string, draftKeys: string[] = []) {
  await api.delete(`${baseUrl}/api/signal/saved-view/metrics/${encodeURIComponent(viewKey)}`, {
    failOnStatusCode: false
  });
  for (const draftKey of draftKeys) {
    await api.delete(`${baseUrl}/api/signal/dashboard-panel-draft/metrics/${encodeURIComponent(draftKey)}`, {
      failOnStatusCode: false
    });
  }
}

async function cleanupSavedViewReplay(
  api: APIRequestContext,
  dashboardKey: string,
  seededItems: Array<{ signal: SignalCase['signal']; seededViewKey: string }>,
  draftKeys: Array<{ signal: DashboardDraftSignal; draftKey: string }>
) {
  await api.delete(`${baseUrl}/api/signal/dashboard/${encodeURIComponent(dashboardKey)}`, {
    failOnStatusCode: false
  });
  for (const item of seededItems) {
    await api.delete(`${baseUrl}/api/signal/saved-view/${encodeURIComponent(item.signal)}/${encodeURIComponent(item.seededViewKey)}`, {
      failOnStatusCode: false
    });
  }
  for (const draftKey of draftKeys) {
    await api.delete(
      `${baseUrl}/api/signal/dashboard-panel-draft/${encodeURIComponent(draftKey.signal)}/${encodeURIComponent(draftKey.draftKey)}`,
      { failOnStatusCode: false }
    );
  }
}

function assertPlanMatchesReplayExpectation(
  plan: ReturnType<typeof buildSignalDashboardExecutionPlans>[number] | undefined,
  expectation: ReturnType<typeof buildThreeSignalWorkbenchDashboardReplayExpectations>[number]
) {
  expect(plan, `${expectation.signal} promoted panel should produce a dashboard execution plan`).toBeTruthy();
  expect(plan).toEqual(expect.objectContaining({
    signal: expectation.signal,
    state: 'ready',
    primaryUrl: expect.stringContaining(expectation.replay.primaryPath)
  }));
  const primaryUrl = new URL(String(plan?.primaryUrl || ''), baseUrl);
  expect(primaryUrl.pathname).toBe(expectation.replay.primaryPath);
  Object.entries(expectation.replay.expectedQuery).forEach(([key, value]) => {
    expect(primaryUrl.searchParams.get(key), `${expectation.signal} replay query ${key}`).toBe(String(value));
  });
  for (const key of expectation.replay.excludedQueryKeys || []) {
    expect(primaryUrl.searchParams.get(key), `${expectation.signal} replay should not include ${key}`).toBeNull();
  }
}

test.describe('live dashboard source edit browser smoke', () => {
  test('promotes logs, traces, and metrics saved views into a persisted replay dashboard', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);

    const proofKey = randomBytes(4).toString('hex');
    const dashboardKey = uniqueSavedViewReplayDashboardKey();
    const seededItems: Array<Awaited<ReturnType<typeof seedReplaySavedView>>> = [];
    const promotedDraftKeys: Array<{ signal: DashboardDraftSignal; draftKey: string }> = [];
    await authenticate(page);

    try {
      for (const expectation of buildThreeSignalWorkbenchDashboardReplayExpectations()) {
        seededItems.push(await seedReplaySavedView(page.context().request, expectation, proofKey));
      }

      await page.goto(`${baseUrl}/dashboard?timeRange=last-1h`, {
        timeout: BROWSER_SMOKE_TIMEOUT,
        waitUntil: 'domcontentloaded'
      });

      const promotedDrafts: SignalDashboardPanelDraft[] = [];
      for (const item of seededItems) {
        const savedViewRow = page.locator(`[data-dashboard-saved-view-row="${item.seededViewKey}"]`).first();
        await expect(savedViewRow).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
        await expect(savedViewRow).toHaveAttribute('data-dashboard-saved-view-signal', item.signal);
        await expect(savedViewRow).toHaveAttribute('data-dashboard-saved-view-route', new RegExp(`liveProof=${proofKey}`));

        await savedViewRow.locator('[data-dashboard-saved-view-action="add-panel"]').click();
        await expect.poll(async () => {
          const drafts = await loadPanelDrafts(page.context().request, item.signal);
          return drafts.find(draft => draft.title === item.seededLabel);
        }, {
          timeout: WORKBENCH_READY_TIMEOUT
        }).toBeTruthy();

        const drafts = await loadPanelDrafts(page.context().request, item.signal);
        const promotedDraft = drafts.find(draft => draft.title === item.seededLabel);
        expect(promotedDraft, `${item.signal} saved-view promotion should persist a panel draft`).toBeTruthy();
        expect(promotedDraft).toEqual(expect.objectContaining({
          signal: item.signal,
          title: item.seededLabel,
          description: item.savedView.description,
          visualization: item.panelDraft.visualization,
          route: item.seededRoute,
          querySnapshot: item.seededRoute
        }));
        expect(parsePayload(promotedDraft?.payload)).toEqual(expect.objectContaining({
          source: 'signal-saved-view',
          savedViewId: item.seededViewKey,
          savedViewLabel: item.seededLabel,
          savedViewRouteSummary: expect.objectContaining(item.panelDraft.expectedRouteSummary)
        }));
        promotedDrafts.push(promotedDraft as SignalDashboardPanelDraft);
        promotedDraftKeys.push({
          signal: promotedDraft?.signal || item.signal,
          draftKey: promotedDraft?.draftKey || ''
        });
      }

      const dashboard = buildSignalDashboardCompositionFromDrafts({
        dashboardKey,
        title: 'Live saved-view replay dashboard',
        description: 'Live saved-view replay smoke',
        tags: ['logs', 'traces', 'metrics'],
        drafts: promotedDrafts as Parameters<typeof buildSignalDashboardCompositionFromDrafts>[0]['drafts']
      });
      await requestJson<SignalDashboard>(page.context().request, 'PUT', '/api/signal/dashboard', dashboard);

      const persistedDashboard = await loadDashboard(page.context().request, dashboardKey);
      const persistedWidgets = parseWidgets(persistedDashboard);
      const persistedVariables = parseVariables(persistedDashboard);
      expect(persistedWidgets.map(widget => widget.signal)).toEqual(['logs', 'traces', 'metrics']);
      expect(persistedWidgets.map(widget => widget.title)).toEqual(seededItems.map(item => item.seededLabel));
      expect(persistedVariables).toEqual(expect.arrayContaining(
        buildThreeSignalWorkbenchExpectedDashboardVariables().map(variable => expect.objectContaining(variable))
      ));

      const plans = buildSignalDashboardExecutionPlans(persistedDashboard);
      for (const item of seededItems) {
        assertPlanMatchesReplayExpectation(plans.find(plan => plan.signal === item.signal), item);
      }

      await page.goto(`${baseUrl}/dashboard?dashboard=${encodeURIComponent(dashboardKey)}&timeRange=last-1h`, {
        timeout: BROWSER_SMOKE_TIMEOUT,
        waitUntil: 'domcontentloaded'
      });
      for (const widget of persistedWidgets) {
        const previewPanel = page.locator(`[data-dashboard-composition-preview-panel="${widget.id}"]`).first();
        await expect(previewPanel).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
        await expect(previewPanel).toHaveAttribute('data-dashboard-composition-preview-route', new RegExp(`liveProof=${proofKey}`));
      }
    } finally {
      await cleanupSavedViewReplay(
        page.context().request,
        dashboardKey,
        seededItems,
        promotedDraftKeys.filter((draftKey): draftKey is { signal: DashboardDraftSignal; draftKey: string } => Boolean(draftKey.draftKey))
      );
    }
  });

  test('promotes a saved query view through real saved-view and panel-draft APIs', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);

    const viewKey = uniqueSavedViewKey();
    let promotedDraftKey: string | undefined;
    let duplicatedDraftKey: string | undefined;
    await authenticate(page);
    await seedSavedView(page.context().request, viewKey);

    try {
      await page.goto(`${baseUrl}/dashboard?timeRange=last-1h`, {
        timeout: BROWSER_SMOKE_TIMEOUT,
        waitUntil: 'domcontentloaded'
      });

      const savedViewRow = page.locator(`[data-dashboard-saved-view-row="${viewKey}"]`).first();
      await expect(savedViewRow).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
      await expect(savedViewRow).toHaveAttribute('data-dashboard-saved-view-signal', 'metrics');
      await expect(savedViewRow).toHaveAttribute('data-dashboard-saved-view-route', /query=http\.server\.duration/);

      await savedViewRow.locator(`[data-dashboard-saved-view-label-input="${viewKey}"]`).fill('Live checkout p99');
      await savedViewRow.locator(`[data-dashboard-saved-view-description-input="${viewKey}"]`).fill('Live saved view update smoke');
      await savedViewRow.locator('[data-dashboard-saved-view-action="update"]').click();
      await expect.poll(async () => {
        const views = await loadSavedViews(page.context().request, 'metrics');
        return views.find(view => view.viewKey === viewKey);
      }, {
        timeout: WORKBENCH_READY_TIMEOUT
      }).toEqual(expect.objectContaining({
        label: 'Live checkout p99',
        description: 'Live saved view update smoke'
      }));
      await expect(savedViewRow).toHaveAttribute('data-dashboard-saved-view-label', 'Live checkout p99', {
        timeout: WORKBENCH_READY_TIMEOUT
      });

      await savedViewRow.locator('[data-dashboard-saved-view-action="add-panel"]').click();
      await expect.poll(async () => {
        const drafts = await loadPanelDrafts(page.context().request, 'metrics');
        return drafts.find(draft => draft.title === 'Live checkout p99');
      }, {
        timeout: WORKBENCH_READY_TIMEOUT
      }).toBeTruthy();
      const drafts = await loadPanelDrafts(page.context().request, 'metrics');
      const savedDraft = drafts.find(draft => draft.title === 'Live checkout p99');
      expect(savedDraft, 'saved-view promotion should persist a metrics panel draft').toBeTruthy();
      promotedDraftKey = savedDraft?.draftKey;
      expect(savedDraft).toEqual(expect.objectContaining({
        signal: 'metrics',
        title: 'Live checkout p99',
        description: 'Live saved view update smoke',
        visualization: 'graph',
        route: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&inspector=graph&timeRange=last-1h',
        querySnapshot: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&inspector=graph&timeRange=last-1h'
      }));
      expect(parsePayload(savedDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-saved-view',
        savedViewId: viewKey,
        savedViewLabel: 'Live checkout p99',
        savedViewRouteSummary: {
          query: 'http.server.duration',
          serviceName: 'checkout',
          inspector: 'graph',
          timeRange: 'last-1h'
        },
        savedViewRouteSummaryText: 'query=http.server.duration, serviceName=checkout, inspector=graph, timeRange=last-1h'
      }));

      const panelDraftRow = page.locator('[data-dashboard-panel-draft-row]').filter({ hasText: 'Live checkout p99' }).first();
      await expect(panelDraftRow).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
      await expect(panelDraftRow).toHaveAttribute('data-dashboard-panel-draft-signal', 'metrics');
      await expect(panelDraftRow).toHaveAttribute('data-dashboard-panel-draft-visualization', 'graph');
      await expect(panelDraftRow).toHaveAttribute(
        'data-dashboard-panel-draft-source-summary',
        'query=http.server.duration, serviceName=checkout, inspector=graph, timeRange=last-1h'
      );

      await panelDraftRow.locator('[data-dashboard-panel-draft-action="duplicate"]').click();
      await expect.poll(async () => {
        const nextDrafts = await loadPanelDrafts(page.context().request, 'metrics');
        return nextDrafts.find(draft => draft.title === 'Live checkout p99 Copy');
      }, {
        timeout: WORKBENCH_READY_TIMEOUT
      }).toBeTruthy();
      const duplicateDrafts = await loadPanelDrafts(page.context().request, 'metrics');
      const duplicatedDraft = duplicateDrafts.find(draft => draft.title === 'Live checkout p99 Copy');
      expect(duplicatedDraft, 'saved-view panel draft duplicate should persist').toBeTruthy();
      duplicatedDraftKey = duplicatedDraft?.draftKey;
      expect(duplicatedDraft).toEqual(expect.objectContaining({
        signal: 'metrics',
        title: 'Live checkout p99 Copy',
        description: 'Live saved view update smoke',
        visualization: 'graph',
        route: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&inspector=graph&timeRange=last-1h',
        querySnapshot: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=checkout&inspector=graph&timeRange=last-1h'
      }));
      expect(parsePayload(duplicatedDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-panel-duplicate',
        duplicatedFromSource: 'signal-saved-view',
        duplicatedFromDraftKey: promotedDraftKey,
        savedViewRouteSummaryText: 'query=http.server.duration, serviceName=checkout, inspector=graph, timeRange=last-1h'
      }));
      const duplicatePanelDraftRow = page.locator('[data-dashboard-panel-draft-row]').filter({ hasText: 'Live checkout p99 Copy' }).first();
      await expect(duplicatePanelDraftRow).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
      await expect(duplicatePanelDraftRow).toHaveAttribute(
        'data-dashboard-panel-draft-source-summary',
        'query=http.server.duration, serviceName=checkout, inspector=graph, timeRange=last-1h'
      );

      await savedViewRow.locator('[data-dashboard-saved-view-action="delete"]').click();
      await expect.poll(async () => {
        const views = await loadSavedViews(page.context().request, 'metrics');
        return views.some(view => view.viewKey === viewKey);
      }, {
        timeout: WORKBENCH_READY_TIMEOUT
      }).toBe(false);
      await expect(page.locator(`[data-dashboard-saved-view-row="${viewKey}"]`)).toHaveCount(0, {
        timeout: WORKBENCH_READY_TIMEOUT
      });
    } finally {
      await cleanupSavedViewPromotion(page.context().request, viewKey, [promotedDraftKey, duplicatedDraftKey].filter((draftKey): draftKey is string => Boolean(draftKey)));
    }
  });

  test('applies dashboard variable URL overrides through real dashboard APIs', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);

    const dashboardKey = uniqueVariableDashboardKey();
    let filterDraftKeys: { signal: DashboardDraftSignal; draftKey: string }[] = [];
    await authenticate(page);
    await requestJson<SignalDashboard>(
      page.context().request,
      'PUT',
      '/api/signal/dashboard',
      buildVariableDashboard(dashboardKey)
    );

    try {
      await page.goto(`${baseUrl}/dashboard?dashboard=${encodeURIComponent(dashboardKey)}&timeRange=last-1h&var-service.name=billing`, {
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
      await expect(previewPanel).toHaveAttribute(
        'data-dashboard-composition-preview-edit-href',
        new RegExp(`dashboardKey=${dashboardKey}`)
      );

      await filterVariable.locator('[data-dashboard-composition-filter-variable-action="add-panel-draft"]').click();
      await expect.poll(async () => {
        const drafts = await loadPanelDrafts(page.context().request, 'metrics');
        return drafts.find(draft => draft.title === 'Filter panel: service.name=billing');
      }, {
        timeout: WORKBENCH_READY_TIMEOUT
      }).toBeTruthy();
      const drafts = await loadPanelDrafts(page.context().request, 'metrics');
      const filterDraft = drafts.find(draft => draft.title === 'Filter panel: service.name=billing');
      const filterTableDraft = drafts.find(draft => draft.title === 'Filter panel table: service.name=billing');
      const filterLatencyDraft = drafts.find(draft => draft.title === 'Filter panel latency p95: service.name=billing');
      const filterRateDraft = drafts.find(draft => draft.title === 'Filter panel request rate: service.name=billing');
      const filterErrorRateDraft = drafts.find(draft => draft.title === 'Filter panel error rate: service.name=billing');
      const filterApdexDraft = drafts.find(draft => draft.title === 'Filter panel apdex: service.name=billing');
      const filterDbRateDraft = drafts.find(draft => draft.title === 'Filter panel db calls rate: service.name=billing');
      const filterDbDurationDraft = drafts.find(draft => draft.title === 'Filter panel db call duration: service.name=billing');
      const filterExternalRateDraft = drafts.find(draft => draft.title === 'Filter panel external calls rate: service.name=billing');
      const filterExternalDurationDraft = drafts.find(draft => draft.title === 'Filter panel external call duration: service.name=billing');
      const filterKeyOperationsDraft = drafts.find(draft => draft.title === 'Filter panel key operations: service.name=billing');
      const logsDrafts = await loadPanelDrafts(page.context().request, 'logs');
      const filterLogsDraft = logsDrafts.find(draft => draft.title === 'Filter panel logs: service.name=billing');
      const filterLogErrorsDraft = logsDrafts.find(draft => draft.title === 'Filter panel log errors: service.name=billing');
      const tracesDrafts = await loadPanelDrafts(page.context().request, 'traces');
      const filterTracesDraft = tracesDrafts.find(draft => draft.title === 'Filter panel traces: service.name=billing');
      const filterTraceErrorsDraft = tracesDrafts.find(draft => draft.title === 'Filter panel trace errors: service.name=billing');
      const filterTraceExceptionsDraft = tracesDrafts.find(draft => draft.title === 'Filter panel exceptions: service.name=billing');
      const filterTraceExceptionMessagesDraft = tracesDrafts.find(draft => draft.title === 'Filter panel exception messages: service.name=billing');
      const alertsDrafts = await loadPanelDrafts(page.context().request, 'alerts');
      const filterAlertsDraft = alertsDrafts.find(draft => draft.title === 'Filter panel firing alerts: service.name=billing');
      expect(filterDraft, 'filter selection panel draft should persist').toBeTruthy();
      expect(filterTableDraft, 'filter selection table panel draft should persist').toBeTruthy();
      expect(filterLatencyDraft, 'filter selection latency panel draft should persist').toBeTruthy();
      expect(filterRateDraft, 'filter selection request-rate panel draft should persist').toBeTruthy();
      expect(filterErrorRateDraft, 'filter selection error-rate panel draft should persist').toBeTruthy();
      expect(filterApdexDraft, 'filter selection apdex panel draft should persist').toBeTruthy();
      expect(filterDbRateDraft, 'filter selection db-call-rate panel draft should persist').toBeTruthy();
      expect(filterDbDurationDraft, 'filter selection db-call-duration panel draft should persist').toBeTruthy();
      expect(filterExternalRateDraft, 'filter selection external-call-rate panel draft should persist').toBeTruthy();
      expect(filterExternalDurationDraft, 'filter selection external-call-duration panel draft should persist').toBeTruthy();
      expect(filterKeyOperationsDraft, 'filter selection key-operations panel draft should persist').toBeTruthy();
      expect(filterLogsDraft, 'filter selection logs panel draft should persist').toBeTruthy();
      expect(filterLogErrorsDraft, 'filter selection log-error panel draft should persist').toBeTruthy();
      expect(filterTracesDraft, 'filter selection traces panel draft should persist').toBeTruthy();
      expect(filterTraceErrorsDraft, 'filter selection trace-error panel draft should persist').toBeTruthy();
      expect(filterTraceExceptionsDraft, 'filter selection trace-exception panel draft should persist').toBeTruthy();
      expect(filterTraceExceptionMessagesDraft, 'filter selection trace-exception-message panel draft should persist').toBeTruthy();
      expect(filterAlertsDraft, 'filter selection firing-alerts panel draft should persist').toBeTruthy();
      filterDraftKeys = [
        { signal: 'metrics' as const, draftKey: filterDraft?.draftKey || '' },
        { signal: 'metrics' as const, draftKey: filterTableDraft?.draftKey || '' },
        { signal: 'metrics' as const, draftKey: filterLatencyDraft?.draftKey || '' },
        { signal: 'metrics' as const, draftKey: filterRateDraft?.draftKey || '' },
        { signal: 'metrics' as const, draftKey: filterErrorRateDraft?.draftKey || '' },
        { signal: 'metrics' as const, draftKey: filterApdexDraft?.draftKey || '' },
        { signal: 'metrics' as const, draftKey: filterDbRateDraft?.draftKey || '' },
        { signal: 'metrics' as const, draftKey: filterDbDurationDraft?.draftKey || '' },
        { signal: 'metrics' as const, draftKey: filterExternalRateDraft?.draftKey || '' },
        { signal: 'metrics' as const, draftKey: filterExternalDurationDraft?.draftKey || '' },
        { signal: 'metrics' as const, draftKey: filterKeyOperationsDraft?.draftKey || '' },
        { signal: 'logs' as const, draftKey: filterLogsDraft?.draftKey || '' },
        { signal: 'logs' as const, draftKey: filterLogErrorsDraft?.draftKey || '' },
        { signal: 'traces' as const, draftKey: filterTracesDraft?.draftKey || '' },
        { signal: 'traces' as const, draftKey: filterTraceErrorsDraft?.draftKey || '' },
        { signal: 'traces' as const, draftKey: filterTraceExceptionsDraft?.draftKey || '' },
        { signal: 'traces' as const, draftKey: filterTraceExceptionMessagesDraft?.draftKey || '' },
        { signal: 'alerts' as const, draftKey: filterAlertsDraft?.draftKey || '' }
      ].filter((item): item is { signal: DashboardDraftSignal; draftKey: string } => Boolean(item.draftKey));
      expect(filterDraft).toEqual(expect.objectContaining({
        signal: 'metrics',
        title: 'Filter panel: service.name=billing',
        description: 'service.name=billing',
        visualization: 'graph'
      }));
      expect(filterDraft?.route).toContain('serviceName=billing');
      expect(filterDraft?.route).toContain('environment=prod');
      expect(parsePayload(filterDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'metrics-graph'
      }));
      expect(filterTableDraft).toEqual(expect.objectContaining({
        signal: 'metrics',
        title: 'Filter panel table: service.name=billing',
        description: 'service.name=billing · table',
        visualization: 'table'
      }));
      expect(filterTableDraft?.route).toContain('serviceName=billing');
      expect(filterTableDraft?.route).toContain('environment=prod');
      expect(filterTableDraft?.route).toContain('inspector=table');
      expect(parsePayload(filterTableDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'metrics-table'
      }));
      expect(filterLatencyDraft).toEqual(expect.objectContaining({
        signal: 'metrics',
        title: 'Filter panel latency p95: service.name=billing',
        description: 'service.name=billing · latency p95',
        visualization: 'graph'
      }));
      expect(filterLatencyDraft?.route).toContain('serviceName=billing');
      expect(filterLatencyDraft?.route).toContain('environment=prod');
      expect(filterLatencyDraft?.route).toContain('query=http.server.duration');
      expect(filterLatencyDraft?.route).toContain('aggregation=p95');
      expect(parsePayload(filterLatencyDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'metrics-latency-p95'
      }));
      expect(filterRateDraft).toEqual(expect.objectContaining({
        signal: 'metrics',
        title: 'Filter panel request rate: service.name=billing',
        description: 'service.name=billing · request rate',
        visualization: 'graph'
      }));
      expect(filterRateDraft?.route).toContain('serviceName=billing');
      expect(filterRateDraft?.route).toContain('environment=prod');
      expect(filterRateDraft?.route).toContain('query=http_server_duration_milliseconds_count');
      expect(filterRateDraft?.route).toContain('temporalAggregation=rate');
      expect(parsePayload(filterRateDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'metrics-request-rate'
      }));
      expect(filterErrorRateDraft).toEqual(expect.objectContaining({
        signal: 'metrics',
        title: 'Filter panel error rate: service.name=billing',
        description: 'service.name=billing · error rate',
        visualization: 'graph'
      }));
      expect(filterErrorRateDraft?.route).toContain('serviceName=billing');
      expect(filterErrorRateDraft?.route).toContain('environment=prod');
      expect(filterErrorRateDraft?.route).toContain('query=http_server_duration_milliseconds_count');
      expect(filterErrorRateDraft?.route).toContain('status_code%3D%22STATUS_CODE_ERROR%22');
      expect(filterErrorRateDraft?.route).toContain('temporalAggregation=rate');
      expect(filterErrorRateDraft?.route).toContain('groupBy=status_code');
      expect(parsePayload(filterErrorRateDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'metrics-error-rate'
      }));
      expect(filterApdexDraft).toEqual(expect.objectContaining({
        signal: 'metrics',
        title: 'Filter panel apdex: service.name=billing',
        description: 'service.name=billing · apdex',
        visualization: 'graph'
      }));
      expect(filterApdexDraft?.route).toContain('serviceName=billing');
      expect(filterApdexDraft?.route).toContain('environment=prod');
      expect(filterApdexDraft?.route).toContain('query=http.server.duration.bucket');
      expect(filterApdexDraft?.route).toContain('template=service-apdex');
      expect(filterApdexDraft?.route).toContain('groupBy=service.name');
      expect(parsePayload(filterApdexDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'metrics-apdex'
      }));
      expect(filterDbRateDraft).toEqual(expect.objectContaining({
        signal: 'metrics',
        title: 'Filter panel db calls rate: service.name=billing',
        description: 'service.name=billing · db calls rate',
        visualization: 'graph'
      }));
      expect(filterDbRateDraft?.route).toContain('serviceName=billing');
      expect(filterDbRateDraft?.route).toContain('environment=prod');
      expect(filterDbRateDraft?.route).toContain('query=signoz_db_latency_count');
      expect(filterDbRateDraft?.route).toContain('temporalAggregation=rate');
      expect(filterDbRateDraft?.route).toContain('groupBy=db.system');
      expect(parsePayload(filterDbRateDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'metrics-db-call-rate'
      }));
      expect(filterDbDurationDraft).toEqual(expect.objectContaining({
        signal: 'metrics',
        title: 'Filter panel db call duration: service.name=billing',
        description: 'service.name=billing · db call duration',
        visualization: 'graph'
      }));
      expect(filterDbDurationDraft?.route).toContain('serviceName=billing');
      expect(filterDbDurationDraft?.route).toContain('environment=prod');
      expect(filterDbDurationDraft?.route).toContain('query=signoz_db_latency_sum');
      expect(filterDbDurationDraft?.route).toContain('template=service-db-call-duration');
      expect(filterDbDurationDraft?.route).toContain('groupBy=db.system');
      expect(parsePayload(filterDbDurationDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'metrics-db-call-duration'
      }));
      expect(filterExternalRateDraft).toEqual(expect.objectContaining({
        signal: 'metrics',
        title: 'Filter panel external calls rate: service.name=billing',
        description: 'service.name=billing · external calls rate',
        visualization: 'graph'
      }));
      expect(filterExternalRateDraft?.route).toContain('serviceName=billing');
      expect(filterExternalRateDraft?.route).toContain('environment=prod');
      expect(filterExternalRateDraft?.route).toContain('query=signoz_external_call_latency_count');
      expect(filterExternalRateDraft?.route).toContain('temporalAggregation=rate');
      expect(filterExternalRateDraft?.route).toContain('groupBy=external.service.address');
      expect(parsePayload(filterExternalRateDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'metrics-external-call-rate'
      }));
      expect(filterExternalDurationDraft).toEqual(expect.objectContaining({
        signal: 'metrics',
        title: 'Filter panel external call duration: service.name=billing',
        description: 'service.name=billing · external call duration',
        visualization: 'graph'
      }));
      expect(filterExternalDurationDraft?.route).toContain('serviceName=billing');
      expect(filterExternalDurationDraft?.route).toContain('environment=prod');
      expect(filterExternalDurationDraft?.route).toContain('query=signoz_external_call_latency_sum');
      expect(filterExternalDurationDraft?.route).toContain('template=service-external-call-duration');
      expect(filterExternalDurationDraft?.route).toContain('groupBy=external.service.address');
      expect(parsePayload(filterExternalDurationDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'metrics-external-call-duration'
      }));
      expect(filterKeyOperationsDraft).toEqual(expect.objectContaining({
        signal: 'metrics',
        title: 'Filter panel key operations: service.name=billing',
        description: 'service.name=billing · key operations',
        visualization: 'graph'
      }));
      expect(filterKeyOperationsDraft?.route).toContain('serviceName=billing');
      expect(filterKeyOperationsDraft?.route).toContain('environment=prod');
      expect(filterKeyOperationsDraft?.route).toContain('query=http.server.duration');
      expect(filterKeyOperationsDraft?.route).toContain('aggregation=p95');
      expect(filterKeyOperationsDraft?.route).toContain('groupBy=operation');
      expect(filterKeyOperationsDraft?.route).toContain('limit=10');
      expect(parsePayload(filterKeyOperationsDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'metrics-key-operations'
      }));
      expect(filterLogsDraft).toEqual(expect.objectContaining({
        signal: 'logs',
        title: 'Filter panel logs: service.name=billing',
        description: 'service.name=billing · logs',
        visualization: 'list'
      }));
      expect(filterLogsDraft?.route).toContain('/log/manage?');
      expect(filterLogsDraft?.route).toContain('serviceName=billing');
      expect(filterLogsDraft?.route).toContain('environment=prod');
      expect(filterLogsDraft?.route).toContain('view=list');
      expect(parsePayload(filterLogsDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'logs-list'
      }));
      expect(filterLogErrorsDraft).toEqual(expect.objectContaining({
        signal: 'logs',
        title: 'Filter panel log errors: service.name=billing',
        description: 'service.name=billing · log errors',
        visualization: 'table'
      }));
      expect(filterLogErrorsDraft?.route).toContain('/log/manage?');
      expect(filterLogErrorsDraft?.route).toContain('serviceName=billing');
      expect(filterLogErrorsDraft?.route).toContain('environment=prod');
      expect(filterLogErrorsDraft?.route).toContain('view=table');
      expect(filterLogErrorsDraft?.route).toContain('severityText=ERROR');
      expect(parsePayload(filterLogErrorsDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'logs-errors'
      }));
      expect(filterTracesDraft).toEqual(expect.objectContaining({
        signal: 'traces',
        title: 'Filter panel traces: service.name=billing',
        description: 'service.name=billing · traces',
        visualization: 'table'
      }));
      expect(filterTracesDraft?.route).toContain('/trace/manage?');
      expect(filterTracesDraft?.route).toContain('serviceName=billing');
      expect(filterTracesDraft?.route).toContain('environment=prod');
      expect(filterTracesDraft?.route).toContain('view=table');
      expect(parsePayload(filterTracesDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'traces-table'
      }));
      expect(filterTraceErrorsDraft).toEqual(expect.objectContaining({
        signal: 'traces',
        title: 'Filter panel trace errors: service.name=billing',
        description: 'service.name=billing · trace errors',
        visualization: 'table'
      }));
      expect(filterTraceErrorsDraft?.route).toContain('/trace/manage?');
      expect(filterTraceErrorsDraft?.route).toContain('serviceName=billing');
      expect(filterTraceErrorsDraft?.route).toContain('environment=prod');
      expect(filterTraceErrorsDraft?.route).toContain('view=table');
      expect(filterTraceErrorsDraft?.route).toContain('errorOnly=true');
      expect(parsePayload(filterTraceErrorsDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'traces-errors'
      }));
      expect(filterTraceExceptionsDraft).toEqual(expect.objectContaining({
        signal: 'traces',
        title: 'Filter panel exceptions: service.name=billing',
        description: 'service.name=billing · exceptions',
        visualization: 'list'
      }));
      expect(filterTraceExceptionsDraft?.route).toContain('/trace/manage?');
      expect(filterTraceExceptionsDraft?.route).toContain('serviceName=billing');
      expect(filterTraceExceptionsDraft?.route).toContain('environment=prod');
      expect(filterTraceExceptionsDraft?.route).toContain('template=service-exceptions');
      expect(filterTraceExceptionsDraft?.route).toContain('errorOnly=true');
      expect(filterTraceExceptionsDraft?.route).toContain('spanScope=all');
      expect(filterTraceExceptionsDraft?.route).toContain('groupBy=exception.type');
      expect(parsePayload(filterTraceExceptionsDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'traces-exceptions'
      }));
      expect(filterTraceExceptionMessagesDraft).toEqual(expect.objectContaining({
        signal: 'traces',
        title: 'Filter panel exception messages: service.name=billing',
        description: 'service.name=billing · exception messages',
        visualization: 'list'
      }));
      expect(filterTraceExceptionMessagesDraft?.route).toContain('/trace/manage?');
      expect(filterTraceExceptionMessagesDraft?.route).toContain('serviceName=billing');
      expect(filterTraceExceptionMessagesDraft?.route).toContain('environment=prod');
      expect(filterTraceExceptionMessagesDraft?.route).toContain('template=service-exception-messages');
      expect(filterTraceExceptionMessagesDraft?.route).toContain('errorOnly=true');
      expect(filterTraceExceptionMessagesDraft?.route).toContain('spanScope=all');
      expect(filterTraceExceptionMessagesDraft?.route).toContain('groupBy=exception.message');
      expect(parsePayload(filterTraceExceptionMessagesDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'traces-exception-messages'
      }));
      expect(filterAlertsDraft).toEqual(expect.objectContaining({
        signal: 'alerts',
        title: 'Filter panel firing alerts: service.name=billing',
        description: 'service.name=billing · firing alerts',
        visualization: 'list'
      }));
      expect(filterAlertsDraft?.route).toContain('/alert?');
      expect(filterAlertsDraft?.route).toContain('serviceName=billing');
      expect(filterAlertsDraft?.route).toContain('environment=prod');
      expect(filterAlertsDraft?.route).toContain('search=billing');
      expect(filterAlertsDraft?.route).toContain('status=firing');
      expect(parsePayload(filterAlertsDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-filter-selection',
        sourcePanelId: 'variable-metrics',
        variableName: 'service.name',
        variableValue: 'billing',
        variableType: 'textbox',
        templateKey: 'alerts-firing'
      }));
      const persistedDashboard = await loadDashboard(page.context().request, dashboardKey);
      const persistedWidgets = parseWidgets(persistedDashboard);
      expect(persistedWidgets.map(widget => widget.title)).toEqual([
        'Service latency',
        'Filter panel: service.name=billing',
        'Filter panel table: service.name=billing',
        'Filter panel latency p95: service.name=billing',
        'Filter panel request rate: service.name=billing',
        'Filter panel error rate: service.name=billing',
        'Filter panel apdex: service.name=billing',
        'Filter panel db calls rate: service.name=billing',
        'Filter panel db call duration: service.name=billing',
        'Filter panel external calls rate: service.name=billing',
        'Filter panel external call duration: service.name=billing',
        'Filter panel key operations: service.name=billing',
        'Filter panel logs: service.name=billing',
        'Filter panel log errors: service.name=billing',
        'Filter panel traces: service.name=billing',
        'Filter panel trace errors: service.name=billing',
        'Filter panel exceptions: service.name=billing',
        'Filter panel exception messages: service.name=billing',
        'Filter panel firing alerts: service.name=billing'
      ]);
      expect(JSON.parse(persistedDashboard.layout)).toEqual(expect.arrayContaining([
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
    } finally {
      await page.context().request.delete(`${baseUrl}/api/signal/dashboard/${encodeURIComponent(dashboardKey)}`, {
        failOnStatusCode: false
      });
      for (const filterDraftKey of filterDraftKeys) {
        await page.context().request.delete(
          `${baseUrl}/api/signal/dashboard-panel-draft/${encodeURIComponent(filterDraftKey.signal)}/${encodeURIComponent(filterDraftKey.draftKey)}`,
          { failOnStatusCode: false }
        );
      }
    }
  });

  test('persists a runtime evidence panel draft through the real panel-draft API', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);

    const proofKey = randomBytes(4).toString('hex');
    const route = `/ingestion/otlp/metrics?query=http.server.duration&serviceName=billing&environment=prod&inspector=graph&timeRange=last-1h&start=1713196400000&end=1713200000000&runtimeProof=${proofKey}`;
    const row: SignalDashboardRuntimeSyncTooltipRow = {
      key: `variable-metrics:metric-series:0:point:${proofKey}:sync`,
      panelId: 'variable-metrics',
      signal: 'metrics',
      source: 'metrics-point',
      label: 'series-1',
      value: '120',
      meta: '1713200000000'
    };
    const draft = createSignalDashboardPanelDraftFromRuntimeEvidence({
      row,
      route,
      titlePrefix: 'Evidence panel'
    });
    expect(draft, 'runtime evidence helper should create a metrics draft').toBeTruthy();
    const draftKey = draft?.draftKey || '';

    await authenticate(page);

    try {
      await requestJson<SignalDashboardPanelDraft>(
        page.context().request,
        'PUT',
        '/api/signal/dashboard-panel-draft',
        draft
      );
      await expect.poll(async () => {
        const drafts = await loadPanelDrafts(page.context().request, 'metrics');
        return drafts.find(item => item.draftKey === draftKey);
      }, {
        timeout: WORKBENCH_READY_TIMEOUT
      }).toBeTruthy();
      const drafts = await loadPanelDrafts(page.context().request, 'metrics');
      const savedDraft = drafts.find(item => item.draftKey === draftKey);
      expect(savedDraft, 'runtime evidence panel draft should persist').toBeTruthy();
      expect(savedDraft).toEqual(expect.objectContaining({
        signal: 'metrics',
        draftKey,
        title: 'Evidence panel: http.server.duration',
        description: 'metrics-point · 120 · 1713200000000',
        visualization: 'graph',
        route,
        querySnapshot: route
      }));
      expect(parsePayload(savedDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-runtime-evidence',
        sourcePanelId: 'variable-metrics',
        evidenceRowKey: row.key,
        evidenceSource: 'metrics-point',
        evidenceLabel: 'http.server.duration',
        evidenceSeriesLabel: 'series-1',
        evidenceValue: '120'
      }));
    } finally {
      if (draftKey) {
        await page.context().request.delete(
          `${baseUrl}/api/signal/dashboard-panel-draft/metrics/${encodeURIComponent(draftKey)}`,
          { failOnStatusCode: false }
        );
      }
    }
  });

  test('persists runtime breakout panel drafts through the real panel-draft API', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);

    const proofKey = randomBytes(4).toString('hex');
    const breakoutAttribute = {
      key: `resource:service.version:1.2.3:${proofKey}`,
      name: 'resource:service.version',
      value: '1.2.3',
      source: 'resource' as const
    };
    const logRow: SignalDashboardRuntimeSyncTooltipRow = {
      key: `runtime-log-row:${proofKey}`,
      panelId: 'runtime-log-panel',
      signal: 'logs',
      source: 'log-row',
      label: 'checkout timeout',
      value: '14 logs',
      meta: 'trace-123',
      traceId: 'trace-123',
      spanId: 'span-456'
    };
    const traceRow: SignalDashboardRuntimeSyncTooltipRow = {
      key: `runtime-trace-row:${proofKey}`,
      panelId: 'runtime-trace-panel',
      signal: 'traces',
      source: 'trace-row',
      label: 'POST /checkout',
      value: '9 traces',
      meta: 'p95 245ms',
      traceId: 'trace-123',
      spanId: 'span-456'
    };
    const logRoute = `/log/manage?view=table&search=timeout&serviceName=checkout&environment=prod&traceId=trace-123&spanId=span-456&timeRange=last-1h&runtimeProof=${proofKey}`;
    const traceRoute = `/trace/manage?view=table&serviceName=checkout&environment=prod&spanScope=all&traceId=trace-123&spanId=span-456&timeRange=last-1h&runtimeProof=${proofKey}`;
    const titlePrefix = `Breakout panel ${proofKey}`;
    const logDraft = createSignalDashboardPanelDraftFromRuntimeBreakout({
      row: logRow,
      route: logRoute,
      attribute: breakoutAttribute,
      titlePrefix
    });
    const traceDraft = createSignalDashboardPanelDraftFromRuntimeBreakout({
      row: traceRow,
      route: traceRoute,
      attribute: breakoutAttribute,
      titlePrefix
    });
    expect(logDraft, 'runtime breakout helper should create a logs draft').toBeTruthy();
    expect(traceDraft, 'runtime breakout helper should create a traces draft').toBeTruthy();
    const draftKeys = [
      { signal: 'logs' as const, draftKey: logDraft?.draftKey || '' },
      { signal: 'traces' as const, draftKey: traceDraft?.draftKey || '' }
    ].filter((item): item is { signal: 'logs' | 'traces'; draftKey: string } => Boolean(item.draftKey));

    await authenticate(page);

    try {
      await requestJson<SignalDashboardPanelDraft>(
        page.context().request,
        'PUT',
        '/api/signal/dashboard-panel-draft',
        logDraft
      );
      await requestJson<SignalDashboardPanelDraft>(
        page.context().request,
        'PUT',
        '/api/signal/dashboard-panel-draft',
        traceDraft
      );
      await expect.poll(async () => {
        const logsDrafts = await loadPanelDrafts(page.context().request, 'logs');
        const tracesDrafts = await loadPanelDrafts(page.context().request, 'traces');
        return Boolean(
          logsDrafts.find(item => item.draftKey === logDraft?.draftKey) &&
          tracesDrafts.find(item => item.draftKey === traceDraft?.draftKey)
        );
      }, {
        timeout: WORKBENCH_READY_TIMEOUT
      }).toBe(true);

      const logsDrafts = await loadPanelDrafts(page.context().request, 'logs');
      const tracesDrafts = await loadPanelDrafts(page.context().request, 'traces');
      const savedLogDraft = logsDrafts.find(item => item.draftKey === logDraft?.draftKey);
      const savedTraceDraft = tracesDrafts.find(item => item.draftKey === traceDraft?.draftKey);
      expect(savedLogDraft).toEqual(expect.objectContaining({
        signal: 'logs',
        title: `${titlePrefix}: resource:service.version`,
        description: 'breakout by resource:service.version · 1.2.3',
        visualization: 'list'
      }));
      expect(savedLogDraft?.route).toContain('/log/manage?');
      expect(savedLogDraft?.route).toContain('view=list');
      expect(savedLogDraft?.route).toContain('search=timeout');
      expect(savedLogDraft?.route).toContain('serviceName=checkout');
      expect(savedLogDraft?.route).toContain('environment=prod');
      expect(savedLogDraft?.route).toContain('groupBy=resource%3Aservice.version');
      expect(savedLogDraft?.route).toContain('groupLimit=8');
      expect(savedLogDraft?.route).not.toContain('traceId=');
      expect(savedLogDraft?.route).not.toContain('spanId=');
      expect(parsePayload(savedLogDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-runtime-breakout',
        sourcePanelId: 'runtime-log-panel',
        evidenceRowKey: logRow.key,
        evidenceSource: 'log-row',
        evidenceLabel: 'checkout timeout',
        evidenceValue: '14 logs',
        breakoutAttribute: 'resource:service.version',
        breakoutAttributeValue: '1.2.3'
      }));
      expect(savedTraceDraft).toEqual(expect.objectContaining({
        signal: 'traces',
        title: `${titlePrefix}: resource:service.version`,
        description: 'breakout by resource:service.version · 1.2.3',
        visualization: 'list'
      }));
      expect(savedTraceDraft?.route).toContain('/trace/manage?');
      expect(savedTraceDraft?.route).toContain('view=list');
      expect(savedTraceDraft?.route).toContain('serviceName=checkout');
      expect(savedTraceDraft?.route).toContain('environment=prod');
      expect(savedTraceDraft?.route).toContain('spanScope=all');
      expect(savedTraceDraft?.route).toContain('groupBy=resource%3Aservice.version');
      expect(savedTraceDraft?.route).toContain('groupLimit=8');
      expect(savedTraceDraft?.route).not.toContain('traceId=');
      expect(savedTraceDraft?.route).not.toContain('spanId=');
      expect(parsePayload(savedTraceDraft?.payload)).toEqual(expect.objectContaining({
        source: 'signal-dashboard-runtime-breakout',
        sourcePanelId: 'runtime-trace-panel',
        evidenceRowKey: traceRow.key,
        evidenceSource: 'trace-row',
        evidenceLabel: 'POST /checkout',
        evidenceValue: '9 traces',
        breakoutAttribute: 'resource:service.version',
        breakoutAttributeValue: '1.2.3'
      }));
    } finally {
      for (const draftKey of draftKeys) {
        await page.context().request.delete(
          `${baseUrl}/api/signal/dashboard-panel-draft/${encodeURIComponent(draftKey.signal)}/${encodeURIComponent(draftKey.draftKey)}`,
          { failOnStatusCode: false }
        );
      }
    }
  });

  for (const signalCase of SIGNAL_CASES) {
    test(`persists a ${signalCase.signal} dashboard panel source edit through real backend APIs`, async ({ page }) => {
      test.setTimeout(BROWSER_SMOKE_TIMEOUT);

      const dashboardKey = uniqueDashboardKey(signalCase.signal);
      await authenticate(page);
      await seedDashboard(page.context().request, signalCase, dashboardKey);

      try {
        await page.goto(`${baseUrl}/dashboard?dashboard=${encodeURIComponent(dashboardKey)}&timeRange=last-1h`, {
          timeout: BROWSER_SMOKE_TIMEOUT,
          waitUntil: 'domcontentloaded'
        });

        const previewPanel = page.locator(`[data-dashboard-composition-preview-panel="${signalCase.panelId}"]`).first();
        await expect(previewPanel).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
        await expect(previewPanel).toHaveAttribute('data-dashboard-composition-preview-edit-source', 'none');

        const editAction = page.locator(`[data-dashboard-composition-preview-action-panel="${signalCase.panelId}"]`).first();
        await expect(editAction).toHaveAttribute('href', /intent=edit-panel/);
        await expect(editAction).toHaveAttribute('href', new RegExp(`dashboardKey=${dashboardKey}`));
        await editAction.click();

        await expect(page.locator(signalCase.sourceRouteSelector)).toBeVisible({
          timeout: WORKBENCH_READY_TIMEOUT
        });
        await expect(page.locator(signalCase.fieldSelector)).toBeVisible({
          timeout: WORKBENCH_READY_TIMEOUT
        });

        await signalCase.editField(page);
        await page.locator(signalCase.runSelector).click();
        await expect(page).toHaveURL(signalCase.previewMatcher, {
          timeout: WORKBENCH_READY_TIMEOUT
        });

        await page.locator(signalCase.sourceActionSelector).click();
        await expect(page.locator(`${signalCase.sourceActionSelector.replace('action="update-current"', 'status="saved"')}`))
          .toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });

        const persisted = await loadDashboard(page.context().request, dashboardKey);
        const widget = parseWidgets(persisted).find(item => item.id === signalCase.panelId);
        expect(widget?.route).toContain(signalCase.editedNeedle);
        expect(widget?.draftKey).toBe(signalCase.draftKey);
        expect(JSON.parse(persisted.panelMap)[signalCase.panelId]).toBe(signalCase.draftKey);
        const payload = parsePayload(widget?.payload);
        expect(payload.dashboardPanelEdit).toEqual(expect.objectContaining({
          intent: 'edit-panel',
          dashboardKey,
          panelId: signalCase.panelId,
          draftKey: signalCase.draftKey
        }));

        await page.locator(signalCase.sourceReturnSelector).click();
        const returnedPreviewPanel = page.locator(`[data-dashboard-composition-preview-panel="${signalCase.panelId}"]`).first();
        await expect(returnedPreviewPanel).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
        await expect(returnedPreviewPanel).toHaveAttribute('data-dashboard-composition-preview-route', signalCase.previewMatcher);
        await expect(returnedPreviewPanel).toHaveAttribute('data-dashboard-composition-preview-edit-source', 'edit-panel');
        await expect(returnedPreviewPanel).toHaveAttribute('data-dashboard-composition-preview-edit-source-dashboard', dashboardKey);
      } finally {
        await cleanupDashboard(page.context().request, signalCase, dashboardKey);
      }
    });
  }
});
