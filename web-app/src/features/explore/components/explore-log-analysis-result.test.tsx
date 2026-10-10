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
import { ExploreLogAnalysisResult } from './explore-log-analysis-result';
const { chart } = vi.hoisted(() => ({ chart: vi.fn() }));
vi.mock('@/platform/perses/runtime/hertzbeat-perses-primitives', async importOriginal => ({
  ...(await importOriginal<typeof import('@/platform/perses/runtime/hertzbeat-perses-primitives')>()),
  HertzBeatMetricTimeSeriesResult: (props: unknown) => {
    chart(props);
    return <div data-testid="native-perses" />;
  }
}));
const t = ((key: string) => key) as TFunction;
const data = {
  window: { start: 1000, end: 2000 },
  field: null,
  view: 'groups' as const,
  limit: 20,
  order: 'count-desc' as const,
  minCount: 1,
  matchingTotal: 10,
  truncated: true,
  intervalMs: null,
  groups: [
    { kind: 'value' as const, value: 'checkout', count: 5, buckets: [] },
    { kind: 'missing' as const, value: null, count: 2, buckets: [] }
  ]
};
afterEach(cleanup);
it('keeps counts and typed group labels identical in table and toplist', () => {
  const load = { state: 'ready' as const, data, retry: vi.fn() };
  const view = render(<ExploreLogAnalysisResult load={load} representation="table" t={t} />);
  expect(screen.getByText('checkout')).toBeVisible();
  expect(screen.getByText('5')).toBeVisible();
  expect(screen.getByText('explore.logAnalysis.missing')).toBeVisible();
  expect(screen.getByText('explore.logAnalysis.truncated')).toBeVisible();
  view.rerender(<ExploreLogAnalysisResult load={load} representation="toplist" t={t} />);
  expect(screen.getByText('5')).toBeVisible();
  expect(screen.getByText('2')).toBeVisible();
});
it('does not show retained counts on failed evidence', () => {
  render(<ExploreLogAnalysisResult load={{ state: 'error', data, retry: vi.fn() }} representation="table" t={t} />);
  expect(screen.queryByText('checkout')).not.toBeInTheDocument();
  expect(screen.getByText('explore.logAnalysis.error')).toBeVisible();
});

it('uses native Perses grouped count bars with honest bounded population', () => {
  chart.mockClear();
  const timeline = {
    ...data,
    view: 'timeseries' as const,
    window: { start: 1000, end: 120000 },
    intervalMs: 60_000,
    groups: data.groups.map(group => ({
      ...group,
      buckets: [
        { start: 0, count: group.count - 1 },
        { start: 60000, count: 1 }
      ]
    }))
  };
  render(
    <ExploreLogAnalysisResult
      load={{ state: 'ready', data: timeline, retry: vi.fn() }}
      representation="timeseries"
      t={t}
    />
  );
  expect(chart).toHaveBeenCalledWith(
    expect.objectContaining({
      timeSeriesDisplay: 'bar',
      outcome: expect.objectContaining({
        truncated: true,
        data: expect.objectContaining({
          series: expect.arrayContaining([
            expect.objectContaining({
              name: 'checkout · explore.logAnalysis.logsUnit',
              points: [
                { timestamp: 0, value: 4 },
                { timestamp: 60000, value: 1 }
              ]
            })
          ])
        })
      })
    })
  );
});

