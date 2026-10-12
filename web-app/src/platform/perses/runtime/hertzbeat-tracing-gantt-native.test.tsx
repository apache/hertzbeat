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

import { ThemeProvider } from '@mui/material/styles';
import { ChartsProvider } from '@perses-dev/components';
import { TracingGanttChart, TracingGanttChartCore } from '@perses-dev/tracing-gantt-chart-plugin';
import type { TraceData } from '@perses-dev/spec';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHertzBeatPersesTheme } from './hertzbeat-perses-theme';
import { createHertzBeatChartsTheme } from './hertzbeat-perses-charts-theme';
import en from '@/assets/i18n/explore/en-us.json';
import zh from '@/assets/i18n/explore/zh-cn.json';
import { HertzBeatTracingGanttAdapter } from './hertzbeat-tracing-gantt-adapter';

const labels = vi.hoisted(() => ({ chinese: false }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const tools = (labels.chinese ? zh : en).explore.traceTools as Record<string, string>;
      return key.startsWith('explore.traceTools.') ? (tools[key.split('.').at(-1)!] ?? key) : key;
    }
  })
}));
const rulerLayout = vi.hoisted(() => ({ width: 354 }));
vi.mock('use-resize-observer', () => ({ default: () => ({ width: rulerLayout.width }) }));

vi.mock('react-virtuoso', () => ({
  Virtuoso: ({ data, itemContent }: { data: unknown[]; itemContent: (index: number, item: unknown) => ReactNode }) => (
    <div>
      {data.map((item, index) => (
        <div key={index}>{itemContent(index, item)}</div>
      ))}
    </div>
  )
}));
const traceId = '0123456789abcdef0123456789abcdef';
const first = '1111111111111111';
const second = '2222222222222222';
const theme = createHertzBeatPersesTheme('default', true);
const trace: NonNullable<TraceData['trace']> = {
  resourceSpans: [
    {
      resource: { attributes: [{ key: 'service.name', value: { stringValue: 'checkout' } }] },
      scopeSpans: [
        {
          spans: [
            {
              traceId,
              spanId: first,
              parentSpanId: '3333333333333333',
              name: 'request',
              startTimeUnixNano: '1000000000',
              endTimeUnixNano: '1003000000'
            },
            {
              traceId,
              spanId: second,
              parentSpanId: first,
              name: 'database',
              startTimeUnixNano: '1001000000',
              endTimeUnixNano: '1002000000'
            }
          ]
        }
      ]
    }
  ]
};

