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

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { ExploreLogStatistics } from './explore-log-statistics';
import { LogRows } from './log-rows';
import { LogStreamResult } from './log-stream-result';

vi.mock('@/platform/perses', async original => ({
  ...(await original<typeof import('@/platform/perses')>()),
  HertzBeatLogsTableResult: (props: Parameters<typeof import('@/platform/perses').HertzBeatLogsTableResult>[0]) => (
    <div role="table" aria-label={props.ariaLabel} data-grid-label={props.logRowSelection?.ariaLabel}>
      {props.outcome.state === 'ready' &&
        props.outcome.data.rows.map((row, index) => (
          <div
            role="row"
            key={index}
            tabIndex={0}
            data-log-index={index}
            aria-label={props.logRowSelection?.getAriaLabel(index)}
            onClick={() => props.logRowSelection?.onSelect(index, document.createElement('div'))}
            onKeyDown={event => {
              if (event.key === ' ') props.logRowSelection?.onSelect(index, document.createElement('div'));
            }}
          >
            {typeof row.body === 'string' ? row.body : JSON.stringify(row.body)}
          </div>
        ))}
    </div>
  )
}));

describe('Log evidence components', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(() => cleanup());

  it.each([false, true])('keeps untimed live records inspectable without invented timestamps (mixed: %s)', mixed => {
    const untimed = { ...liveLogRow, timeUnixNano: null, observedTimeUnixNano: null, body: 'untimed record' };
    const props = { query: defaultLogQuery, t: i18n.t, navigate: vi.fn() };
    const view = render(
      <I18nextProvider i18n={i18n}>
        <LogRows {...props} rows={mixed ? [liveLogRow, untimed] : [untimed]} />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'untimed record' }));
    const inspector = screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') });
    expect(within(inspector).queryByRole('tab', { name: i18n.t('explore.logContext.title') })).not.toBeInTheDocument();
    expect(within(inspector).getByText('untimed record')).toBeInTheDocument();
    if (mixed) {
      fireEvent.click(screen.getByRole('row', { name: /live payment timeout/ }));
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
      expect(within(screen.getByRole('dialog')).queryByText('untimed record')).not.toBeInTheDocument();
    }
    view.rerender(
      <I18nextProvider i18n={i18n}>
        <LogRows {...props} rows={[]} />
      </I18nextProvider>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([false, true])(
    'retains live detail when a full incoming batch replaces its timestamp category (untimed: %s)',
    untimed => {
      const selected = { ...liveLogRow, ...(untimed ? { timeUnixNano: null, observedTimeUnixNano: null } : {}) };
      const incoming = Array.from({ length: 500 }, (_, index) => ({
        ...liveLogRow,
        body: `incoming-${index}`,
        ...(!untimed ? { timeUnixNano: null, observedTimeUnixNano: null } : {})
      }));
      const show = (rows: Array<typeof selected>) => (
        <I18nextProvider i18n={i18n}>
          <LogRows rows={rows} query={{ ...defaultLogQuery, live: true }} t={i18n.t} navigate={vi.fn()} />
        </I18nextProvider>
      );
      const view = render(show([selected]));
      fireEvent.click(screen.getByRole(untimed ? 'button' : 'row', { name: /live payment timeout/u }));
      const inspector = screen.getByRole('dialog');
      view.rerender(show(incoming));
      expect(screen.getByRole('dialog')).toBe(inspector);
      expect(within(inspector).getByText('live payment timeout')).toBeInTheDocument();
      expect(within(inspector).getByRole('button', { name: i18n.t('explore.perses.nextLog') })).toBeDisabled();
      view.rerender(show([]));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      view.rerender(show(incoming));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }
  );

  it('retains live detail across incoming buffer windows and closes on clear or session change', () => {
    const query = { ...defaultLogQuery, live: true };
    const props = { query, t: i18n.t, navigate: vi.fn() };
    const show = (rows: (typeof liveLogRow)[], evidenceIdentity = 'session-one') => (
      <I18nextProvider i18n={i18n}>
        <LogRows {...props} rows={rows} evidenceIdentity={evidenceIdentity} />
      </I18nextProvider>
    );
    const view = render(show([liveLogRow]));
    fireEvent.click(screen.getByRole('row', { name: /live payment timeout/u }));
    const inspector = screen.getByRole('dialog');
    const incoming = { ...liveLogRow, body: 'new incoming record', timeUnixNano: liveLogRow.timeUnixNano + 1e9 };
    view.rerender(show([incoming, liveLogRow]));
    expect(screen.getByRole('dialog')).toBe(inspector);
    expect(within(inspector).getByText('live payment timeout')).toBeInTheDocument();
    expect(within(inspector).queryByText('new incoming record')).not.toBeInTheDocument();
    expect(within(inspector).getByRole('button', { name: i18n.t('explore.perses.previousLog') })).toBeEnabled();
    // Incoming batches may evict the selected record from the bounded live buffer.
    view.rerender(show([incoming]));
    expect(screen.getByRole('dialog')).toBe(inspector);
    expect(within(inspector).getByText('live payment timeout')).toBeInTheDocument();
    expect(within(inspector).getByRole('button', { name: i18n.t('explore.perses.previousLog') })).toBeDisabled();
    expect(within(inspector).getByRole('button', { name: i18n.t('explore.perses.nextLog') })).toBeDisabled();
    view.rerender(show([incoming, liveLogRow], 'session-two'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('row', { name: /live payment timeout/u }));
    view.rerender(show([], 'session-two'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(show([incoming], 'session-two'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens an inspectable OTLP log detail without leaving the workbench', async () => {
    const navigate = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <Subject navigate={navigate} />
      </I18nextProvider>
    );
    const logRow = await screen.findByRole('row', { name: /payment timeout/ });
    expect(document.querySelector('[data-log-index]')).not.toBeNull();
    expect(logRow).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(logRow, { key: ' ' });
    expect(screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).toBeInTheDocument();
    expect(screen.getByText(/service.version/)).toBeInTheDocument();
    expect(screen.getByText(/retry.count/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.perses.openTraceAction') }));
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('signal=traces'));
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('traceId=0123456789abcdef0123456789abcdef'));
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('timeRange=last-30m'));
  });

  it('closes selected log evidence when the query scope changes', async () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <Subject query={{ ...defaultLogQuery, serviceName: 'checkout' }} />
      </I18nextProvider>
    );
    fireEvent.click(await screen.findByRole('row', { name: /payment timeout/ }));
    expect(screen.getByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).toBeInTheDocument();

    view.rerender(
      <I18nextProvider i18n={i18n}>
        <Subject query={{ ...defaultLogQuery, serviceName: 'payments' }} />
      </I18nextProvider>
    );

    const closingDrawer = screen.queryByRole('dialog', { name: i18n.t('explore.perses.logInspector') });
    if (closingDrawer) expect(within(closingDrawer).queryByText('payment timeout')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: i18n.t('explore.perses.logInspector') })).not.toBeInTheDocument();
    });
  });

  it('lets an operator pause, resume, and clear a live stream', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LiveSubject />
      </I18nextProvider>
    );
    expect(await screen.findByText('live payment timeout')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: i18n.t('exploreLog.pauseDisconnect') }));
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('exploreLog.pauseDisconnectGap'));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByText('live payment timeout')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: i18n.t('exploreLog.resumeNewStream') }));
    expect(screen.getByText('Connecting to log stream')).toBeInTheDocument();
  });

  it('keeps a waiting live view distinct from historical empty results', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LogStreamResult
          query={{ signal: 'logs', timeRange: 'last-30m', live: true }}
          t={i18n.t}
          navigate={vi.fn()}
          stream={{ rows: [], status: 'waiting', togglePaused: vi.fn(), retry: vi.fn(), clear: vi.fn() }}
        />
      </I18nextProvider>
    );
    expect(screen.getByText(i18n.t('exploreLog.connecting'))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('explore.empty.logs'))).not.toBeInTheDocument();
  });

  it('renders overview and trend as independent backend evidence regions', () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <ExploreLogStatistics
          timeWindow={{ from: 1_754_467_200_000, to: 1_754_474_400_000 }}
          runtimeIdentity="logs-independent-evidence"
          statistics={{
            overview: {
              kind: 'ready',
              data: {
                totalCount: 9,
                traceCount: 1,
                debugCount: 2,
                infoCount: 3,
                warnCount: 1,
                errorCount: 2,
                fatalCount: 0
              }
            },
            trend: { kind: 'error' }
          }}
          t={i18n.t}
        />
      </I18nextProvider>
    );

    expect(screen.getByRole('region', { name: i18n.t('exploreLog.overview') })).toHaveTextContent('9');
    expect(screen.getByRole('region', { name: i18n.t('exploreLog.trend') })).toHaveTextContent(
      i18n.t('exploreLog.statisticsUnavailable')
    );
    expect(screen.getByRole('region', { name: i18n.t('exploreLog.trend') })).toHaveAttribute(
      'data-trend-density',
      'visualization'
    );
    view.rerender(
      <I18nextProvider i18n={i18n}>
        <ExploreLogStatistics
          timeWindow={{ from: 1_754_467_200_000, to: 1_754_474_400_000 }}
          runtimeIdentity="logs-empty-trend"
          statistics={{
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
              data: { start: 1_754_467_200_000, end: 1_754_474_400_000, intervalMs: 3_600_000, buckets: [] }
            }
          }}
          t={i18n.t}
        />
      </I18nextProvider>
    );
    expect(screen.getByRole('region', { name: i18n.t('exploreLog.trend') })).toHaveAttribute(
      'data-trend-density',
      'visualization'
    );
    expect(screen.getByText(i18n.t('exploreLog.trendEmpty'))).toBeInTheDocument();
  });

  it('renders non-empty hourly evidence as an accessible time-series chart instead of row-by-row history', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreLogStatistics
          statistics={{
            overview: {
              kind: 'ready',
              data: {
                totalCount: 12,
                traceCount: 0,
                debugCount: 0,
                infoCount: 12,
                warnCount: 0,
                errorCount: 0,
                fatalCount: 0
              }
            },
            trend: {
              kind: 'ready',
              data: {
                start: 1_754_467_200_000,
                end: 1_754_474_400_000,
                intervalMs: 3_600_000,
                buckets: [
                  { start: 1_754_467_200_000, count: 4 },
                  { start: 1_754_470_800_000, count: 8 }
                ]
              }
            }
          }}
          timeWindow={{ from: 1_754_467_200_000, to: 1_754_474_400_000 }}
          runtimeIdentity="logs-trend:revision-1"
          t={i18n.t}
        />
      </I18nextProvider>
    );

    const trend = screen.getByRole('region', { name: i18n.t('exploreLog.trend') });
    expect(within(trend).queryByRole('heading', { name: i18n.t('exploreLog.trend') })).not.toBeInTheDocument();
    expect(within(trend).queryByText(/Peak 8/)).not.toBeInTheDocument();
    const runtime = trend.querySelector('[data-visualization-runtime="perses"]');
    expect(runtime).toHaveAttribute('data-variant', 'compact');
    expect(runtime?.firstElementChild).not.toHaveAttribute('style');
    const chart = within(trend).getByRole('img', { name: i18n.t('exploreLog.trend') });
    expect(within(chart).queryByRole('list')).not.toBeInTheDocument();
    expect(within(trend).getByRole('list', { name: i18n.t('exploreLog.statisticsScope') })).toBeInTheDocument();
  });

  it('plots the single observed bucket while retaining the insufficient trend disclosure', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ExploreLogStatistics
          statistics={{
            overview: {
              kind: 'ready',
              data: {
                totalCount: 6,
                traceCount: 0,
                debugCount: 0,
                infoCount: 6,
                warnCount: 0,
                errorCount: 0,
                fatalCount: 0
              }
            },
            trend: {
              kind: 'ready',
              data: {
                start: 1_754_467_200_000,
                end: 1_754_470_800_000,
                intervalMs: 3_600_000,
                buckets: [{ start: 1_754_467_200_000, count: 6 }]
              }
            }
          }}
          timeWindow={{ from: 1_754_467_200_000, to: 1_754_470_800_000 }}
          runtimeIdentity="logs-trend:revision-single"
          t={i18n.t}
        />
      </I18nextProvider>
    );

    const trend = screen.getByRole('region', { name: i18n.t('exploreLog.trend') });
    expect(screen.getByRole('region', { name: i18n.t('exploreLog.overview') })).toHaveAttribute(
      'data-explore-evidence-summary'
    );
    expect(trend).toHaveAttribute('data-trend-density', 'visualization');
    expect(within(trend).getByText(i18n.t('exploreLog.trendInsufficient', { count: 6 }))).toBeInTheDocument();
    expect(trend.querySelector('[data-visualization-runtime="perses"]')).toBeInTheDocument();
    expect(within(trend).getByRole('button', { name: i18n.t('explore.perses.collapseTrend') })).toBeInTheDocument();
  });

  it.each([
    ['unavailable', 'common.unavailable'],
    ['error', 'exploreLog.streamFailed'],
    ['contract', 'explore.loadFailed']
  ] as const)('labels %s without claiming the stream is connecting', (status, messageKey) => {
    const retry = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <LogStreamResult
          query={{ signal: 'logs', timeRange: 'last-30m', live: true }}
          t={i18n.t}
          navigate={vi.fn()}
          stream={{ rows: [], status, togglePaused: vi.fn(), retry, clear: vi.fn() }}
        />
      </I18nextProvider>
    );
    expect(screen.getAllByText(i18n.t(messageKey)).length).toBeGreaterThan(0);
    expect(screen.queryByText(i18n.t('exploreLog.connecting'))).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('exploreLog.waiting'))).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.t('exploreLog.pauseDisconnect') })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.retry') }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it.each(['invalid_filter', 'permission'] as const)('does not reconnect or show a waiting state for %s', status => {
    render(
      <I18nextProvider i18n={i18n}>
        <LogStreamResult
          query={{ signal: 'logs', timeRange: 'last-30m', live: true }}
          t={i18n.t}
          navigate={vi.fn()}
          stream={{ rows: [], status, togglePaused: vi.fn(), retry: vi.fn(), clear: vi.fn() }}
        />
      </I18nextProvider>
    );
    expect(screen.queryByRole('button', { name: i18n.t('common.retry') })).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('exploreLog.connecting'))).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('exploreLog.waiting'))).not.toBeInTheDocument();
    if (status === 'invalid_filter')
      expect(screen.getByRole('button', { name: i18n.t('explore.logQueryBuilder.checkFilter') })).toBeInTheDocument();
  });

  it('keeps a single gap disclosure and does not offer retry while connected', async () => {
    const retry = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <LogStreamResult
          query={{ signal: 'logs', timeRange: 'last-30m', live: true }}
          t={i18n.t}
          navigate={vi.fn()}
          stream={{
            rows: [liveLogRow],
            status: 'degraded',
            gapDroppedCount: 37,
            pauseDisconnectGap: true,
            togglePaused: vi.fn(),
            retry,
            clear: vi.fn()
          }}
        />
      </I18nextProvider>
    );

    expect(screen.getAllByText(i18n.t('exploreLog.streamGapCount', { count: 37 })).length).toBeGreaterThan(0);
    expect(await screen.findByText('live payment timeout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.t('exploreLog.pauseDisconnect') })).toBeEnabled();
    expect(screen.queryByRole('button', { name: i18n.t('common.retry') })).toBeNull();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByText(i18n.t('explore.liveFlow.connectedGap'))).toBeVisible();
    expect(screen.getByRole('table')).toHaveAccessibleName(i18n.t('explore.liveFlow.logsTable'));
    fireEvent.click(screen.getByRole('row', { name: /live payment timeout/ }));
    expect(
      screen.getByText(new RegExp(i18n.t('explore.liveFlow.pivotWindowHint').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    ).toBeVisible();
  });

  it('retains a gap warning while the transport is reconnecting without claiming connected', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LogStreamResult
          query={{ signal: 'logs', timeRange: 'last-30m', live: true }}
          t={i18n.t}
          navigate={vi.fn()}
          stream={{
            rows: [],
            status: 'degraded',
            connectionStatus: 'waiting',
            pauseDisconnectGap: true,
            togglePaused: vi.fn(),
            retry: vi.fn(),
            clear: vi.fn()
          }}
        />
      </I18nextProvider>
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByText(i18n.t('exploreLog.connecting'))).toBeVisible();
    expect(screen.queryByText(i18n.t('explore.liveFlow.connectedGap'))).toBeNull();
    expect(screen.queryByRole('button', { name: i18n.t('common.retry') })).toBeNull();
  });

  it('discloses bounded local retention without treating it as a backend gap', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LogStreamResult
          query={{ signal: 'logs', timeRange: 'last-30m', live: true }}
          t={i18n.t}
          navigate={vi.fn()}
          stream={{
            rows: [liveLogRow],
            status: 'connected',
            locallyDroppedCount: 12,
            togglePaused: vi.fn(),
            retry: vi.fn(),
            clear: vi.fn()
          }}
        />
      </I18nextProvider>
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      i18n.t('exploreLog.localRetention', { retained: 500, dropped: 12 })
    );
    expect(screen.queryByText(i18n.t('exploreLog.streamGapCount', { count: 12 }))).not.toBeInTheDocument();
  });
});

