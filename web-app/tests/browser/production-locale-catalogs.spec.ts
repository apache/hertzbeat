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

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { captureBrowserFailures, installBackendContract } from './production-browser-support';

test.skip(({ baseURL }) => baseURL !== 'http://127.0.0.1:4289', 'Requires isolated synthetic preview');
for (const locale of ['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'pt-BR']) {
  test(`production shared catalogs render ${locale} without a model or business mutation`, async ({
    page
  }, testInfo) => {
    const catalog = JSON.parse(
      readFileSync(join(__dirname, '../../src/assets/i18n', `${locale.toLowerCase()}.json`), 'utf8')
    );
    const failures = captureBrowserFailures(page);
    const writes: string[] = [];
    page.on('request', request => {
      const path = new URL(request.url()).pathname;
      // Synthetic session renewal is allowed; business mutations remain forbidden.
      if (path.startsWith('/api/') && path !== '/api/ui/session/refresh' && request.method() !== 'GET')
        writes.push(request.url());
    });
    await page.addInitScript(value => localStorage.setItem('hertzbeat.locale', value), locale);
    await installBackendContract(page, { setupComplete: true, authenticated: true });
    await page.route(
      url => url.pathname === '/api/agent/sessions',
      async route => {
        expect(route.request().method()).toBe('GET');
        await route.fulfill({
          json: { code: 0, data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 50 } }
        });
      }
    );
    await page.goto('/ai');
    const tasks = page.getByRole('navigation', { name: catalog.aiWorkspace.sessions.label, exact: true });
    await expect(tasks).toBeVisible();
    await expect(
      tasks.getByRole('searchbox', { name: catalog.aiWorkspace.sessions.search, exact: true })
    ).toBeVisible();
    await expect(tasks.getByRole('button', { name: catalog.aiWorkspace.sessions.new, exact: true })).toBeVisible();
    await expect(
      page.getByRole('region', { name: catalog.aiWorkspace.conversationHistory, exact: true })
    ).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`catalog-${locale}.png`), fullPage: true });
    expect(failures).toEqual([]);
    expect(writes).toEqual([]);
  });
}
