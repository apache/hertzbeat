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
import { ExploreLogComparisonResult } from './explore-log-comparison-result';
import { ExploreLogsRecoveryContext } from './explore-logs-recovery-context';
import { comparisonValues } from '@/platform/perses';
const { chart } = vi.hoisted(() => ({ chart: vi.fn() }));
vi.mock('@/platform/perses/runtime/hertzbeat-perses-primitives', async importOriginal => ({
  ...(await importOriginal<typeof import('@/platform/perses/runtime/hertzbeat-perses-primitives')>()),
  HertzBeatMetricTimeSeriesResult: (props: unknown) => {
    chart(props);
    return null;
  }
}));
const t = ((key: string, options?: { source?: string }) =>
  key + (options?.source ? `:${options.source}` : '')) as TFunction;
const data = {
  window: { start: 1000, end: 2000 },
  analysis: {
    field: null,
    view: 'groups' as const,
    limit: 20,
    order: 'count-desc' as const,
    minCount: 1,
    measure: null,
    grouping: null
  },
  matchingA: 12,
  matchingB: 100,
  truncated: false,
  intervalMs: null,
  formula: '100*b/a',
  groups: [{ keys: [], a: { count: 12 }, b: { count: 3 }, buckets: [] }]
};
afterEach(cleanup);
it('hides a display without changing formula operands or source-specific actions', () => {
  const onGroup = vi.fn();
  render(
    <ExploreLogComparisonResult
      load={{ state: 'ready', data, retry: vi.fn() }}
      t={t}
      hidden={['a']}
      canOpenGroup={() => true}
      onGroup={onGroup}
    />
  );
  expect(screen.getByText('25')).toBeVisible();
  expect(screen.queryByText('12')).not.toBeInTheDocument();
  expect(screen.getByText('25')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logComparison.inspect:b' }));
  expect(onGroup).toHaveBeenCalledWith(data.groups[0], 'b');
});
it('keeps division by zero unavailable and conceals retained rows on failure', () => {
  expect(comparisonValues(data)({ a: { count: 0 }, b: { count: 3 } }, 'formula')).toBeNull();
  render(<ExploreLogComparisonResult load={{ state: 'error', data, retry: vi.fn() }} t={t} />);
  expect(screen.queryByText('25')).not.toBeInTheDocument();
  expect(screen.getByText('explore.logAnalysis.error')).toBeVisible();
});

it('charts paired bucket identities and preserves unavailable formula points', () => {
  const onTimeWindowChange = vi.fn();
  const timeline = {
    ...data,
    window: { start: 0, end: 120000 },
    intervalMs: 60000,
    analysis: { ...data.analysis, view: 'timeseries' as const },
    groups: [
      {
        ...data.groups[0]!,
        buckets: [
          { start: 0, a: { count: 0 }, b: { count: 1 } },
          { start: 60000, a: { count: 12 }, b: { count: 2 } }
        ]
      }
    ]
  };
  render(
    <ExploreLogComparisonResult
      load={{ state: 'ready', data: timeline, retry: vi.fn() }}
      t={t}
      onTimeWindowChange={onTimeWindowChange}
    />
  );
  expect(chart).toHaveBeenLastCalledWith(
    expect.objectContaining({
      onTimeWindowChange,
      timeWindowChangeEnabled: true,
      outcome: expect.objectContaining({
        data: expect.objectContaining({
          series: expect.arrayContaining([
            expect.objectContaining({
              name: expect.stringContaining('formula'),
              points: [
                { timestamp: 0, value: null },
                { timestamp: 60000, value: (100 * 2) / 12 }
              ]
            })
          ])
        })
      })
    })
  );
});
it('preserves unsupported b filter reason and focuses only the named source editor', () => {
  render(
    <div data-explore-query-layout>
      <input data-log-search-input data-testid="a-query" />
      <div data-log-comparison-source="b">
        <input data-log-search-input data-testid="b-query" />
      </div>
      <ExploreLogComparisonResult
        load={{
          state: 'invalid_filter',
          data: undefined,
          retry: vi.fn(),
          invalidFilter: { source: 'b', reason: 'cidr_unsupported' }
        }}
        t={t}
      />
    </div>
  );
  expect(screen.getByText('explore.logAuthoring.cidr_unsupported')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logComparison.review' }));
  expect(screen.getByTestId('b-query')).toHaveFocus();
});
it('opens the Logs source B editor for invalid filter recovery', () => {
  const reviewSourceB = vi.fn();
  const diagnostic = { issue: 'missing_value' as const, expression: 'bad:', start: 0, end: 4 };
  render(
    <ExploreLogsRecoveryContext.Provider value={{ reviewSourceB }}>
      <ExploreLogComparisonResult
        load={{ state: 'invalid_filter', data: undefined, retry: vi.fn(), invalidFilter: { source: 'b', diagnostic } }}
        t={t}
      />
    </ExploreLogsRecoveryContext.Provider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.logComparison.review' }));
  expect(reviewSourceB).toHaveBeenCalledWith(diagnostic);
});
it('does not guess a source for a shared filter failure', () => {
  render(
    <div data-explore-query-layout>
      <form tabIndex={-1} data-testid="query-form">
        <input data-log-search-input data-testid="a-query" />
      </form>
      <ExploreLogComparisonResult
        load={{ state: 'invalid_filter', data: undefined, retry: vi.fn(), invalidFilter: {} }}
        t={t}
      />
    </div>
  );
  expect(screen.queryByText('explore.logComparison.invalidSource:a')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'explore.logComparison.review' }));
  expect(screen.getByTestId('query-form')).toHaveFocus();
  expect(screen.getByTestId('a-query')).not.toHaveFocus();
});
it('labels approximate percentile comparison and preserves unavailable sample semantics', () => {
  const percentile = {
    ...data,
    analysis: { ...data.analysis, measure: { function: 'p95' as const, field: 'attribute:duration' } },
    groups: [
      {
        ...data.groups[0]!,
        a: { count: 12, measurement: { state: 'ready' as const, sampleCount: 10, value: 40 } },
        b: { count: 3, measurement: { state: 'non_finite' as const, sampleCount: 3, value: null } }
      }
    ]
  };
  render(<ExploreLogComparisonResult load={{ state: 'ready', data: percentile, retry: vi.fn() }} t={t} />);
  expect(screen.getByText(/explore.logAnalysis.p95\(attribute:duration\)/u)).toBeVisible();
  expect(screen.getByText(/explore.logAnalysis.percentileHint/u)).toBeVisible();
  expect(screen.getByText('explore.logAnalysis.percentileUnavailable')).toBeVisible();
  expect(screen.getByText('explore.logComparison.unavailable')).toBeVisible();
  expect(screen.getByTitle('explore.logAnalysis.count: 12; explore.logAnalysis.samples: 10')).toBeVisible();
});

it.each(['error', 'permission', 'unavailable'] as const)(
  'keeps %s Retry themed and callable without changing its status',
  state => {
    const retry = vi.fn();
    const view = render(<ExploreLogComparisonResult load={{ state, data: undefined, retry }} t={t} />);
    expect(screen.getByText(`explore.logAnalysis.${state}`)).toBeVisible();
    const button = screen.getByRole('button', { name: 'common.retry' });
    expect(button).toHaveClass('ant-btn');
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledOnce();
    view.rerender(<ExploreLogComparisonResult load={{ state: 'loading', data: undefined, retry }} t={t} />);
    expect(screen.getByText('explore.logAnalysis.loading')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();
  }
);

it('does not offer CSV export for paired, stale, or empty evidence', () => {
  const load = { state: 'ready' as const, data, retry: vi.fn() };
  const view = render(<ExploreLogComparisonResult load={load} hidden={['b']} t={t} />);
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.exportCsv' })).not.toBeInTheDocument();
  view.rerender(<ExploreLogComparisonResult load={load} t={t} />);
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.exportCsv' })).not.toBeInTheDocument();
  view.rerender(<ExploreLogComparisonResult load={{ ...load, data: { ...data, groups: [] } }} t={t} />);
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.exportCsv' })).not.toBeInTheDocument();
  view.rerender(<ExploreLogComparisonResult load={{ ...load, state: 'error' }} t={t} />);
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.exportCsv' })).not.toBeInTheDocument();
});