function Subject({
  navigate = vi.fn(),
  query = defaultLogQuery
}: {
  navigate?: (path: string) => void;
  query?: typeof defaultLogQuery & { serviceName?: string | undefined };
}) {
  const { t } = useTranslation();
  const rows = [
    {
      timeUnixNano: 1_750_000_000_000_000_000,
      observedTimeUnixNano: null,
      severityNumber: null,
      severityText: 'ERROR',
      body: 'payment timeout',
      droppedAttributesCount: null,
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: '0123456789abcdef',
      traceFlags: null,
      resource: { 'service.name': 'checkout', 'service.version': '1.2.3' },
      attributes: { 'retry.count': 2 },
      resourceSchemaUrl: null,
      instrumentationScope: null,
      scopeSchemaUrl: null
    }
  ];
  return <LogRows rows={rows} query={query} t={t} navigate={navigate} />;
}

const defaultLogQuery = { signal: 'logs', timeRange: 'last-30m' } as const;

function LiveSubject() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([liveLogRow]);
  const [paused, setPaused] = useState(false);
  return (
    <LogStreamResult
      query={{ signal: 'logs', timeRange: 'last-30m', live: true }}
      t={t}
      navigate={vi.fn()}
      stream={{
        rows,
        status: paused ? 'paused' : 'waiting',
        pauseDisconnectGap: paused,
        togglePaused: () => setPaused(current => !current),
        retry: vi.fn(),
        clear: () => setRows([])
      }}
    />
  );
}

