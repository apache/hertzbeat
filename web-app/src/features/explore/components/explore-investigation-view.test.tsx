/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import type { LogInvestigationViewState, TraceInvestigationViewState } from '../model/explore-investigation-contract';
import { createTraceInvestigationPersesResults } from '../model/explore-investigation-perses-model';
import { ExploreLogInvestigationView } from './explore-log-investigation-view';
import { TraceSummary } from './explore-investigation-trace-primary';
import { ExploreTraceInvestigationView } from './explore-trace-investigation-view';

const runtime = vi.hoisted(() => ({ gantt: vi.fn(), logs: vi.fn(), metric: vi.fn() }));
type ReadyTrace = Extract<TraceInvestigationViewState, { kind: 'ready' }>;
type ReadyLog = Extract<LogInvestigationViewState, { kind: 'ready' }>;

vi.mock('@/platform/perses', async importOriginal => ({
  ...(await importOriginal<typeof import('@/platform/perses')>()),
  HertzBeatTracingGanttChartResult: (props: { ariaLabel: string; onSpanSelect?: (spanId: string) => void }) => {
    runtime.gantt(props);
    return (
      <div data-testid="perses-gantt">
        {props.ariaLabel}
        <button data-span-trigger="0123456789abcdef" onClick={() => props.onSpanSelect?.('0123456789abcdef')}>
          native operation
        </button>
      </div>
    );
  },
  HertzBeatLogsTableResult: (props: { ariaLabel: string }) => {
    runtime.logs(props);
    return <div data-testid="perses-logs">{props.ariaLabel}</div>;
  },
  HertzBeatMetricTimeSeriesResult: (props: { ariaLabel: string }) => {
    runtime.metric(props);
    return <div data-testid="perses-metric">{props.ariaLabel}</div>;
  }
}));

