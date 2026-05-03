import { expect, test } from 'playwright/test';
import {
  MONITOR_SMOKE_HOST,
  MONITOR_SMOKE_PORT,
  MONITOR_SMOKE_URI,
  buildWebsiteMonitorSmokePayload,
  buildWebsiteMonitorSmokeName,
  extractMonitorFromPage
} from './monitor-route-smoke-lib.mjs';

const baseUrl = process.env.MONITOR_ROUTE_BROWSER_BASE_URL || 'http://127.0.0.1:4200';
const createReturnPath = '/monitors?app=website&status=1';
const editReturnPath = '/monitors?app=website&status=2';
const BROWSER_SMOKE_TIMEOUT = 120000;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildLegacyReturnLabelMonitorDetailRoute(monitorId: number | string) {
  return `/monitors/${monitorId}?app=website&returnTo=${encodeURIComponent(
    `${editReturnPath}?returnLabel=Return to smoke`
  )}&returnLabel=${encodeURIComponent('Return to smoke')}`;
}

async function acknowledgeDefaultPasswordWarning(page: import('playwright/test').Page) {
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  await expect(page.locator('a[href*="account-modify"]')).toBeVisible();
  await submitButton.click();
}

async function loginToProtectedRoute(page: import('playwright/test').Page, protectedRoute: string) {
  await page.goto(`${baseUrl}${protectedRoute}`, { waitUntil: 'commit' });
  await page.waitForURL(
    url => {
      return url.pathname === '/passport/login' && url.searchParams.get('redirect') === protectedRoute;
    },
    { timeout: BROWSER_SMOKE_TIMEOUT }
  );

  await acknowledgeDefaultPasswordWarning(page);
  await page.waitForURL(`${baseUrl}${protectedRoute}`, {
    timeout: BROWSER_SMOKE_TIMEOUT,
    waitUntil: 'commit'
  });
}

async function currentAccessToken(page: import('playwright/test').Page) {
  if (page.isClosed()) {
    return null;
  }
  return page.evaluate(() => window.localStorage.getItem('Authorization'));
}

async function findMonitor(page: import('playwright/test').Page, name: string) {
  const token = await currentAccessToken(page);
  expect(token).toBeTruthy();

  const response = await page.request.get(
    `${baseUrl}/api/monitors?pageIndex=0&pageSize=20&app=website&search=${encodeURIComponent(name)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  expect(response.ok()).toBeTruthy();
  const message = await response.json();
  expect(message.code).toBe(0);
  return extractMonitorFromPage(message.data, name);
}

async function deleteCopiedMonitor(page: import('playwright/test').Page, monitorId: number | string | null | undefined) {
  if (monitorId == null) return;
  await deleteMonitor(page, monitorId);
}

async function deleteMonitor(page: import('playwright/test').Page, monitorId: number | string) {
  const token = await currentAccessToken(page);
  if (!token) return;

  try {
    await page.request.delete(`${baseUrl}/api/monitor/${monitorId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      timeout: 15000
    });
  } catch {
    // Best-effort cleanup: do not fail the smoke if the disposable fixture delete stalls.
  }
}

async function createMonitorViaApi(page: import('playwright/test').Page, name: string) {
  const token = await currentAccessToken(page);
  expect(token).toBeTruthy();

  const response = await page.request.post(`${baseUrl}/api/monitor`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    data: buildWebsiteMonitorSmokePayload(name)
  });
  expect(response.ok()).toBeTruthy();
  const message = await response.json();
  expect(message.code).toBe(0);
}

async function clickAndAssertMessageCode(
  page: import('playwright/test').Page,
  trigger: () => Promise<void>,
  matcher: (response: import('playwright/test').Response) => boolean
) {
  const responsePromise = page.waitForResponse(matcher);
  await trigger();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  const message = await response.json();
  expect(message.code).toBe(0);
}

