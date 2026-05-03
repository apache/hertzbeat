import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, test } from 'playwright/test';
import {
  TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY,
  TRACE_MANAGE_SMOKE_ROUTE,
  TRACE_MANAGE_SMOKE_SERVICE_NAME,
  TRACE_MANAGE_SMOKE_TRACE_START_MS,
  TRACE_MANAGE_SMOKE_TRACE_ID,
  buildTraceManageProtectedRoute,
  buildTraceManageResetExpectedQuery
} from './trace-manage-smoke-lib.mjs';

const baseUrl = process.env.TRACE_MANAGE_BROWSER_BASE_URL || 'http://127.0.0.1:4200';
const traceApiBaseUrl = process.env.TRACE_MANAGE_API_BASE_URL || 'http://127.0.0.1:1157';
const BROWSER_SMOKE_TIMEOUT = 300000;
const WORKBENCH_READY_TIMEOUT = 120000;
const TRACE_SEED_READY_REQUEST_TIMEOUT = 90000;

function hasExpectedQuery(url: URL, expectedQuery: Record<string, string>) {
  return Object.entries(expectedQuery).every(([key, value]) => url.searchParams.get(key) === value);
}

async function acknowledgeDefaultPasswordWarning(page: import('playwright/test').Page) {
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  await expect(page.locator('a[href*="account-modify"]')).toBeVisible();
  await submitButton.click();
}

async function waitForTraceWorkbench(page: import('playwright/test').Page, protectedRoute: string) {
  await waitForTraceWorkbenchWithExpectedQuery(page, protectedRoute, TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY);
}

async function waitForTraceWorkbenchWithExpectedQuery(
  page: import('playwright/test').Page,
  protectedRoute: string,
  expectedQuery: Record<string, string>
) {
  const traceIdInput = page.locator('[data-trace-manage-trace-id-input="true"]');
  const loadFailed = page.getByText('Load failed');

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.waitForURL(
      url => url.pathname === TRACE_MANAGE_SMOKE_ROUTE && hasExpectedQuery(url, expectedQuery),
      {
        timeout: BROWSER_SMOKE_TIMEOUT,
        waitUntil: 'commit'
      }
    );

    try {
      await Promise.race([
        traceIdInput.waitFor({ state: 'visible', timeout: WORKBENCH_READY_TIMEOUT }),
        loadFailed.waitFor({ state: 'visible', timeout: WORKBENCH_READY_TIMEOUT }).then(() => {
          throw new Error('trace workbench load failed');
        })
      ]);
      return;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
      await page.goto(`${baseUrl}${protectedRoute}`, {
        timeout: BROWSER_SMOKE_TIMEOUT,
        waitUntil: 'domcontentloaded'
      });
    }
  }
}

function seedTraceRichDemo() {
  execFileSync(resolve(process.cwd(), '../script/dev/seed-trace-rich-demo.sh'), {
    cwd: resolve(process.cwd(), '..'),
    env: {
      ...process.env,
      TRACE_ID: TRACE_MANAGE_SMOKE_TRACE_ID,
      TRACE_WINDOW_START_MS: TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY.start,
      TRACE_WINDOW_END_MS: TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY.end,
      TRACE_ROOT_START_MS: TRACE_MANAGE_SMOKE_TRACE_START_MS
    },
    stdio: 'pipe'
  });
}

async function currentAccessToken(page: import('playwright/test').Page) {
  return page.evaluate(() => window.localStorage.getItem('Authorization'));
}