describe('focused Explore investigation presentation', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('offers waterfall, span attributes and related logs as one trace evidence tab set', () => {
    renderTrace(traceReady());
    expect(screen.getByRole('tab', { name: i18n.t('exploreInvestigation.trace.tabs.waterfall') })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    fireEvent.click(screen.getByRole('tab', { name: i18n.t('exploreInvestigation.trace.tabs.attributes') }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('http.status_code');
    fireEvent.click(screen.getByRole('tab', { name: i18n.t('explore.relatedLogs') }));
    expect(screen.getByRole('tabpanel')).toContainElement(screen.getByTestId('perses-logs'));
  });

  it('TR02 13/14: local stats controls preserve the mounted waterfall and selected span without network work', () => {
    const ready = traceReady();
    const select = vi.fn();
    const refresh = vi.fn();
    const network = vi.fn(() => Promise.reject(new Error('Unexpected statistics fetch')));
    vi.stubGlobal('fetch', network);
    renderTrace(ready, { onSelectSpan: select, onRefresh: refresh });
    const waterfall = screen.getByTestId('perses-gantt');
    const propsBefore = runtime.gantt.mock.calls.at(-1)?.[0];
    const statsTab = screen.getByRole('tab', { name: i18n.t('exploreInvestigation.trace.operationStatistics.title') });
    fireEvent.click(statsTab);
    const groupTable = screen.getByRole('table', {
      name: i18n.t('exploreInvestigation.trace.operationStatistics.groups')
    });
    const operation = within(groupTable).getAllByRole('button')[0]!;
    operation.focus();
    expect(operation).toHaveFocus();
    fireEvent.click(operation);
    expect(
      screen.getByRole('region', { name: i18n.t('exploreInvestigation.trace.operationStatistics.loadedSpans') })
    ).toBeVisible();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'self' } });
    fireEvent.change(
      screen.getByRole('textbox', { name: i18n.t('exploreInvestigation.trace.operationStatistics.filter') }),
      { target: { value: 'no matches' } }
    );
    expect(screen.getByText(i18n.t('exploreInvestigation.trace.operationStatistics.noMatches'))).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: i18n.t('exploreInvestigation.trace.tabs.waterfall') }));
    expect(screen.getByTestId('perses-gantt')).toBe(waterfall);
    expect(runtime.gantt.mock.calls.at(-1)?.[0]).toEqual(propsBefore);
    expect(select).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('labels partial trace summaries and selected span attributes', () => {
    const ready = traceReady();
    if (ready.snapshot.gantt.state === 'ready' && ready.snapshot.gantt.detail) {
      ready.snapshot.gantt.detail.partial = true;
    }
    ready.perses = createTraceInvestigationPersesResults(
      {
        signal: 'traces',
        timeRange: 'last-30m',
        traceId: ready.snapshot.traceId,
        spanId: ready.snapshot.selectedSpanId ?? undefined
      },
      ready.snapshot
    );
    renderTrace(ready);

    expect(screen.getAllByText(i18n.t('exploreInvestigation.trace.operationStatistics.partial'))).toHaveLength(1);
    fireEvent.click(screen.getByRole('tab', { name: i18n.t('exploreInvestigation.trace.tabs.attributes') }));
    expect(screen.getAllByText(i18n.t('exploreInvestigation.trace.operationStatistics.partial'))).toHaveLength(1);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('http.status_code');
  });

  it('renders ready related logs independently when the requested trace has no retained spans', () => {
    const ready = traceReady();
    ready.snapshot.gantt = { state: 'empty', reason: 'no_data', source: 'greptime_traces', detail: null };
    ready.snapshot.sameTraceLogs.logs[0] = {
      ...ready.snapshot.sameTraceLogs.logs[0]!,
      truncatedFields: { attributes: ['arguments'] }
    };
    ready.snapshot.red = {
      ...ready.snapshot.red,
      state: 'unavailable',
      reason: 'identity_unavailable',
      identity: null,
      summary: null,
      series: []
    };
    ready.snapshot.metrics = {
      ...ready.snapshot.metrics,
      state: 'unavailable',
      reason: 'identity_unavailable',
      series: []
    };
    ready.perses = createTraceInvestigationPersesResults(
      { signal: 'traces', timeRange: 'last-30m', traceId: ready.snapshot.traceId },
      ready.snapshot
    );
    renderTrace(ready);
    expect(runtime.gantt).not.toHaveBeenCalled();
    expect(runtime.metric).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('tab', { name: i18n.t('explore.relatedLogs') }));
    expect(screen.getByTestId('perses-logs')).toBeVisible();
    expect(screen.getByText(/Attribute values for/)).toHaveTextContent('attributes.arguments');
    expect(runtime.logs.mock.calls.at(-1)?.[0]).toMatchObject({
      outcome: { state: 'ready', data: { rows: [{ body: 'nearby retry', traceId: ready.snapshot.traceId }] } }
    });
    expect(screen.getByRole('button', { name: i18n.t('exploreInvestigation.actions.openLogs') })).toBeEnabled();
    expect(screen.queryByText('420 ms')).not.toBeInTheDocument();
  });

  it('keeps the selected-span log handoff and supporting evidence actions available in the compact view', () => {
    const onOpenLogs = vi.fn();
    const onOpenSpanLogs = vi.fn();
    renderTrace(traceReady(), { onOpenLogs, onOpenSpanLogs });
    const inspector = screen.getByRole('region', { name: i18n.t('exploreInvestigation.trace.spanInspector') });
    fireEvent.click(within(inspector).getByRole('button', { name: i18n.t('explore.relatedLogs') }));
    expect(onOpenSpanLogs).toHaveBeenCalledOnce();
    expect(onOpenLogs).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('tab', { name: i18n.t('explore.relatedLogs') }));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('exploreInvestigation.actions.openLogs') }));
    expect(onOpenLogs).toHaveBeenCalledOnce();
    expect(onOpenSpanLogs).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: i18n.t('exploreInvestigation.actions.openMetrics') })).toBeEnabled();
    expect(screen.getByRole('button', { name: i18n.t('exploreInvestigation.actions.openTopology') })).toBeEnabled();
    expect(document.querySelector('details')).not.toHaveAttribute('open');
  });

  it('keeps the waterfall primary and other evidence reachable without the legacy waterfall', () => {
    renderTrace(traceReady());

    expect(screen.getByRole('region', { name: i18n.t('exploreInvestigation.sections.traces') })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: i18n.t('exploreInvestigation.title') })).toHaveAttribute(
      'data-explore-investigation',
      'true'
    );
    expect(screen.queryByTestId('perses-logs')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: i18n.t('explore.relatedLogs') }));
    expect(screen.getByRole('region', { name: i18n.t('exploreInvestigation.sections.logs') })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: i18n.t('exploreInvestigation.sections.metrics') })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: i18n.t('exploreInvestigation.sections.topology') })).toBeInTheDocument();
    expect(screen.getByTestId('perses-gantt')).toBeInTheDocument();
    expect(runtime.gantt.mock.calls.at(-1)?.[0]).toMatchObject({ variant: 'fill' });
    expect(screen.getAllByText('3.00 s').length).toBeGreaterThan(0);
    expect(screen.getByTestId('perses-logs')).toBeInTheDocument();
    expect(screen.getByTestId('perses-metric')).toBeInTheDocument();
    expect(document.querySelector('[data-timing]')).toBeNull();
  });

  it('opens the Inspector from the native operation and returns keyboard focus without duplicating the span list', () => {
    const ready = traceReady();
    ready.route.spanId = undefined;
    const select = vi.fn();
    renderTrace(ready, { onSelectSpan: select });
    expect(screen.queryByRole('region', { name: i18n.t('exploreInvestigation.trace.spanInspector') })).toBeNull();
    const operation = screen.getByRole('button', { name: 'native operation' });
    const rail = document.querySelector('[data-investigation-inspector-slot]');
    expect(rail).not.toBeNull();
    const grid = rail!.parentElement!;
    expect(grid.children).toHaveLength(2);
    operation.focus();
    fireEvent.click(operation);
    const inspector = screen.getByRole('region', { name: i18n.t('exploreInvestigation.trace.spanInspector') });
    expect(within(inspector).getByText(i18n.t('exploreInvestigation.trace.startTime'))).toBeInTheDocument();
    expect(within(inspector).getByText('3.00 s')).toBeInTheDocument();
    expect(inspector.querySelector('time')).toHaveAttribute('data-start-time-unix-nano', '1750000000000000000');
    expect(inspector.closest('[data-investigation-inspector-slot]')).toBe(rail);
    expect(grid.children).toHaveLength(2);
    expect(inspector).toHaveFocus();
    expect(select).toHaveBeenCalledWith('0123456789abcdef');
    expect(screen.queryByRole('button', { name: 'checkout POST /checkout' })).toBeNull();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: i18n.t('exploreInvestigation.trace.spanInspector') })).toBeNull();
    expect(grid.children).toHaveLength(2);
    expect(operation).toHaveFocus();
  });

  it('keeps waterfall compact and exact span attributes and JSON in the attributes tab', () => {
    renderTrace(traceReady());
    const inspector = screen.getByRole('region', { name: i18n.t('exploreInvestigation.trace.spanInspector') });
    expect(within(inspector).getByText('attributes.http.status_code')).toBeInTheDocument();
    expect(within(inspector).getByRole('button', { name: 'JSON' })).toBeInTheDocument();
    expect(document.querySelector('[data-trace-waterfall]')).toHaveStyle({ '--trace-row-count': '1' });
    fireEvent.click(screen.getByRole('tab', { name: i18n.t('exploreInvestigation.trace.tabs.attributes') }));
    const attributes = screen.getByRole('tabpanel');
    expect(within(attributes).getByText('http.status_code')).toBeInTheDocument();
    fireEvent.click(within(attributes).getByRole('button', { name: 'JSON' }));
    const raw = JSON.parse(attributes.querySelector('pre')!.textContent);
    expect(raw).toMatchObject({
      spanId: '0123456789abcdef',
      startTimeUnixNano: '1750000000000000000',
      spanAttributes: { 'http.status_code': '504' },
      resourceAttributes: { 'service.name': 'checkout' }
    });
  });

  it('searches original attributes directly in the selected span inspector', () => {
    renderTrace(traceReady());
    fireEvent.click(screen.getByRole('button', { name: 'native operation' }));
    const inspector = screen.getByRole('region', { name: i18n.t('exploreInvestigation.trace.spanInspector') });
    fireEvent.change(
      within(inspector).getByRole('textbox', { name: i18n.t('exploreInvestigation.trace.searchFields') }),
      {
        target: { value: '504' }
      }
    );
    expect(within(inspector).getByText('attributes.http.status_code')).toBeInTheDocument();
    expect(within(inspector).queryByText('parentSpanId')).not.toBeInTheDocument();
  });

  it('stages original scalar span fields and exposes disabled reasons without submitting', () => {
    const add = vi.fn().mockReturnValue(true),
      apply = vi.fn();
    renderTrace(traceReady(), {
      onAddSpanFilter: add,
      onApplySpanFilters: apply,
      spanFilterPending: true,
      spanFilterDisabledReason: (_target, operator) => (operator === '!=' ? 'Existing filter' : undefined)
    });
    const inspector = screen.getByRole('region', { name: i18n.t('exploreInvestigation.trace.spanInspector') });
    fireEvent.click(
      within(inspector).getByRole('button', {
        name: i18n.t('explore.perses.includeField', { field: 'http.status_code' })
      })
    );
    expect(add).toHaveBeenCalledWith({ scope: 'attribute', key: 'http.status_code', value: '504' }, '=');
    expect(apply).not.toHaveBeenCalled();
    expect(
      within(inspector).getByRole('button', {
        name: i18n.t('explore.perses.excludeField', { field: 'http.status_code' })
      })
    ).toBeDisabled();
    fireEvent.click(within(inspector).getByRole('button', { name: i18n.t('common.query') }));
    expect(apply).toHaveBeenCalledOnce();
  });

  it('keeps trace availability concise while preserving full state explanations', () => {
    renderTrace(traceReady());
    const availability = screen.getByRole('region', { name: i18n.t('exploreInvestigation.availability') });
    expect(availability).toHaveAttribute('data-trace-availability');
    expect(availability.querySelectorAll('[title]')).toHaveLength(4);
    expect(within(availability).queryByText(i18n.t('exploreInvestigation.states.unavailable'))).toBeNull();
  });

  it('explains that missing correlated logs can result from sampling or retention', () => {
    const ready = traceReady();
    ready.perses.logs!.outcome = { state: 'empty', truncated: false };
    renderTrace(ready);
    const availability = screen.getByRole('region', { name: i18n.t('exploreInvestigation.availability') });
    expect(within(availability).getByText(i18n.t('exploreInvestigation.trace.correlationGap'))).toBeVisible();
  });

  it('keeps the stacked Inspector non-modal at narrow widths and restores focus on Escape', () => {
    const original = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
      ...original(query),
      matches: query.includes('700px')
    }));
    const ready = traceReady();
    ready.route.spanId = undefined;
    renderTrace(ready);
    const operation = screen.getByRole('button', { name: 'native operation' });
    operation.focus();
    fireEvent.click(operation);
    const inspector = screen.getByRole('region', { name: i18n.t('exploreInvestigation.trace.spanInspector') });
    expect(inspector).not.toHaveAttribute('aria-modal');
    expect(inspector).toHaveFocus();
    operation.focus();
    expect(operation).toHaveFocus();
    inspector.focus();
    fireEvent.keyDown(inspector, { key: 'Escape' });
    expect(operation).toHaveFocus();
    expect(screen.queryByRole('region', { name: i18n.t('exploreInvestigation.trace.spanInspector') })).toBeNull();
  });

  it('renders empty and unavailable Trace blocks compactly without creating Perses canvases', () => {
    const ready = traceReady();
    renderTrace({
      ...ready,
      snapshot: {
        ...ready.snapshot,
        sameTraceLogs: { ...ready.snapshot.sameTraceLogs, state: 'empty', reason: 'no_data', logs: [] },
        red: { ...ready.snapshot.red, state: 'empty', reason: 'no_data', summary: null, series: [] },
        metrics: { ...ready.snapshot.metrics, state: 'unavailable', reason: 'storage_unavailable', series: [] },
        dependencies: {
          ...ready.snapshot.dependencies,
          state: 'unavailable',
          reason: 'query_strategy_unavailable',
          edges: []
        }
      },
      perses: { gantt: ready.perses.gantt, metrics: [] }
    });

    fireEvent.click(screen.getByRole('tab', { name: i18n.t('explore.relatedLogs') }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent(i18n.t('exploreInvestigation.reasons.no_data'));
    expect(screen.getAllByText(i18n.t('exploreInvestigation.reasons.no_data')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('exploreInvestigation.reasons.storage_unavailable')).length).toBeGreaterThan(0);
    expect(runtime.logs).not.toHaveBeenCalled();
    expect(runtime.metric).not.toHaveBeenCalled();
  });

  it('explains unavailable evidence and keeps a valid scoped Metrics query reachable without fabricating RED', () => {
    const ready = traceReady();
    const onOpenMetrics = vi.fn();
    renderTrace(
      {
        ...ready,
        snapshot: {
          ...ready.snapshot,
          red: {
            ...ready.snapshot.red,
            state: 'unavailable',
            reason: 'identity_unavailable',
            summary: null,
            series: []
          },
          metrics: { ...ready.snapshot.metrics, state: 'unavailable', reason: 'upstream_unavailable', series: [] }
        },
        perses: { ...ready.perses, metrics: [] }
      },
      { onOpenMetrics }
    );
    expect(screen.getByText(i18n.t('exploreInvestigation.reasons.identity_unavailable'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('exploreInvestigation.reasons.upstream_unavailable'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('exploreInvestigation.actions.openMetrics') }));
    expect(onOpenMetrics).toHaveBeenCalledOnce();
    expect(runtime.metric).not.toHaveBeenCalled();
  });

  it('keeps selected Log and nearby Logs together while using the controller callback for Trace focus', () => {
    const focusTrace = vi.fn();
    const openTopology = vi.fn();
    renderLog(logReady(), { onFocusTrace: focusTrace, onOpenTopology: openTopology });

    expect(screen.getByRole('region', { name: i18n.t('exploreInvestigation.title') })).toHaveAttribute(
      'data-explore-investigation',
      'true'
    );
    expect(
      screen.getByRole('complementary', { name: i18n.t('exploreInvestigation.sections.selectedLog') })
    ).toHaveTextContent('payment timeout');
    expect(screen.getByText(i18n.t('exploreInvestigation.logs.anchor'))).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: i18n.t('exploreInvestigation.sections.nearbyLogs') })
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: i18n.t('exploreInvestigation.sections.topology') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('exploreInvestigation.actions.focusTrace') }));
    expect(focusTrace).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('exploreInvestigation.actions.openTopology') }));
    expect(openTopology).toHaveBeenCalledOnce();
  });

  it('shows partial completeness for the Log-first embedded Trace', () => {
    const ready = logReady();
    ready.snapshot.trace.detail!.partial = true;
    const gantt = ready.perses.gantt;
    if (gantt?.outcome.state === 'ready') gantt.outcome.truncated = true;
    renderLog(ready);
    expect(screen.getByText(i18n.t('exploreInvestigation.trace.loadedSpanLimitNotice'))).toBeVisible();
  });

  it('shows preview metadata for selected and nearby Log attributes', () => {
    const ready = logReady();
    ready.snapshot.selectedLog.log!.truncatedFields = { attributes: ['arguments'] };
    ready.snapshot.nearbyLogs.before = [
      {
        ...investigationLog('nearby context'),
        logRecordUid: 'log-2',
        truncatedFields: { resourceAttributes: ['process.command_args'] }
      }
    ];
    renderLog(ready);
    expect(screen.getByText(/Attribute values for/)).toHaveTextContent('attributes.arguments');
    expect(screen.getByText(/Attribute values for/)).toHaveTextContent('resourceAttributes.process.command_args');
    expect(screen.getByText(/Attribute values for/)).toHaveTextContent('2');
  });

  it('keeps Log Topology visible but honestly unavailable without a safe authoritative identity', () => {
    renderLog(logReady(), { onOpenTopology: undefined });

    const topology = screen.getByRole('region', { name: i18n.t('exploreInvestigation.sections.topology') });
    expect(topology).toHaveTextContent(i18n.t('exploreInvestigation.states.unavailable'));
    expect(screen.queryByRole('button', { name: i18n.t('exploreInvestigation.actions.openTopology') })).toBeNull();
  });

  it('does not mount or hand off to Trace when the selected Log has no trace context', () => {
    const focusTrace = vi.fn();
    const ready = logReady();
    renderLog(
      {
        ...ready,
        snapshot: {
          ...ready.snapshot,
          trace: {
            ...ready.snapshot.trace,
            state: 'empty',
            reason: 'not_correlated',
            detail: null
          }
        },
        perses: { ...ready.perses, gantt: undefined }
      },
      { onFocusTrace: focusTrace }
    );

    expect(screen.getByText(i18n.t('exploreInvestigation.states.noTraceContext'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('exploreInvestigation.actions.focusTrace') })).toBeNull();
    expect(runtime.gantt).not.toHaveBeenCalled();
    expect(focusTrace).not.toHaveBeenCalled();
  });

  it('keeps route-only back navigation enabled while retained evidence is stale', () => {
    renderTrace(traceReady(), { evidenceCurrent: false });

    expect(screen.getByRole('button', { name: i18n.t('exploreInvestigation.actions.backToResults') })).toBeEnabled();
  });

  it('keeps manual refresh beside Back in the exact-window context band', () => {
    const refresh = vi.fn();
    renderTrace(traceReady(), { onRefresh: refresh });

    const refreshButton = screen.getByRole('button', { name: i18n.t('common.refresh') });
    const context = refreshButton.closest('header');
    expect(context).not.toBeNull();
    fireEvent.click(refreshButton);
    expect(refresh).toHaveBeenCalledOnce();
    expect(
      within(context as HTMLElement).getByRole('button', {
        name: i18n.t('exploreInvestigation.actions.backToResults')
      })
    ).toBeInTheDocument();
  });

  it('renders facts as one semantic list inside the outer signal surface', () => {
    renderTrace(traceReady());

    const traces = screen.getByRole('region', { name: i18n.t('exploreInvestigation.sections.traces') });
    expect(within(traces).getAllByRole('term').length).toBeGreaterThan(0);
    expect(within(traces).getAllByRole('definition').length).toBeGreaterThan(0);
  });

  it('does not let ready RED evidence mask unavailable service metrics', () => {
    const ready = traceReady();
    renderTrace({
      ...ready,
      snapshot: {
        ...ready.snapshot,
        metrics: { ...ready.snapshot.metrics, state: 'unavailable', reason: 'storage_unavailable', series: [] }
      },
      perses: { ...ready.perses, metrics: [] }
    });

    const metrics = screen.getByRole('region', { name: i18n.t('exploreInvestigation.sections.metrics') });
    expect(
      within(metrics).getByRole('region', { name: i18n.t('exploreInvestigation.metrics.red') })
    ).toBeInTheDocument();
    expect(
      within(metrics).getByRole('region', { name: i18n.t('exploreInvestigation.metrics.service') })
    ).toHaveTextContent(i18n.t('exploreInvestigation.reasons.storage_unavailable'));
  });

  it('disables focused handoffs while retained evidence is stale', () => {
    renderTrace(traceReady(), { evidenceCurrent: false });
    fireEvent.click(screen.getByRole('tab', { name: i18n.t('explore.relatedLogs') }));
    expect(screen.getByRole('button', { name: i18n.t('exploreInvestigation.actions.openLogs') })).toBeDisabled();
    expect(screen.getByRole('button', { name: i18n.t('exploreInvestigation.actions.openMetrics') })).toBeDisabled();
    expect(screen.getByRole('button', { name: i18n.t('exploreInvestigation.actions.openTopology') })).toBeDisabled();
  });

  it('does not offer a generic Topology handoff without a safe authoritative route', () => {
    renderTrace(traceReady(), { onOpenTopology: undefined });

    expect(screen.queryByRole('button', { name: i18n.t('exploreInvestigation.actions.openTopology') })).toBeNull();
  });

  it('allows a safe Trace Topology handoff when exact-trace dependencies are empty', () => {
    const ready = traceReady();
    const openTopology = vi.fn();
    renderTrace(
      {
        ...ready,
        snapshot: {
          ...ready.snapshot,
          dependencies: { ...ready.snapshot.dependencies, state: 'empty', reason: 'no_data', edges: [] }
        }
      },
      { onOpenTopology: openTopology }
    );

    const topology = screen.getByRole('region', { name: i18n.t('exploreInvestigation.sections.topology') });
    expect(topology).toHaveTextContent(i18n.t('exploreInvestigation.reasons.no_data'));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('exploreInvestigation.actions.openTopology') }));
    expect(openTopology).toHaveBeenCalledOnce();
  });
});

