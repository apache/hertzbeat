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

import { defineConfig } from '@playwright/test';

// Core workbench proof uses synthetic HTTP responses and a fresh browser profile.
// It intentionally does not depend on the separate live-log SSE fixture.
const origin = 'http://127.0.0.1:4289';
export default defineConfig({
  testDir: './tests/browser',
  testMatch: [
    'production-ai-history.spec.ts',
    'production-session-recovery.spec.ts',
    'production-locale-catalogs.spec.ts'
  ],
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: 'line',
  outputDir: '.tmp/playwright-ai',
  use: { baseURL: origin, locale: 'en-US', trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm exec vite preview --host 127.0.0.1 --port 4289 --strictPort',
    url: origin,
    reuseExistingServer: false,
    timeout: 30_000
  }
});