test.describe('monitor route browser smoke', () => {
  test('records create/edit return-path proof with a real browser flow', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);

    const createdIds: Array<number | string> = [];
    const smokeName = buildWebsiteMonitorSmokeName(`browser-${Date.now()}`);
    const editedSmokeName = `${smokeName}-edited`;
    const taskNameInput = page.getByRole('textbox', { name: /Task Name|任务名称/ });
    const hostInput = page.getByRole('textbox', { name: /Target Host|目标Host/ });
    const uriInput = page.getByRole('textbox', { name: /^URI$/ });
    const portInput = page.getByRole('spinbutton', { name: /Port|端口/ });
    const httpsCheckbox = page.getByRole('checkbox', { name: /HTTPS/ });

    try {
      await loginToProtectedRoute(
        page,
        `/monitors/new?app=website&returnTo=${encodeURIComponent(createReturnPath)}`
      );

      await taskNameInput.fill(smokeName);
      await hostInput.fill(MONITOR_SMOKE_HOST);
      await portInput.fill(String(MONITOR_SMOKE_PORT));
      await uriInput.fill(MONITOR_SMOKE_URI);
      if (!(await httpsCheckbox.isChecked())) {
        await httpsCheckbox.check();
      }

      await expect(taskNameInput).toHaveValue(smokeName, { timeout: BROWSER_SMOKE_TIMEOUT });
      await expect(hostInput).toHaveValue(MONITOR_SMOKE_HOST, { timeout: BROWSER_SMOKE_TIMEOUT });
      await expect(portInput).toHaveValue(String(MONITOR_SMOKE_PORT), { timeout: BROWSER_SMOKE_TIMEOUT });
      await expect(uriInput).toHaveValue(MONITOR_SMOKE_URI, { timeout: BROWSER_SMOKE_TIMEOUT });
      await expect(httpsCheckbox).toBeChecked({ timeout: BROWSER_SMOKE_TIMEOUT });

      await clickAndAssertMessageCode(
        page,
        async () => {
          await page.getByRole('button', { name: /Detect|测试/ }).click();
        },
        response => {
          const url = new URL(response.url());
          return url.pathname === '/api/monitor/detect' && response.request().method() === 'POST';
        }
      );

      const createReturnRouteWait = page.waitForURL(`${baseUrl}${createReturnPath}`, {
        timeout: BROWSER_SMOKE_TIMEOUT,
        waitUntil: 'commit'
      });
      await clickAndAssertMessageCode(
        page,
        async () => {
          await page.locator('button[type="submit"]').click();
        },
        response => {
          const url = new URL(response.url());
          return url.pathname === '/api/monitor' && response.request().method() === 'POST';
        }
      );
      await createReturnRouteWait;

      const createdMonitor = await findMonitor(page, smokeName);
      expect(createdMonitor?.id).toBeTruthy();
      createdIds.push(createdMonitor.id);

      const legacyReturnLabelDetailRoute = buildLegacyReturnLabelMonitorDetailRoute(createdMonitor.id);
      await page.goto(`${baseUrl}${legacyReturnLabelDetailRoute}`, { waitUntil: 'commit' });
      const editMonitorLink = page.getByRole('link', { name: /Edit monitor|编辑监控/ });
      await expect(editMonitorLink).toBeVisible({ timeout: BROWSER_SMOKE_TIMEOUT });
      const editRouteWait = page.waitForURL(
        new RegExp(
          `${escapeRegExp(baseUrl)}/monitors/${createdMonitor.id}/edit\\?app=website&returnTo=${escapeRegExp(
            encodeURIComponent(editReturnPath)
          )}`
        ),
        {
          timeout: BROWSER_SMOKE_TIMEOUT,
          waitUntil: 'commit'
        }
      );
      await editMonitorLink.click();
      await editRouteWait;

      await expect(taskNameInput).toHaveValue(smokeName, { timeout: BROWSER_SMOKE_TIMEOUT });
      await expect(hostInput).toHaveValue(MONITOR_SMOKE_HOST, { timeout: BROWSER_SMOKE_TIMEOUT });
      await expect(portInput).toHaveValue(String(MONITOR_SMOKE_PORT), { timeout: BROWSER_SMOKE_TIMEOUT });
      await expect(uriInput).toHaveValue(MONITOR_SMOKE_URI, { timeout: BROWSER_SMOKE_TIMEOUT });
      await expect(httpsCheckbox).toBeChecked({ timeout: BROWSER_SMOKE_TIMEOUT });

      await clickAndAssertMessageCode(
        page,
        async () => {
          await page.getByRole('button', { name: /Detect|测试/ }).click();
        },
        response => {
          const url = new URL(response.url());
          return url.pathname === '/api/monitor/detect' && response.request().method() === 'POST';
        }
      );

      await taskNameInput.fill(editedSmokeName);

      const editSaveReturnWait = page.waitForURL(`${baseUrl}${editReturnPath}`, {
        timeout: BROWSER_SMOKE_TIMEOUT,
        waitUntil: 'commit'
      });
      await clickAndAssertMessageCode(
        page,
        async () => {
          await page.locator('button[type="submit"]').click();
        },
        response => {
          const url = new URL(response.url());
          return url.pathname === '/api/monitor' && response.request().method() === 'PUT';
        }
      );
      await editSaveReturnWait;
      const editedMonitor = await findMonitor(page, editedSmokeName);
      expect(editedMonitor?.id).toBe(createdMonitor.id);
    } finally {
      for (const monitorId of createdIds) {
        await deleteMonitor(page, monitorId);
      }
    }
  });

  test('records shared editor cancel return-path proof on the live edit route', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);

    const createdIds: Array<number | string> = [];
    const smokeName = buildWebsiteMonitorSmokeName(`cancel-${Date.now()}`);

    try {
      await loginToProtectedRoute(page, editReturnPath);
      await createMonitorViaApi(page, smokeName);

      const createdMonitor = await findMonitor(page, smokeName);
      expect(createdMonitor?.id).toBeTruthy();
      createdIds.push(createdMonitor.id);

      const legacyReturnLabelDetailRoute = buildLegacyReturnLabelMonitorDetailRoute(createdMonitor.id);
      await page.goto(`${baseUrl}${legacyReturnLabelDetailRoute}`, { waitUntil: 'commit' });

      const editMonitorLink = page.getByRole('link', { name: /Edit monitor|编辑监控/ });
      await expect(editMonitorLink).toBeVisible({ timeout: BROWSER_SMOKE_TIMEOUT });
      const cancelEditHref = await editMonitorLink.getAttribute('href');
      expect(cancelEditHref).toBe(
        `/monitors/${createdMonitor.id}/edit?app=website&returnTo=${encodeURIComponent(editReturnPath)}`
      );

      const editRouteWait = page.waitForURL(url => url.pathname === `/monitors/${createdMonitor.id}/edit`, {
        timeout: BROWSER_SMOKE_TIMEOUT,
        waitUntil: 'commit'
      });
      await editMonitorLink.click();
      await editRouteWait;

      const cancelEditUrl = new URL(page.url());
      expect(cancelEditUrl.searchParams.get('app')).toBe('website');
      expect(cancelEditUrl.searchParams.get('returnTo')).toBe(editReturnPath);
      expect(cancelEditUrl.searchParams.has('returnLabel')).toBe(false);

      await expect(page.locator('[data-monitor-editor-cancel-action="true"]')).toBeVisible({
        timeout: BROWSER_SMOKE_TIMEOUT
      });
      await page.locator('[data-monitor-editor-cancel-action="true"]').click();
      await expect
        .poll(() => page.url(), { timeout: BROWSER_SMOKE_TIMEOUT })
        .toBe(`${baseUrl}${editReturnPath}`);
    } finally {
      for (const monitorId of createdIds) {
        await deleteMonitor(page, monitorId);
      }
    }
  });

  test('records filtered list -> detail -> list return-path proof with a real browser flow', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);

    const createdIds: Array<number | string> = [];
    const smokeName = buildWebsiteMonitorSmokeName(`list-detail-${Date.now()}`);
    const filteredListRoute = `/monitors?search=${encodeURIComponent(smokeName)}&app=website&pageIndex=0&pageSize=8`;

    try {
      await loginToProtectedRoute(page, filteredListRoute);
      await createMonitorViaApi(page, smokeName);

      const createdMonitor = await findMonitor(page, smokeName);
      expect(createdMonitor?.id).toBeTruthy();
      createdIds.push(createdMonitor.id);

      await page.goto(`${baseUrl}${filteredListRoute}`, { waitUntil: 'commit' });
      await expect(page.locator('[data-monitors-search-input="true"]')).toHaveValue(smokeName, {
        timeout: BROWSER_SMOKE_TIMEOUT
      });
      await expect(page.locator('[data-monitors-app-input="true"]')).toHaveValue('website', {
        timeout: BROWSER_SMOKE_TIMEOUT
      });
      await expect(page.locator('[data-monitors-status-filter="true"]')).toHaveValue('', {
        timeout: BROWSER_SMOKE_TIMEOUT
      });
      await expect(page.locator('[data-monitors-open-detail-action="true"]')).toBeVisible({
        timeout: BROWSER_SMOKE_TIMEOUT
      });

      const detailRouteWait = page.waitForURL(url => url.pathname === `/monitors/${createdMonitor.id}`, {
        timeout: BROWSER_SMOKE_TIMEOUT,
        waitUntil: 'commit'
      });
      await page.locator('[data-monitors-open-detail-action="true"]').click();
      await detailRouteWait;

      const detailUrl = new URL(page.url());
      expect(detailUrl.searchParams.get('app')).toBe('website');

      const detailReturnUrl = new URL(detailUrl.searchParams.get('returnTo') || '', baseUrl);
      expect(detailReturnUrl.pathname).toBe('/monitors');
      expect(detailReturnUrl.searchParams.get('search')).toBe(smokeName);
      expect(detailReturnUrl.searchParams.get('app')).toBe('website');
      expect(detailReturnUrl.searchParams.get('pageIndex')).toBe('0');
      expect(detailReturnUrl.searchParams.get('pageSize')).toBe('8');

      await expect(page.locator('[data-monitor-detail-return-action="true"]')).toBeVisible({
        timeout: BROWSER_SMOKE_TIMEOUT
      });
      await expect(page.locator('[data-monitor-detail-return-action="true"]')).toContainText(/Monitors|监控/, {
        timeout: BROWSER_SMOKE_TIMEOUT
      });
      const filteredListReturnWait = page.waitForURL(
        url => {
          return (
            url.pathname === '/monitors' &&
            url.searchParams.get('search') === smokeName &&
            url.searchParams.get('app') === 'website' &&
            url.searchParams.get('pageIndex') === '0' &&
            url.searchParams.get('pageSize') === '8'
          );
        },
        {
          timeout: BROWSER_SMOKE_TIMEOUT,
          waitUntil: 'commit'
        }
      );
      await page.locator('[data-monitor-detail-return-action="true"]').click();
      await filteredListReturnWait;
    } finally {
      for (const monitorId of createdIds) {
        await deleteMonitor(page, monitorId);
      }
    }
  });

  test('records representative single-item and bulk list-action coverage on a seeded row', async ({ page }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);

    const createdIds: Array<number | string> = [];
    const smokeName = buildWebsiteMonitorSmokeName(`list-actions-${Date.now()}`);
    const filteredListRoute = `/monitors?search=${encodeURIComponent(smokeName)}&app=website&pageIndex=0&pageSize=8`;

    try {
      await loginToProtectedRoute(page, filteredListRoute);
      await createMonitorViaApi(page, smokeName);

      const createdMonitor = await findMonitor(page, smokeName);
      expect(createdMonitor?.id).toBeTruthy();
      createdIds.push(createdMonitor.id);

      await page.goto(`${baseUrl}${filteredListRoute}`, { waitUntil: 'commit' });
      await expect(page.locator('[data-monitors-search-input="true"]')).toHaveValue(smokeName, {
        timeout: BROWSER_SMOKE_TIMEOUT
      });

      await expect(page.locator('[data-monitors-copy-action="true"]')).toBeVisible({
        timeout: BROWSER_SMOKE_TIMEOUT
      });
      const copyResponsePromise = page.waitForResponse(response => {
        const url = new URL(response.url());
        return url.pathname === `/api/monitor/copy/${createdMonitor.id}` && response.request().method() === 'POST';
      });
      await page.locator('[data-monitors-copy-action="true"]').click();
      const copyResponse = await copyResponsePromise;
      expect(copyResponse.ok()).toBeTruthy();
      const copyPayload = await copyResponse.json();
      expect(copyPayload.code ?? 0).toBe(0);
      const copiedId = copyPayload?.data?.id ?? copyPayload?.id ?? null;
      if (copiedId != null) {
        createdIds.push(copiedId);
      }

      const rowSelect = page.locator(`[data-monitors-row-select="${createdMonitor.id}"]`);
      await expect(rowSelect).toBeVisible({ timeout: BROWSER_SMOKE_TIMEOUT });
      await rowSelect.check();

      const pauseSelectedResponsePromise = page.waitForResponse(response => {
        const url = new URL(response.url());
        return (
          url.pathname === '/api/monitors/manage' &&
          url.searchParams.getAll('ids').includes(String(createdMonitor.id)) &&
          url.searchParams.get('type') === 'JSON' &&
          response.request().method() === 'DELETE'
        );
      });
      await page.locator('[data-monitors-pause-selected-action="true"]').click();
      const pauseSelectedResponse = await pauseSelectedResponsePromise;
      expect(pauseSelectedResponse.ok()).toBeTruthy();
      const pauseSelectedPayload = await pauseSelectedResponse.json();
      expect(pauseSelectedPayload.code ?? 0).toBe(0);
    } finally {
      for (const monitorId of createdIds) {
        await deleteCopiedMonitor(page, monitorId);
      }
    }
  });
});
