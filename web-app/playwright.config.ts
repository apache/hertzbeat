/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { defineConfig } from '@playwright/test';

const smokePort = process.env.HERTZBEAT_SMOKE_PORT ?? '4289';
const smokeSsePort = process.env.HERTZBEAT_SMOKE_SSE_PORT ?? '4290';
const smokeOrigin = `http://127.0.0.1:${smokePort}`;
const smokeSseOrigin = `http://127.0.0.1:${smokeSsePort}`;

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: 'line',
  use: {
    baseURL: smokeOrigin,
    locale: 'en-US',
    trace: 'retain-on-failure'
  },
  webServer: [
    {
      command: `HERTZBEAT_SMOKE_SSE_PORT=${smokeSsePort} node scripts/browser/live-log-sse-fixture.mjs`,
      url: `${smokeSseOrigin}/health`,
      reuseExistingServer: false,
      timeout: 30_000
    },
    {
      command: `pnpm exec vite preview --host 127.0.0.1 --port ${smokePort} --strictPort`,
      url: smokeOrigin,
      reuseExistingServer: false,
      timeout: 30_000
    }
  ]
});
