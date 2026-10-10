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

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import resultFrameStyles from '../components/signal-result-frame.module.css?raw';
import toolbarStyles from '../components/explore-log-result-toolbar.module.css?raw';
import inspectorStyles from '../components/explore-log-inspector.module.css?raw';

type MockRowSelection = {
  columns?: Array<{ id: string; getValue?: (index: number) => string | undefined }>;
  getAriaLabel: (index: number) => string;
  onSelect: (index: number, row: HTMLElement) => void;
};

const persesContract = vi.hoisted<{
  logDisplay: unknown;
  rowSelection: MockRowSelection | undefined;
  rowCount: number;
  preserveLogOrder: boolean;
}>(() => ({
  logDisplay: undefined,
  rowSelection: undefined,
  rowCount: 1,
  preserveLogOrder: false
}));

vi.mock('@/platform/perses', async importOriginal => ({
  ...(await importOriginal<typeof import('@/platform/perses')>()),
  HERTZBEAT_QUERY_LIMITS: { maximumWindowMs: 86_400_000 },
  orderHertzBeatLogRowsForPerses: (rows: Array<{ timeUnixNano: string | null; observedTimeUnixNano: string | null }>) =>
    [...rows].sort((left, right) =>
      (right.timeUnixNano ?? right.observedTimeUnixNano ?? '0').localeCompare(
        left.timeUnixNano ?? left.observedTimeUnixNano ?? '0'
      )
    ),
  HertzBeatLogsTableResult: ({
    logDisplay,
    logRowSelection,
    preserveLogOrder
  }: {
    logDisplay?: unknown;
    logRowSelection?: MockRowSelection;
    preserveLogOrder?: boolean;
  }) => {
    persesContract.logDisplay = logDisplay;
    persesContract.rowSelection = logRowSelection;
    persesContract.preserveLogOrder = Boolean(preserveLogOrder);
    return (
      <div>
        {Array.from({ length: persesContract.rowCount }, (_, index) => (
          <button
            key={index}
            type="button"
            data-log-index={index}
            onClick={event => logRowSelection?.onSelect(index, event.currentTarget)}
          >
            {logRowSelection?.getAriaLabel(index)}
          </button>
        ))}
      </div>
    );
  },
  HertzBeatMetricTimeSeriesResult: ({
    onTimeWindowChange,
    timeWindowChangeEnabled
  }: {
    onTimeWindowChange?: ((window: { from: number; to: number }) => void) | undefined;
    timeWindowChangeEnabled?: boolean | undefined;
  }) => (
    <button
      type="button"
      disabled={!timeWindowChangeEnabled}
      onClick={() => onTimeWindowChange?.({ from: evidenceWindow.from + 60_000, to: evidenceWindow.to - 60_000 })}
    >
      Zoom trend
    </button>
  )
}));

import { parseExploreQuery } from '../model/explore-model';
import type { LogExploreQuery } from '../model/explore-query';
import type { LogHistoryEvidence } from '../model/explore-signal-contract';
import { ExplorePersesLogPanel } from './explore-perses-log-panel';

const evidenceWindow = { from: 1_750_000_000_000, to: 1_750_003_600_000 } as const;