function renderTrace(
  state: ReadyTrace,
  overrides: Partial<React.ComponentProps<typeof ExploreTraceInvestigationView>> = {}
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ExploreTraceInvestigationView
        state={state}
        evidenceCurrent
        onBack={vi.fn()}
        onRefresh={vi.fn()}
        onSelectSpan={vi.fn()}
        onOpenLogs={vi.fn()}
        onOpenMetrics={vi.fn()}
        onOpenTopology={vi.fn()}
        {...overrides}
      />
    </I18nextProvider>
  );
}

function renderLog(state: ReadyLog, overrides: Partial<React.ComponentProps<typeof ExploreLogInvestigationView>> = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ExploreLogInvestigationView
        state={state}
        evidenceCurrent
        onBack={vi.fn()}
        onRefresh={vi.fn()}
        onFocusTrace={vi.fn()}
        onOpenMetrics={vi.fn()}
        onOpenTopology={vi.fn()}
        {...overrides}
      />
    </I18nextProvider>
  );
}

function traceReady(): ReadyTrace {
  return {
    kind: 'ready',
    route: {
      kind: 'trace',
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: '0123456789abcdef',
      window: { from: 1_750_000_000_000, to: 1_750_000_060_000, timeZone: 'UTC' }
    },
    snapshot: {
      traceId: '0123456789abcdef0123456789abcdef',
      selectedSpanId: '0123456789abcdef',
      window: { start: 1_750_000_000_000, end: 1_750_000_060_000 },
      gantt: { ...observed('greptime_traces'), detail: investigationTraceDetail() },
      sameTraceLogs: { ...observed('greptime_logs'), truncated: false, logs: [investigationLog('nearby retry')] },
      red: {
        ...observed('greptime_flow'),
        resolutionSeconds: 60,
        identity: serviceIdentity(),
        summary: {
          requestCount: 12,
          errorCount: 3,
          requestRatePerSecond: 2,
          errorRate: 0.25,
          latencyAverageMs: 230,
          latencyP95Ms: 420
        },
        series: []
      },
      metrics: { ...observed('otlp_metrics'), truncated: false, series: [] },
      dependencies: {
        ...observed('greptime_traces'),
        truncated: false,
        edges: [
          {
            sourceServiceName: 'checkout',
            targetServiceName: 'mysql',
            sourceEntityId: '10',
            targetEntityId: '20',
            spanId: '0123456789abcdef',
            status: 'ERROR',
            durationMillis: 420
          }
        ]
      }
    },
    perses: {
      gantt: { query: ganttQuery(), outcome: ganttOutcome() },
      logs: { query: logsQuery(), outcome: logsOutcome() },
      metrics: [{ query: metricQuery(), outcome: metricOutcome() }]
    }
  };
}

