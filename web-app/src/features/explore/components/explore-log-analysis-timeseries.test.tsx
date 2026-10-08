/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { afterEach, expect, it, vi } from 'vitest';
import { ExploreLogAnalysisTimeseries } from './explore-log-analysis-timeseries';
import { ExploreLogAnalysisResult } from './explore-log-analysis-result';
import css from '@/platform/perses/runtime/log-analysis/log-analysis-timeseries.module.css?raw';
const { chart } = vi.hoisted(() => ({ chart: vi.fn() }));
vi.mock('@/platform/perses/runtime/hertzbeat-perses-primitives', async importOriginal => ({
  ...(await importOriginal<typeof import('@/platform/perses/runtime/hertzbeat-perses-primitives')>()),
  HertzBeatMetricTimeSeriesResult: (props: unknown) => {
    chart(props);
    return <div data-testid="native-chart" />;
  }
}));
const t = ((key: string) => key) as TFunction;
const data = {
  window: { start: 1000, end: 4000 },
  field: null,
  view: 'timeseries' as const,
  limit: 20,
  order: 'count-desc' as const,
  minCount: 1,
  matchingTotal: 5,
  truncated: false,
  intervalMs: 60_000,
  groups: [
    { kind: 'value' as const, value: 'server', count: 3, buckets: [{ start: 0, count: 3 }] },
    { kind: 'value' as const, value: 'timeout', count: 2, buckets: [{ start: 0, count: 2 }] }
  ]
};
afterEach(() => {
  cleanup();
  chart.mockClear();
});
it('shows one shared bucket as labelled counts without inventing separated timestamps', () => {
  render(
    <ExploreLogAnalysisResult
      load={{ state: 'ready', data, retry: vi.fn() }}
      representation="timeseries"
      t={t}
      onTimeWindowChange={vi.fn()}
    />
  );
  expect(chart).not.toHaveBeenCalled();
  expect(screen.getByText('explore.logAnalysis.singleBucket')).toBeVisible();
  expect(screen.getByRole('row', { name: 'server 3' })).toBeVisible();
  expect(screen.getByRole('row', { name: 'timeout 2' })).toBeVisible();
});
it('uses the native legend and a stable readable plot height for multiple time buckets', () => {
  const timeline = {
    ...data,
    window: { start: 1000, end: 120000 },
    groups: data.groups.map(group => ({
      ...group,
      buckets: [
        { start: 0, count: group.count - 1 },
        { start: 60000, count: 1 }
      ]
    }))
  };
  render(
    <ExploreLogAnalysisTimeseries data={timeline} t={t} groupLabel={group => group.value!}>
      {null}
    </ExploreLogAnalysisTimeseries>
  );
  expect(chart).toHaveBeenCalledWith(
    expect.objectContaining({ className: expect.stringContaining('chart'), timeSeriesCompact: false })
  );
  expect(css).toMatch(/--hb-perses-compact-height:\s*280px/u);
  expect(css).toMatch(/min-height:\s*280px/u);
});
it('renders native lines with negative values and null gaps for measured buckets', () => {
  const measured = {
    ...data,
    measure: { function: 'avg' as const, field: 'attribute:duration' },
    order: 'measure-desc' as const,
    window: { start: 1000, end: 120000 },
    groups: [
      {
        kind: 'all' as const,
        value: null,
        count: 5,
        measurement: { state: 'ready' as const, sampleCount: 2, value: -2 },
        buckets: [
          { start: 0, count: 3, measurement: { state: 'ready' as const, sampleCount: 2, value: -2 } },
          { start: 60000, count: 2, measurement: { state: 'no_samples' as const, sampleCount: 0, value: null } }
        ]
      }
    ]
  };
  render(
    <ExploreLogAnalysisTimeseries data={measured} t={t} groupLabel={() => 'all'}>
      <span>rows</span>
    </ExploreLogAnalysisTimeseries>
  );
  expect(chart).toHaveBeenCalledWith(
    expect.objectContaining({
      timeSeriesDisplay: 'line',
      outcome: expect.objectContaining({
        data: expect.objectContaining({
          series: [
            expect.objectContaining({
              points: [
                { timestamp: 0, value: -2 },
                { timestamp: 60000, value: null }
              ]
            })
          ]
        })
      })
    })
  );
});
it('keeps measured group reasons and samples below a multi-bucket native chart', () => {
  const measured = {
    ...data,
    measure: { function: 'avg' as const, field: 'attribute:duration' },
    order: 'measure-desc' as const,
    window: { start: 1000, end: 120000 },
    groups: [
      {
        kind: 'all' as const,
        value: null,
        count: 5,
        measurement: { state: 'non_finite' as const, sampleCount: 2, value: null },
        buckets: [
          { start: 0, count: 3, measurement: { state: 'non_finite' as const, sampleCount: 2, value: null } },
          { start: 60000, count: 2, measurement: { state: 'no_samples' as const, sampleCount: 0, value: null } }
        ]
      }
    ]
  };
  render(
    <ExploreLogAnalysisResult
      load={{ state: 'ready', data: measured, retry: vi.fn() }}
      representation="timeseries"
      t={t}
      onGroup={vi.fn()}
      canOpenGroup={() => true}
    />
  );
  expect(screen.getByTestId('native-chart')).toBeVisible();
  expect(screen.getByText('explore.logAnalysis.non_finite')).toBeVisible();
  expect(screen.getByRole('columnheader', { name: 'explore.logAnalysis.samples' })).toBeVisible();
  expect(screen.getByRole('cell', { name: '2' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'explore.logAnalysis.openGroup' })).toBeVisible();
});
it('keeps delimiter-containing tuple labels visibly distinct in the native chart', () => {
  const dimensions = [
    { field: 'attribute:a', limit: 2 },
    { field: 'attribute:b', limit: 2 }
  ];
  const tuple = (a: string, b: string) => ({
    kind: null,
    value: null,
    keys: [
      { field: 'attribute:a', kind: 'value' as const, value: a },
      { field: 'attribute:b', kind: 'value' as const, value: b }
    ],
    count: 2,
    buckets: [
      { start: 0, count: 1 },
      { start: 60000, count: 1 }
    ]
  });
  const grouped = {
    ...data,
    window: { start: 1000, end: 120000 },
    grouping: { version: 1 as const, dimensions },
    limit: 4,
    matchingTotal: 4,
    groups: [tuple('a / b', 'c'), tuple('a', 'b / c')]
  };
  render(
    <ExploreLogAnalysisResult
      load={{ state: 'ready', data: grouped, retry: vi.fn() }}
      representation="timeseries"
      t={t}
    />
  );
  expect(chart).toHaveBeenCalledWith(
    expect.objectContaining({
      outcome: expect.objectContaining({
        data: expect.objectContaining({
          series: [
            expect.objectContaining({ name: '"a / b" / "c" · explore.logAnalysis.logsUnit' }),
            expect.objectContaining({ name: '"a" / "b / c" · explore.logAnalysis.logsUnit' })
          ]
        })
      })
    })
  );
  const series = chart.mock.lastCall![0].outcome.data.series;
  expect(series).toHaveLength(2);
  expect(series[0].key).not.toBe(series[1].key);
  expect(series.map((item: { points: { timestamp: number; value: number }[] }) => item.points)).toEqual([
    [
      { timestamp: 0, value: 1 },
      { timestamp: 60000, value: 1 }
    ],
    [
      { timestamp: 0, value: 1 },
      { timestamp: 60000, value: 1 }
    ]
  ]);
});
it('shows one bucket raw and nominal throughput without a fabricated chart', () => {
  render(
    <ExploreLogAnalysisTimeseries
      data={{ ...data, transform: 'throughput' }}
      t={t}
      groupLabel={group => group.value!}
      timeZone="Asia/Shanghai"
    >
      {null}
    </ExploreLogAnalysisTimeseries>
  );
  expect(chart).not.toHaveBeenCalled();
  expect(screen.getByRole('region', { name: 'explore.logAnalysis.rawBucket' })).toHaveTextContent('0.05');
  expect(screen.getByText('1970-01-01 08:00:00.000 +08:00')).toBeVisible();
  expect(screen.getByText('explore.logAnalysis.partialBucket')).toBeVisible();
});
