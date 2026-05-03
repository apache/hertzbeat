import { expect, test } from 'playwright/test';
import { buildWebsiteMonitorSmokePayload, extractMonitorFromPage } from './monitor-route-smoke-lib.mjs';

const baseUrl = process.env.ENTITY_EDITOR_BROWSER_BASE_URL || 'http://127.0.0.1:4200';
const BROWSER_SMOKE_TIMEOUT = 300000;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function acknowledgeDefaultPasswordWarning(page: import('playwright/test').Page) {
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  await expect(page.locator('a[href*="account-modify"]')).toBeVisible();
  await submitButton.click();
}

async function loginToProtectedRoute(page: import('playwright/test').Page, protectedRoute: string) {
  const pendingNavigation = page.goto(`${baseUrl}${protectedRoute}`, { waitUntil: 'commit' }).catch(error => {
    if (error instanceof Error && error.message.includes('ERR_ABORTED')) {
      return null;
    }
    throw error;
  });
  await page.waitForURL(
    url => url.pathname === '/passport/login' && url.searchParams.get('redirect') === protectedRoute,
    { timeout: BROWSER_SMOKE_TIMEOUT }
  );
  await pendingNavigation;

  await acknowledgeDefaultPasswordWarning(page);
  await page.waitForURL(`${baseUrl}${protectedRoute}`, {
    timeout: BROWSER_SMOKE_TIMEOUT,
    waitUntil: 'commit'
  });
}

async function currentAccessToken(page: import('playwright/test').Page) {
  return page.evaluate(() => window.localStorage.getItem('Authorization'));
}

async function requestJson(
  request: import('playwright/test').APIRequestContext,
  path: string,
  token: string,
  options: Parameters<import('playwright/test').APIRequestContext['fetch']>[1] = {}
) {
  const response = await request.fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  expect(response.ok()).toBeTruthy();
  const message = await response.json();
  expect(message.code).toBe(0);
  return message.data;
}

async function createDiscoveryMonitor(
  request: import('playwright/test').APIRequestContext,
  token: string,
  name: string
) {
  const payload = buildWebsiteMonitorSmokePayload(name);

  await requestJson(request, '/api/monitor/detect', token, {
    method: 'POST',
    data: payload
  });
  await requestJson(request, '/api/monitor', token, {
    method: 'POST',
    data: payload
  });

  const pageData = await requestJson(
    request,
    `/api/monitors?pageIndex=0&pageSize=20&search=${encodeURIComponent(name)}`,
    token
  );
  const monitor = extractMonitorFromPage(pageData, name);
  expect(monitor?.id).toBeTruthy();
  return monitor;
}

async function deleteEntity(
  request: import('playwright/test').APIRequestContext,
  token: string,
  entityId: number | string | null | undefined
) {
  if (entityId == null) {
    return;
  }
  try {
    await requestJson(request, `/api/entities/${entityId}`, token, {
      method: 'DELETE'
    });
  } catch {}
}

async function deleteMonitor(
  request: import('playwright/test').APIRequestContext,
  token: string,
  monitorId: number | string | null | undefined
) {
  if (monitorId == null) {
    return;
  }
  try {
    await requestJson(request, `/api/monitor/${monitorId}`, token, {
      method: 'DELETE'
    });
  } catch {}
}