function logReady(): ReadyLog {
  return {
    kind: 'ready',
    route: {
      kind: 'log',
      logRecordUid: 'log-1',
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: '0123456789abcdef',
      window: { from: 1_750_000_000_000, to: 1_750_000_060_000, timeZone: 'UTC' }
    },
    snapshot: {
      logRecordUid: 'log-1',
      window: { start: 1_750_000_000_000, end: 1_750_000_060_000 },
      selectedLog: { ...observed('greptime_logs'), log: investigationLog('payment timeout') },
      trace: { ...observed('greptime_traces'), detail: investigationTraceDetail() },
      metrics: { ...observed('otlp_metrics'), truncated: false, series: [] },
      nearbyLogs: {
        ...observed('greptime_logs'),
        hasMoreBefore: false,
        hasMoreAfter: false,
        before: [],
        after: [investigationLog('nearby retry')]
      }
    },
    perses: {
      gantt: { query: ganttQuery(), outcome: ganttOutcome() },
      logs: { query: logsQuery(), outcome: logsOutcome() },
      metrics: [{ query: metricQuery(), outcome: metricOutcome() }]
    }
  };
}

function observed(source: 'greptime_traces' | 'greptime_logs' | 'greptime_flow' | 'otlp_metrics') {
  return { state: 'ready' as const, reason: 'observed' as const, source };
}

