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
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import type { MetricComposition } from '@/platform/perses/metrics/metric-composition';
import { DashboardMetricComposition } from './dashboard-metric-composition';
vi.mock('@/platform/perses', async original => ({
  ...(await original<typeof import('@/platform/perses')>()),
  HertzBeatMetricTimeSeriesResult: () => <div data-testid="chart" />
}));
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
const series = {
  key: 'a',
  refId: 'a',
  name: 'cpu',
  unit: 'percent',
  labels: { host: 'one' },
  points: [[1788761069000, 2]]
};
const data: MetricComposition = {
  plan: { version: 1, queries: [{ refId: 'a', metric: 'cpu' }], formulas: [] },
  sources: [{ refId: 'a', state: 'ready', series: [series] }],
  formulas: []
};
const query = {
  signal: 'metrics',
  queryKind: 'composition',
  plan: data.plan,
  timeWindow: { from: 1788761069000, to: 1788761091000 }
} as const;
const messages = {
  loading: 'Loading',
  inactive: 'Inactive',
  empty: 'Empty',
  truncated: 'Truncated',
  truncationUnknown: 'Unknown',
  runtimeError: 'Error',
  failures: {
    'perses.query.invalid': 'Invalid',
    'perses.query.permission': 'Forbidden',
    'perses.query.overloaded': 'Overloaded',
    'perses.query.unavailable': 'Unavailable',
    'perses.query.contract': 'Contract'
  }
};
it('distinguishes all-hidden from no numeric outputs without mounting an empty chart', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <DashboardMetricComposition
        query={query}
        outcome={{ state: 'ready', data, truncated: false }}
        view={{ mode: 'chart', hidden: ['a'] }}
        title="CPU"
        messages={messages}
        runtimeIdentity="test"
      />
    </I18nextProvider>
  );
  expect(screen.getByRole('status')).toHaveTextContent(i18n.t('explore.metricComposition.allHidden'));
  expect(screen.queryByTestId('chart')).toBeNull();
});
it('formats samples in the selected timezone and keeps the original timestamp', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <DashboardMetricComposition
        query={query}
        outcome={{ state: 'ready', data, truncated: false }}
        view={{ mode: 'table', hidden: [] }}
        title="CPU"
        messages={messages}
        runtimeIdentity="test"
        timeZone="UTC"
      />
    </I18nextProvider>
  );
  expect(document.querySelector('time')).toHaveTextContent(
    new Date(1788761069000).toLocaleTimeString(undefined, { timeZone: 'UTC' })
  );
  expect(document.querySelector('time')).toHaveAttribute('datetime', new Date(1788761069000).toISOString());
});
it('retains source and formula failure reasons and never charts all-null samples', () => {
  const unavailable: MetricComposition = {
    ...data,
    sources: [{ refId: 'a', state: 'storage_unavailable', series: [] }],
    formulas: [
      {
        id: 'f1',
        expression: 'a / 0',
        state: 'empty',
        reason: 'samples',
        series: [{ ...series, refId: 'f1', allowsGaps: true, points: [[1788761069000, null]] }]
      }
    ]
  };
  render(
    <I18nextProvider i18n={i18n}>
      <DashboardMetricComposition
        query={query}
        outcome={{ state: 'ready', data: unavailable, truncated: false }}
        view={{ mode: 'chart', hidden: [] }}
        title="CPU"
        messages={messages}
        runtimeIdentity="test"
      />
    </I18nextProvider>
  );
  expect(
    screen.getByText(new RegExp(i18n.t('explore.metricComposition.states.storage_unavailable')))
  ).toBeInTheDocument();
  expect(screen.getByText(new RegExp(i18n.t('explore.metricComposition.reasons.samples')))).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(i18n.t('explore.metricComposition.noOutputs'));
  expect(screen.queryByTestId('chart')).toBeNull();
});