async function waitForSeededTraceReadiness(page: import('playwright/test').Page) {
  const token = await currentAccessToken(page);
  expect(token).toBeTruthy();

  const authHeaders = {
    Authorization: `Bearer ${token}`
  };
  const listUrl =
    `${traceApiBaseUrl}/api/traces/list?traceId=${encodeURIComponent(TRACE_MANAGE_SMOKE_TRACE_ID)}`
    + `&serviceName=${encodeURIComponent(TRACE_MANAGE_SMOKE_SERVICE_NAME)}&errorOnly=true&pageIndex=0&pageSize=8`;
  const overviewUrl =
    `${traceApiBaseUrl}/api/traces/stats/overview?traceId=${encodeURIComponent(TRACE_MANAGE_SMOKE_TRACE_ID)}`
    + `&serviceName=${encodeURIComponent(TRACE_MANAGE_SMOKE_SERVICE_NAME)}&errorOnly=true`;

  await expect
    .poll(
      async () => {
        try {
          const listResponse = await fetch(listUrl, {
            headers: authHeaders,
            signal: AbortSignal.timeout(TRACE_SEED_READY_REQUEST_TIMEOUT)
          });
          if (!listResponse.ok) {
            return `list:http:${listResponse.status}`;
          }

          const listMessage = await listResponse.json();
          const traceItems = Array.isArray(listMessage?.data?.content) ? listMessage.data.content : [];
          const listReady = listMessage?.code === 0
            && traceItems.some((item: { traceId?: string | null }) => item?.traceId === TRACE_MANAGE_SMOKE_TRACE_ID);

          if (!listReady) {
            return 'waiting:list';
          }

          const overviewResponse = await fetch(overviewUrl, {
            headers: authHeaders,
            signal: AbortSignal.timeout(TRACE_SEED_READY_REQUEST_TIMEOUT)
          });
          if (!overviewResponse.ok) {
            return `overview:http:${overviewResponse.status}`;
          }

          const overviewMessage = await overviewResponse.json();
          const overviewReady =
            overviewMessage?.code === 0
            && typeof overviewMessage?.data?.totalTraceCount === 'number'
            && overviewMessage.data.totalTraceCount >= 1;

          return overviewReady ? 'ready' : 'waiting:overview';
        } catch (error) {
          return error instanceof Error ? `error:${error.name}` : 'error:unknown';
        }
      },
      {
        timeout: BROWSER_SMOKE_TIMEOUT,
        intervals: [5000, 10000, 15000]
      }
    )
    .toBe('ready');
}

async function loginToProtectedRoute(
  page: import('playwright/test').Page,
  protectedRoute: string,
  options?: {
    waitForSeededTrace?: boolean;
  }
) {
  await page.goto(`${baseUrl}${protectedRoute}`, { waitUntil: 'commit' });
  await page.waitForURL(
    url => url.pathname === '/passport/login' && url.searchParams.get('redirect') === protectedRoute,
    { timeout: BROWSER_SMOKE_TIMEOUT }
  );

  await acknowledgeDefaultPasswordWarning(page);
  await page.waitForFunction(() => Boolean(window.localStorage.getItem('Authorization')), undefined, {
    timeout: BROWSER_SMOKE_TIMEOUT
  });

  if (options?.waitForSeededTrace) {
    await waitForSeededTraceReadiness(page);
  }

  await page.goto(`${baseUrl}${protectedRoute}`, {
    timeout: BROWSER_SMOKE_TIMEOUT,
    waitUntil: 'domcontentloaded'
  });
  await waitForTraceWorkbench(page, protectedRoute);
}

