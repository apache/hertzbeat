/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect, test } from '@playwright/test';

import { captureBrowserFailures, installBackendContract } from './production-browser-support';

test('AI history fixture opens its latest page and loads earlier messages without a model call', async ({ page }) => {
  const failures = captureBrowserFailures(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await installBackendContract(page, { setupComplete: true, authenticated: true });
  const requests: number[] = [];
  await page.route('**/api/agent/**', async route => {
    const url = new URL(route.request().url());
    expect(route.request().method()).toBe('GET');
    let data: unknown = null;
    if (url.pathname.endsWith('/sessions')) {
      data = {
        content: [
          {
            id: 1,
            sessionUid: 'fixture-session',
            conversationId: 'fixture-conversation',
            status: 'SUCCEEDED',
            title: 'Long history fixture',
            gmtCreate: null,
            gmtUpdate: null
          }
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 50
      };
    } else if (url.pathname.endsWith('/transcript')) {
      const pageIndex = Number(url.searchParams.get('pageIndex'));
      requests.push(pageIndex);
      expect(url.searchParams.get('pageSize')).toBe('200');
      const content = Array.from({ length: pageIndex === 2 ? 1 : 200 }, (_, index) => {
        const sequence = pageIndex * 200 + index + 1;
        return {
          id: sequence,
          sessionSequence: sequence,
          messageRole: 'user',
          gmtCreate: null,
          payloadJson: JSON.stringify({
            role: 'user',
            content: [{ type: 'text', text: `Fixture message ${sequence}` }]
          })
        };
      });
      data = { content, totalElements: 401, totalPages: 3, number: pageIndex, size: 200 };
    }
    await route.fulfill({ json: { code: 0, data } });
  });
  await page.goto('/ai');
  await page.getByRole('button', { name: /Long history fixture/ }).click();
  await expect(page.getByText('Fixture message 401', { exact: true })).toBeVisible();
  await expect(page.getByText('Fixture message 1', { exact: true })).toHaveCount(0);
  expect(requests).toEqual([0, 2]);
  await page.screenshot({ path: '.tmp/ai-history-latest-fixture.png', fullPage: true });
  await page.getByRole('button', { name: 'Load earlier messages', exact: true }).click();
  await expect(page.getByText('Fixture message 201', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load earlier messages', exact: true }).click();
  await expect(page.getByText('Fixture message 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load earlier messages', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Investigation' }).locator('article')).toHaveCount(401);
  expect(requests).toEqual([0, 2, 1, 0]);
  expect(failures).toEqual([]);
});

test('AI evidence fixture shows bounded context and honest partial coverage without model output', async ({ page }) => {
  const failures = captureBrowserFailures(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await installBackendContract(page, { setupComplete: true, authenticated: true });
  const start = 1760000000000;
  const end = start + 3600000;
  await page.route('**/api/agent/**', async route => {
    expect(route.request().method()).toBe('GET');
    const path = new URL(route.request().url()).pathname;
    let data: unknown = null;
    if (path.endsWith('/sessions'))
      data = {
        content: [
          {
            id: 1,
            sessionUid: 'evidence-fixture',
            conversationId: 'fixture-only',
            status: 'SUCCEEDED',
            title: 'Controlled UI fixture · not a model response',
            gmtCreate: null,
            gmtUpdate: null
          }
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 50
      };
    if (path.endsWith('/transcript')) data = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 200 };
    if (path.endsWith('/latest-run'))
      data = {
        runUid: 'fixture-run',
        sessionUid: 'evidence-fixture',
        messageId: 'fixture-message',
        status: 'SUCCEEDED',
        target: {
          version: 'entity-investigation.v1',
          entityId: 42,
          signal: { type: 'investigation', start, end, timezone: 'UTC' },
          service: { name: 'checkout-api', namespace: 'shop', environment: 'production' },
          authority: { bindingId: 42, version: 'entity-investigation-authority.v1', hash: `sha256:${'a'.repeat(64)}` }
        },
        result: 'Controlled fixture for UI verification. No model was called and no production health claim is made.',
        errorMessage: null,
        replayAvailable: true,
        startedAt: null,
        completedAt: null,
        retryRequest: null,
        evidence: [
          {
            evidenceId: 'entity-fixture',
            runUid: 'fixture-run',
            toolCallId: 'entity-read',
            toolName: 'entity.get',
            signalType: 'entity',
            resourceType: 'entity',
            resourceId: '42',
            start: null,
            end: null,
            observationCount: 1,
            status: 'OBSERVED',
            summary: 'entity-record',
            partial: null
          },
          {
            evidenceId: 'logs-fixture',
            runUid: 'fixture-run',
            toolCallId: 'logs-read',
            toolName: 'logs.query',
            signalType: 'logs',
            resourceType: 'read',
            resourceId: null,
            start,
            end,
            observationCount: 25,
            status: 'OBSERVED',
            summary: 'log-records',
            partial: true
          }
        ]
      };
    await route.fulfill({ json: { code: 0, data } });
  });
  await page.goto(`/ai?source=entityInvestigation&entityId=42&start=${start}&end=${end}&timezone=UTC`);
  const context = page.getByRole('complementary', { name: 'Run context' });
  await expect(context).toBeVisible();
  await expect(context).toContainText('Bounded cross-signal investigation');
  await expect(context).toContainText('UTC');
  await page.screenshot({ path: '.tmp/ai-entity-scope-fixture.png', fullPage: true });
  await page.getByRole('button', { name: /Controlled UI fixture/ }).click();
  await page.getByRole('button', { name: 'Open run details', exact: true }).click();
  await expect(context).toContainText('Partial evidence');
  await expect(context).toContainText('Coverage not reported');
  await expect(context).toContainText('25 observations');
  await expect(context.getByRole('link', { name: 'View source' }).last()).toHaveAttribute('href', '/entities/42');
  await page.screenshot({ path: '.tmp/ai-evidence-partial-fixture.png', fullPage: true });
  expect(failures).toEqual([]);
});