function serviceIdentity() {
  return {
    workspaceId: 'default',
    entityId: '10',
    entityType: 'service',
    serviceName: 'checkout',
    serviceNamespace: 'shop',
    deploymentEnvironment: 'production'
  };
}

function investigationLog(body: string) {
  return {
    logRecordUid: 'log-1',
    timeUnixNano: '1750000000000000000',
    observedTimeUnixNano: null,
    severityNumber: 17,
    severityText: 'ERROR',
    body,
    traceId: '0123456789abcdef0123456789abcdef',
    spanId: '0123456789abcdef',
    identity: serviceIdentity(),
    attributes: { 'retry.count': '2' },
    resourceAttributes: { 'service.name': 'checkout' }
  };
}

function investigationTraceDetail() {
  return {
    partial: false,
    rootState: 'unique' as const,
    rootSpanCount: 1,
    missingParentCount: 0,
    observedStartTime: 1_750_000_000_000,
    observedEndTime: 1_750_000_000_000 + 3_000,
    representativeSpan: {
      spanId: '0123456789abcdef',
      spanName: 'POST /checkout',
      serviceName: 'checkout',
      serviceNamespace: 'shop',
      startTime: 1_750_000_000_000,
      durationNanos: 3_000_000_000
    },
    rootSpanId: '0123456789abcdef',
    serviceName: 'checkout',
    serviceNamespace: 'shop',
    deploymentEnvironment: 'production',
    entityId: '10',
    entityType: 'service',
    rootSpanName: 'POST /checkout',
    durationNanos: '3000000000',
    status: 'ERROR',
    startTime: 1_750_000_000_000,
    errorSpanCount: 1,
    resourceAttributes: { 'service.name': 'checkout' },
    spans: [
      {
        spanId: '0123456789abcdef',
        parentSpanId: null,
        spanName: 'POST /checkout',
        serviceName: 'checkout',
        serviceNamespace: 'shop',
        deploymentEnvironment: 'production',
        entityId: '10',
        entityType: 'service',
        status: 'ERROR',
        statusMessage: null,
        spanKind: 'server',
        traceState: null,
        scopeName: null,
        scopeVersion: null,
        durationNanos: '3000000000',
        startTime: 1_750_000_000_000,
        startTimeUnixNano: String(BigInt(1_750_000_000_000) * 1000000n),
        highlighted: true,
        resourceAttributes: { 'service.name': 'checkout' },
        spanAttributes: { 'http.status_code': '504' },
        events: [],
        links: [],
        codeNavigationHint: null
      }
    ]
  };
}

