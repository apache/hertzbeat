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

import { EditorView } from '@codemirror/view';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_LOG_ANALYSIS, encodeLogAnalysis } from '@/platform/perses';

import type { useExplorePageController } from '../controller/use-explore-page-controller';
import { ExploreLogTrendRegion } from './explore-log-trend-region';

const t = ((key: string) => key) as TFunction;
let queryEditor: EditorView | null = null;
afterEach(() => {
  localStorage.clear();
  queryEditor?.destroy();
  queryEditor = null;
  cleanup();
});

it('honors the timeline setting in the production workspace region', () => {
  const controller = {
    query: {
      signal: 'logs',
      logView: JSON.stringify({
        version: 1,
        columns: [{ kind: 'message' }],
        density: 'compact',
        wrap: false,
        showTimeline: false
      })
    },
    result: { kind: 'invalid_query' }
  } as unknown as ReturnType<typeof useExplorePageController>;
  if (controller.query.signal !== 'logs') throw new Error('Expected a logs fixture');
  const view = render(<ExploreLogTrendRegion controller={controller} t={t} />);
  expect(screen.queryByRole('region', { name: 'exploreLog.trend' })).not.toBeInTheDocument();
  view.rerender(
    <ExploreLogTrendRegion controller={{ ...controller, query: { ...controller.query, logView: undefined } }} t={t} />
  );
  expect(screen.getByRole('region', { name: 'exploreLog.trend' })).toBeInTheDocument();
});

function renderFailure(result: object) {
  const controller = {
    query: { signal: 'logs', live: false },
    result,
    refresh: vi.fn(),
    openPath: vi.fn()
  } as unknown as ReturnType<typeof useExplorePageController>;
  render(
    <div data-explore-query-layout="split">
      <div data-log-comparison-source="a">
        <div data-log-search-syntax="structured-v1">
          <div data-testid="query-editor" />
        </div>
      </div>
      <ExploreLogTrendRegion controller={controller} t={t} />
    </div>
  );
  queryEditor = new EditorView({ parent: screen.getByTestId('query-editor'), doc: 'bad:' });
  queryEditor.contentDOM.setAttribute('data-log-search-input', '');
  queryEditor.contentDOM.setAttribute('aria-label', 'Search A');
  return { controller, input: queryEditor.contentDOM, editor: queryEditor };
}

it('reviews a structured query diagnostic at the exact invalid range', () => {
  const { input, editor } = renderFailure({
    kind: 'invalid_filter',
    syntaxDiagnostic: { issue: 'missing_value', expression: 'bad:', start: 3, end: 4 }
  });
  fireEvent.click(screen.getByRole('button', { name: 'explore.recovery.reviewQuery' }));
  expect(input).toHaveFocus();
  expect([editor.state.selection.main.anchor, editor.state.selection.main.head]).toEqual([3, 4]);
});

it('focuses the current source A search when invalid query has no diagnostic', () => {
  const { input, controller } = renderFailure({ kind: 'invalid_query' });
  fireEvent.click(screen.getByRole('button', { name: 'explore.recovery.reviewQuery' }));
  expect(input).toHaveFocus();
  expect(controller.refresh).not.toHaveBeenCalled();
});

it('shows a bounded calculated budget failure with retry in the trend region', () => {
  const { controller } = renderFailure({ kind: 'calculated_budget_exceeded' });
  expect(screen.getByText('explore.logCalculatedV2.queryBudgetExceeded')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'exploreLog.trend' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(controller.refresh).toHaveBeenCalledOnce();
});

it('defaults the duplicate trend closed in time series and resets on returning to logs', () => {
  const makeController = (logAnalysis?: string) =>
    ({
      query: { signal: 'logs', live: false, start: 1000, end: 3000, logAnalysis },
      result: {
        kind: 'ready',
        signal: 'logs',
        data: { content: [], totalElements: 0, size: 20 },
        statistics: {
          overview: {
            kind: 'ready',
            data: {
              totalCount: 0,
              traceCount: 0,
              debugCount: 0,
              infoCount: 0,
              warnCount: 0,
              errorCount: 0,
              fatalCount: 0
            }
          },
          trend: {
            kind: 'ready',
            data: {
              start: 1000,
              end: 3000,
              intervalMs: 1000,
              buckets: [
                { start: 1000, count: 0 },
                { start: 2000, count: 0 }
              ]
            }
          }
        },
        window: { from: 1000, to: 3000 },
        revision: 1
      },
      openPath: vi.fn()
    }) as unknown as ReturnType<typeof useExplorePageController>;
  const timeseries = encodeLogAnalysis({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries' });
  const view = render(<ExploreLogTrendRegion controller={makeController()} t={t} />);
  const density = () => view.container.querySelector('[data-trend-density]');
  expect(density()).toHaveAttribute('data-trend-density', 'visualization');
  view.rerender(<ExploreLogTrendRegion controller={makeController(timeseries)} t={t} />);
  expect(density()).toHaveAttribute('data-trend-density', 'compact');
  fireEvent.click(screen.getByRole('button', { name: 'explore.perses.expandTrend' }));
  view.rerender(<ExploreLogTrendRegion controller={makeController(timeseries)} t={t} />);
  expect(density()).toHaveAttribute('data-trend-density', 'visualization');
  view.rerender(<ExploreLogTrendRegion controller={makeController()} t={t} />);
  expect(density()).toHaveAttribute('data-trend-density', 'visualization');
  fireEvent.click(screen.getByRole('button', { name: 'explore.perses.collapseTrend' }));
  view.rerender(<ExploreLogTrendRegion controller={makeController()} t={t} />);
  expect(density()).toHaveAttribute('data-trend-density', 'compact');
  view.rerender(<ExploreLogTrendRegion controller={makeController(timeseries)} t={t} />);
  expect(density()).toHaveAttribute('data-trend-density', 'compact');
});
