/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { expect, test } from '@playwright/test';

import {
  captureBrowserFailures,
  dropLiveLogStreams,
  emitLiveLogEvent,
  expectBrowserSecretAbsent,
  installBackendContract,
  liveLogRow,
  readLiveLogSseState,
  type BrowserBackend
} from './production-browser-support';

const authenticatedRouteMatrix = [
  '/dashboard',
  '/monitors',
  '/monitors/new',
  '/monitors/7/edit',
  '/monitors/7',
  '/entities',
  '/entities/discovery',
  '/entities/import',
  '/entities/new',
  '/entities/7/edit',
  '/entities/7/definition',
  '/entities/7',
  '/topology',
  '/explore',
  '/observability/integration',
  '/alerts',
  '/alerts/rules',
  '/alerts/rules/new',
  '/alerts/rules/7/edit',
  '/alerts/groups',
  '/alerts/inhibits',
  '/alerts/silences',
  '/alerts/integrations/webhook',
  '/settings/notifications/receivers',
  '/settings/notifications/rules',
  '/settings/notifications/templates',
  '/settings/notifications/channels',
  '/settings/tokens',
  '/settings/collectors',
  '/settings/plugins',
  '/settings/monitor-definitions',
  '/settings/deployment',
  '/settings/system',
  '/settings/labels',
  '/settings/storage/object-store',
  '/settings/status-page',
  '/bulletin',
  '/status',
  '/passport/lock'
] as const;

test('unfinished setup owns product routes before authenticated chunks can mount', async ({ page }) => {
  const failures = captureBrowserFailures(page);
  await installBackendContract(page, { setupComplete: false, authenticated: false });

  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByTestId('dashboard-start')).toHaveCount(0);
  expect(failures).toEqual([]);
});

test('setup credentials retire on refresh and completion closes the setup write surface', async ({ page }) => {
  const failures = captureBrowserFailures(page);
  const backend: BrowserBackend = {
    setupComplete: false,
    setupPhase: 'administrator_required',
    authenticated: false,
    setupAdministratorWrites: 0,
    setupCompletionWrites: 0
  };
  await installBackendContract(page, backend);
  const secret = 'browser-only-setup-secret';

  await page.goto('/setup');
  await expect(page.getByRole('heading', { level: 2, name: 'Create the first administrator' })).toBeVisible();
  await page.locator('#setup-administrator-username').fill('bootstrap-admin');
  await page.locator('#setup-administrator-password').fill(secret);
  await page.locator('#setup-administrator-confirm-password').fill(secret);
  await expectBrowserSecretAbsent(page, secret);

  await page.reload();
  await expect(page.locator('#setup-administrator-password')).toHaveValue('');
  await expect(page.locator('#setup-administrator-confirm-password')).toHaveValue('');
  await expectBrowserSecretAbsent(page, secret);

  await page.locator('#setup-administrator-username').fill('bootstrap-admin');
  await page.locator('#setup-administrator-password').fill(secret);
  await page.locator('#setup-administrator-confirm-password').fill(secret);
  await page.getByRole('button', { name: 'Create administrator' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Optional configuration' })).toBeVisible();
  expect(backend.setupAdministratorWrites).toBe(1);
  await expectBrowserSecretAbsent(page, secret);

  await page.getByRole('button', { name: 'Finish setup' }).click();
  await expect(page).toHaveURL(/\/passport\/login$/u);
  await expect(page.locator('input[autocomplete="username"]')).toHaveValue('bootstrap-admin');
  await expect(page.locator('input[autocomplete="current-password"]')).toHaveValue('');
  expect(backend.setupCompletionWrites).toBe(1);
  await expectBrowserSecretAbsent(page, secret);

  await page.goto('/setup');
  await expect(page).toHaveURL(/\/passport\/login$/u);
  await expect(page.getByRole('heading', { level: 2, name: 'Create the first administrator' })).toHaveCount(0);
  expect(backend.setupAdministratorWrites).toBe(1);
  expect(backend.setupCompletionWrites).toBe(1);
  expect(failures).toEqual([]);
});

test('login reaches Dashboard and a direct lazy Monitor route survives refresh', async ({ page }) => {
  const failures = captureBrowserFailures(page);
  const backend = { setupComplete: true, authenticated: false };
  await installBackendContract(page, backend);

  await page.goto('/passport/login?redirect=%2Fdashboard');
  await page.locator('input[autocomplete="username"]').fill('operator');
  await page.locator('input[autocomplete="current-password"]').fill('test-credential');
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId('dashboard-start')).toBeVisible();

  await page.goto('/monitors');
  await expect(page).toHaveURL(/\/monitors$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Monitors' })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/monitors$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Monitors' })).toBeVisible();
  expect(failures).toEqual([]);
});

