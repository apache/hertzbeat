/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { expect, test, type Page } from '@playwright/test';

import { installBackendContract } from './production-browser-support';

const authenticated = {
  authenticated: true,
  username: 'synthetic-recovery-operator',
  roles: ['ADMIN'],
  workspaceId: 'default',
  expiresAt: '2030-01-01T00:00:00Z'
};
const anonymous = { authenticated: false, username: null, roles: [], workspaceId: null, expiresAt: null };

type SyntheticSession = { access: boolean; refreshValid: boolean; refreshes: number };

async function installSession(page: Page, session: SyntheticSession) {
  await installBackendContract(page, { setupComplete: true, authenticated: true });
  // Entire auth exchange is a synthetic HTTP contract in a fresh browser
  // context. No runtime login, real cookies, or credential inspection occurs.
  await page.route('**/api/ui/session**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/api/ui/session/refresh') {
      session.refreshes += 1;
      session.access = session.refreshValid;
      await route.fulfill({
        json: {
          code: session.refreshValid ? 0 : -1,
          msg: null,
          data: session.refreshValid ? authenticated : null
        }
      });
      return;
    }
    await route.fulfill({ json: { code: 0, msg: null, data: session.access ? authenticated : anonymous } });
  });
}

test('production bootstrap restores synthetic retained refresh without visiting login', async ({ page }) => {
  const session = { access: false, refreshValid: true, refreshes: 0 };
  await installSession(page, session);
  await page.goto('/monitors');
  await expect(page).toHaveURL(/\/monitors$/u);
  await expect(page.getByText(authenticated.username, { exact: true })).toBeVisible();
  expect(session.refreshes).toBe(1);
});

test('production foreground restores synthetic access loss without an expiry timer firing', async ({ page }) => {
  const session = { access: true, refreshValid: true, refreshes: 0 };
  await installSession(page, session);
  await page.goto('/monitors');
  await expect(page.getByText(authenticated.username, { exact: true })).toBeVisible();
  expect(session.refreshes).toBe(0);
  session.access = false;
  await page.evaluate("window.dispatchEvent(new Event('focus'))");
  await expect.poll(() => session.refreshes).toBe(1);
  await expect(page).toHaveURL(/\/monitors$/u);
  await expect(page.getByText(authenticated.username, { exact: true })).toBeVisible();
});

test('production rejected refresh returns to login after one attempt', async ({ page }) => {
  const session = { access: false, refreshValid: false, refreshes: 0 };
  await installSession(page, session);
  await page.goto('/monitors');
  await expect(page).toHaveURL(/\/passport\/login(?:\?.*)?$/u);
  expect(session.refreshes).toBe(1);
  await page.evaluate("window.dispatchEvent(new Event('focus'))");
  expect(session.refreshes).toBe(1);
});

test('production contended Web Lock fails within admission budget and retry recovers after release', async ({
  page,
  context
}, testInfo) => {
  const holder = await context.newPage();
  await installSession(holder, { access: true, refreshValid: true, refreshes: 0 });
  await holder.goto('/monitors');
  await expect(holder.getByText(authenticated.username, { exact: true })).toBeVisible();
  try {
    await holder.evaluate(`
      window.__syntheticSessionLockHeld = false;
      void navigator.locks.request('hertzbeat-ui-session-mutation', () => {
        window.__syntheticSessionLockHeld = true;
        return new Promise(() => {});
      });
    `);
    await expect.poll(() => holder.evaluate('window.__syntheticSessionLockHeld === true')).toBe(true);
    await page.clock.install();
    const session = { access: false, refreshValid: true, refreshes: 0 };
    let sessionRequests = 0;
    page.on('request', request => {
      if (new URL(request.url()).pathname.startsWith('/api/ui/session')) sessionRequests += 1;
    });
    await installSession(page, session);
    await page.goto('/monitors');
    await expect
      .poll(() => page.evaluate<boolean>('navigator.locks.query().then(state => state.pending.length > 0)'))
      .toBe(true);
    await page.clock.runFor(30_001);
    await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
    expect(sessionRequests).toBe(0);
    await page.screenshot({ path: testInfo.outputPath('contended-session-unavailable.png') });
    await holder.close();
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByText(authenticated.username, { exact: true })).toBeVisible();
    expect(session.refreshes).toBe(1);
  } finally {
    if (!holder.isClosed()) await holder.close();
  }
});
