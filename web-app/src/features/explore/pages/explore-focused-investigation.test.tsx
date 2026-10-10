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
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import type { LogInvestigationViewState, TraceInvestigationViewState } from '../model/explore-investigation-contract';
import { buildExplorePath, parseExploreQuery } from '../model/explore-model';
import { ExploreFocusedLogPage, ExploreFocusedTracePage } from './explore-focused-investigation';

const controllers = vi.hoisted(() => ({ trace: vi.fn(), log: vi.fn() }));

vi.mock('../controller/use-telemetry-source', () => ({
  useTelemetrySource: (query: { source?: string }) => ({
    source: query.source ?? 'external',
    selfAccessible: true,
    state: 'ready',
    retry: vi.fn()
  })
}));
vi.mock('../controller/use-trace-investigation-controller', () => ({
  useTraceInvestigationController: controllers.trace
}));
vi.mock('../controller/use-log-investigation-controller', () => ({
  useLogInvestigationController: controllers.log
}));
vi.mock('../components/explore-trace-investigation-view', () => ({
  ExploreTraceInvestigationView: (props: {
    onBack: () => void;
    onRefresh: () => void;
    onSelectSpan: (spanId: string) => void;
    onOpenLogs: () => void;
    onOpenMetrics?: (() => void) | undefined;
    onOpenTopology?: (() => void) | undefined;
  }) => (
    <div>
      <button onClick={props.onBack}>trace-back</button>
      <button onClick={props.onRefresh}>trace-refresh</button>
      <button onClick={() => props.onSelectSpan('fedcba9876543210')}>select-span</button>
      <button onClick={props.onOpenLogs}>trace-logs</button>
      {props.onOpenMetrics ? <button onClick={props.onOpenMetrics}>trace-metrics</button> : null}
      {props.onOpenTopology ? <button onClick={props.onOpenTopology}>trace-topology</button> : null}
    </div>
  )
}));
vi.mock('../components/explore-log-investigation-view', () => ({
  ExploreLogInvestigationView: (props: {
    evidenceCurrent: boolean;
    onOpenMetrics?: (() => void) | undefined;
    onBack: () => void;
    onRefresh: () => void;
    onFocusTrace: () => void;
    onOpenTopology?: (() => void) | undefined;
  }) => (
    <div>
      <button onClick={props.onBack}>log-back</button>
      <button onClick={props.onRefresh}>log-refresh</button>
      <button disabled={!props.evidenceCurrent} onClick={props.onFocusTrace}>
        log-trace
      </button>
      {props.onOpenMetrics ? (
        <button disabled={!props.evidenceCurrent} onClick={props.onOpenMetrics}>
          log-metrics
        </button>
      ) : null}
      {props.onOpenTopology ? (
        <button disabled={!props.evidenceCurrent} onClick={props.onOpenTopology}>
          log-topology
        </button>
      ) : null}
    </div>
  )
}));