afterEach(() => {
  cleanup();
  labels.chinese = false;
  vi.restoreAllMocks();
});
describe('official Gantt host controls', () => {
  it('announces zero search matches while retaining all 17 spans and selection', () => {
    const forest = structuredClone(trace);
    const spans = forest.resourceSpans[0]!.scopeSpans[0]!.spans;
    for (let i = 2; i < 17; i++)
      spans.push({ ...spans[1]!, spanId: i.toString(16).padStart(16, '0'), name: `operation-${i}` });
    const select = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <ChartsProvider chartsTheme={createHertzBeatChartsTheme(theme)}>
          <HertzBeatTracingGanttAdapter data={{ trace: forest }} selectedSpanId={first} onSpanSelect={select} />
        </ChartsProvider>
      </ThemeProvider>
    );
    const input = screen.getByPlaceholderText('Search spans...');
    fireEvent.change(input, { target: { value: 'impossible-match' } });
    expect(screen.getByRole('status')).toHaveTextContent(en.explore.traceTools.searchNoMatches);
    expect(screen.getAllByTestId('span-duration-bar')).toHaveLength(17);
    expect(screen.getByRole('button', { name: 'Previous match' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next match' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(input).toHaveValue('');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('span-duration-bar')).toHaveLength(17);
    expect(select).not.toHaveBeenCalled();
  });
  it('keeps the independently selected error view unchanged during zero-match search', () => {
    const select = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <ChartsProvider chartsTheme={createHertzBeatChartsTheme(theme)}>
          <HertzBeatTracingGanttAdapter data={{ trace }} selectedSpanId={first} onSpanSelect={select} />
        </ChartsProvider>
      </ThemeProvider>
    );
    fireEvent.click(screen.getByRole('checkbox', { name: en.explore.traceTools.errors }));
    expect(screen.queryByTestId('span-duration-bar')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(en.explore.traceTools.search), { target: { value: 'impossible' } });
    expect(screen.getByText(en.explore.traceTools.searchNoMatches)).toHaveAttribute('role', 'status');
    expect(screen.queryByTestId('span-duration-bar')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en.explore.traceTools.clearSearch }));
    expect(screen.queryByText(en.explore.traceTools.searchNoMatches)).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: en.explore.traceTools.errors })).toBeChecked();
    expect(select).not.toHaveBeenCalled();
  });
  it('uses host locale for search controls and the service/operation heading', () => {
    labels.chinese = true;
    render(
      <ThemeProvider theme={theme}>
        <ChartsProvider chartsTheme={createHertzBeatChartsTheme(theme)}>
          <HertzBeatTracingGanttAdapter data={{ trace }} />
        </ChartsProvider>
      </ThemeProvider>
    );
    const copy = zh.explore.traceTools as Record<string, string>;
    expect(screen.getByPlaceholderText(copy.search!)).toBeVisible();
    expect(screen.getByRole('button', { name: copy.previousMatch! })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: copy.nextMatch! })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: copy.clearSearch! })).toBeInTheDocument();
    expect(screen.getByText(copy.serviceOperation!)).toBeVisible();
  });
  it.each(['default', 'dark'] as const)('keeps %s service colors stable across errors and selection', mode => {
    const currentTheme = createHertzBeatPersesTheme(mode, true);
    const mixed = structuredClone(trace);
    mixed.resourceSpans[0]!.scopeSpans[0]!.spans[0]!.status = { code: 'STATUS_CODE_ERROR' };
    mixed.resourceSpans.push({
      resource: { attributes: [{ key: 'service.name', value: { stringValue: 'inventory' } }] },
      scopeSpans: [{ spans: [{ ...mixed.resourceSpans[0]!.scopeSpans[0]!.spans[1]!, spanId: '4444444444444444' }] }]
    });
    const subject = (selectedSpanId?: string) => (
      <ThemeProvider theme={currentTheme}>
        <ChartsProvider chartsTheme={createHertzBeatChartsTheme(currentTheme)}>
          <HertzBeatTracingGanttAdapter
            data={{ trace: mixed }}
            selectedSpanId={selectedSpanId}
            onSpanSelect={vi.fn()}
          />
        </ChartsProvider>
      </ThemeProvider>
    );
    const view = render(subject(first));
    const fills = () =>
      screen
        .getAllByTestId('span-duration-bar')
        .map(bar => bar.style.backgroundColor)
        .sort();
    const expected = ['rgb(78, 116, 91)', 'rgb(78, 116, 91)', 'rgb(248, 204, 45)'].sort();
    expect(fills()).toEqual(expected);
    expect(screen.getByTitle('error')).toBeInTheDocument();
    view.rerender(subject(second));
    expect(fills()).toEqual(expected);
  });
  it('focuses a subtree and resets without changing full trace data', () => {
    const subject = (focusedSpanId?: string) => (
      <ThemeProvider theme={theme}>
        <ChartsProvider chartsTheme={createHertzBeatChartsTheme(theme)}>
          <TracingGanttChartCore
            trace={trace}
            options={{}}
            hideHeader
            hideDetails
            hideMiniMap
            displayOptions={focusedSpanId ? { focusedSpanId } : {}}
          />
        </ChartsProvider>
      </ThemeProvider>
    );
    const view = render(subject(second));
    expect(screen.queryByRole('button', { name: `checkout · request · ${first}` })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: `checkout · database · ${second}` })).toBeInTheDocument();
    view.rerender(subject());
    expect(screen.getByRole('button', { name: `checkout · request · ${first}` })).toBeInTheDocument();
    expect(trace.resourceSpans[0]!.scopeSpans[0]!.spans).toHaveLength(2);
  });
  it('uses one service color across operations and statuses, then separates errors in status mode', () => {
    const mixed = structuredClone(trace);
    mixed.resourceSpans[0]!.scopeSpans[0]!.spans[0]!.status = { code: 'STATUS_CODE_ERROR' };
    const subject = (mode: 'auto' | 'status') => (
      <ThemeProvider theme={theme}>
        <ChartsProvider chartsTheme={createHertzBeatChartsTheme(theme)}>
          <TracingGanttChartCore
            trace={mixed}
            options={{ visual: { palette: { mode } } }}
            hideHeader
            hideDetails
            hideMiniMap
          />
        </ChartsProvider>
      </ThemeProvider>
    );
    const view = render(subject('auto'));
    const colors = () => screen.getAllByTestId('span-duration-bar').map(bar => getComputedStyle(bar).backgroundColor);
    expect(colors()[0]).toBe(colors()[1]);
    view.rerender(subject('status'));
    expect(colors()[0]).not.toBe(colors()[1]);
    expect(screen.getAllByTestId('span-duration-bar')[0]).toHaveStyle({ backgroundColor: theme.palette.error.main });
    expect(screen.getAllByTestId('span-duration-bar')[1]).toHaveStyle({ backgroundColor: theme.palette.grey[500] });
  });
  it('keeps error ancestors, expands collapsed rows, and switches real bars to a duration list', () => {
    const errors = structuredClone(trace);
    errors.resourceSpans[0]!.scopeSpans[0]!.spans[1]!.status = { code: 'STATUS_CODE_ERROR' };
    const subject = (collapsed: boolean, revision: number, list = false) => (
      <ThemeProvider theme={theme}>
        <ChartsProvider chartsTheme={createHertzBeatChartsTheme(theme)}>
          <TracingGanttChartCore
            trace={errors}
            options={{ visual: { palette: { mode: 'status' }, spanList: list } }}
            hideHeader
            hideDetails
            hideMiniMap
            displayOptions={{ errorsOnly: true, collapsed, collapseRevision: revision, durationLabel: 'Duration' }}
          />
        </ChartsProvider>
      </ThemeProvider>
    );
    const view = render(subject(true, 1));
    expect(screen.queryByRole('button', { name: `checkout · database · ${second}` })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: `checkout · request · ${first}` })).toBeInTheDocument();
    view.rerender(subject(false, 2));
    expect(screen.getByRole('button', { name: `checkout · database · ${second}` })).toBeInTheDocument();
    expect(screen.getAllByTestId('span-duration-bar')[1]).toHaveStyle({ backgroundColor: theme.palette.error.main });
    view.rerender(subject(false, 2, true));
    expect(screen.queryByTestId('span-duration-bar')).not.toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
  });
  it('explains an empty error view without replacing trace evidence', () => {
    render(
      <ThemeProvider theme={theme}>
        <ChartsProvider chartsTheme={createHertzBeatChartsTheme(theme)}>
          <TracingGanttChartCore
            trace={trace}
            options={{}}
            hideHeader
            hideDetails
            hideMiniMap
            displayOptions={{ errorsOnly: true, emptyLabel: 'No matching spans' }}
          />
        </ChartsProvider>
      </ThemeProvider>
    );
    expect(screen.getByRole('status')).toHaveTextContent('No matching spans');
    expect(screen.queryByRole('button', { name: `checkout · request · ${first}` })).not.toBeInTheDocument();
  });
  it('retains ruler endpoints and removes only colliding interior labels as the ruler resizes', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return new DOMRect(0, 0, this.hasAttribute('data-trace-tick') ? 60 : 0, 0);
    });
    const subject = () => (
      <ThemeProvider theme={theme}>
        <ChartsProvider chartsTheme={createHertzBeatChartsTheme(theme)}>
          <HertzBeatTracingGanttAdapter data={{ trace }} onSpanSelect={vi.fn()} />
        </ChartsProvider>
      </ThemeProvider>
    );
    const view = render(subject());
    const visibleTicks = () =>
      [...view.container.querySelectorAll<HTMLElement>('[data-trace-tick]')].filter(
        tick => tick.style.visibility !== 'hidden'
      );
    expect(visibleTicks()).toHaveLength(3);
    rulerLayout.width = 150;
    view.rerender(subject());
    expect(visibleTicks().map(tick => tick.dataset.traceTick)).toEqual(['0', '4']);
    rulerLayout.width = 500;
    view.rerender(subject());
    expect(visibleTicks()).toHaveLength(5);
    rulerLayout.width = 354;
  });

  it('retains view state for updated rows and resets it for a new evidence time context', () => {
    const select = vi.fn();
    const subject = (contextKey: string, selected: string, traceData = trace) => (
      <ThemeProvider theme={theme}>
        <ChartsProvider chartsTheme={createHertzBeatChartsTheme(theme)}>
          <HertzBeatTracingGanttAdapter
            data={{ trace: structuredClone(traceData) }}
            selectedSpanId={selected}
            onSpanSelect={select}
            evidenceIdentity={contextKey}
          />
        </ChartsProvider>
      </ThemeProvider>
    );
    const view = render(subject('scope:window-1', first));
    const input = screen.getByPlaceholderText('Search spans...');
    const toolbar = input.closest('[data-perses-trace-toolbar]');
    expect(toolbar).not.toBeNull();
    const overview = toolbar?.querySelector<HTMLButtonElement>('button[aria-expanded]');
    expect(overview).not.toBeNull();
    expect(overview).toHaveAttribute('aria-expanded', 'false');
    const operation = screen.getByRole('button', { name: `checkout · database · ${second}` });
    expect(operation.textContent).toMatch(/^database/);
    expect(operation.parentElement).toHaveStyle({ width: '45%' });
    fireEvent.change(input, { target: { value: 'database' } });
    fireEvent.click(overview!);
    expect(overview).toHaveAttribute('aria-expanded', 'true');

    const expandedTrace = structuredClone(trace);
    expandedTrace.resourceSpans[0]!.scopeSpans[0]!.spans.push({
      traceId,
      spanId: '4444444444444444',
      parentSpanId: first,
      name: 'cache lookup',
      startTimeUnixNano: '1001500000',
      endTimeUnixNano: '1001800000'
    });
    view.rerender(subject('scope:window-1', second, expandedTrace));
    expect(screen.getByPlaceholderText('Search spans...')).toBe(input);
    expect(input).toHaveValue('database');
    const updatedOverview = screen
      .getByPlaceholderText('Search spans...')
      .closest('[data-perses-trace-toolbar]')
      ?.querySelector('button[aria-expanded]');
    expect(updatedOverview).toHaveAttribute('aria-expanded', 'true');

    view.rerender(subject('scope:window-2', second, expandedTrace));
    expect(screen.getByPlaceholderText('Search spans...')).not.toBe(input);
    expect(screen.getByPlaceholderText('Search spans...')).toHaveValue('');
    const resetOverview = screen
      .getByPlaceholderText('Search spans...')
      .closest('[data-perses-trace-toolbar]')
      ?.querySelector('button[aria-expanded]');
    expect(resetOverview).toHaveAttribute('aria-expanded', 'false');
    expect(select).not.toHaveBeenCalled();
  });

  it('resets view state when the trace id changes inside the same owner identity', () => {
    const subject = (traceData: NonNullable<TraceData['trace']>) => (
      <ThemeProvider theme={theme}>
        <ChartsProvider chartsTheme={createHertzBeatChartsTheme(theme)}>
          <HertzBeatTracingGanttAdapter data={{ trace: traceData }} evidenceIdentity="scope:window" />
        </ChartsProvider>
      </ThemeProvider>
    );
    const view = render(subject(structuredClone(trace)));
    const input = screen.getByPlaceholderText('Search spans...');
    fireEvent.change(input, { target: { value: 'database' } });

    const otherTrace = structuredClone(trace);
    for (const resourceSpan of otherTrace.resourceSpans) {
      for (const scopeSpan of resourceSpan.scopeSpans) {
        for (const span of scopeSpan.spans) span.traceId = 'abcdef0123456789abcdef0123456789';
      }
    }
    view.rerender(subject(otherTrace));

    expect(screen.getByPlaceholderText('Search spans...')).not.toBe(input);
    expect(screen.getByPlaceholderText('Search spans...')).toHaveValue('');
  });

  it('exports the core without replacing the existing panel plugin', () => {
    expect(typeof TracingGanttChartCore).toBe('function');
    expect(typeof TracingGanttChart).toBe('object');
  });
  it('selects actual forest operations by keyboard click even after text selection, with reachable collapse', () => {
    const select = vi.fn();
    const view = render(
      <ThemeProvider theme={theme}>
        <ChartsProvider chartsTheme={createHertzBeatChartsTheme(theme)}>
          <TracingGanttChartCore
            trace={trace}
            options={{}}
            selectedSpanId={first}
            onSelectSpan={select}
            hideHeader
            hideDetails
            hideMiniMap
          />
        </ChartsProvider>
      </ThemeProvider>
    );
    const operation = screen.getByRole('button', { name: `checkout · database · ${second}` });
    expect(screen.getByPlaceholderText('Search spans...').closest('[data-perses-trace-toolbar]')).toBeNull();
    operation.focus();
    vi.spyOn(document, 'getSelection').mockReturnValue({ type: 'Range' } as Selection);
    fireEvent.click(operation, { detail: 0 });
    expect(select).toHaveBeenCalledWith(second);
    const collapse = screen.getByRole('button', { name: 'collapse' });
    fireEvent.keyDown(collapse, { key: 'Enter' });
    expect(screen.queryByRole('button', { name: `checkout · database · ${second}` })).toBeNull();
    fireEvent.keyDown(screen.getByRole('button', { name: 'expand' }), { key: ' ' });
    expect(screen.getByRole('button', { name: `checkout · database · ${second}` })).toBeInTheDocument();
    const search = screen.getByPlaceholderText('Search spans...');
    fireEvent.change(search, { target: { value: 'database' } });
    view.rerender(
      <ThemeProvider theme={theme}>
        <ChartsProvider chartsTheme={createHertzBeatChartsTheme(theme)}>
          <TracingGanttChartCore
            trace={trace}
            options={{}}
            selectedSpanId={second}
            onSelectSpan={select}
            hideHeader
            hideDetails
            hideMiniMap
          />
        </ChartsProvider>
      </ThemeProvider>
    );
    expect(screen.getByPlaceholderText('Search spans...')).toHaveValue('database');
    expect(select).toHaveBeenCalledOnce();
  });
});
