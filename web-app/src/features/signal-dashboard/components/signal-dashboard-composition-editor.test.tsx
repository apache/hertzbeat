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
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import type { MetricPlan } from '@/platform/perses/metrics/metric-plan';
import { DashboardCompositionEditor } from './signal-dashboard-composition-editor';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it('edits imported source conditions without mutating the source or losing formulas', () => {
  const plan: MetricPlan = {
    version: 1,
    queries: [
      {
        refId: 'a',
        metric: 'cpu',
        metricFilter: 'host="one"',
        groupBy: 'host',
        step: '60',
        aggregation: 'avg',
        temporalAggregation: 'rate'
      }
    ],
    formulas: [{ id: 'f1', expression: 'a * 2' }]
  };
  const onChange = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <DashboardCompositionEditor plan={plan} onChange={onChange} disabled={false} />
    </I18nextProvider>
  );
  fireEvent.change(screen.getByLabelText(`a ${i18n.t('exploreMetric.groupBy')}`), { target: { value: 'zone' } });
  expect(onChange.mock.calls[0]?.[0].queries[0]).toEqual({ ...plan.queries[0], groupBy: 'zone' });
  expect(plan.queries[0]?.groupBy).toBe('host');
  expect(onChange.mock.calls[0]?.[0].formulas).toEqual(plan.formulas);
  expect(screen.getByDisplayValue('host="one"')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.metricComposition.addFormula') }));
  expect(onChange.mock.calls.at(-1)?.[0].formulas).toHaveLength(2);
});
it('keeps the last source and shows broken references after a source is removed', () => {
  const plan: MetricPlan = {
    version: 1,
    queries: [{ refId: 'a', metric: 'cpu' }],
    formulas: [{ id: 'f1', expression: 'a + b' }]
  };
  render(
    <I18nextProvider i18n={i18n}>
      <DashboardCompositionEditor plan={plan} onChange={vi.fn()} disabled={false} />
    </I18nextProvider>
  );
  expect(
    screen.getByRole('button', { name: i18n.t('explore.metricComposition.removeQuery', { ref: 'a' }) })
  ).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent(
    i18n.t('explore.metricComposition.errors.reference', { reference: 'b' })
  );
});

it('keeps the imported historical comparison visible in dashboard authoring', () => {
  const plan: MetricPlan = {
    version: 1,
    queries: [{ refId: 'a', metric: 'cpu', timeShiftSeconds: 3600 }],
    formulas: []
  };
  render(
    <I18nextProvider i18n={i18n}>
      <DashboardCompositionEditor plan={plan} onChange={vi.fn()} disabled={false} />
    </I18nextProvider>
  );
  expect(screen.getByRole('combobox', { name: `a ${i18n.t('exploreMetric.timeShiftSeconds')}` })).toBeInTheDocument();
  expect(screen.getByText('1 h')).toBeInTheDocument();
});

it('shows an imported rollup beside its matching query step', () => {
  const plan: MetricPlan = {
    version: 1,
    queries: [{ refId: 'a', metric: 'cpu', step: '300', rollup: { aggregation: 'avg', intervalSeconds: 300 } }],
    formulas: []
  };
  render(
    <I18nextProvider i18n={i18n}>
      <DashboardCompositionEditor plan={plan} onChange={vi.fn()} disabled={false} />
    </I18nextProvider>
  );
  expect(screen.getByRole('combobox', { name: `a ${i18n.t('exploreMetric.rollup')}` })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: `a ${i18n.t('exploreMetric.rollupWindow')}` })).toBeInTheDocument();
  expect(screen.getByDisplayValue('300')).toBeInTheDocument();
});
it('reopens a nested time stage with the outer step in dashboard authoring', () => {
  const plan: MetricPlan = {
    version: 1,
    queries: [
      {
        refId: 'a',
        metric: 'cpu',
        step: '1800',
        rollup: { aggregation: 'avg', intervalSeconds: 300 },
        nestedRollup: { aggregation: 'max', intervalSeconds: 1800 }
      }
    ],
    formulas: []
  };
  render(
    <I18nextProvider i18n={i18n}>
      <DashboardCompositionEditor plan={plan} onChange={vi.fn()} disabled={false} />
    </I18nextProvider>
  );
  expect(screen.getByRole('combobox', { name: `a ${i18n.t('exploreMetric.nestedRollup')}` })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: `a ${i18n.t('exploreMetric.nestedRollupWindow')}` })).toBeInTheDocument();
  expect(screen.getByDisplayValue('1800')).toBeInTheDocument();
});