test('registered business routes resolve a production page or their explicit admission guard', async ({ page }) => {
  test.setTimeout(120_000);
  const failures = captureBrowserFailures(page);
  await installBackendContract(page, { setupComplete: true, authenticated: true });

  for (const path of authenticatedRouteMatrix) {
    await page.goto(path);
    expect(new URL(page.url()).pathname).toBe(path);
    await expect(page.locator('[data-route-state-frame] [data-state="loading"]')).toHaveCount(0);
    await expect(page.locator('[data-route-state-frame][data-placement="viewport"] [data-state="error"]')).toHaveCount(
      0
    );
  }

  expect(failures).toEqual([]);
});

test('Topology draws with the real G6 runtime and preserves inspection across viewport changes', async ({ page }) => {
  test.setTimeout(60_000);
  const failures = captureBrowserFailures(page);
  const backend = { setupComplete: true, authenticated: true, topologyRequests: 0 };
  await installBackendContract(page, backend);

  await page.goto('/topology');

  await expect(page.getByRole('heading', { level: 2, name: 'Topology' })).toBeVisible();
  const canvas = page.locator('main canvas').first();
  await expect(canvas).toBeVisible();
  await expect(page.getByRole('row', { name: /checkout-api/u })).toBeVisible();

  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByText('120%', { exact: true })).toBeVisible();
  await canvas.evaluate(element => {
    element.setAttribute('data-topology-canvas-proof', 'stable');
  });
  const beforeResize = await canvas.boundingBox();
  expect(beforeResize?.width).toBeGreaterThan(0);
  expect(beforeResize?.height).toBeGreaterThan(0);
  await page.mouse.move(beforeResize!.x + beforeResize!.width / 2, beforeResize!.y + beforeResize!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    beforeResize!.x + beforeResize!.width / 2 + 60,
    beforeResize!.y + beforeResize!.height / 2 + 40
  );
  await page.mouse.up();
  await page.getByRole('row', { name: /checkout-api/u }).click();
  await expect(page).toHaveURL(/nodeId=10/u);
  await expect(page.getByRole('heading', { level: 4, name: 'checkout-api' })).toBeVisible();
  await page.setViewportSize({ width: 1000, height: 800 });
  await expect(page.locator('canvas[data-topology-canvas-proof="stable"]')).toBeVisible();
  await expect(page.getByText('120%', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 4, name: 'checkout-api' })).toBeVisible();
  expect(backend.topologyRequests).toBeLessThanOrEqual(2);
  expect(failures).toEqual([]);
});

test('Explore live logs owns one native stream through pause, reconnect, and scope retirement', async ({ page }) => {
  test.setTimeout(30_000);
  const failures = captureBrowserFailures(page);
  await installBackendContract(page, { setupComplete: true, authenticated: true, liveLogSse: true });

  await page.goto('/explore?signal=logs&timeRange=last-30m&mode=live&serviceName=checkout');

  await expect(page.getByRole('heading', { level: 2, name: 'Observability' })).toBeVisible();
  await expect.poll(async () => (await readLiveLogSseState()).active).toBe(1);
  await expect(page.getByText('Log stream connected')).toBeVisible();
  await emitLiveLogEvent('LOG_EVENT', liveLogRow('checkout ready'));
  await expect(page.getByText('checkout ready')).toBeVisible();

  const stableOpenCount = (await readLiveLogSseState()).opened;
  await page.getByRole('button', { name: 'Refresh' }).click();
  await page.waitForTimeout(200);
  expect((await readLiveLogSseState()).opened).toBe(stableOpenCount);

  await page.getByRole('button', { name: 'Pause and disconnect' }).click();
  await expect.poll(async () => (await readLiveLogSseState()).active).toBe(0);
  await expect(page.getByText('checkout ready')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Pausing disconnects the live stream');

  await page.getByRole('button', { name: 'Resume with a new stream' }).click();
  await expect.poll(async () => (await readLiveLogSseState()).opened).toBe(stableOpenCount + 1);
  await expect.poll(async () => (await readLiveLogSseState()).active).toBe(1);
  await emitLiveLogEvent('LOG_STREAM_GAP', {
    observedAt: 1_787_040_000_000,
    reason: 'queue_overflow',
    droppedCount: 37
  });
  await expect(page.getByRole('alert').filter({ hasText: 'At least 37 log entries were dropped' })).toBeVisible();

  await dropLiveLogStreams();
  await expect.poll(async () => (await readLiveLogSseState()).opened, { timeout: 5_000 }).toBe(stableOpenCount + 2);
  await expect.poll(async () => (await readLiveLogSseState()).active).toBe(1);

  await page.getByPlaceholder('Service name').fill('payments');
  await page.locator('form').getByRole('button', { name: 'Query' }).click();
  await expect(page).toHaveURL(/serviceName=payments/u);
  await expect.poll(async () => (await readLiveLogSseState()).opened).toBe(stableOpenCount + 3);
  const finalState = await readLiveLogSseState();
  expect(finalState.active).toBe(1);
  expect(finalState.paths.at(-1)).toContain('serviceName=payments');
  expect(failures).toEqual([]);
});