describe('Explore focused investigation page wiring', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each(['trace', 'log'])('keeps the Dashboard return action in focused %s investigation', signal => {
    controllers.trace.mockReturnValue({ state: traceReady(), refetch: vi.fn() });
    controllers.log.mockReturnValue({ state: logReady(), evidenceCurrent: true, refetch: vi.fn() });
    const openPath = vi.fn();
    const dashboardReturnTo = '/observability/dashboards?dashboard=ops&start=1000&end=2000&timeZone=UTC';
    const common = { t: i18n.t, updateQuery: vi.fn(), time: undefined, openPath };
    renderSubject(
      signal === 'trace' ? (
        <ExploreFocusedTracePage {...common} query={{ ...traceQuery(), dashboardReturnTo }} />
      ) : (
        <ExploreFocusedLogPage {...common} query={{ ...logQuery(), dashboardReturnTo }} />
      )
    );
    fireEvent.click(screen.getByRole('button', { name: i18n.t('signalDashboard.back') }));
    expect(openPath).toHaveBeenCalledWith(dashboardReturnTo);
  });

  it('uses route builders for Trace actions and returns without focused identities', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    controllers.trace.mockReturnValue({ state: traceReady(), refetch });
    const openPath = vi.fn();
    renderSubject(
      <ExploreFocusedTracePage
        query={traceQuery()}
        t={i18n.t}
        updateQuery={vi.fn()}
        time={undefined}
        openPath={openPath}
      />
    );

    fireEvent.click(screen.getByText('select-span'));
    expect(pathParams(lastPath(openPath))).toMatchObject({
      signal: 'traces',
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: 'fedcba9876543210'
    });
    fireEvent.click(screen.getByText('trace-logs'));
    expect(pathParams(lastPath(openPath))).toMatchObject({
      signal: 'logs',
      traceId: '0123456789abcdef0123456789abcdef'
    });
    fireEvent.click(screen.getByText('trace-metrics'));
    expect(pathParams(lastPath(openPath))).toMatchObject({ signal: 'metrics' });
    fireEvent.click(screen.getByText('trace-topology'));
    expect(pathParams(lastPath(openPath))).toMatchObject({
      focusEntityId: '10',
      environment: 'production',
      sourceKind: 'otel',
      start: '1750000000000',
      end: '1750000060000'
    });
    fireEvent.click(screen.getByText('trace-back'));
    expect(pathParams(lastPath(openPath))).not.toHaveProperty('traceId');
    expect(pathParams(lastPath(openPath))).not.toHaveProperty('spanId');
    fireEvent.click(screen.getByText('trace-refresh'));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('passes stale Log evidence to disable handoffs while Back remains available', () => {
    controllers.log.mockReturnValue({ state: logReady(), evidenceCurrent: false, refetch: vi.fn() });
    const openPath = vi.fn();
    renderSubject(
      <ExploreFocusedLogPage query={logQuery()} t={i18n.t} updateQuery={vi.fn()} time={undefined} openPath={openPath} />
    );
    for (const name of ['log-trace', 'log-metrics', 'log-topology']) {
      const action = screen.getByRole('button', { name });
      expect(action).toBeDisabled();
      fireEvent.click(action);
    }
    expect(openPath).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'log-back' }));
    expect(openPath).toHaveBeenCalledOnce();
  });

  it('hands a selected Log to its exact Trace and clears the Log anchor on return', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    controllers.log.mockReturnValue({ state: logReady(), evidenceCurrent: true, refetch });
    const openPath = vi.fn();
    renderSubject(
      <ExploreFocusedLogPage query={logQuery()} t={i18n.t} updateQuery={vi.fn()} time={undefined} openPath={openPath} />
    );

    fireEvent.click(screen.getByText('log-trace'));
    expect(pathParams(lastPath(openPath))).toMatchObject({
      signal: 'traces',
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: '0123456789abcdef'
    });
    expect(pathParams(lastPath(openPath))).not.toHaveProperty('logRecordUid');
    fireEvent.click(screen.getByText('log-topology'));
    expect(pathParams(lastPath(openPath))).toMatchObject({
      focusEntityId: '10',
      environment: 'production',
      sourceKind: 'otel',
      start: '1750000000000',
      end: '1750000060000'
    });
    fireEvent.click(screen.getByText('log-back'));
    expect(pathParams(lastPath(openPath))).not.toHaveProperty('logRecordUid');
    fireEvent.click(screen.getByText('log-refresh'));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it.each(['source', 'direct', 'external', 'nested'])(
    'returns from a Log-linked Trace to the original list: %s',
    entry => {
      controllers.log.mockReturnValue({ state: logReady(), evidenceCurrent: true, refetch: vi.fn() });
      controllers.trace.mockReturnValue({ state: traceReady(), refetch: vi.fn() });
      const source = parseExploreQuery(
        new URLSearchParams({
          signal: 'logs',
          start: '1750000000000',
          end: '1750000060000',
          timeZone: 'UTC',
          page: '3',
          pageSize: '50',
          query: 'timeout',
          serviceName: 'checkout',
          environment: 'production',
          resourceFilter: 'region=west',
          attributeFilter: 'http.method=POST',
          severityCategory: 'ERROR',
          severityText: 'SEVERE',
          hideInternal: 'true',
          hideNoise: 'true'
        })
      );
      if (source.signal !== 'logs') throw new Error('Expected logs route');
      const returnTo = buildExplorePath(source);
      const candidates: Record<string, string | undefined> = {
        source: returnTo,
        direct: undefined,
        external: 'https://example.com',
        nested: `${returnTo}&returnTo=${encodeURIComponent(returnTo)}`
      };
      const candidate = candidates[entry];
      const expectedReturn = entry === 'source' ? returnTo : buildExplorePath({ ...source, pageIndex: undefined });
      const query = { ...source, ...logQuery(), returnTo: candidate };
      const openPath = vi.fn();
      const common = { t: i18n.t, updateQuery: vi.fn(), time: undefined, openPath };
      const view = renderSubject(<ExploreFocusedLogPage {...common} query={query} />);
      fireEvent.click(screen.getByText('log-trace'));
      const target = parseExploreQuery(new URL(lastPath(openPath), 'http://localhost').searchParams);
      expect(target.returnTo).toBe(expectedReturn);
      expect(target).not.toHaveProperty('logRecordUid');
      expect(target.signal).toBe('traces');
      if (target.signal !== 'traces') throw new Error('Expected trace route');
      view.unmount();
      renderSubject(<ExploreFocusedTracePage {...common} query={target} />);
      fireEvent.click(screen.getByText('trace-back'));
      expect(lastPath(openPath)).toBe(expectedReturn);
      expect(new URL(lastPath(openPath), 'http://localhost').searchParams.has('returnTo')).toBe(false);
    }
  );

  it('returns to the frozen source list rather than the focused trace envelope', () => {
    controllers.trace.mockReturnValue({ state: traceReady(), evidenceCurrent: true, refetch: vi.fn() });
    const openPath = vi.fn();
    const returnTo = buildExplorePath(
      parseExploreQuery(
        new URLSearchParams('signal=traces&start=1000&end=2000&timeZone=UTC&page=2&serviceName=checkout')
      )
    );
    renderSubject(
      <ExploreFocusedTracePage
        query={{ ...traceQuery(), returnTo }}
        t={i18n.t}
        updateQuery={vi.fn()}
        time={undefined}
        openPath={openPath}
      />
    );
    fireEvent.click(screen.getByText('trace-back'));
    expect(openPath).toHaveBeenCalledWith(returnTo);
  });

  it('does not offer Log Topology navigation from a trace fallback identity', () => {
    const ready = logReady();
    controllers.log.mockReturnValue({
      state: {
        ...ready,
        snapshot: {
          ...ready.snapshot,
          selectedLog: {
            ...ready.snapshot.selectedLog,
            log: ready.snapshot.selectedLog.log
              ? { ...ready.snapshot.selectedLog.log, identity: null }
              : ready.snapshot.selectedLog.log
          },
          trace: {
            state: 'ready',
            reason: 'observed',
            source: 'greptime_traces',
            detail: traceDetail(identity())
          }
        }
      },
      refetch: vi.fn().mockResolvedValue(undefined)
    });
    renderSubject(
      <ExploreFocusedLogPage query={logQuery()} t={i18n.t} updateQuery={vi.fn()} time={undefined} openPath={vi.fn()} />
    );

    expect(screen.queryByText('log-topology')).toBeNull();
  });
});