const liveLogRow = {
  timeUnixNano: 1_750_000_000_000_000_000,
  observedTimeUnixNano: null,
  severityNumber: 17,
  severityText: 'ERROR',
  body: 'live payment timeout',
  attributes: null,
  droppedAttributesCount: null,
  traceId: null,
  spanId: null,
  traceFlags: null,
  resource: null,
  resourceSchemaUrl: null,
  instrumentationScope: null,
  scopeSchemaUrl: null
};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

it.each(['overview', 'trend'] as const)('renders localized %s permission while preserving sibling evidence', failed => {
  cleanup();
  const overview = {
    kind: 'ready' as const,
    data: { totalCount: 9, traceCount: 0, debugCount: 0, infoCount: 9, warnCount: 0, errorCount: 0, fatalCount: 0 }
  };
  const trend = {
    kind: 'ready' as const,
    data: { start: 1000, end: 2000, intervalMs: 60000, buckets: [{ start: 0, count: 9 }] }
  };
  const statistics = { overview, trend, [failed]: { kind: 'error' as const, reason: 'permission' as const } };
  render(
    <I18nextProvider i18n={i18n}>
      <ExploreLogStatistics
        statistics={statistics}
        timeWindow={{ from: 1000, to: 2000 }}
        runtimeIdentity="permission-evidence"
        t={i18n.t}
      />
    </I18nextProvider>
  );
  expect(screen.getByRole('alert')).toHaveTextContent(i18n.t(`exploreLog.${failed}Permission`));
  expect(screen.queryByText(i18n.t('exploreLog.statisticsUnavailable'))).not.toBeInTheDocument();
  if (failed === 'trend')
    expect(screen.getByRole('region', { name: i18n.t('exploreLog.overview') })).toHaveTextContent('9');
  else
    expect(screen.getByRole('region', { name: i18n.t('exploreLog.trend') })).toHaveTextContent(
      i18n.t('exploreLog.trendInsufficient', { count: 9 })
    );
});