function ganttQuery() {
  return {
    signal: 'traces' as const,
    queryKind: 'gantt' as const,
    traceId: '0123456789abcdef0123456789abcdef',
    spanId: '0123456789abcdef',
    timeWindow: { from: 1_750_000_000_000, to: 1_750_000_060_000 }
  };
}

function ganttOutcome() {
  return {
    state: 'ready' as const,
    truncated: false as const,
    data: {
      traceId: '0123456789abcdef0123456789abcdef',
      rootState: 'unique' as const,
      rootSpanCount: 1,
      missingParentCount: 0,
      observedStartTime: 1_750_000_000_000,
      observedEndTime: 1_750_000_003_000,
      representativeSpan: {
        spanId: '0123456789abcdef',
        spanName: 'POST /checkout',
        serviceName: 'checkout',
        serviceNamespace: null,
        startTime: 1_750_000_000_000,
        durationNanos: 3_000_000_000
      },
      rootSpanId: '0123456789abcdef',
      rootSpanName: 'POST /checkout',
      serviceName: 'checkout',
      serviceNamespace: null,
      startTime: 1_750_000_000_000,
      durationNanos: '3000000000',
      errorSpanCount: 1,
      status: 'ERROR',
      resourceAttributes: {},
      spans: [traceSpan()]
    }
  };
}