test.describe('entity editor browser smoke', () => {
  test('records discovery handoff, direct auth recovery, telemetry evidence, and staged workflow proof across new/edit', async ({ page, request }) => {
    test.setTimeout(BROWSER_SMOKE_TIMEOUT);

    const seed = Date.now();
    const discoveryMonitorName = `codex-entity-discovery-${seed}`;
    const createdEntityName = `codex-entity-${seed}`;
    const editedDisplayName = `Codex Entity ${seed} Edited`;
    let accessToken: string | null = null;
    let createdMonitorId: number | string | null = null;
    let createdEntityId: number | string | null = null;

    try {
      await loginToProtectedRoute(page, '/entities/discovery');
      accessToken = await currentAccessToken(page);
      expect(accessToken).toBeTruthy();

      const discoveryMonitor = await createDiscoveryMonitor(request, accessToken as string, discoveryMonitorName);
      createdMonitorId = discoveryMonitor.id;

      const searchInput = page.getByPlaceholder(/Search monitor(?:s)? by name or instance|按名称或实例搜索监控/);
      await searchInput.fill(discoveryMonitorName);
      await page.getByRole('button', { name: /Search|搜索/ }).first().click();

      const discoveryLink = page.locator(`a[href="/entities/new?source=telemetry&monitorId=${discoveryMonitor.id}"]`).first();
      await expect(discoveryLink).toBeVisible();
      await discoveryLink.click();

      const newRoute = `/entities/new?source=telemetry&monitorId=${discoveryMonitor.id}`;
      await page.waitForURL(
        new RegExp(`${escapeRegExp(baseUrl)}${escapeRegExp(newRoute)}`),
        {
          timeout: BROWSER_SMOKE_TIMEOUT,
          waitUntil: 'commit'
        }
      );

      await page.evaluate(() => {
        window.localStorage.removeItem('Authorization');
        window.localStorage.removeItem('refresh-token');
      });
      await loginToProtectedRoute(page, newRoute);

      const telemetryDiscoveryLink = page
        .locator(`a[href="/entities/discovery?source=telemetry&monitorId=${discoveryMonitor.id}"]`)
        .last();
      await expect(telemetryDiscoveryLink).toBeVisible({ timeout: BROWSER_SMOKE_TIMEOUT });
      await expect(page.getByRole('button', { name: /Evidence|证据关联/ })).toBeVisible({
        timeout: BROWSER_SMOKE_TIMEOUT
      });
      await expect(page.getByRole('button', { name: /Relationships|关系信息/ })).toBeVisible({
        timeout: BROWSER_SMOKE_TIMEOUT
      });

      const nameInput = page.getByRole('textbox', { name: /^Name$|^名称$/ });
      const displayNameInput = page.getByRole('textbox', { name: /^Display Name$|^显示名称$/ });
      const sourceInput = page.getByRole('textbox', { name: /^Source$|^来源$/ });

      await expect(nameInput).toHaveValue('example.com:443', { timeout: BROWSER_SMOKE_TIMEOUT });
      await expect(displayNameInput).toHaveValue(discoveryMonitorName, { timeout: BROWSER_SMOKE_TIMEOUT });
      await expect(sourceInput).toHaveValue('otel_resource', { timeout: BROWSER_SMOKE_TIMEOUT });

      await page.getByRole('button', { name: /Evidence|证据关联/ }).click();
      await expect(page.locator('[data-entity-editor-stage="signals"]')).toBeVisible();

      await nameInput.fill(createdEntityName);
      await displayNameInput.fill(`Codex Entity ${seed}`);

      const createResponsePromise = page.waitForResponse(response => {
        const url = new URL(response.url());
        return url.pathname === '/api/entities' && response.request().method() === 'POST';
      });
      await page.locator('button[type="submit"]').click();
      const createResponse = await createResponsePromise;
      expect(createResponse.ok()).toBeTruthy();
      const createMessage = await createResponse.json();
      expect(createMessage.code).toBe(0);
      createdEntityId = createMessage.data;
      expect(createdEntityId).toBeTruthy();

      const editRoute = `/entities/${createdEntityId}/edit`;

      await page.goto(`${baseUrl}${editRoute}`, {
        waitUntil: 'commit'
      });
      await page.evaluate(() => {
        window.localStorage.removeItem('Authorization');
        window.localStorage.removeItem('refresh-token');
      });
      await loginToProtectedRoute(page, editRoute);

      await expect(telemetryDiscoveryLink).toBeVisible({ timeout: BROWSER_SMOKE_TIMEOUT });
      await expect(page.getByRole('button', { name: /Relationships|关系信息/ })).toBeVisible({
        timeout: BROWSER_SMOKE_TIMEOUT
      });
      await expect(nameInput).toHaveValue(createdEntityName, { timeout: BROWSER_SMOKE_TIMEOUT });
      await expect(sourceInput).toHaveValue('otel_resource', { timeout: BROWSER_SMOKE_TIMEOUT });

      await page.getByRole('button', { name: /Relationships|关系信息|Relationships/ }).click();
      await displayNameInput.fill(editedDisplayName);

      const updateResponsePromise = page.waitForResponse(response => {
        const url = new URL(response.url());
        return url.pathname === '/api/entities' && response.request().method() === 'PUT';
      });
      await page.locator('button[type="submit"]').click();
      const updateResponse = await updateResponsePromise;
      expect(updateResponse.ok()).toBeTruthy();
      const updateMessage = await updateResponse.json();
      expect(updateMessage.code).toBe(0);
    } finally {
      if (accessToken) {
        await deleteEntity(request, accessToken, createdEntityId);
        await deleteMonitor(request, accessToken, createdMonitorId);
      }
    }
  });
});
