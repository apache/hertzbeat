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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadLogInvestigation, loadTraceInvestigation } from '../api/explore-investigation-api';
import { ExploreInvestigationContractError } from '../api/explore-investigation-schema';
import { parseExploreQuery } from '../model/explore-model';
import { useLogInvestigationController } from './use-log-investigation-controller';
import { useTraceInvestigationController } from './use-trace-investigation-controller';

vi.mock('../api/explore-investigation-api', () => ({
  loadLogInvestigation: vi.fn(),
  loadTraceInvestigation: vi.fn()
}));
vi.mock('@/shared/time', () => ({ useSharedTimeOptional: () => ({ refreshRevision: 3 }) }));

const loadTrace = vi.mocked(loadTraceInvestigation);
const sessionState = vi.hoisted(() => ({ workspaceId: 'default' }));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({
    session: {
      username: 'operator',
      workspaceId: sessionState.workspaceId,
      roles: ['ADMIN'],
      authenticated: true
    }
  })
}));
const loadLog = vi.mocked(loadLogInvestigation);
const traceId = '0123456789abcdef0123456789abcdef';
const spanId = '0123456789abcdef';

describe('Explore focused investigation controllers', () => {
  beforeEach(() => {
    loadTrace.mockReset();
    loadLog.mockReset();
    sessionState.workspaceId = 'default';
  });

  it('queries an exact Trace composite and exposes only parsed ready evidence', async () => {
    loadTrace.mockResolvedValue(traceSnapshot());
    const { result } = renderHook(
      () =>
        useTraceInvestigationController(
          traceQuery(`signal=traces&traceId=${traceId}&spanId=${spanId}&start=1000&end=2000&timeZone=UTC&entityId=7`)
        ),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    expect(loadTrace).toHaveBeenCalledWith(
      traceId,
      spanId,
      { from: 1_000, to: 2_000, timeZone: 'UTC' },
      expect.any(AbortSignal),
      undefined
    );
    if (result.current.state.kind === 'ready') {
      expect(result.current.state.perses.gantt).toBeUndefined();
      expect(result.current.state.snapshot.gantt.state).toBe('empty');
    }
  });

  it('uses source as part of detail identity for the same trace and clears retained selection evidence', async () => {
    loadTrace.mockResolvedValueOnce(traceSnapshot()).mockImplementation(() => new Promise(() => undefined));
    const { result, rerender } = renderHook(
      ({ source }) =>
        useTraceInvestigationController(
          traceQuery(
            `signal=traces&source=${source}&traceId=${traceId}&spanId=${spanId}&start=1000&end=2000&timeZone=UTC`
          )
        ),
      { initialProps: { source: 'external' }, wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    rerender({ source: 'self' });
    expect(result.current.state.kind).toBe('loading');
    await waitFor(() =>
      expect(loadTrace).toHaveBeenLastCalledWith(
        traceId,
        spanId,
        { from: 1000, to: 2000, timeZone: 'UTC' },
        expect.any(AbortSignal),
        'self'
      )
    );
  });

  it('does not query incomplete focused anchors and separates invalid from inactive routes', () => {
    const invalid = renderHook(
      () => useTraceInvestigationController(traceQuery(`signal=traces&traceId=${traceId}&start=1000&end=2000`)),
      { wrapper: wrapper() }
    );
    const inactive = renderHook(() => useLogInvestigationController(logQuery('signal=logs&query=timeout')), {
      wrapper: wrapper()
    });

    expect(invalid.result.current.state).toEqual({ kind: 'invalid' });
    expect(inactive.result.current.state).toEqual({ kind: 'inactive' });
    expect(loadTrace).not.toHaveBeenCalled();
    expect(loadLog).not.toHaveBeenCalled();
  });

  it('lets a refetch error win over retained data and keeps contract failure distinct', async () => {
    loadLog.mockResolvedValueOnce(logSnapshot()).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(
      () =>
        useLogInvestigationController(logQuery('signal=logs&logRecordUid=event-7&start=1000&end=2000&timeZone=UTC')),
      { wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.state.kind).toBe('ready'));

    await act(() => result.current.refetch());
    await waitFor(() => expect(result.current.state.kind).toBe('unavailable'));

    loadLog.mockRejectedValueOnce(new ExploreInvestigationContractError());
    await act(() => result.current.refetch());
    await waitFor(() => expect(result.current.state.kind).toBe('contract_error'));
  });

  it('marks retained Log evidence stale until refetch succeeds and after failure', async () => {
    let finish: (value: ReturnType<typeof logSnapshot>) => void = () => undefined;
    loadLog.mockResolvedValueOnce(logSnapshot()).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const { result } = renderHook(
      () =>
        useLogInvestigationController(logQuery('signal=logs&logRecordUid=event-7&start=1000&end=2000&timeZone=UTC')),
      { wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    expect(result.current.evidenceCurrent).toBe(true);
    act(() => {
      void result.current.refetch();
    });
    await waitFor(() => expect(result.current.evidenceCurrent).toBe(false));
    expect(result.current.state.kind).toBe('ready');
    act(() => finish(logSnapshot()));
    await waitFor(() => expect(result.current.evidenceCurrent).toBe(true));
    loadLog.mockRejectedValueOnce(new Error('offline'));
    await act(() => result.current.refetch());
    await waitFor(() => expect(result.current.state.kind).toBe('unavailable'));
    expect(result.current.evidenceCurrent).toBe(false);
  });

  it('aborts the previous owner when the exact Trace scope changes', async () => {
    const observedSignals: AbortSignal[] = [];
    loadTrace.mockImplementation((_traceId, _spanId, _window, signal) => {
      if (signal) observedSignals.push(signal);
      return new Promise(() => undefined);
    });
    const { rerender } = renderHook(
      ({ trace }) =>
        useTraceInvestigationController(
          traceQuery(`signal=traces&traceId=${trace}&start=1000&end=2000&timeZone=UTC&entityId=7`)
        ),
      { initialProps: { trace: traceId }, wrapper: wrapper() }
    );
    await waitFor(() => expect(observedSignals).toHaveLength(1));

    rerender({ trace: 'fedcba9876543210fedcba9876543210' });
    await waitFor(() => expect(observedSignals).toHaveLength(2));
    expect(observedSignals[0]?.aborted).toBe(true);
  });

  it('retains only the same trace and window while URL selection loads, marking dependent evidence stale', async () => {
    loadTrace.mockResolvedValueOnce(traceSnapshot()).mockImplementation(() => new Promise(() => undefined));
    const { result, rerender } = renderHook(
      ({ selected, trace }) =>
        useTraceInvestigationController(
          traceQuery(`signal=traces&traceId=${trace}&spanId=${selected}&start=1000&end=2000&timeZone=UTC`)
        ),
      { initialProps: { selected: spanId, trace: traceId }, wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    const original = result.current.state;
    rerender({ selected: '1111111111111111', trace: traceId });
    expect(result.current.state.kind).toBe('ready');
    expect(result.current.evidenceCurrent).toBe(false);
    if (result.current.state.kind === 'ready' && original.kind === 'ready') {
      expect(result.current.state.snapshot).toBe(original.snapshot);
    }
    rerender({ selected: spanId, trace: 'fedcba9876543210fedcba9876543210' });
    expect(result.current.state.kind).toBe('loading');
  });

  it('immediately discards retained evidence when the authenticated workspace changes', async () => {
    loadTrace.mockResolvedValueOnce(traceSnapshot()).mockImplementation(() => new Promise(() => undefined));
    const { result, rerender } = renderHook(
      () =>
        useTraceInvestigationController(
          traceQuery(`signal=traces&traceId=${traceId}&spanId=${spanId}&start=1000&end=2000&timeZone=UTC`)
        ),
      { wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    sessionState.workspaceId = 'another';
    rerender();
    expect(result.current.state.kind).toBe('loading');
  });

  it('clears retained geometry when the selected-span request fails rather than claiming current evidence', async () => {
    loadTrace.mockResolvedValueOnce(traceSnapshot()).mockRejectedValueOnce(new Error('offline'));
    const { result, rerender } = renderHook(
      ({ selected }) =>
        useTraceInvestigationController(
          traceQuery(`signal=traces&traceId=${traceId}&spanId=${selected}&start=1000&end=2000&timeZone=UTC`)
        ),
      { initialProps: { selected: spanId }, wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    rerender({ selected: '1111111111111111' });
    await waitFor(() => expect(result.current.state.kind).toBe('unavailable'));
    expect(result.current.evidenceCurrent).toBe(false);
  });
  it.each(['success', 'failure'] as const)('keeps the latest selected span after an obsolete %s', async outcome => {
    const old = deferredDetail<ReturnType<typeof traceSnapshot>>();
    const current = deferredDetail<ReturnType<typeof traceSnapshot>>();
    loadTrace
      .mockResolvedValueOnce(traceSnapshot())
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise);
    const scope = (selected: string) =>
      traceQuery(
        `signal=traces&traceId=${traceId}&spanId=${selected}&start=1000&end=2000&timeZone=UTC&serviceName=checkout`
      );
    const hook = renderHook(({ selected }) => useTraceInvestigationController(scope(selected)), {
      initialProps: { selected: spanId },
      wrapper: wrapper()
    });
    await waitFor(() => expect(hook.result.current.evidenceCurrent).toBe(true));
    hook.rerender({ selected: '1111111111111111' });
    await waitFor(() => expect(loadTrace).toHaveBeenCalledTimes(2));
    const oldSignal = loadTrace.mock.calls[1]![3]!;
    hook.rerender({ selected: '2222222222222222' });
    await waitFor(() => expect(loadTrace).toHaveBeenCalledTimes(3));
    expect(oldSignal.aborted).toBe(true);
    expect(hook.result.current.evidenceCurrent).toBe(false);
    const accepted = { ...traceSnapshot(), selectedSpanId: '2222222222222222' };
    await act(async () => {
      current.resolve(accepted);
      await current.promise;
    });
    await waitFor(() => expect(hook.result.current.evidenceCurrent).toBe(true));
    await act(async () => {
      if (outcome === 'success') old.resolve({ ...traceSnapshot(), selectedSpanId: '1111111111111111' });
      else old.reject(new Error('obsolete span failed'));
      await old.promise.catch(() => undefined);
    });
    expect(hook.result.current.state).toMatchObject({
      kind: 'ready',
      snapshot: { selectedSpanId: '2222222222222222' }
    });
    expect(hook.result.current.evidenceCurrent).toBe(true);
  });
  it('recovers selected-span failure with one delayed retry and current evidence', async () => {
    const retry = deferredDetail<ReturnType<typeof traceSnapshot>>();
    loadTrace
      .mockResolvedValueOnce(traceSnapshot())
      .mockRejectedValueOnce(new Error('selection offline'))
      .mockReturnValueOnce(retry.promise);
    const hook = renderHook(
      ({ selected }) =>
        useTraceInvestigationController(
          traceQuery(`signal=traces&traceId=${traceId}&spanId=${selected}&start=1000&end=2000&timeZone=UTC`)
        ),
      { initialProps: { selected: spanId }, wrapper: wrapper() }
    );
    await waitFor(() => expect(hook.result.current.evidenceCurrent).toBe(true));
    hook.rerender({ selected: '2222222222222222' });
    await waitFor(() => expect(hook.result.current.state.kind).toBe('unavailable'));
    expect(hook.result.current.evidenceCurrent).toBe(false);
    act(() => {
      void hook.result.current.refetch();
      void hook.result.current.refetch();
    });
    await waitFor(() => expect(loadTrace).toHaveBeenCalledTimes(3));
    expect(hook.result.current.evidenceCurrent).toBe(false);
    expect(hook.result.current.state).toMatchObject({ kind: 'ready', snapshot: { selectedSpanId: spanId } });
    await act(async () => {
      retry.resolve({ ...traceSnapshot(), selectedSpanId: '2222222222222222' });
      await retry.promise;
    });
    await waitFor(() => expect(hook.result.current.evidenceCurrent).toBe(true));
    expect(hook.result.current.state).toMatchObject({
      kind: 'ready',
      snapshot: { selectedSpanId: '2222222222222222' }
    });
  });

  it('retires selected detail on drawer unmount and keeps its late failure out of cache', async () => {
    const old = deferredDetail<ReturnType<typeof traceSnapshot>>();
    loadTrace.mockReturnValueOnce(old.promise);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const Wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const hook = renderHook(
      () =>
        useTraceInvestigationController(
          traceQuery(`signal=traces&traceId=${traceId}&spanId=${spanId}&start=1000&end=2000&timeZone=UTC`)
        ),
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(loadTrace).toHaveBeenCalledOnce());
    const signal = loadTrace.mock.calls[0]![3]!;
    hook.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => {
      old.reject(new Error('unmounted detail failed'));
      await old.promise.catch(() => undefined);
    });
    for (const entry of client.getQueryCache().getAll()) {
      expect(entry.state.data).toBeUndefined();
      expect(entry.state.error).toBeNull();
    }
    client.clear();
  });
});

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function traceQuery(search: string) {
  const query = parseExploreQuery(new URLSearchParams(search));
  if (query.signal !== 'traces') throw new Error('Trace query expected');
  return query;
}

function logQuery(search: string) {
  const query = parseExploreQuery(new URLSearchParams(search));
  if (query.signal !== 'logs') throw new Error('Log query expected');
  return query;
}

function traceSnapshot() {
  return {
    traceId,
    selectedSpanId: spanId,
    window: { start: 1_000, end: 2_000 },
    gantt: { state: 'empty' as const, reason: 'no_data' as const, source: 'greptime_traces' as const, detail: null },
    sameTraceLogs: {
      state: 'empty' as const,
      reason: 'no_data' as const,
      source: 'greptime_logs' as const,
      truncated: false,
      logs: []
    },
    red: {
      state: 'unavailable' as const,
      reason: 'identity_unavailable' as const,
      source: 'greptime_flow' as const,
      resolutionSeconds: 60 as const,
      identity: null,
      summary: null,
      series: []
    },
    metrics: {
      state: 'unavailable' as const,
      reason: 'query_strategy_unavailable' as const,
      source: 'otlp_metrics' as const,
      truncated: false,
      series: []
    },
    dependencies: {
      state: 'empty' as const,
      reason: 'no_data' as const,
      source: 'greptime_traces' as const,
      truncated: false,
      edges: []
    }
  };
}

function logSnapshot() {
  return {
    logRecordUid: 'event-7',
    window: { start: 1_000, end: 2_000 },
    selectedLog: { state: 'empty' as const, reason: 'not_found' as const, source: 'greptime_logs' as const, log: null },
    trace: {
      state: 'empty' as const,
      reason: 'not_correlated' as const,
      source: 'greptime_traces' as const,
      detail: null
    },
    metrics: {
      state: 'unavailable' as const,
      reason: 'query_strategy_unavailable' as const,
      source: 'otlp_metrics' as const,
      truncated: false,
      series: []
    },
    nearbyLogs: {
      state: 'empty' as const,
      reason: 'no_data' as const,
      source: 'greptime_logs' as const,
      hasMoreBefore: false,
      hasMoreAfter: false,
      before: [],
      after: []
    }
  };
}

function deferredDetail<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