function logsQuery() {
  return {
    signal: 'logs' as const,
    queryKind: 'table' as const,
    traceId: '0123456789abcdef0123456789abcdef',
    timeWindow: { from: 1_750_000_000_000, to: 1_750_000_060_000 }
  };
}

function logsOutcome() {
  return {
    state: 'ready' as const,
    truncated: false as const,
    data: { rows: [persesLogRow('nearby retry')], total: 1 }
  };
}

function metricQuery() {
  return {
    signal: 'metrics' as const,
    queryKind: 'time-series' as const,
    timeWindow: { from: 1_750_000_000_000, to: 1_750_000_060_000 },
    metric: { name: 'process_cpu_seconds_total' }
  };
}

function metricOutcome() {
  return {
    state: 'ready' as const,
    truncated: false as const,
    data: {
      timeWindow: { from: 1_750_000_000_000, to: 1_750_000_060_000 },
      source: 'greptime',
      series: [{ key: 'cpu', name: 'cpu', labels: {}, points: [{ timestamp: 1_750_000_000_000, value: 0.5 }] }]
    }
  };
}

function persesLogRow(body: string) {
  return {
    logRecordUid: 'log-1',
    timeUnixNano: '1750000000000000000',
    observedTimeUnixNano: null,
    severityNumber: 17,
    severityText: 'ERROR',
    body,
    attributes: { 'retry.count': 2 },
    droppedAttributesCount: null,
    traceId: '0123456789abcdef0123456789abcdef',
    spanId: '0123456789abcdef',
    traceFlags: 1,
    resource: { 'service.name': 'checkout' },
    resourceSchemaUrl: null,
    instrumentationScope: null,
    scopeSchemaUrl: null
  };
}