describe('ExplorePersesLogPanel trend ownership', () => {
  it('hides the timeline from a saved display choice without hiding log rows', () => {
    renderPanel(
      {
        ...query,
        logView: JSON.stringify({
          version: 1,
          columns: [{ kind: 'time' }, { kind: 'message' }],
          density: 'compact',
          wrap: false,
          showTimeline: false
        })
      },
      true,
      vi.fn()
    );
    expect(screen.queryByRole('button', { name: 'Zoom trend' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Options' })).toBeInTheDocument();
  });
  it('keeps calculated values in the existing Logs columns and row inspector', () => {
    const calculated: NonNullable<LogHistoryEvidence['calculated']> = {
      version: 2,
      window: { start: evidenceWindow.from, end: evidenceWindow.to },
      executed: {
        parameters: {},
        calculatedFields: {
          version: 2,
          fields: [
            {
              id: 'c1',
              kind: 'formula',
              name: 'durationSeconds',
              expression: '@duration_ms / 1000',
              outputs: [{ name: 'durationSeconds', type: 'number' }]
            }
          ]
        },
        operation: { kind: 'page', pageIndex: 0, pageSize: 20, sort: { field: 'timestamp', direction: 'desc' } }
      },
      result: { kind: 'page', totalElements: 1, rows: [{ log: page.content[0]!, derived: { durationSeconds: 1.307 } }] }
    };
    render(panelView({ ...query, logRecordUid: undefined }, true, vi.fn(), page, 1, evidenceWindow, calculated));
    expect(persesContract.preserveLogOrder).toBe(true);
    expect(
      persesContract.rowSelection?.columns?.find(column => column.id === 'calculated:durationSeconds')?.getValue?.(0)
    ).toBe('1.307');
    fireEvent.click(screen.getByRole('button', { name: /timeout/u }));
    expect(screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).toHaveTextContent(
      '#durationSeconds'
    );
    expect(screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).toHaveTextContent('1.307');
  });
  it('collapses only the trend while leaving the result tools and native rows reachable', () => {
    renderPanel(query, true, vi.fn());
    fireEvent.click(screen.getByRole('button', { name: 'Collapse trend' }));
    expect(screen.queryByRole('button', { name: 'Zoom trend' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Options' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expand trend' }));
    expect(screen.getByRole('button', { name: 'Zoom trend' })).toBeInTheDocument();
  });
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  beforeEach(() => {
    localStorage.clear();
    persesContract.logDisplay = undefined;
    persesContract.rowSelection = undefined;
  });

  it('keeps the result identity stable while stretching toolbar actions to the right boundary', () => {
    expect(resultFrameStyles).toMatch(/\.identity\s*\{[^}]*flex:\s*none[^}]*white-space:\s*nowrap/s);
    expect(resultFrameStyles).toMatch(/\.headerTools\s*\{[^}]*flex:\s*1 1 auto/s);
    expect(toolbarStyles).toMatch(/\.toolbar\s*\{[^}]*width:\s*100%[^}]*flex:\s*1 1 auto/s);
  });
  afterEach(cleanup);

  it('keeps result controls in one header and reopens URL-owned display preferences', async () => {
    localStorage.clear();
    const openPath = vi.fn();
    let view = renderPanel(query, true, openPath);

    const result = view.container.querySelector('[data-explore-log-region="result"]');
    expect(result).not.toBeNull();
    expect(result?.querySelectorAll('header')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Export page' })).not.toBeInTheDocument();
    expect(screen.queryByText('1 / 57')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Page: 3 / 3')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /^Historical result pages/u })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /^Historical result pages/u })).toHaveAttribute(
      'data-pagination-variant',
      'compact'
    );
    expect(result?.lastElementChild).not.toHaveAttribute('aria-label', 'Historical result pages');

    const reopen = () => {
      const next = parseExploreQuery(new URL(String(openPath.mock.calls.at(-1)?.[0]), 'http://local').searchParams);
      expect(next.signal).toBe('logs');
      view.unmount();
      view = renderPanel(next as LogExploreQuery, true, openPath);
    };
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(await screen.findByRole('radio', { name: i18n.t('explore.perses.rowHeightMedium') }));
    expect(openPath).toHaveBeenCalledTimes(1);
    reopen();
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(await screen.findByRole('radio', { name: i18n.t('explore.perses.rowHeightLarge') }));
    expect(openPath).toHaveBeenCalledTimes(2);
    reopen();
    expect(persesContract.logDisplay).toMatchObject({
      density: 'comfortable',
      wrap: true,
      showTime: true,
      rowHeight: 'large'
    });
    expect(screen.queryByRole('button', { name: 'Show time' })).not.toBeInTheDocument();
  });

  it('keeps severity summary separate from the applied query', () => {
    const openPath = vi.fn();
    renderPanel({ ...query, severityText: 'SEVERE' }, true, openPath);
    expect(screen.getByRole('list', { name: i18n.t('exploreLog.statisticsScope') })).toHaveTextContent('Total57');
    expect(screen.queryByRole('button', { name: 'WARN 1' })).not.toBeInTheDocument();
    expect(openPath).not.toHaveBeenCalled();
  });

  it('publishes a current trend zoom as a canonical exact query and shows offset-page provenance', () => {
    const openPath = vi.fn();
    renderPanel(query, true, openPath);

    expect(screen.queryByText('1 / 57')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Page: 3 / 3')).toBeInTheDocument();
    const exactWindow = `${new Date(evidenceWindow.from).toISOString()} – ${new Date(evidenceWindow.to).toISOString()}`;
    expect(screen.queryByText(exactWindow)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Query details' }));
    expect(screen.getByText('1 / 57')).toBeInTheDocument();
    expect(screen.getByText(exactWindow)).toBeInTheDocument();
    expect(screen.getByText(i18n.t('explore.perses.historicalEvidence'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Zoom trend' }));

    const params = new URLSearchParams(String(openPath.mock.calls[0]?.[0]).split('?')[1]);
    expect(Object.fromEntries(params)).toMatchObject({
      signal: 'logs',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod',
      query: '"timeout"',
      searchSyntax: 'structured-v1',
      severityText: 'WARN',
      resourceFilter: 'cloud.region=us-east',
      attributeFilter: 'http.status_code=500',
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: '0123456789abcdef',
      start: String(evidenceWindow.from + 60_000),
      end: String(evidenceWindow.to - 60_000)
    });
    expect(params.has('windowMode')).toBe(false);
    expect(params.has('page')).toBe(false);
    expect(params.has('logRecordUid')).toBe(false);
  });

  it('does not expose trend zoom while retained evidence is stale', () => {
    const openPath = vi.fn();
    renderPanel(query, false, openPath);

    expect(screen.getByRole('button', { name: 'Zoom trend' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom trend' }));
    expect(openPath).not.toHaveBeenCalled();
  });

  it('reports zero pages for an empty response instead of an impossible requested page', () => {
    renderPanel({ ...query, pageIndex: 4 }, true, vi.fn(), {
      ...page,
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0
    });

    fireEvent.click(screen.getByRole('button', { name: 'Query details' }));
    expect(screen.getByLabelText('Page: 0 / 0')).toBeInTheDocument();
    expect(screen.queryByText('5 / 0')).not.toBeInTheDocument();
  });

  it('inspects the same timestamp-descending row rendered by Perses without changing result geometry', async () => {
    const newest = {
      ...page.content[0]!,
      logRecordUid: 'newest',
      body: 'newest rendered row',
      timeUnixNano: '1750000002000000000',
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: '0123456789abcdef'
    };
    const older = {
      ...page.content[0]!,
      logRecordUid: 'older',
      body: 'older source row',
      timeUnixNano: '1750000001000000000'
    };
    const openPath = vi.fn();
    const view = renderPanel(query, true, openPath, { ...page, content: [older, newest] });
    const host = view.container.querySelector('[data-log-inspector-open]');
    expect(host).toHaveAttribute('data-log-inspector-open', 'false');
    expect(inspectorStyles).toMatch(/\.inspector\s*\{[^}]*position:\s*fixed/s);
    expect(persesContract.rowSelection?.getAriaLabel(99)).toBe('Historical logs');

    const firstRenderedRow = screen.getByRole('button', { name: /newest rendered row/u });
    fireEvent.click(firstRenderedRow);
    expect(screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).toHaveTextContent(
      'newest rendered row'
    );
    expect(host).toHaveAttribute('data-log-inspector-open', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Investigate' }));
    expect(openPath.mock.calls.at(-1)?.[0]).toContain('logRecordUid=newest');

    fireEvent.click(screen.getByRole('button', { name: 'Close inspector' }));
    await waitFor(() => expect(firstRenderedRow).toHaveFocus());
    expect(host).toHaveAttribute('data-log-inspector-open', 'false');
  });

  it('keeps inspector selection while navigating to the previous history page', async () => {
    const openPath = vi.fn();
    const view = renderPanel(query, true, openPath);
    fireEvent.click(screen.getByRole('button', { name: /timeout/u }));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.perses.previousLog') }));

    expect(openPath).toHaveBeenCalledTimes(1);
    expect(new URL(String(openPath.mock.calls[0]?.[0]), 'http://local').searchParams.get('page')).toBe('1');

    const previousPage = {
      ...page,
      number: 1,
      content: Array.from({ length: 20 }, (_, index) => ({
        ...page.content[0]!,
        logRecordUid: `previous-${index}`,
        body: `previous page row ${index}`,
        timeUnixNano: String(1_750_000_000_000_000_000n + BigInt(index) * 1_000_000_000n)
      }))
    };
    view.rerender(panelView({ ...query, pageIndex: 1 }, true, openPath, previousPage, 1, evidenceWindow));
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).toHaveTextContent(
        'previous page row 0'
      )
    );
    expect(
      screen.getByLabelText(i18n.t('explore.perses.selectedLogPosition', { current: 20, total: 20 }))
    ).toHaveTextContent('20 / 20');
  });

  it('uses native Down navigation to load the next page and select its first row', async () => {
    const openPath = vi.fn();
    const middlePage = {
      ...page,
      number: 1,
      content: Array.from({ length: 20 }, (_, index) => ({
        ...page.content[0]!,
        logRecordUid: `middle-${index}`,
        body: `middle page row ${index}`,
        timeUnixNano: String(1_750_000_000_000_000_000n + BigInt(index) * 1_000_000_000n)
      }))
    };
    const view = renderPanel({ ...query, pageIndex: 1 }, true, openPath, middlePage);
    fireEvent.click(screen.getByRole('button', { name: /middle page row 0/u }));
    const inspector = screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') });
    fireEvent.keyDown(inspector, { key: 'ArrowDown' });

    expect(new URL(String(openPath.mock.calls[0]?.[0]), 'http://local').searchParams.get('page')).toBe('2');
    view.rerender(panelView({ ...query, pageIndex: 2 }, false, openPath, middlePage, 1, evidenceWindow));
    expect(inspector).toHaveAttribute('aria-busy', 'true');
    expect(inspector).toHaveTextContent('middle page row 0');
    expect(screen.getByRole('button', { name: i18n.t('explore.perses.copyLog') })).toBeDisabled();
    expect(screen.getByRole('button', { name: i18n.t('explore.perses.nextLog') })).toBeDisabled();
    fireEvent.keyDown(inspector, { key: 'ArrowDown' });
    expect(openPath).toHaveBeenCalledTimes(1);

    const lastPage = {
      ...page,
      number: 2,
      content: Array.from({ length: 17 }, (_, index) => ({
        ...page.content[0]!,
        logRecordUid: `last-${index}`,
        body: `last page row ${index}`,
        timeUnixNano: String(1_750_000_100_000_000_000n + BigInt(index) * 1_000_000_000n)
      }))
    };
    view.rerender(panelView({ ...query, pageIndex: 2 }, true, openPath, lastPage, 1, evidenceWindow));
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).toHaveTextContent(
        'last page row 16'
      )
    );
  });

  it('sends only one adjacent-page request for rapid boundary keys and ignores stale evidence', () => {
    const openPath = vi.fn();
    const view = renderPanel({ ...query, pageIndex: 1 }, true, openPath, {
      ...page,
      number: 1
    });
    fireEvent.click(screen.getByRole('button', { name: /timeout/u }));
    const inspector = screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') });
    fireEvent.keyDown(inspector, { key: 'ArrowDown' });
    fireEvent.keyDown(inspector, { key: 'ArrowDown' });

    expect(openPath).toHaveBeenCalledTimes(1);

    view.rerender(panelView({ ...query, pageIndex: 1 }, false, openPath, { ...page, number: 1 }, 1, evidenceWindow));
    fireEvent.keyDown(inspector, { key: 'ArrowDown' });
    expect(openPath).toHaveBeenCalledTimes(1);
  });

  it.each<[string, { query?: LogExploreQuery; timeWindow?: { from: number; to: number } }]>([
    ['filter or sort scope', { query: { ...query, severityText: 'ERROR', sort: 'oldest' as const } }],
    ['time window', { timeWindow: { from: evidenceWindow.from + 1_000, to: evidenceWindow.to } }]
  ])('closes an outdated inspector after %s changes', (_label, update) => {
    const openPath = vi.fn();
    const view = renderPanel(query, true, openPath);
    fireEvent.click(screen.getByRole('button', { name: /timeout/u }));
    expect(screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).toBeInTheDocument();

    view.rerender(panelView(update.query ?? query, true, openPath, page, 1, update.timeWindow ?? evidenceWindow));
    expect(screen.queryByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).not.toBeInTheDocument();
  });

  it('does not restore a pending page selection after the Inspector is closed', () => {
    const openPath = vi.fn();
    const middlePage = {
      ...page,
      number: 1,
      content: Array.from({ length: 20 }, (_, index) => ({
        ...page.content[0]!,
        logRecordUid: `middle-${index}`,
        body: `middle page row ${index}`,
        timeUnixNano: String(1_750_000_000_000_000_000n + BigInt(index) * 1_000_000_000n)
      }))
    };
    const view = renderPanel({ ...query, pageIndex: 1 }, true, openPath, middlePage);
    fireEvent.click(screen.getByRole('button', { name: /middle page row 0/u }));
    fireEvent.keyDown(screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') }), {
      key: 'ArrowDown'
    });
    fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.perses.closeInspector') }));

    const lastPage = { ...middlePage, number: 2, content: middlePage.content.slice(0, 17) };
    view.rerender(panelView({ ...query, pageIndex: 2 }, true, openPath, lastPage, 1, evidenceWindow));
    expect(screen.queryByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).not.toBeInTheDocument();
  });
});

const query: LogExploreQuery = {
  signal: 'logs',
  timeRange: 'last-30m',
  windowMode: 'preset',
  pageIndex: 2,
  logRecordUid: 'record-1',
  serviceName: 'checkout',
  serviceNamespace: 'commerce',
  environment: 'prod',
  query: 'timeout',
  severityText: 'WARN',
  resourceFilter: 'cloud.region=us-east',
  attributeFilter: 'http.status_code=500',
  traceId: '0123456789abcdef0123456789abcdef',
  spanId: '0123456789abcdef'
};

const page: LogHistoryEvidence['page'] = {
  content: [
    {
      logRecordUid: 'record-1',
      timeUnixNano: '1750000000000000000',
      observedTimeUnixNano: null,
      severityNumber: 9,
      severityText: 'INFO',
      body: 'timeout',
      attributes: {},
      droppedAttributesCount: 0,
      traceId: null,
      spanId: null,
      traceFlags: null,
      resource: {},
      resourceSchemaUrl: null,
      instrumentationScope: null,
      scopeSchemaUrl: null
    }
  ],
  totalElements: 57,
  totalPages: 3,
  number: 2,
  size: 20
};

function renderPanel(
  value: LogExploreQuery,
  evidenceCurrent: boolean,
  openPath: (path: string) => void,
  data: LogHistoryEvidence['page'] = page
) {
  persesContract.rowCount = data.content.length;
  return render(panelView(value, evidenceCurrent, openPath, data, 1, evidenceWindow));
}

function panelView(
  value: LogExploreQuery,
  evidenceCurrent: boolean,
  openPath: (path: string) => void,
  data: LogHistoryEvidence['page'],
  revision: number,
  timeWindow: { from: number; to: number },
  calculated?: LogHistoryEvidence['calculated']
) {
  persesContract.rowCount = data.content.length;
  return (
    <I18nextProvider i18n={i18n}>
      <ExplorePersesLogPanel
        data={data}
        calculated={calculated}
        statistics={{
          overview: {
            kind: 'ready',
            data: {
              totalCount: 57,
              traceCount: 1,
              debugCount: 0,
              infoCount: 56,
              warnCount: 1,
              errorCount: 0,
              fatalCount: 0
            }
          },
          trend: {
            kind: 'ready',
            data: {
              start: evidenceWindow.from,
              end: evidenceWindow.to,
              intervalMs: 3_600_000,
              buckets: [
                { start: evidenceWindow.from, count: 28 },
                { start: evidenceWindow.from + 3_600_000, count: 29 }
              ]
            }
          }
        }}
        query={value}
        openPath={openPath}
        timeWindow={timeWindow}
        revision={revision}
        evidenceCurrent={evidenceCurrent}
      />
    </I18nextProvider>
  );
}
