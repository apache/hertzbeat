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
const BROWSER_SMOKE_TIMEOUT = 300000;
const WORKBENCH_READY_TIMEOUT = 120000;

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

async function authenticateViaApi(page: import('playwright/test').Page) {
  const response = await fetch(`${baseUrl}/api/account/auth/form`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 0,
      identifier: 'admin',
      credential: 'hertzbeat'
    }),
    signal: AbortSignal.timeout(WORKBENCH_READY_TIMEOUT)
  });
  expect(response.ok).toBe(true);
  const message = await response.json();
  expect(message?.code).toBe(0);
  expect(message?.data?.token).toBeTruthy();

  await page.context().addInitScript(({ token, refreshToken }) => {
    window.localStorage.setItem('Authorization', token);
    if (refreshToken) {
      window.localStorage.setItem('refresh-token', refreshToken);
    }
  }, {
    token: message.data.token,
    refreshToken: message.data.refreshToken
  });
}

function seedThreeSignalDemo(context: ThreeSignalWorkbenchSmokeContext) {
  execFileSync(resolve(process.cwd(), '../script/dev/seed-otlp-three-signal-demo.sh'), {
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
    await expect(page.locator('[data-otlp-metrics-route="otlp-cold-metrics-workbench"]')).toBeVisible({
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
    await expect(page.locator('[data-log-manage-route="otlp-cold-log-workbench"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('[data-log-manage-row-detail-action="true"]').first()).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('[data-log-manage-entity-context="hertzbeat-signal-entity-context"]')).toBeVisible();
    await expectWorkbenchText(page, smokeContext);

    const detailDialog = page.locator('[data-log-stream-detail-dialog="true"]').first();
    if ((await detailDialog.count()) === 0 || !(await detailDialog.isVisible())) {
      await page.locator('[data-log-manage-row-detail-action="true"]').first().click();
      await expect(detailDialog).toBeVisible({ timeout: WORKBENCH_READY_TIMEOUT });
    }
    await page.locator('[data-log-stream-detail-dialog="true"] [data-log-manage-results-open-trace-action="true"]').first().click();
    await expect(page.locator('[data-log-related-trace-dialog="true"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    assertUrlCarries(
      await page.locator('[data-log-related-trace-open-workspace-action="true"]').first().getAttribute('href'),
      '/trace/manage',
      signalQuery
    );

    await page.goto(routeUrl('trace', smokeContext), {
      timeout: BROWSER_SMOKE_TIMEOUT,
      waitUntil: 'domcontentloaded'
    });
    await expect(page.locator('[data-trace-manage-route="otlp-cold-trace-workbench"]')).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
    await expect(page.locator('[data-trace-manage-open-detail-action="side-waterfall-modal"]').first()).toBeVisible({
      timeout: WORKBENCH_READY_TIMEOUT
    });
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
    await expect(spanEventDetail.locator('[data-trace-manage-event-detail-type="span-event"]').first()).toBeVisible();
    await expectWorkbenchText(page, smokeContext);
    assertUrlCarries(
      await page.locator('[data-trace-manage-open-logs-action="true"]').first().getAttribute('href'),
      '/log/manage',
      signalQuery
    );
  });
});
