/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { installBackendContract } from './production-browser-support';

test('Passport and Setup have no serious or critical automated accessibility violations', async ({ page }) => {
  await installBackendContract(page, { setupComplete: true, authenticated: false });
  await page.goto('/passport/login');
  await expect(page.getByRole('heading', { level: 2, name: 'Sign in to Apache HertzBeat' })).toBeVisible();
  await expectNoHighImpactAccessibilityViolations(page);

  await page.unrouteAll();
  await installBackendContract(page, {
    setupComplete: false,
    setupPhase: 'administrator_required',
    authenticated: false
  });
  await page.goto('/setup');
  await expect(page.getByRole('heading', { level: 2, name: 'Create the first administrator' })).toBeVisible();
  await expectNoHighImpactAccessibilityViolations(page);
});

test('dense Monitor data and its editor have no serious or critical automated accessibility violations', async ({
  page
}) => {
  await installBackendContract(page, { setupComplete: true, authenticated: true, monitorRows: true });
  await page.goto('/monitors');
  await expect(page.getByRole('row', { name: /checkout-api/u })).toBeVisible();
  await expectNoHighImpactAccessibilityViolations(page);

  await page.goto('/monitors/new');
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
  await expectNoHighImpactAccessibilityViolations(page);
});

test('Topology canvas and selected inspector have no serious or critical automated accessibility violations', async ({
  page
}) => {
  await installBackendContract(page, { setupComplete: true, authenticated: true });
  await page.goto('/topology');
  await expect(page.locator('main canvas').first()).toBeVisible();
  await page.getByRole('row', { name: /checkout-api/u }).click();
  await expect(page.getByRole('heading', { level: 4, name: 'checkout-api' })).toBeVisible();

  await expectNoHighImpactAccessibilityViolations(page);
});

async function expectNoHighImpactAccessibilityViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  const violations = result.violations.filter(violation =>
    violation.impact ? ['serious', 'critical'].includes(violation.impact) : false
  );
  expect(violations).toEqual([]);
}
