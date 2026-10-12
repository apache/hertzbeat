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
import en from '@/assets/i18n/explore/en-us.json';
import zhCn from '@/assets/i18n/explore/zh-cn.json';
import zhTw from '@/assets/i18n/explore/zh-tw.json';
import ja from '@/assets/i18n/explore/ja-jp.json';
import pt from '@/assets/i18n/explore/pt-br.json';
import { ExploreCalculatedAnalysisResult } from './explore-calculated-analysis-result';
import css from './explore-calculated-analysis-result.module.css?raw';
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
  version: 2 as const,
  window: { start: 120_001, end: 240_000 },
  executed: {
    parameters: { start: '120001', end: '240000' },
    calculatedFields: {
      version: 2 as const,
      fields: [
        {
          id: 'c1',
          kind: 'formula' as const,
          name: 'seconds',
          expression: '@duration_ms / 1000',
          outputs: [{ name: 'seconds', type: 'number' as const }]
        }
      ]
    },
    operation: {
      kind: 'analysis' as const,
      view: 'timeseries' as const,
      grouping: [{ field: 'calculated:seconds', limit: 20 }],
      measure: null,
      limit: 20,
      order: 'count-desc' as const,
      minCount: 1,
      intervalMs: 60_000
    }
  },
  result: {
    kind: 'analysis' as const,
    view: 'timeseries' as const,
    matchingTotal: 3,
    truncated: true,
    intervalMs: 60_000,
    groups: [
      {
        keys: [{ field: 'calculated:seconds', kind: 'value' as const, value: 1.5 }],
        count: 3,
        measurement: null,
        buckets: [
          { start: 120_000, count: 1, measurement: null },
          { start: 180_000, count: 1, measurement: null },
          { start: 240_000, count: 1, measurement: null }
        ]
      }
    ]
  }
};
afterEach(() => {
  cleanup();
  chart.mockClear();
});

it('localizes grouped evidence and gives only its result chart a substantive height', () => {
  for (const locale of [en, zhCn, zhTw, ja, pt]) {
    expect(locale.explore.logCalculatedV2.groupValues).toContain('{{count}}');
    expect(locale.explore.logCalculatedV2.groupUnavailable).toBeTruthy();
    expect(locale.explore.logCalculatedV2.analysisInvalid).toBeTruthy();
  }
  expect(css).toMatch(/\.groupedChart\s*\{[^}]*--hb-perses-compact-height:\s*220px/su);
  render(<ExploreCalculatedAnalysisResult load={{ state: 'ready', data, retry: vi.fn() }} t={t} />);
  expect(screen.getByTestId('native-perses').parentElement?.className).toContain('groupedChart');
});

it('draws server bucket counts and typed group values while showing full matching population', () => {
  render(<ExploreCalculatedAnalysisResult load={{ state: 'ready', data, retry: vi.fn() }} t={t} />);
  expect(screen.getByText('explore.logAnalysis.matching')).toBeVisible();
  expect(screen.getByText('1.5')).toBeVisible();
  expect(screen.getByText('explore.logAnalysis.truncated')).toBeVisible();
  expect(chart).toHaveBeenCalledWith(
    expect.objectContaining({
      outcome: expect.objectContaining({
        truncated: true,
        data: expect.objectContaining({
          series: [
            expect.objectContaining({
              points: [
                { timestamp: 120_000, value: 1 },
                { timestamp: 180_000, value: 1 },
                { timestamp: 240_000, value: 1 }
              ]
            })
          ]
        })
      })
    })
  );
});

it('shows one bucket and typed failures with retry without charting stale data', () => {
  const retry = vi.fn();
  const one = {
    ...data,
    result: {
      ...data.result,
      groups: data.result.groups.map(group => ({ ...group, buckets: group.buckets.slice(0, 1) }))
    }
  };
  const view = render(<ExploreCalculatedAnalysisResult load={{ state: 'ready', data: one, retry }} t={t} />);
  expect(screen.getByText('explore.logAnalysis.singleBucket')).toBeVisible();
  expect(chart).not.toHaveBeenCalled();
  view.rerender(<ExploreCalculatedAnalysisResult load={{ state: 'calculated_budget_exceeded', data, retry }} t={t} />);
  expect(screen.getByText('explore.logCalculatedV2.queryBudgetExceeded')).toBeVisible();
  expect(chart).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(retry).toHaveBeenCalledOnce();
});
