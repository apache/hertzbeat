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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { ExploreLogAnalysisControls } from './explore-log-analysis-controls';
import { DEFAULT_LOG_ANALYSIS } from '@/platform/perses';
afterEach(cleanup);
const t = ((key: string) => key) as TFunction;
const fields = [
  { id: 'attribute:duration', source: 'attribute' as const, key: 'duration' },
  { id: 'builtin:serviceName', source: 'builtin' as const, key: 'serviceName' }
];
function choose(name: string, option: string) {
  fireEvent.mouseDown(screen.getByRole('combobox', { name }));
  fireEvent.click(screen.getByText(option));
}
it('stages Show measure independently of By and changes the compatible order', () => {
  const onChange = vi.fn();
  render(
    <ExploreLogAnalysisControls
      value={{ ...DEFAULT_LOG_ANALYSIS, field: 'builtin:serviceName' }}
      fields={fields}
      onChange={onChange}
      pending={false}
      t={t}
    />
  );
  choose('explore.logAnalysis.show', 'explore.logAnalysis.avg');
  expect(onChange).toHaveBeenCalledExactlyOnceWith({
    ...DEFAULT_LOG_ANALYSIS,
    field: 'builtin:serviceName',
    measure: { function: 'avg', field: 'attribute:duration' },
    order: 'measure-desc'
  });
  expect(screen.getByText('explore.logFacets.builtin.serviceName')).toBeVisible();
});
it('uses the workbench dropdown component for analysis controls', () => {
  const { container } = render(
    <ExploreLogAnalysisControls
      value={{
        ...DEFAULT_LOG_ANALYSIS,
        representation: 'timeseries',
        measure: { function: 'avg', field: 'attribute:duration' }
      }}
      fields={fields}
      onChange={vi.fn()}
      pending={false}
      t={t}
    />
  );
  expect(container.querySelector('select')).not.toBeInTheDocument();
  expect(container.querySelectorAll('.ant-select').length).toBeGreaterThan(0);
});
it('returns to count without leaving a measure descriptor or measured ranking', () => {
  const onChange = vi.fn();
  render(
    <ExploreLogAnalysisControls
      value={{
        ...DEFAULT_LOG_ANALYSIS,
        measure: { function: 'avg', field: 'attribute:duration' },
        order: 'measure-asc'
      }}
      fields={fields}
      onChange={onChange}
      pending={false}
      t={t}
    />
  );
  choose('explore.logAnalysis.show', 'explore.logAnalysis.count');
  expect(onChange).toHaveBeenCalledExactlyOnceWith({ ...DEFAULT_LOG_ANALYSIS, order: 'count-asc' });
});
it('stages approximate P95 without changing the applied value or grouping', () => {
  const onChange = vi.fn();
  const value = {
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'table' as const,
    field: 'builtin:serviceName',
    measure: { function: 'avg' as const, field: 'attribute:duration' },
    order: 'measure-desc' as const
  };
  const view = render(
    <ExploreLogAnalysisControls value={value} fields={fields} onChange={onChange} pending={false} t={t} />
  );
  choose('explore.logAnalysis.show', 'explore.logAnalysis.p95');
  expect(onChange).toHaveBeenCalledExactlyOnceWith({
    ...value,
    measure: { function: 'p95', field: 'attribute:duration' }
  });
  expect(screen.getAllByText('explore.logAnalysis.avg')[0]).toBeVisible();
  view.rerender(
    <ExploreLogAnalysisControls
      value={{ ...value, measure: { function: 'p95', field: 'attribute:duration' } }}
      fields={fields}
      onChange={onChange}
      pending
      t={t}
    />
  );
  expect(screen.queryByText('explore.logAnalysis.percentileHint')).not.toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'explore.logAnalysis.percentileHint' })).toBeVisible();
  expect(screen.getByText('explore.logAnalysis.pending')).toBeVisible();
  expect(screen.getAllByText('explore.logAnalysis.p95')[0]).toBeVisible();
});
