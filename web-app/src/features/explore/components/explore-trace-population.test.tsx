/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { beforeAll, afterEach, it, expect, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { TraceGroups, TraceSpanPage, TraceHistogram, TraceFacet } from '../model/explore-trace-analytics';
import { ExploreTraceGroups } from './explore-trace-groups';
import { ExploreSpanTable } from './explore-span-table';
import { ExploreTraceHistogram } from './explore-trace-histogram';
import { ExploreTraceFacets } from './explore-trace-facets';
vi.mock('@/platform/perses', async importOriginal => ({
  ...(await importOriginal<typeof import('@/platform/perses')>()),
  HertzBeatMetricTimeSeriesResult: ({
    onTimeWindowChange
  }: {
    onTimeWindowChange: (value: { from: number; to: number }) => void;
  }) => <button onClick={() => onTimeWindowChange({ from: 1500, to: 2500 })}>Brush</button>
}));
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
const window = { start: 1000, end: 3000, endExclusive: false };
const coverage = { mode: 'window', rowLimit: null, scannedRows: null, truncated: false } as const;
function subject(node: ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);
}
it('never displays supplied evidence after permission denial', () => {
  const groups: TraceGroups = {
    state: 'ready',
    window,
    population: 'matched_traces',
    coverage,
    data: {
      groupBy: 'serviceName',
      totalCount: 1,
      membership: 'multiple',
      orderBy: 'count-desc',
      groups: [{ value: 'private-service', count: 1, errorCount: 0 }],
      truncated: false
    }
  };
  subject(<ExploreTraceGroups load={{ state: 'permission', data: groups }} retry={vi.fn()} onGroup={vi.fn()} />);
  expect(screen.queryByText('private-service')).not.toBeInTheDocument();
});
it('shows tiny span durations without rounding them into zero and preserves nanoseconds/timezone', () => {
  const data: TraceSpanPage = {
    state: 'ready',
    window,
    population: 'matched_spans',
    coverage,
    data: {
      content: [
        {
          traceId: 'a'.repeat(32),
          spanId: 'b'.repeat(16),
          parentSpanId: null,
          serviceName: 'checkout',
          serviceNamespace: null,
          environment: null,
          operationName: 'GET /',
          spanKind: 'SERVER',
          status: 'UNSET',
          startTimeUnixNano: '1750000000123456789',
          durationNanos: '1'
        }
      ],
      totalElements: 1,
      pageIndex: 0,
      pageSize: 10,
      sort: 'newest'
    }
  };
  const view = subject(
    <ExploreSpanTable
      load={{ state: 'ready', data }}
      retry={vi.fn()}
      display={{ columns: ['traceName', 'duration', 'startTime'], density: 'compact' }}
      onPage={vi.fn()}
      onOpen={vi.fn()}
      timeZone="UTC"
    />
  );
  expect(screen.getByText('1 ns')).toHaveAttribute('title', '1 ns');
  expect(view.container.querySelector('time')).toHaveAttribute('datetime', '2025-06-15T15:06:40.123456789Z');
  expect(screen.getByRole('button', { name: i18n.t('explore.perses.previousPage') })).toBeDisabled();
});
it('snaps brush to full bucket bounds and preserves the final inclusive boundary', () => {
  const data: TraceHistogram = {
    state: 'ready',
    window,
    population: 'matched_traces',
    coverage,
    data: {
      totalCount: 3,
      errorCount: 1,
      intervalMs: 1000,
      buckets: [
        { start: 1000, end: 2000, endExclusive: true, count: 1, errorCount: 0 },
        { start: 2000, end: 3000, endExclusive: false, count: 2, errorCount: 1 }
      ]
    }
  };
  const change = vi.fn();
  const view = subject(
    <ExploreTraceHistogram load={{ state: 'ready', data }} retry={vi.fn()} onWindowChange={change} />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Brush' }));
  expect(change).toHaveBeenCalledWith(window);
  view.rerender(
    <I18nextProvider i18n={i18n}>
      <ExploreTraceHistogram load={{ state: 'loading', data }} retry={vi.fn()} onWindowChange={change} />
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Brush' }));
  expect(change).toHaveBeenCalledOnce();
});
it('does not show old facet-field values and gives empty results a recovery hint', () => {
  const data: TraceFacet = {
    state: 'ready',
    window,
    population: 'matched_traces',
    coverage,
    data: {
      field: 'serviceName',
      totalCount: 1,
      missingCount: 0,
      membership: 'multiple',
      values: [{ value: 'old-service', count: 1, errorCount: 0 }],
      truncated: false
    }
  };
  subject(
    <ExploreTraceFacets
      load={{ state: 'ready', data }}
      field="environment"
      onFieldChange={vi.fn()}
      retry={vi.fn()}
      action={() => ({ disabled: false, selected: false, run: vi.fn() })}
    />
  );
  expect(screen.queryByText('old-service')).not.toBeInTheDocument();
});

it('retains honest multiple-membership/missing counts but disables stale facet actions', () => {
  const data: TraceFacet = {
    state: 'ready',
    window,
    population: 'matched_traces',
    coverage,
    data: {
      field: 'serviceName',
      totalCount: 2,
      missingCount: 1,
      membership: 'multiple',
      values: [{ value: 'checkout', count: 1, errorCount: 1 }],
      truncated: true
    }
  };
  const run = vi.fn();
  subject(
    <ExploreTraceFacets
      load={{ state: 'loading', data }}
      field="serviceName"
      onFieldChange={vi.fn()}
      retry={vi.fn()}
      action={() => ({ disabled: false, selected: false, run })}
    />
  );
  expect(screen.getByText(i18n.t('exploreTrace.analytics.membership'))).toBeInTheDocument();
  expect(screen.getByText(i18n.t('exploreTrace.analytics.missing', { count: 1 }))).toBeInTheDocument();
  const button = screen.getByRole('button', { name: i18n.t('exploreTrace.facets.toggleValue', { value: 'checkout' }) });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(run).not.toHaveBeenCalled();
  expect(screen.getByText(i18n.t('explore.logFacets.refreshing'))).toBeInTheDocument();
});
it('distinguishes unfilterable empty groups from missing and gives empty ready recovery', () => {
  const data: TraceGroups = {
    state: 'ready',
    window,
    population: 'matched_traces',
    coverage,
    data: {
      groupBy: 'serviceName',
      totalCount: 2,
      membership: 'multiple',
      orderBy: 'count-desc',
      groups: [
        { value: '', count: 1, errorCount: 0 },
        { value: null, count: 1, errorCount: 0 }
      ],
      truncated: false
    }
  };
  const view = subject(<ExploreTraceGroups load={{ state: 'ready', data }} retry={vi.fn()} onGroup={vi.fn()} />);
  expect(screen.getByRole('button', { name: i18n.t('exploreTrace.analytics.emptyValue') })).toBeDisabled();
  expect(screen.getByRole('button', { name: i18n.t('exploreTrace.analytics.missingValue') })).toBeDisabled();
  view.rerender(
    <I18nextProvider i18n={i18n}>
      <ExploreTraceGroups
        load={{ state: 'ready', data: { ...data, data: { ...data.data!, totalCount: 0, groups: [] } } }}
        retry={vi.fn()}
        onGroup={vi.fn()}
      />
    </I18nextProvider>
  );
  expect(screen.getByRole('status')).toHaveTextContent(i18n.t('exploreTrace.analytics.empty'));
  expect(screen.getByRole('button', { name: i18n.t('explore.recovery.reviewQuery') })).toBeInTheDocument();
});

it('keeps a zero-match histogram compact instead of mounting an empty chart', () => {
  const data: TraceHistogram = {
    state: 'ready',
    window,
    population: 'matched_spans',
    coverage,
    data: {
      totalCount: 0,
      errorCount: 0,
      intervalMs: 2000,
      buckets: [{ start: 1000, end: 3000, endExclusive: false, count: 0, errorCount: 0 }]
    }
  };
  subject(<ExploreTraceHistogram load={{ state: 'ready', data }} retry={vi.fn()} onWindowChange={vi.fn()} />);
  expect(screen.queryByRole('button', { name: 'Brush' })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(i18n.t('exploreTrace.analytics.empty'));
});