test.describe('trace manage browser smoke', () => {
  test('restores guarded trace deep links and keeps query-state stable across reset/apply', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);

    const protectedRoute = buildTraceManageProtectedRoute();

    await loginToProtectedRoute(page, protectedRoute);

    const traceIdInput = page.locator('[data-trace-manage-trace-id-input="true"]');
    const serviceInput = page.locator('[data-trace-manage-service-input="true"]');
    const statusFilter = page.locator('[data-trace-manage-status-filter="true"]');
    const resetAction = page.locator('[data-trace-manage-reset-action="true"]');
    const searchAction = page.locator('[data-trace-manage-search-action="true"]');

    await expect(traceIdInput).toBeVisible({ timeout: BROWSER_SMOKE_TIMEOUT });
    await expect(traceIdInput).toHaveValue(TRACE_MANAGE_SMOKE_TRACE_ID, { timeout: BROWSER_SMOKE_TIMEOUT });
    await expect(serviceInput).toHaveValue(TRACE_MANAGE_SMOKE_SERVICE_NAME, { timeout: BROWSER_SMOKE_TIMEOUT });
    await expect(statusFilter).toHaveValue('error', { timeout: BROWSER_SMOKE_TIMEOUT });

    await resetAction.click();

    const resetQuery = buildTraceManageResetExpectedQuery();
    await page.waitForURL(url => {
      if (url.pathname !== TRACE_MANAGE_SMOKE_ROUTE) return false;
      if (url.searchParams.get('traceId') !== null) return false;
      if (url.searchParams.get('errorOnly') !== null) return false;
      return Object.entries(resetQuery).every(([key, value]) => url.searchParams.get(key) === value);
    });

    await traceIdInput.fill(TRACE_MANAGE_SMOKE_TRACE_ID);
    await serviceInput.fill(TRACE_MANAGE_SMOKE_SERVICE_NAME);
    await statusFilter.selectOption('error');
    await searchAction.click();

    await page.waitForURL(url => {
      if (url.pathname !== TRACE_MANAGE_SMOKE_ROUTE) return false;
      return Object.entries(TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY).every(([key, value]) => url.searchParams.get(key) === value);
    });
  });

  test('records seeded trace detail and related-log handoff return-path proof on the protected trace route', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);

    seedTraceRichDemo();

    const protectedRoute = buildTraceManageProtectedRoute();
    await loginToProtectedRoute(page, protectedRoute, { waitForSeededTrace: true });

    const traceIdInput = page.locator('[data-trace-manage-trace-id-input="true"]');
    await expect(traceIdInput).toHaveValue(TRACE_MANAGE_SMOKE_TRACE_ID, { timeout: BROWSER_SMOKE_TIMEOUT });

    const openLogsAction = page.locator('[data-trace-manage-open-logs-action="true"]').first();
    await expect(openLogsAction).toBeVisible({ timeout: BROWSER_SMOKE_TIMEOUT });

    const logsHref = await openLogsAction.getAttribute('href');
    expect(logsHref).toBeTruthy();

    const logsUrl = new URL(String(logsHref), baseUrl);
    expect(logsUrl.pathname).toBe('/log/manage');
    expect(logsUrl.searchParams.get('traceId')).toBe(TRACE_MANAGE_SMOKE_TRACE_ID);
    expect(logsUrl.searchParams.get('serviceName')).toBe(TRACE_MANAGE_SMOKE_SERVICE_NAME);

    const handoffSpanId = logsUrl.searchParams.get('spanId');
    expect(handoffSpanId).toBeTruthy();
    expect(logsUrl.searchParams.get('returnLabel')).toBeNull();

    const traceReturnTo = logsUrl.searchParams.get('returnTo');
    expect(traceReturnTo).toBeTruthy();

    const traceReturnUrl = new URL(String(traceReturnTo), baseUrl);
    expect(traceReturnUrl.pathname).toBe(TRACE_MANAGE_SMOKE_ROUTE);
    expect(traceReturnUrl.searchParams.get('traceId')).toBe(TRACE_MANAGE_SMOKE_TRACE_ID);
    expect(traceReturnUrl.searchParams.get('spanId')).toBe(handoffSpanId);
    expect(traceReturnUrl.searchParams.get('serviceName')).toBe(TRACE_MANAGE_SMOKE_SERVICE_NAME);
    expect(traceReturnUrl.searchParams.get('errorOnly')).toBe('true');
    expect(traceReturnUrl.searchParams.get('returnTo')).toBe(TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY.returnTo);
    expect(traceReturnUrl.searchParams.get('returnLabel')).toBeNull();

    await Promise.all([
      page.waitForURL(
        url => url.pathname === '/log/manage' && url.searchParams.get('traceId') === TRACE_MANAGE_SMOKE_TRACE_ID,
        {
          timeout: BROWSER_SMOKE_TIMEOUT,
          waitUntil: 'commit'
        }
      ),
      openLogsAction.click()
    ]);

    const logReturnAction = page.locator('[data-log-manage-return-action="true"]');
    await expect(logReturnAction).toBeVisible({ timeout: BROWSER_SMOKE_TIMEOUT });

    const expectedReturnQuery = Object.fromEntries(traceReturnUrl.searchParams.entries());
    await Promise.all([
      page.waitForURL(
        url => url.pathname === TRACE_MANAGE_SMOKE_ROUTE && hasExpectedQuery(url, expectedReturnQuery),
        {
          timeout: BROWSER_SMOKE_TIMEOUT,
          waitUntil: 'commit'
        }
      ),
      logReturnAction.click()
    ]);

    await waitForTraceWorkbenchWithExpectedQuery(
      page,
      `${traceReturnUrl.pathname}${traceReturnUrl.search}`,
      expectedReturnQuery
    );
    await expect(traceIdInput).toHaveValue(TRACE_MANAGE_SMOKE_TRACE_ID, { timeout: BROWSER_SMOKE_TIMEOUT });
  });
});