it('offers an explicit group action and explains groups without exact filters', () => {
  const onGroup = vi.fn();
  render(
    <ExploreLogAnalysisResult
      load={{ state: 'ready', data, retry: vi.fn() }}
      representation="table"
      t={t}
      onGroup={onGroup}
      canOpenGroup={group => group.kind === 'value'}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.logAnalysis.openGroup' }));
  expect(onGroup).toHaveBeenCalledWith(data.groups[0]);
  expect(screen.getByText('explore.logAnalysis.unsupportedGroup')).toBeVisible();
  expect(screen.getByText('explore.logAnalysis.missing')).toBeVisible();
});
it('explains unavailable group actions without inventing a predicate', () => {
  const numeric = {
    ...data,
    field: { id: 'attribute:amount', source: 'attribute' as const, key: 'amount' },
    groups: [{ kind: 'value' as const, value: '2', count: 2, buckets: [] }]
  };
  render(
    <ExploreLogAnalysisResult
      load={{ state: 'ready', data: numeric, retry: vi.fn() }}
      representation="table"
      t={t}
      onGroup={vi.fn()}
      canOpenGroup={() => false}
    />
  );
  expect(screen.getByText('explore.logAnalysis.unsupportedGroup')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.openGroup' })).not.toBeInTheDocument();
});
it('forwards the native time-window callback only for ready timeseries evidence', () => {
  chart.mockClear();
  const onTimeWindowChange = vi.fn();
  const timeline = {
    ...data,
    view: 'timeseries' as const,
    window: { start: 1000, end: 120000 },
    intervalMs: 60_000,
    groups: data.groups.map(group => ({
      ...group,
      buckets: [
        { start: 0, count: group.count - 1 },
        { start: 60000, count: 1 }
      ]
    }))
  };
  const view = render(
    <ExploreLogAnalysisResult
      load={{ state: 'ready', data: timeline, retry: vi.fn() }}
      representation="timeseries"
      onTimeWindowChange={onTimeWindowChange}
      t={t}
    />
  );
  expect(chart).toHaveBeenLastCalledWith(
    expect.objectContaining({ onTimeWindowChange, timeWindowChangeEnabled: true })
  );
  const nativeProps = chart.mock.calls.at(-1)![0] as {
    onTimeWindowChange: (window: { from: number; to: number }) => void;
  };
  nativeProps.onTimeWindowChange({ from: 1200, to: 1600 });
  expect(onTimeWindowChange).toHaveBeenCalledWith({ from: 1200, to: 1600 });
  onTimeWindowChange.mockClear();
  for (const state of ['loading', 'unavailable'] as const) {
    chart.mockClear();
    view.rerender(
      <ExploreLogAnalysisResult
        load={{ state, data: timeline, retry: vi.fn() }}
        representation="timeseries"
        onTimeWindowChange={onTimeWindowChange}
        t={t}
      />
    );
    expect(chart).not.toHaveBeenCalled();
  }
  expect(onTimeWindowChange).not.toHaveBeenCalled();
});
it('keeps native chart time selection disabled when its owner provides no callback', () => {
  chart.mockClear();
  const timeline = {
    ...data,
    view: 'timeseries' as const,
    window: { start: 1000, end: 120000 },
    intervalMs: 60_000,
    groups: data.groups.map(group => ({
      ...group,
      buckets: [
        { start: 0, count: group.count - 1 },
        { start: 60000, count: 1 }
      ]
    }))
  };
  render(
    <ExploreLogAnalysisResult
      load={{ state: 'ready', data: timeline, retry: vi.fn() }}
      representation="timeseries"
      t={t}
    />
  );
  expect(chart).toHaveBeenLastCalledWith(expect.objectContaining({ timeWindowChangeEnabled: false }));
});
it('renders ordered tuple key columns without joining identities into one cell', () => {
  const grouping = {
    version: 1 as const,
    dimensions: [
      { field: 'attribute:a', limit: 5 },
      { field: 'attribute:b', limit: 4 }
    ]
  };
  const tuple = {
    ...data,
    field: null,
    limit: 20,
    grouping,
    groups: [
      {
        kind: null,
        value: null,
        keys: [
          { field: 'attribute:a', kind: 'value' as const, value: 'left / embedded' },
          { field: 'attribute:b', kind: 'value' as const, value: 'right' }
        ],
        count: 2,
        buckets: []
      }
    ]
  };
  render(
    <ExploreLogAnalysisResult
      load={{ state: 'ready', data: tuple, retry: vi.fn() }}
      representation="table"
      t={t}
      onGroup={vi.fn()}
      canOpenGroup={() => true}
    />
  );
  expect(
    screen
      .getAllByRole('columnheader')
      .slice(0, 2)
      .map(cell => cell.textContent)
  ).toEqual(['attribute:a', 'attribute:b']);
  expect(screen.getByText('left / embedded')).toBeVisible();
  expect(screen.getByRole('cell', { name: 'right' })).toBeVisible();
  expect(screen.getByRole('cell', { name: 'right' })).not.toHaveAttribute('data-log-stat');
  expect(screen.getByRole('cell', { name: '2' })).toHaveAttribute('data-log-stat');
  expect(screen.getByTitle('right')).toBeVisible();
  expect(screen.getByRole('table')).toHaveStyle({ minWidth: '430px' });
});

it('shows the applied effective interval even for an empty timeseries', () => {
  render(
    <ExploreLogAnalysisResult
      load={{ state: 'ready', data: { ...data, view: 'timeseries', intervalMs: 1000, groups: [] }, retry: vi.fn() }}
      representation="timeseries"
      t={t}
    />
  );
  expect(screen.getByText('explore.logAnalysis.interval')).toBeVisible();
  expect(screen.getByText('explore.logAnalysis.noData')).toBeVisible();
});

it.each(['error', 'permission', 'unavailable'] as const)(
  'keeps %s Retry themed and callable without changing its status',
  state => {
    const retry = vi.fn();
    const view = render(
      <ExploreLogAnalysisResult load={{ state, data: undefined, retry }} representation="table" t={t} />
    );
    expect(screen.getByText(`explore.logAnalysis.${state}`)).toBeVisible();
    const button = screen.getByRole('button', { name: 'common.retry' });
    expect(button).toHaveClass('ant-btn');
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledOnce();
    view.rerender(
      <ExploreLogAnalysisResult load={{ state: 'loading', data: undefined, retry }} representation="table" t={t} />
    );
    expect(screen.getByText('explore.logAnalysis.loading')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument();
  }
);

it('does not offer CSV export for ready, empty, or loading analysis', () => {
  const view = render(
    <ExploreLogAnalysisResult load={{ state: 'ready', data, retry: vi.fn() }} representation="table" t={t} />
  );
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.exportCsv' })).not.toBeInTheDocument();
  view.rerender(
    <ExploreLogAnalysisResult
      load={{ state: 'ready', data: { ...data, groups: [] }, retry: vi.fn() }}
      representation="table"
      t={t}
    />
  );
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.exportCsv' })).not.toBeInTheDocument();
  view.rerender(
    <ExploreLogAnalysisResult load={{ state: 'loading', data, retry: vi.fn() }} representation="table" t={t} />
  );
  expect(screen.queryByRole('button', { name: 'explore.logAnalysis.exportCsv' })).not.toBeInTheDocument();
});