function renderSubject(subject: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{subject}</I18nextProvider>);
}

function traceQuery() {
  return {
    signal: 'traces' as const,
    timeRange: 'last-30m' as const,
    traceId: '0123456789abcdef0123456789abcdef',
    spanId: '0123456789abcdef',
    start: 1_750_000_000_000,
    end: 1_750_000_060_000,
    timeZone: 'UTC'
  };
}

function logQuery() {
  return {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    logRecordUid: 'log-1',
    traceId: '0123456789abcdef0123456789abcdef',
    spanId: '0123456789abcdef',
    start: 1_750_000_000_000,
    end: 1_750_000_060_000,
    timeZone: 'UTC'
  };
}

function traceReady(): Extract<TraceInvestigationViewState, { kind: 'ready' }> {
  return {
    kind: 'ready',
    route: { kind: 'trace', traceId: '0123456789abcdef0123456789abcdef', spanId: '0123456789abcdef', window: window() },
    snapshot: {
      traceId: '0123456789abcdef0123456789abcdef',
      selectedSpanId: '0123456789abcdef',
      window: { start: window().from, end: window().to },
      gantt: { ...unavailable('greptime_traces'), detail: null },
      sameTraceLogs: { ...unavailable('greptime_logs'), truncated: false, logs: [] },
      red: {
        state: 'ready',
        reason: 'observed',
        source: 'greptime_flow',
        resolutionSeconds: 60,
        identity: identity(),
        summary: null,
        series: []
      },
      metrics: { ...unavailable('otlp_metrics'), truncated: false, series: [] },
      dependencies: { ...unavailable('greptime_traces'), truncated: false, edges: [] }
    },
    perses: { metrics: [] }
  };
}