function traceSpan() {
  return {
    traceId: '0123456789abcdef0123456789abcdef',
    spanId: '0123456789abcdef',
    parentSpanId: null,
    spanName: 'POST /checkout',
    serviceName: 'checkout',
    status: 'error',
    spanKind: 'server',
    statusMessage: null,
    traceState: null,
    scopeName: null,
    scopeVersion: null,
    durationNanos: '3000000000',
    startTime: 1_750_000_000_000,
    startTimeUnixNano: String(BigInt(1_750_000_000_000) * 1000000n),
    highlighted: true,
    resourceAttributes: { 'service.name': 'checkout' },
    spanAttributes: { 'http.status_code': '504' },
    events: [],
    links: [],
    codeNavigationHint: null
  };
}

it('labels generic partial separately from the observed loaded-span cap', () => {
  const ready = traceReady();
  const detail = ready.perses.gantt!.outcome;
  if (detail.state !== 'ready') throw new Error('Expected ready fixture');
  const show = (spans: typeof detail.data.spans) =>
    render(
      <I18nextProvider i18n={i18n}>
        <TraceSummary detail={{ ...detail.data, spans }} partial />
      </I18nextProvider>
    );
  show(detail.data.spans);
  expect(screen.getByRole('note')).toHaveTextContent(i18n.t('exploreInvestigation.trace.operationStatistics.partial'));
  expect(screen.queryByText(i18n.t('exploreInvestigation.trace.loadedSpanLimitNotice'))).toBeNull();
  cleanup();
  show(Array.from({ length: 5000 }, () => detail.data.spans[0]!));
  expect(screen.getByRole('note')).toHaveTextContent(i18n.t('exploreInvestigation.trace.operationStatistics.capped'));
});
