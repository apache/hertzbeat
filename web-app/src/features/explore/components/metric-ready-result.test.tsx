/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
import type { TFunction } from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MetricReadyResult } from './metric-ready-result';
import type { MetricConsole } from '../model/explore-signal-contract';

const runtime = vi.hoisted(() => ({ received: vi.fn() }));
vi.mock('@/platform/perses', async importOriginal => ({
  ...(await importOriginal<typeof import('@/platform/perses')>()),
  HertzBeatMetricTimeSeriesResult: (props: { onTimeWindowChange?: (value: { from: number; to: number }) => void }) => {
    runtime.received(props);
    return <button onClick={() => props.onTimeWindowChange?.({ from: 150, to: 250 })}>Metric chart</button>;
  }
}));

const data: MetricConsole = {
  context: null,
  query: 'actual_cpu{workspace_id="default"}',
  datasource: 'greptime',
  queryMode: 'range',
  results: null,
  stats: null,
  emptyStateReason: null,
  errorMessage: null
};
const series = [
  {
    key: 'cpu-1',
    name: 'cpu',
    labels: { host: 'operator-a' },
    points: [
      [100, 0],
      [200, 12]
    ]
  }
];
const t = ((key: string) => key) as TFunction;

function subject(onTimeWindowChange = vi.fn()) {
  return (
    <MetricReadyResult
      data={data}
      series={series}
      query={{ signal: 'metrics', timeRange: 'last-30m', query: 'cpu' }}
      timeWindow={{ from: 100, to: 300 }}
      revision={0}
      t={t}
      onTimeWindowChange={onTimeWindowChange}
    />
  );
}

describe('metric result display', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('alternates chart and table using the same evidence and persists only display preference', () => {
    render(subject());
    expect(screen.getByRole('button', { name: 'Metric chart' })).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'explore.samples' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'exploreMetric.table' }));
    expect(screen.queryByRole('button', { name: 'Metric chart' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getAllByText('host=operator-a')).toHaveLength(1);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(localStorage.getItem('hertzbeat.explore.metrics.display')).toBe('table');
    cleanup();
    render(subject());
    expect(screen.getByRole('table')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'exploreMetric.chart' }));
    const snapshot = runtime.received.mock.calls.at(-1)?.[0];
    expect(snapshot.outcome.data.series[0].points).toEqual([
      { timestamp: 100, value: 0 },
      { timestamp: 200, value: 12 }
    ]);
  });

  it('forwards exact chart range changes and shows the executed response query rather than the draft', () => {
    const zoom = vi.fn();
    render(subject(zoom));
    fireEvent.click(screen.getByRole('button', { name: 'Metric chart' }));
    expect(zoom).toHaveBeenCalledExactlyOnceWith({ from: 150, to: 250 });
    expect(screen.getByText(data.query!)).toBeInTheDocument();
    expect(screen.getByText(data.query!).closest('details')).not.toHaveAttribute('open');
  });

  it('keeps the exact sample accessible while rendering a compact numeric value', () => {
    const raw = 0.003974855285274746;
    render(
      <MetricReadyResult
        data={data}
        series={[{ ...series[0]!, points: [[100, raw]] }]}
        query={{ signal: 'metrics', timeRange: 'last-30m', query: 'cpu' }}
        timeWindow={{ from: 100, to: 300 }}
        revision={0}
        t={t}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'exploreMetric.table' }));
    const value = screen.getByText('0.00397486');
    expect(value).toHaveAttribute('title', String(raw));
    expect(value).toHaveAttribute('aria-label', String(raw));
  });
});

