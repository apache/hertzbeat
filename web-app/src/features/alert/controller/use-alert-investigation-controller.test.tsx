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

import { loadAlertInvestigation } from '../api/alert-investigation-api';
import { AlertInvestigationContractError } from '../api/alert-investigation-schema';
import type { AlertInvestigationRoute } from '../model/alert-investigation-route';
import { useAlertInvestigationController } from './use-alert-investigation-controller';

vi.mock('../api/alert-investigation-api', () => ({ loadAlertInvestigation: vi.fn() }));
vi.mock('@/shared/time', () => ({ useSharedTimeOptional: () => ({ refreshRevision: 3 }) }));
const auth = vi.hoisted((): AuthRuntime => ({
  state: {
    loading: false,
    session: { workspaceId: 'workspace-a' }
  }
}));
vi.mock('@/core/auth/session-context', () => ({ useSession: () => auth.state }));

const load = vi.mocked(loadAlertInvestigation);

type AuthRuntime = { state: { loading: boolean; session: { workspaceId: string } | undefined } };

describe('Alert investigation controller', () => {
  beforeEach(() => {
    load.mockReset();
    auth.state = { loading: false, session: { workspaceId: 'workspace-a' } };
  });

  it('queries the exact URL-owned alert scope and exposes ready evidence', async () => {
    load.mockResolvedValue(snapshot() as never);
    const { result } = renderHook(() => useAlertInvestigationController(readyRoute()), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    expect(load).toHaveBeenCalledWith(11, { from: 1_000, to: 2_000, timeZone: 'UTC' }, expect.any(AbortSignal));
    if (result.current.state.kind === 'ready') {
      expect(result.current.state.snapshot.window.anchor).toBe(1_500);
      expect(result.current.state.perses).toEqual({ metrics: [] });
    }
  });

  it('does not query an invalid route', () => {
    const { result } = renderHook(() => useAlertInvestigationController({ kind: 'invalid' }), { wrapper: wrapper() });

    expect(result.current.state).toEqual({ kind: 'invalid' });
    expect(load).not.toHaveBeenCalled();
  });

  it('lets refetch errors win over retained evidence and separates contract failure', async () => {
    load.mockResolvedValueOnce(snapshot() as never).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useAlertInvestigationController(readyRoute()), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.state.kind).toBe('ready'));

    await act(() => result.current.refetch());
    await waitFor(() => expect(result.current.state.kind).toBe('unavailable'));

    load.mockRejectedValueOnce(new AlertInvestigationContractError());
    await act(() => result.current.refetch());
    await waitFor(() => expect(result.current.state.kind).toBe('contract_error'));
  });

  it('starts a distinct request owner when the alert identity changes', async () => {
    const signals: AbortSignal[] = [];
    load.mockImplementation((_alertId, _window, signal) => {
      if (signal) signals.push(signal);
      return Promise.resolve(snapshot() as never);
    });
    const { rerender } = renderHook(({ alertId }) => useAlertInvestigationController({ ...readyRoute(), alertId }), {
      initialProps: { alertId: 11 },
      wrapper: wrapper()
    });
    await waitFor(() => expect(signals).toHaveLength(1), { timeout: 2_000 });

    rerender({ alertId: 12 });
    await waitFor(() => expect(signals).toHaveLength(2), { timeout: 2_000 });
    expect(load.mock.calls.map(call => call[0])).toEqual([11, 12]);
    expect(signals[0]).not.toBe(signals[1]);
  });

  it('starts a distinct request owner when the session workspace changes', async () => {
    load.mockResolvedValue(snapshot() as never);
    const { rerender } = renderHook(() => useAlertInvestigationController(readyRoute()), { wrapper: wrapper() });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    auth.state = { loading: false, session: { workspaceId: 'workspace-b' } };
    rerender();

    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });

  it('does not query without an authenticated workspace', () => {
    auth.state = { loading: false, session: undefined };
    const { result } = renderHook(() => useAlertInvestigationController(readyRoute()), { wrapper: wrapper() });

    expect(result.current.state.kind).toBe('unavailable');
    expect(load).not.toHaveBeenCalled();
  });
});

function readyRoute(): Extract<AlertInvestigationRoute, { kind: 'ready' }> {
  return {
    kind: 'ready',
    alertId: 11,
    window: { from: 1_000, to: 2_000, timeZone: 'UTC' },
    returnTo: '/alerts?status=firing'
  };
}

function snapshot() {
  return {
    alertId: 11,
    window: { start: 1_000, end: 2_000, anchor: 1_500 },
    alert: { name: null, status: null, severity: null, summary: null, content: null, labels: {}, annotations: {} },
    identity: { state: 'unavailable', reason: 'identity_unavailable', source: 'persisted_alert', identity: null },
    metrics: unavailable('otlp_metrics', 'series', 'query_strategy_unavailable'),
    logs: empty('greptime_logs', 'records'),
    traces: empty('greptime_traces', 'traces'),
    topology: unavailable('greptime_semantic_graph', 'edges', 'identity_unavailable'),
    collection: { state: 'empty', reason: 'no_data', source: 'greptime_collection_events', event: null }
  };
}

function empty(source: string, payload: string) {
  return { state: 'empty', reason: 'no_data', source, [payload]: [], truncated: false };
}

function unavailable(source: string, payload: string, reason: string) {
  return { state: 'unavailable', reason, source, [payload]: [], truncated: false };
}

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
