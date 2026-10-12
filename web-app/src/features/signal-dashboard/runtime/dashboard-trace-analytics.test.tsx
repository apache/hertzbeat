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

import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { render as baseRender, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { DashboardTraceAnalytics } from './dashboard-trace-analytics';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
const render = (node: ReactNode) =>
  baseRender(node, { wrapper: ({ children }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider> });
const window = { start: 1000, end: 2000, endExclusive: true };
const coverage = { mode: 'bounded' as const, rowLimit: 5000, scannedRows: 5000, truncated: true };
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
  await i18n.changeLanguage('en-US');
});
afterEach(cleanup);
it('renders real group counts with explicit population, coverage and multiple membership', () => {
  render(
    <DashboardTraceAnalytics
      kind="trace-groups"
      outcome={{
        state: 'ready',
        truncated: true,
        data: {
          state: 'ready',
          window,
          population: 'matched_traces',
          coverage,
          data: {
            groupBy: 'serviceName',
            membership: 'multiple',
            groups: [{ value: 'checkout', count: 3, errorCount: 1 }],
            totalCount: 3,
            orderBy: 'count-desc',
            truncated: true
          }
        }
      }}
    />
  );
  expect(screen.getByRole('table')).toHaveTextContent('checkout');
  expect(screen.getByText(i18n.t('exploreTrace.analytics.matched_traces'))).toBeVisible();
  expect(screen.getByText(i18n.t('exploreTrace.analytics.membership'))).toBeVisible();
  expect(screen.getByText(i18n.t('exploreTrace.analytics.topValues'))).toBeVisible();
});

it('keeps unavailable evidence distinct from empty results', () => {
  const { rerender } = render(
    <DashboardTraceAnalytics
      kind="trace-spans"
      outcome={{
        state: 'ready',
        truncated: 'unknown',
        data: { state: 'unavailable', window, population: 'matched_spans', coverage: null, data: null }
      }}
    />
  );
  expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('exploreTrace.analytics.unavailable'));
  expect(screen.queryByRole('table')).toBeNull();
  rerender(<DashboardTraceAnalytics kind="trace-spans" outcome={{ state: 'empty', truncated: false }} />);
  expect(screen.getByRole('status')).toHaveTextContent(i18n.t('exploreTrace.analytics.empty'));
});
it('retains typed permission errors without calling them storage failures', () => {
  render(
    <DashboardTraceAnalytics
      kind="trace-groups"
      outcome={{
        state: 'error',
        error: { kind: 'permission', messageKey: 'perses.query.permission', retryable: false }
      }}
    />
  );
  expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('perses.query.permission'));
});

it('renders actual spans with unknown duration and explicit page subset', () => {
  render(
    <DashboardTraceAnalytics
      kind="trace-spans"
      display={{ columns: ['traceName', 'duration', 'startTime'], density: 'comfortable' }}
      timeZone="UTC"
      outcome={{
        state: 'ready',
        truncated: false,
        data: {
          state: 'ready',
          window,
          population: 'matched_spans',
          coverage: { mode: 'window', rowLimit: null, scannedRows: null, truncated: false },
          data: {
            content: [
              {
                traceId: 'a'.repeat(32),
                spanId: 'b'.repeat(16),
                parentSpanId: null,
                serviceName: 'checkout',
                serviceNamespace: null,
                environment: null,
                operationName: 'GET /checkout',
                spanKind: 'SERVER',
                status: 'UNSET',
                startTimeUnixNano: '1000000001',
                durationNanos: null
              }
            ],
            totalElements: 2,
            pageIndex: 0,
            pageSize: 1,
            sort: 'newest'
          }
        }
      }}
    />
  );
  expect(screen.getByRole('table')).toHaveAttribute('data-density', 'comfortable');
  expect(screen.getByText('GET /checkout')).toBeVisible();
  expect(screen.getByText('—')).toBeVisible();
  expect(screen.getByText(i18n.t('exploreTrace.analytics.pageSubset', { shown: 1, total: 2 }))).toBeVisible();
  expect(document.querySelector('time')).toHaveAttribute('datetime', '1970-01-01T00:00:01.000000001Z');
  expect(screen.queryByText(i18n.t('exploreTrace.analytics.truncated'))).toBeNull();
});