it('does not mislabel empty outputs as all hidden when only a failed source is hidden', () => {
  runtime.received.mockClear();
  const composition: NonNullable<MetricConsole['composition']> = {
    plan: {
      version: 1,
      queries: [
        { refId: 'a', metric: 'cpu' },
        { refId: 'b', metric: 'memory' }
      ],
      formulas: []
    },
    sources: [
      { refId: 'a', state: 'error', series: [] },
      { refId: 'b', state: 'empty', series: [] }
    ],
    formulas: []
  };
  render(
    <MetricReadyResult
      data={{ ...data, composition }}
      series={[]}
      query={{ signal: 'metrics', timeRange: 'last-30m', metricView: JSON.stringify({ mode: 'chart', hidden: ['a'] }) }}
      timeWindow={{ from: 100, to: 300 }}
      revision={1}
      t={t}
      onViewChange={vi.fn()}
    />
  );
  expect(screen.getByText('explore.metricComposition.noOutputs')).toHaveAttribute('role', 'status');
  expect(runtime.received).not.toHaveBeenCalled();
});
it('shows invalid display recovery instead of silently drawing the default graph', () => {
  cleanup();
  runtime.received.mockClear();
  const onViewChange = vi.fn();
  render(
    <MetricReadyResult
      data={data}
      series={series}
      query={{ signal: 'metrics', timeRange: 'last-30m', metricView: 'invalid' }}
      timeWindow={{ from: 100, to: 300 }}
      revision={1}
      t={t}
      onViewChange={onViewChange}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.metricComposition.resetView' }));
  expect(onViewChange).toHaveBeenCalledWith({ mode: 'chart', hidden: [] });
  expect(runtime.received).not.toHaveBeenCalled();
});
it('uses native shared Y limits for uniform splits and leaves independent limits automatic', () => {
  cleanup();
  runtime.received.mockClear();
  const splitSeries = [
    ...series,
    {
      ...series[0]!,
      key: 'cpu-2',
      labels: { host: 'operator-b' },
      points: [
        [100, 5],
        [200, 20]
      ]
    }
  ];
  const query = {
    signal: 'metrics',
    timeRange: 'last-30m',
    query: 'cpu',
    metricView: JSON.stringify({ mode: 'split', hidden: [], splitBy: 'host' })
  } as const;
  const view = render(
    <MetricReadyResult
      data={data}
      series={splitSeries}
      query={query}
      timeWindow={{ from: 100, to: 300 }}
      revision={1}
      t={t}
      onViewChange={vi.fn()}
    />
  );
  expect(
    runtime.received.mock.calls.slice(-2).map(call => (call[0] as { timeSeriesYDomain?: unknown }).timeSeriesYDomain)
  ).toEqual([
    { min: 0, max: 20 },
    { min: 0, max: 20 }
  ]);
  view.rerender(
    <MetricReadyResult
      data={data}
      series={splitSeries}
      query={{
        ...query,
        metricView: JSON.stringify({ mode: 'split', hidden: [], splitBy: 'host', splitScale: 'independent' })
      }}
      timeWindow={{ from: 100, to: 300 }}
      revision={1}
      t={t}
      onViewChange={vi.fn()}
    />
  );
  expect(runtime.received.mock.calls.at(-1)?.[0].timeSeriesYDomain).toBeUndefined();
});
it('does not mount a fake formula chart when only all-gap output is visible', () => {
  cleanup();
  runtime.received.mockClear();
  const gap = {
    key: 'f1',
    name: 'f1',
    refId: 'f1',
    allowsGaps: true,
    labels: {},
    points: [
      [100, null],
      [200, null]
    ]
  };
  render(
    <MetricReadyResult
      data={data}
      series={[{ ...series[0]!, refId: 'a' }, gap]}
      query={{ signal: 'metrics', timeRange: 'last-30m', metricView: JSON.stringify({ mode: 'chart', hidden: ['a'] }) }}
      timeWindow={{ from: 100, to: 300 }}
      revision={1}
      t={t}
      onViewChange={vi.fn()}
    />
  );
  expect(runtime.received).not.toHaveBeenCalled();
  expect(screen.getByText('explore.metricComposition.noOutputs')).toBeInTheDocument();
});

it('keeps unknown units visible as a short warning with keyboard-accessible details', () => {
  cleanup();
  render(subject());
  const summary = screen.getByText('explore.metricComposition.unknownUnitsShort');
  expect(summary.tagName).toBe('SUMMARY');
  expect(summary).toBeVisible();
  expect(summary.closest('details')).not.toHaveAttribute('open');
  expect(screen.getByText('explore.metricComposition.unknownUnits').closest('details')).toBe(
    summary.closest('details')
  );
  cleanup();
});
