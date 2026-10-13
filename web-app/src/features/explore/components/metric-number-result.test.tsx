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

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import en from '@/assets/i18n/explore/en-us.json';
import type { MetricConsole } from '../model/explore-signal-contract';
import type { MetricSeries } from '@/platform/perses';
import { MetricNumberResult } from './metric-number-result';
import { MetricReadyResult } from './metric-ready-result';
const copy = en.explore.metricNumber;
const data: MetricConsole = {
  context: null,
  query: 'returned-query',
  datasource: 'fixture',
  queryMode: 'range',
  results: null,
  stats: null,
  emptyStateReason: null,
  errorMessage: null
};
const series: MetricSeries[] = [
  {
    key: 'cpu1',
    refId: 'a',
    name: 'cpu',
    unit: 's',
    labels: { host: 'one' },
    points: Array.from({ length: 151 }, (_, i) => [i + 1, i + 1])
  },
  { key: 'cpu2', refId: 'b', name: 'cpu', unit: 'bytes', labels: { host: 'two' }, points: [[1, 9]] },
  { key: 'f1', refId: 'f1', name: 'f1', allowsGaps: true, labels: { host: 'gap' }, points: [[1, null]] }
];
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
function show(
  metricView = JSON.stringify({ mode: 'number', hidden: ['b'], numberCalculation: 'sum' }),
  items = series
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MetricReadyResult
        {...{
          data,
          series: items,
          query: { signal: 'metrics', timeRange: 'last-30m', metricView },
          timeWindow: { from: 1, to: 200 },
          revision: 1,
          t: i18n.t.bind(i18n),
          onViewChange: vi.fn()
        }}
      />
    </I18nextProvider>
  );
}
it('shows every visible series independently, all returned points and an honest gap card', () => {
  show();
  const region = screen.getByRole('region', { name: copy.title });
  expect(within(region).getAllByRole('article')).toHaveLength(2);
  expect(within(region).getByText('11476')).toHaveAttribute('title', '11476');
  expect(within(region).getByText('host=one')).toBeVisible();
  expect(within(region).queryByText('host=two')).toBeNull();
  expect(within(region).getByText(copy.noData)).toBeVisible();
  expect(within(region).getByText('s')).toBeVisible();
  const details = within(region).getByText(copy.sampleSemantics).closest('details');
  expect(details).not.toHaveAttribute('open');
});
it('keeps mixed and unknown units separate and does not infer units for counts', () => {
  show(JSON.stringify({ mode: 'number', hidden: [], numberCalculation: 'latest' }), [
    ...series.slice(0, 2),
    { ...series[1]!, key: 'unknown', name: 'unknown', unit: undefined }
  ]);
  const region = screen.getByRole('region', { name: copy.title });
  expect(within(region).getAllByRole('article')).toHaveLength(3);
  expect(within(region).getByText('bytes')).toBeVisible();
  expect(within(region).getByText('s')).toBeVisible();
  cleanup();
  show(JSON.stringify({ mode: 'number', hidden: [], numberCalculation: 'count' }));
  expect(within(screen.getByRole('region', { name: copy.title })).queryByText('bytes')).toBeNull();
});
it('retains invalid view recovery and all-hidden state without mounting number cards', () => {
  show('{"mode":"number","hidden":[],"numberCalculation":"median"}');
  expect(screen.getByRole('alert')).toHaveTextContent(en.explore.metricComposition.invalidView);
  cleanup();
  show(JSON.stringify({ mode: 'number', hidden: ['a', 'b', 'f1'] }));
  expect(screen.queryAllByRole('article')).toHaveLength(0);
});
it.each(['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'pt-BR'] as const)('resolves number copy in %s', async locale => {
  await loadLocale(locale);
  for (const key of Object.keys(copy))
    expect(i18n.getResource(locale, 'translation', 'explore.metricNumber.' + key)).toEqual(expect.any(String));
  await loadLocale('en-US');
});

it.each(['latest', 'count', 'sum', 'avg'] as const)(
  'distinguishes zero, gaps and overflow in %s cards',
  calculation => {
    const items: MetricSeries[] = [
      { key: 'zero', name: 'actual-zero', labels: {}, points: [[1, 0]], unit: 's' },
      { key: 'gap', name: 'all-gap', labels: {}, points: [[1, null]], allowsGaps: true },
      {
        key: 'overflow',
        name: 'large-finite',
        labels: {},
        points: [
          [1, 1e308],
          [2, 1e308]
        ],
        unit: 's'
      }
    ];
    render(
      <I18nextProvider i18n={i18n}>
        <MetricNumberResult series={items} calculation={calculation} t={i18n.t.bind(i18n)} />
      </I18nextProvider>
    );
    const cards = screen.getAllByRole('article');
    expect(within(cards[0]!).getByText(calculation === 'count' ? '1' : '0', { selector: 'strong' })).toBeVisible();
    expect(within(cards[1]!).getByRole('status')).toHaveTextContent(copy.noData);
    expect(within(cards[1]!).queryByText('0', { selector: 'strong' })).toBeNull();
    if (calculation === 'sum') {
      expect(within(cards[2]!).getByRole('status')).toHaveTextContent(copy.unavailable);
      expect(within(cards[2]!).getByText(i18n.t('explore.metricNumber.sampleCount', { count: 2 }))).toBeVisible();
    } else expect(within(cards[2]!).getByLabelText(calculation === 'count' ? '2' : '1e+308')).toBeVisible();
  }
);
