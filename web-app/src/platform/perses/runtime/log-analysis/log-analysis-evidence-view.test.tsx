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
import type { ComponentProps } from 'react';
import type { HertzBeatMetricTimeSeriesResult } from '../hertzbeat-perses-primitives';
import { LogAnalysisEvidenceView } from './log-analysis-evidence-view';
import type { LogAnalysisResult } from '../../logs/log-analysis';
import type { LogComparisonResult } from '../../logs/log-comparison-result';
import { logQuerySetResultSchema } from '../../logs/log-query-set-result';
const { chart } = vi.hoisted(() => ({ chart: vi.fn() }));
vi.mock('../hertzbeat-perses-primitives', () => ({
  HertzBeatMetricTimeSeriesResult: (props: unknown) => {
    chart(props);
    return null;
  }
}));
const t = ((key: string) => key) as TFunction;
const data: LogAnalysisResult = {
  window: { start: 3660000, end: 3780000 },
  field: null,
  view: 'timeseries',
  transform: 'throughput',
  limit: 20,
  order: 'count-desc',
  minCount: 1,
  matchingTotal: 90,
  truncated: true,
  intervalMs: 60000,
  groups: [
    {
      kind: 'all',
      value: null,
      count: 90,
      buckets: [
        { start: 3660000, count: 60 },
        { start: 3720000, count: 30 }
      ]
    }
  ]
};
afterEach(() => {
  cleanup();
  chart.mockClear();
});
it('renders real normalized series, raw companion totals and explicit native display without drilldown chrome', () => {
  render(
    <LogAnalysisEvidenceView
      evidence={{ kind: 'single', data }}
      representation="timeseries"
      timeZone="UTC"
      display="line"
      t={t}
    />
  );
  const props = chart.mock.lastCall![0] as ComponentProps<typeof HertzBeatMetricTimeSeriesResult>;
  expect(props.timeSeriesDisplay).toBe('line');
  if (props.outcome.state !== 'ready') throw Error('Expected ready chart');
  expect(props.outcome.data.series[0]?.points.map(point => point.value)).toEqual([1, 0.5]);
  expect(props.outcome.data.series[0]?.name).toContain('explore.logAnalysis.throughputLogsUnit');
  expect(screen.getByText('90')).toBeVisible();
  expect(screen.getByText('explore.logAnalysis.rawSummary')).not.toBeVisible();
  const summary = screen.getByText('signalDashboard.analysisDetails', { selector: 'summary' });
  expect(summary.parentElement).not.toHaveAttribute('open');
  expect(screen.getByText('explore.logAnalysis.truncated')).toBeVisible();
  fireEvent.click(summary);
  expect(summary.parentElement).toHaveAttribute('open');
  expect(screen.getByText('explore.logAnalysis.rawSummary')).toBeVisible();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('preserves paired shift, formula and raw table evidence without inactive Inspect actions', () => {
  const comparison: LogComparisonResult = {
    window: data.window,
    bWindow: { start: 60000, end: 180000 },
    bTimeShiftMs: 3600000,
    analysis: {
      field: null,
      view: 'timeseries',
      measure: null,
      grouping: null,
      limit: 20,
      order: 'count-desc',
      minCount: 1
    },
    matchingA: 4,
    matchingB: 8,
    truncated: false,
    intervalMs: 60000,
    formula: 'b/a',
    groups: [
      {
        keys: [],
        a: { count: 4 },
        b: { count: 8 },
        buckets: [
          { start: 3660000, a: { count: 2 }, b: { count: 6 } },
          { start: 3720000, a: { count: 2 }, b: { count: 2 } }
        ]
      }
    ]
  };
  render(
    <LogAnalysisEvidenceView
      evidence={{ kind: 'comparison', data: comparison }}
      comparison={{ version: 1, search: 'b', formula: 'b/a', hidden: ['b'] }}
      representation="timeseries"
      timeZone="UTC"
      t={t}
    />
  );
  expect(chart.mock.lastCall![0].outcome.data.series).toHaveLength(2);
  expect(screen.queryByRole('columnheader', { name: 'b' })).not.toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'a · explore.logAnalysis.logsUnit' })).toBeVisible();
  expect(screen.getByRole('columnheader', { name: 'b/a' })).toBeVisible();
  const props = chart.mock.lastCall![0] as ComponentProps<typeof HertzBeatMetricTimeSeriesResult>;
  if (props.outcome.state !== 'ready') throw Error('Expected ready chart');
  expect(props.outcome.data.series[1]?.points.map(point => point.value)).toEqual([3, 1]);
  expect(props.outcome.data.series[0]?.name).toContain('explore.logAnalysis.logsUnit');
  expect(props.outcome.data.series[1]?.name).not.toContain('explore.logAnalysis.logsUnit');
  expect(props.timeSeriesTimestamp).toBeDefined();
  expect(screen.getByText('4')).toBeVisible();
  expect(screen.queryByRole('columnheader', { name: 'b' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByText('explore.logComparison.fixedTimeShift')).toBeVisible();
});
it('keeps single bucket and empty evidence honest without inventing a time curve', () => {
  const view = render(
    <LogAnalysisEvidenceView
      evidence={{
        kind: 'single',
        data: { ...data, groups: [{ ...data.groups[0]!, buckets: [data.groups[0]!.buckets[0]!] }] }
      }}
      representation="timeseries"
      t={t}
    />
  );
  expect(chart).not.toHaveBeenCalled();
  expect(screen.getByText('explore.logAnalysis.singleBucket')).toBeVisible();
  expect(screen.getByText('90')).toBeVisible();
  view.rerender(
    <LogAnalysisEvidenceView
      evidence={{ kind: 'single', data: { ...data, groups: [] } }}
      representation="timeseries"
      t={t}
    />
  );
  expect(screen.getByRole('status')).toHaveTextContent('explore.logAnalysis.noData');
  expect(chart).not.toHaveBeenCalled();
});

it('renders saved v2 source and formula visibility from the shared result adapter', () => {
  const analysis = { limit: 20, order: 'count-desc', minCount: 1 };
  const queries = [
    { refId: 'a', alias: 'Current', visible: false, analysis },
    { refId: 'b', alias: 'Worker', visible: true, analysis: { ...analysis, transform: 'throughput' } }
  ];
  const formula = { refId: 'f1', alias: 'Combined', visible: true, expression: 'a/3' };
  const result = logQuerySetResultSchema.parse({
    version: 2,
    window: data.window,
    intervalMs: 60000,
    executed: { queries, formulas: [formula] },
    sources: queries.map((query, index) => ({
      ...query,
      sourceWindow: data.window,
      matchingTotal: index ? 8 : 4,
      truncated: false,
      groups: [
        {
          keys: [],
          cell: { count: index ? 8 : 4 },
          buckets: [
            { start: 3660000, cell: { count: index ? 6 : 2 } },
            { start: 3720000, cell: { count: 2 } },
            { start: 3780000, cell: { count: 0 } }
          ]
        }
      ]
    })),
    formulas: [{ ...formula, dependsOn: ['a'] }]
  });
  const view = render(
    <LogAnalysisEvidenceView evidence={{ kind: 'querySet', data: result }} representation="timeseries" t={t} />
  );
  const props = chart.mock.lastCall![0] as ComponentProps<typeof HertzBeatMetricTimeSeriesResult>;
  if (props.outcome.state !== 'ready') throw Error('Expected ready chart');
  expect(props.outcome.data.series.map(series => series.name)).toEqual([
    'Worker · explore.logAnalysis.throughputLogsUnit: explore.logAnalysis.everything',
    'Combined · explore.logAnalysis.formulaUnitUnknown: explore.logAnalysis.everything'
  ]);
  expect(props.outcome.data.series[1]?.points.map(point => point.value)).toEqual([2 / 3, 2 / 3, 0]);
  expect(screen.getByRole('columnheader', { name: 'Worker · explore.logAnalysis.throughputLogsUnit' })).toBeVisible();
  expect(screen.getByRole('columnheader', { name: 'Combined · explore.logAnalysis.formulaUnitUnknown' })).toBeVisible();
  expect(screen.getByText('explore.logAnalysis.formulaUnitHint')).toBeVisible();
  expect(screen.getByText('1.33333')).toHaveAttribute('title', String(4 / 3));
  expect(screen.queryByRole('columnheader', { name: 'Current' })).not.toBeInTheDocument();
  view.rerender(
    <LogAnalysisEvidenceView
      evidence={{
        kind: 'querySet',
        data: {
          ...result,
          sources: result.sources.map(source => ({ ...source, visible: false })),
          formulas: result.formulas.map(item => ({ ...item, visible: false }))
        }
      }}
      representation="timeseries"
      t={t}
    />
  );
  expect(screen.getByRole('status')).toHaveTextContent('explore.logAdd.allHidden');
});
