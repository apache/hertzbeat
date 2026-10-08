/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';
import { ExploreLogComparisonTimeseries } from './explore-log-comparison-timeseries';
const { chart } = vi.hoisted(() => ({ chart: vi.fn() }));
vi.mock('@/platform/perses/runtime/hertzbeat-perses-primitives', async importOriginal => ({
  ...(await importOriginal<typeof import('@/platform/perses/runtime/hertzbeat-perses-primitives')>()),
  HertzBeatMetricTimeSeriesResult: (props: unknown) => {
    chart(props);
    return null;
  }
}));
const t = ((key: string, options?: { time?: string }) => key + (options?.time ? ` ${options.time}` : '')) as TFunction;
const start = Date.parse('2026-09-08T06:00:00Z');
const data = {
  window: { start, end: start + 60000 },
  bWindow: { start: start - 3600000, end: start - 3540000 },
  bTimeShiftMs: 3600000,
  analysis: {
    view: 'timeseries' as const,
    field: null,
    measure: null,
    grouping: null,
    limit: 20,
    order: 'count-desc' as const,
    minCount: 1
  },
  matchingA: 3,
  matchingB: 7,
  truncated: false,
  intervalMs: 60000,
  formula: 'b/a',
  groups: [
    {
      keys: [],
      a: { count: 3 },
      b: { count: 7 },
      buckets: [
        { start, a: { count: 1 }, b: { count: 3 } },
        { start: start + 60000, a: { count: 2 }, b: { count: 4 } }
      ]
    }
  ]
};
afterEach(() => {
  cleanup();
  chart.mockClear();
});
it('overlays raw aligned source buckets and shows actual historical bucket time', () => {
  const onTimeWindowChange = vi.fn();
  render(
    <ExploreLogComparisonTimeseries
      data={data}
      t={t}
      onTimeWindowChange={onTimeWindowChange}
      {...{ timeZone: 'UTC' }}
    />
  );
  const props = chart.mock.lastCall![0];
  expect(props.outcome.data.series).toHaveLength(3);
  expect(
    props.outcome.data.series.map((s: { points: { timestamp: number }[] }) => s.points.map(p => p.timestamp))
  ).toEqual([
    [start, start + 60000],
    [start, start + 60000],
    [start, start + 60000]
  ]);
  expect(props.onTimeWindowChange).toBe(onTimeWindowChange);
  render(props.timeSeriesTimestamp(start) as ReactNode);
  expect(screen.getByText('explore.logComparison.alignedBucket 2026-09-08 06:00:00.000 Z')).toBeVisible();
  expect(screen.getByText('explore.logComparison.historicalBucket 2026-09-08 05:00:00.000 Z')).toBeVisible();
});
it('includes formula by default and omits historical timestamp content for ordinary comparisons', () => {
  const view = render(<ExploreLogComparisonTimeseries data={data} t={t} />);
  expect(chart.mock.lastCall![0].outcome.data.series).toHaveLength(3);
  expect(chart.mock.lastCall![0].outcome.data.series[2].points[0].value).toBe(3);
  const ordinary = { ...data, bTimeShiftMs: undefined, bWindow: undefined };
  view.rerender(<ExploreLogComparisonTimeseries data={ordinary} t={t} />);
  expect(chart.mock.lastCall![0].timeSeriesTimestamp).toBeUndefined();
});
it('hiding b removes its drawn source while formula still uses its bucket values', () => {
  render(<ExploreLogComparisonTimeseries data={data} hidden={['b']} t={t} />);
  expect(chart.mock.lastCall![0].outcome.data.series).toHaveLength(2);
  expect(chart.mock.lastCall![0].outcome.data.series[1].points[0].value).toBe(3);
});
it('normalizes source buckets before the formula once and leaves group formulas raw', async () => {
  const { comparisonValues } = await import('@/platform/perses');
  const throughput = {
    ...data,
    formula: 'a*b',
    analysis: { ...data.analysis, transform: 'throughput' as const },
    groups: data.groups.map(group => ({
      ...group,
      buckets: group.buckets.map(bucket => ({ ...bucket, a: { count: 120 }, b: { count: 60 } }))
    }))
  };
  render(<ExploreLogComparisonTimeseries data={throughput} t={t} />);
  expect(chart.mock.lastCall![0].outcome.data.series[0].points[0].value).toBe(2);
  expect(chart.mock.lastCall![0].outcome.data.series[2].points[0].value).toBe(2);
  expect(comparisonValues(throughput)(throughput.groups[0]!, 'formula')).toBe(21);
});
it('shows a single bucket formula at rate precision without inventing a chart', () => {
  const throughput = {
    ...data,
    intervalMs: 3600000,
    formula: 'a*b',
    analysis: { ...data.analysis, transform: 'throughput' as const },
    groups: data.groups.map(group => ({
      ...group,
      buckets: [{ start, a: { count: 1 }, b: { count: 1 } }]
    }))
  };
  render(<ExploreLogComparisonTimeseries data={throughput} t={t} timeZone="UTC" />);
  expect(chart).not.toHaveBeenCalled();
  expect(screen.getByText('7.71605E-8')).toBeVisible();
  expect(throughput.groups[0]!.buckets[0]).toEqual({ start, a: { count: 1 }, b: { count: 1 } });
  expect(screen.getByText('explore.logComparison.historicalBucket 2026-09-08 05:00:00.000 Z')).toBeVisible();
});
it('only promises brushing when the host supplies a time selection action', () => {
  const view = render(<ExploreLogComparisonTimeseries data={data} t={t} />);
  expect(screen.getByText('explore.logComparison.alignedTimeReadOnlyHint')).toBeVisible();
  expect(screen.queryByText('explore.logComparison.alignedTimeHint')).not.toBeInTheDocument();
  expect(chart.mock.lastCall![0].timeWindowChangeEnabled).toBe(false);
  const onTimeWindowChange = vi.fn();
  view.rerender(<ExploreLogComparisonTimeseries data={data} t={t} onTimeWindowChange={onTimeWindowChange} />);
  expect(screen.getByText('explore.logComparison.alignedTimeHint')).toBeVisible();
  expect(screen.queryByText('explore.logComparison.alignedTimeReadOnlyHint')).not.toBeInTheDocument();
  expect(chart.mock.lastCall![0].timeWindowChangeEnabled).toBe(true);
  expect(chart.mock.lastCall![0].onTimeWindowChange).toBe(onTimeWindowChange);
});