function logReady(): Extract<LogInvestigationViewState, { kind: 'ready' }> {
  return {
    kind: 'ready',
    route: {
      kind: 'log',
      logRecordUid: 'log-1',
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: '0123456789abcdef',
      window: window()
    },
    snapshot: {
      logRecordUid: 'log-1',
      window: { start: window().from, end: window().to },
      selectedLog: {
        state: 'ready',
        reason: 'observed',
        source: 'greptime_logs',
        log: {
          logRecordUid: 'log-1',
          timeUnixNano: '1750000000000000000',
          observedTimeUnixNano: null,
          severityNumber: 17,
          severityText: 'ERROR',
          body: 'payment timeout',
          traceId: '0123456789abcdef0123456789abcdef',
          spanId: '0123456789abcdef',
          identity: identity(),
          attributes: {},
          resourceAttributes: {}
        }
      },
      trace: { ...unavailable('greptime_traces'), detail: null },
      metrics: { ...unavailable('otlp_metrics'), truncated: false, series: [] },
      nearbyLogs: { ...unavailable('greptime_logs'), hasMoreBefore: false, hasMoreAfter: false, before: [], after: [] }
    },
    perses: { metrics: [] }
  };
}

function unavailable(source: 'greptime_traces' | 'greptime_logs' | 'greptime_flow' | 'otlp_metrics') {
  return { state: 'unavailable' as const, reason: 'storage_unavailable' as const, source };
}

function identity() {
  return {
    workspaceId: 'default',
    entityId: '10',
    entityType: 'service',
    serviceName: 'checkout',
    serviceNamespace: 'shop',
    deploymentEnvironment: 'production'
  };
}

function window() {
  return { from: 1_750_000_000_000, to: 1_750_000_060_000, timeZone: 'UTC' };
}

function traceDetail(serviceIdentity: ReturnType<typeof identity>) {
  return {
    rootState: 'unique' as const,
    rootSpanCount: 1,
    missingParentCount: 0,
    observedStartTime: window().from,
    observedEndTime: window().from + 1,
    representativeSpan: {
      spanId: '0123456789abcdef',
      spanName: 'POST /checkout',
      serviceName: serviceIdentity.serviceName,
      serviceNamespace: serviceIdentity.serviceNamespace,
      startTime: window().from,
      durationNanos: 1_000_000
    },
    rootSpanId: '0123456789abcdef',
    serviceName: serviceIdentity.serviceName,
    serviceNamespace: serviceIdentity.serviceNamespace,
    deploymentEnvironment: serviceIdentity.deploymentEnvironment,
    entityId: serviceIdentity.entityId,
    entityType: serviceIdentity.entityType,
    rootSpanName: 'POST /checkout',
    durationNanos: '1000000',
    status: 'OK',
    startTime: window().from,
    errorSpanCount: 0,
    resourceAttributes: {},
    spans: []
  };
}

function lastPath(mock: ReturnType<typeof vi.fn>) {
  return mock.mock.calls.at(-1)?.[0] as string;
}

function pathParams(path: string) {
  const params = new URL(path, 'http://localhost').searchParams;
  return Object.fromEntries(params.entries());
}
