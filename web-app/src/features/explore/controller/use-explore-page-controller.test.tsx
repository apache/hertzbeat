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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryContextProvider } from '@/shared/query-context';
import { GlobalTimeProvider, RouteTimeProvider, useSharedTime, type SharedTimeValue } from '@/shared/time';

import { buildSignalApiPath } from '../api/explore-api';
import type { ExploreQuery, ExploreQueryPatch } from '../model/explore-model';
import type { MetricConsole } from '../model/explore-signal-contract';
import { exploreQueryKeys } from './explore-query-keys';
import { useExplorePageController } from './use-explore-page-controller';

const api = vi.hoisted(() => ({ loadLogSignal: vi.fn(), loadMetricSignal: vi.fn(), loadTraceSignal: vi.fn() }));
vi.mock('../api/explore-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/explore-api')>()),
  ...api
}));

describe('Explore page controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadMetricSignal.mockResolvedValue(metricConsole([]));
    api.loadLogSignal.mockResolvedValue(page([]));
    api.loadTraceSignal.mockResolvedValue(page([]));
  });

  it('owns URL pushes and converges on Back history without browser globals', async () => {
    const routed = renderController(['/explore?signal=metrics', '/explore?signal=metrics&query=current'], 1);
    await waitFor(() => expect(routed.current().query.query).toBe('current'));
    act(() => routed.current().updateQuery({ serviceName: 'checkout' }));
    expect(routed.router.state.location.search).toContain('serviceName=checkout');
    await act(async () => routed.router.navigate(-1));
    await waitFor(() => expect(routed.current().query.query).toBe('current'));
    await act(async () => routed.router.navigate(-1));
    await waitFor(() => expect(routed.current().query.query).toBeUndefined());
    await act(async () => routed.router.navigate(1));
    await waitFor(() => expect(routed.current().query.query).toBe('current'));
  });

  it('replaces legacy or invalid URL state with one canonical entry', async () => {
    const routed = renderController(
      [
        '/explore?signal=logs&query=previous',
        {
          pathname: '/explore',
          search:
            '?signal=invalid&range=last-1h&namespace=commerce&serviceInstanceId=checkout-1' +
            '&http.route=%2Fcheckout&autoRefresh=30000&unknown=drop',
          state: { returnTo: '/entities/7' }
        }
      ],
      1
    );
    expect(routed.router.state.location.state).toEqual({ returnTo: '/entities/7' });

    await waitFor(() =>
      expect(routed.router.state.location.search).toBe(
        '?signal=traces&timeRange=last-1h&autoRefresh=30000&serviceNamespace=commerce' +
          '&instance=checkout-1&endpoint=%2Fcheckout'
      )
    );
    await act(async () => routed.router.navigate(-1));
    expect(routed.router.state.location.search).toBe('?signal=logs&timeRange=last-30m&query=previous');
  });

  it('writes canonical live mode for log controls and clears it for other signals', async () => {
    const routed = renderController(['/explore?signal=logs']);
    await waitFor(() => expect(routed.current().query.signal).toBe('logs'));

    act(() => routed.current().updateQuery({ live: true }));
    await waitFor(() => expect(routed.router.state.location.search).toContain('mode=live'));
    expect(routed.router.state.location.search).not.toContain('live=true');

    act(() => routed.current().updateQuery({ signal: 'metrics' }));
    await waitFor(() => expect(routed.current().query.signal).toBe('metrics'));
    expect(routed.router.state.location.search).not.toMatch(/mode=live|live=true/u);
  });

  it('preserves exact handoff windows across Back and Forward', async () => {
    const scope = 'serviceName=checkout&serviceNamespace=commerce&environment=prod&collectorId=east';
    const routed = renderController(
      [`/explore?signal=traces&${scope}&start=1000&end=2000`, `/explore?signal=traces&${scope}&start=3000&end=4000`],
      1
    );
    await waitFor(() => expect(routed.current().query).toMatchObject({ start: 3000, end: 4000 }));

    await act(async () => routed.router.navigate(-1));
    await waitFor(() => expect(routed.current().query).toMatchObject({ start: 1000, end: 2000 }));
    expect(routed.router.state.location.search).toContain('start=1000&end=2000');

    await act(async () => routed.router.navigate(1));
    await waitFor(() => expect(routed.current().query).toMatchObject({ start: 3000, end: 4000 }));
    expect(routed.router.state.location.search).toContain('start=3000&end=4000');
  });

  it('clears downstream scope and old-service identity on service and Collector switches', async () => {
    const routed = renderController([
      '/explore?signal=metrics&collectorId=east&serviceName=checkout&serviceNamespace=commerce' +
        '&environment=prod&instance=checkout-1&endpoint=%2Fcheckout'
    ]);
    await waitFor(() => expect(routed.current().query.serviceName).toBe('checkout'));
    act(() => routed.current().updateQuery({ serviceName: 'payments' }));
    await waitFor(() => expect(routed.router.state.location.search).toContain('serviceName=payments'));
    expect(routed.router.state.location.search).toContain('collectorId=east');
    expect(routed.router.state.location.search).not.toMatch(/serviceNamespace|environment|instance|endpoint/u);

    act(() => routed.current().updateQuery({ collectorId: 'west' }));
    await waitFor(() => expect(routed.router.state.location.search).toContain('collectorId=west'));
    expect(routed.router.state.location.search).not.toMatch(
      /serviceName|serviceNamespace|environment|instance|endpoint/u
    );
  });

  it('never requests an invalid handoff or live log history', async () => {
    const invalid = renderController(['/explore?signal=traces&collectorId=east']);
    await waitFor(() => expect(invalid.current().handoff).toBe('invalid'));
    await act(async () => invalid.current().refresh());
    expect(api.loadTraceSignal).not.toHaveBeenCalled();
    invalid.unmount();

    const live = renderController(['/explore?signal=logs&mode=live']);
    await waitFor(() => expect(live.current().result.kind).toBe('live'));
    await act(async () => live.current().refresh());
    expect(api.loadLogSignal).not.toHaveBeenCalled();
  });

  it('preserves a complete handoff on query submission and requests the resulting scoped exact query', async () => {
    const routed = renderController([
      '/explore?signal=metrics&intakeProfileId=collector%3Aeast&collectorId=east&serviceName=checkout' +
        '&serviceNamespace=commerce&environment=prod&start=1000&end=2000'
    ]);
    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalledOnce());
    act(() => routed.current().submission.updateField({ field: 'query', value: 'rate(up[5m])' }));
    act(() => routed.current().submission.submit());

    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalledTimes(2));
    expect(routed.router.state.location.search).toContain('intakeProfileId=collector%3Aeast');
    expect(routed.router.state.location.search).toContain('collectorId=east');
    expect(routed.router.state.location.search).toContain('start=1000&end=2000');
    expect(api.loadMetricSignal.mock.calls[1]?.[0]).toMatchObject({
      query: 'rate(up[5m])',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod',
      intakeProfileId: 'collector:east',
      collectorId: 'east',
      start: 1_000,
      end: 2_000
    });
  });

  it('turns an invalid partial handoff into a requestable ordinary query after a valid manual submit', async () => {
    const routed = renderController(['/explore?signal=traces&collectorId=east']);
    await waitFor(() => expect(routed.current().handoff).toBe('invalid'));
    expect(api.loadTraceSignal).not.toHaveBeenCalled();

    act(() => routed.current().submission.updateField({ field: 'query', value: 'checkout' }));
    act(() => routed.current().submission.submit());

    await waitFor(() => expect(api.loadTraceSignal).toHaveBeenCalledOnce());
    expect(routed.current().handoff).toBe('none');
    expect(routed.router.state.location.search).not.toMatch(/collectorId|intakeProfileId|windowMode/u);
    expect(api.loadTraceSignal.mock.calls[0]?.[0]).toMatchObject({ query: 'checkout', collectorId: undefined });
  });

  it('retires handoff markers when an editable active filter is removed', async () => {
    const routed = renderController([
      '/explore?signal=logs&collectorId=east&serviceName=checkout&serviceNamespace=commerce' +
        '&environment=prod&instance=checkout-1&endpoint=%2Fcheckout&windowMode=preset&severityText=ERROR'
    ]);
    await waitFor(() => expect(api.loadLogSignal).toHaveBeenCalledOnce());

    act(() => {
      routed.current().submission.removeFilter('serviceName');
    });

    await waitFor(() => expect(api.loadLogSignal).toHaveBeenCalledTimes(2));
    expect(routed.router.state.location.search).not.toMatch(
      /collectorId|intakeProfileId|windowMode|serviceName|serviceNamespace|environment|instance|endpoint/u
    );
    expect(routed.router.state.location.search).toContain('severityText=ERROR');
  });

  it('keeps handoff markers for workbench signal and time changes', async () => {
    const routed = renderController([
      '/explore?signal=logs&collectorId=east&serviceName=checkout&serviceNamespace=commerce' +
        '&environment=prod&windowMode=preset'
    ]);
    await waitFor(() => expect(api.loadLogSignal).toHaveBeenCalledOnce());

    act(() => routed.current().updateQuery({ signal: 'metrics' }));
    await waitFor(() => expect(routed.current().query.signal).toBe('metrics'));
    expect(routed.router.state.location.search).toContain('collectorId=east');
    expect(routed.router.state.location.search).toContain('windowMode=preset');

    act(() => routed.current().updateQuery({ timeRange: 'last-1h' }));
    await waitFor(() => expect(routed.current().query.timeRange).toBe('last-1h'));
    expect(routed.router.state.location.search).toContain('collectorId=east');
    expect(routed.router.state.location.search).toContain('windowMode=preset');
  });

  it('restores exact scoped handoff submissions across Back and Forward', async () => {
    const handoff =
      '/explore?signal=metrics&collectorId=east&serviceName=checkout&serviceNamespace=commerce' +
      '&environment=prod&windowMode=preset';
    const routed = renderController([handoff]);
    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalledOnce());

    act(() => routed.current().updateManualQuery({ query: 'up' }));
    await waitFor(() => expect(routed.current().query.query).toBe('up'));
    expect(routed.current().handoff).toBe('scoped');
    const submittedSearch = routed.router.state.location.search;

    await act(async () => routed.router.navigate(-1));
    await waitFor(() => expect(routed.current().handoff).toBe('scoped'));
    expect(routed.router.state.location.search).toContain('collectorId=east');
    expect(routed.router.state.location.search).not.toContain('query=up');

    await act(async () => routed.router.navigate(1));
    await waitFor(() => expect(routed.current().query.query).toBe('up'));
    expect(routed.current().handoff).toBe('scoped');
    expect(routed.router.state.location.search).toBe(submittedSearch);
  });

  it('keeps preset ranges relative and exact onboarding windows fixed', async () => {
    const relative = renderController(['/explore?signal=metrics']);
    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalled());
    expect(api.loadMetricSignal.mock.calls[0]?.[0]).toMatchObject({
      timeRange: 'last-30m',
      start: undefined,
      end: undefined
    });
    act(() => relative.current().updateQuery({ timeRange: 'last-1h', start: undefined, end: undefined }));
    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalledTimes(2));
    expect(api.loadMetricSignal.mock.calls[1]?.[0]).toMatchObject({
      timeRange: 'last-1h',
      start: undefined,
      end: undefined
    });
    await act(async () => relative.current().refresh());
    expect(api.loadMetricSignal.mock.calls[2]?.[0]).toMatchObject({
      timeRange: 'last-1h',
      start: undefined,
      end: undefined
    });
    relative.unmount();

    const exact = renderController([
      '/explore?signal=metrics&serviceName=checkout&serviceNamespace=shop&environment=prod&collectorId=east&start=1000&end=2000'
    ]);
    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalledTimes(4));
    expect(api.loadMetricSignal.mock.calls[3]?.[0]).toMatchObject({ start: 1000, end: 2000 });
    await act(async () => exact.current().refresh());
    expect(api.loadMetricSignal.mock.calls[4]?.[0]).toMatchObject({ start: 1000, end: 2000 });
  });

  it.each(['metrics', 'logs', 'traces'] as const)(
    'auto-refreshes the relative %s window once per 30 second shared tick without losing context or exact URL fields',
    async signal => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(2_000_000);
        const paths: string[] = [];
        const loader =
          signal === 'metrics' ? api.loadMetricSignal : signal === 'logs' ? api.loadLogSignal : api.loadTraceSignal;
        loader.mockImplementation((query: ExploreQuery) => {
          paths.push(buildSignalApiPath(query, Date.now()));
          return Promise.resolve(signal === 'metrics' ? metricConsole([]) : page([]));
        });
        const scope =
          'collectorId=east&serviceName=checkout&serviceNamespace=commerce&environment=prod' +
          '&instance=checkout-1&endpoint=%2Fcheckout&windowMode=preset';
        const routed = renderController([`/explore?signal=${signal}&${scope}`]);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
        });
        expect(loader).toHaveBeenCalledTimes(1);
        expect(paths[0]).toContain('start=200000&end=2000000');
        expect(paths[0]).toContain(
          'serviceName=checkout&serviceNamespace=commerce&environment=prod&collectorId=east' +
            '&instance=checkout-1&endpoint=%2Fcheckout'
        );
        act(() => routed.time().setAutoRefresh(30_000));
        expect(routed.time()).toMatchObject({ policy: 'route_owned', autoRefreshMs: 30_000, refreshRevision: 0 });
        const key = routed.router.state.location.key;
        expect(routed.router.state.location.search).not.toMatch(/[?&](?:start|end)=/u);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(30_000);
        });
        expect(loader).toHaveBeenCalledTimes(2);
        expect(paths[1]).toContain('start=230000&end=2030000');
        expect(paths[1]).toContain(
          'serviceName=checkout&serviceNamespace=commerce&environment=prod&collectorId=east' +
            '&instance=checkout-1&endpoint=%2Fcheckout'
        );
        expect(routed.time().refreshRevision).toBe(1);
        expect(routed.router.state.location.key).toBe(key);
        expect(routed.router.state.location.search).not.toMatch(/[?&](?:start|end)=/u);
      } finally {
        vi.useRealTimers();
      }
    }
  );

  it('does not refresh an exact window behind the route-owned shell policy', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(2_000_000);
      const paths: string[] = [];
      api.loadMetricSignal.mockImplementation((query: ExploreQuery) => {
        paths.push(buildSignalApiPath(query, Date.now()));
        return Promise.resolve(metricConsole([]));
      });
      const routed = renderController([
        '/explore?signal=metrics&serviceName=checkout&serviceNamespace=commerce&environment=prod' +
          '&collectorId=east&start=1000&end=2000'
      ]);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      const key = routed.router.state.location.key;
      act(() => routed.time().setAutoRefresh(30_000));
      expect(routed.time()).toMatchObject({ autoRefreshMs: 0, refreshRevision: 0 });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });

      expect(paths).toHaveLength(1);
      expect(paths[0]).toContain('start=1000&end=2000');
      expect(routed.router.state.location.key).toBe(key);
      expect(routed.router.state.location.search).toContain('start=1000&end=2000');
    } finally {
      vi.useRealTimers();
    }
  });

  it('routes a local refresh through the route-owned shell time revision exactly once', async () => {
    const routed = renderController(['/explore?signal=metrics']);
    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalledOnce());
    const revision = routed.time().refreshRevision;

    await act(async () => routed.current().refresh());
    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalledTimes(2));

    expect(routed.time().refreshRevision).toBe(revision + 1);
  });

  it.each([
    [page([]), 'empty'],
    [page([], 3, 3, 1), 'ready']
  ])('classifies authoritative page evidence as %s', async (evidence, kind) => {
    api.loadTraceSignal.mockResolvedValue(evidence);
    const routed = renderController(['/explore?signal=traces']);
    await waitFor(() => expect(routed.current().result.kind).toBe(kind));
  });

  it('keeps metric request failures at the page boundary instead of treating them as result states', async () => {
    const { ApiMessageError } = await import('@/core/http/api-message');
    const { ExploreSignalContractError } = await import('../model/explore-signal-contract');
    for (const [reason, kind] of [
      [new ApiMessageError('forbidden', { status: 403 }), 'permission'],
      [new ApiMessageError('offline', { status: 503 }), 'transport_error'],
      [new ExploreSignalContractError('bad'), 'contract_error'],
      [new Error('bad'), 'error']
    ] as const) {
      api.loadMetricSignal.mockRejectedValue(reason);
      const routed = renderController(['/explore?signal=metrics']);
      await waitFor(() => expect(routed.current().result.kind).toBe(kind));
      routed.unmount();
    }
  });

  it.each([
    ['missing context', metricConsole([], { results: null, emptyStateReason: 'no_context' }), 'missing_context'],
    [
      'unsupported query',
      metricConsole([], { results: null, emptyStateReason: 'unsupported_query' }),
      'unsupported_query'
    ],
    [
      'failed storage load',
      metricConsole([], { results: null, emptyStateReason: 'load_failed' }),
      'storage_unavailable'
    ],
    [
      'backend error',
      metricConsole([], { results: { refId: null, status: 503, msg: 'storage offline', frames: [] } }),
      'error'
    ],
    ['true empty', metricConsole([]), 'empty'],
    ['invalid numeric data', metricConsole([{ schema: null, data: [[1000, 'not-a-number']] }]), 'empty'],
    ['zero-valued data', metricConsole([{ schema: null, data: [[1000, 0]] }]), 'ready']
  ] as const)('classifies $0 once and preserves the metric result object', async (_name, evidence, kind) => {
    api.loadMetricSignal.mockResolvedValue(evidence);
    const routed = renderController([
      '/explore?signal=metrics&collectorId=east&serviceName=checkout' +
        '&serviceNamespace=commerce&environment=prod&windowMode=preset' +
        '&query=sum%28rate%28http_requests_total%5B5m%5D%29%29'
    ]);
    await waitFor(() =>
      expect(routed.current().result).toMatchObject({ kind: 'metric', state: { kind }, data: evidence })
    );
    if (kind === 'error') {
      expect(routed.current().result).toMatchObject({ state: { message: 'storage offline' } });
    }
  });

  it('does not let a stale previous-signal promise replace the current result', async () => {
    const metric = deferred<MetricConsole>();
    let metricSignal: AbortSignal | undefined;
    api.loadMetricSignal.mockImplementation((_query: ExploreQuery, signal: AbortSignal) => {
      metricSignal = signal;
      return metric.promise;
    });
    api.loadLogSignal.mockResolvedValue(page([logRow({ body: 'current' })]));
    const routed = renderController(['/explore?signal=metrics']);
    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalled());
    act(() => routed.current().updateQuery({ signal: 'logs', pageIndex: undefined }));
    await waitFor(() => expect(routed.current().result).toMatchObject({ kind: 'ready', signal: 'logs' }));
    expect(metricSignal?.aborted).toBe(true);
    act(() => metric.resolve(metricConsole([])));
    await act(async () => metric.promise);
    expect(routed.current().result).toMatchObject({ kind: 'ready', signal: 'logs' });
  });

  it.each<[string, ExploreQueryPatch]>([
    ['time', { timeRange: 'last-1h' }],
    ['context', { serviceName: 'payments' }]
  ])('aborts an old request when the active %s scope changes', async (_scope, patch) => {
    const first = deferred<MetricConsole>();
    const signals: AbortSignal[] = [];
    api.loadMetricSignal
      .mockImplementationOnce((_query: ExploreQuery, signal: AbortSignal) => {
        signals.push(signal);
        return first.promise;
      })
      .mockImplementation((_query: ExploreQuery, signal: AbortSignal) => {
        signals.push(signal);
        return Promise.resolve(metricConsole([]));
      });
    const routed = renderController(['/explore?signal=metrics']);
    await waitFor(() => expect(signals).toHaveLength(1));

    act(() => routed.current().updateQuery(patch));
    await waitFor(() => expect(signals).toHaveLength(2));

    expect(signals[0]?.aborted).toBe(true);
  });

  it('shares the feature-owned history identity with cached signal evidence', async () => {
    const refresh = deferred<ReturnType<typeof page>>();
    let refreshSignal: AbortSignal | undefined;
    api.loadLogSignal.mockImplementation((_query: ExploreQuery, signal: AbortSignal) => {
      refreshSignal = signal;
      return refresh.promise;
    });
    const query: ExploreQuery = { signal: 'logs', timeRange: 'last-30m', query: 'cached' };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    client.setQueryData(exploreQueryKeys.history(query, undefined, 0), {
      signal: 'logs',
      data: page([logRow({ body: 'cached' })])
    });

    const routed = renderController(['/explore?signal=logs&query=cached'], 0, client);

    await waitFor(() =>
      expect(routed.current().result).toMatchObject({
        kind: 'refreshing',
        evidence: {
          kind: 'ready',
          signal: 'logs',
          data: { content: [{ body: 'cached' }] }
        }
      })
    );
    expect(api.loadLogSignal).toHaveBeenCalledOnce();
    routed.unmount();
    await waitFor(() => expect(refreshSignal?.aborted).toBe(true));
  });

  it('projects cached history as refreshing until a successful request atomically replaces it', async () => {
    const refresh = deferred<ReturnType<typeof page>>();
    api.loadLogSignal.mockReturnValue(refresh.promise);
    const query: ExploreQuery = { signal: 'logs', timeRange: 'last-30m', query: 'cached' };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    client.setQueryData(exploreQueryKeys.history(query, undefined, 0), {
      signal: 'logs',
      data: page([logRow({ body: 'cached' })])
    });

    const routed = renderController(['/explore?signal=logs&query=cached'], 0, client);

    await waitFor(() =>
      expect(routed.current().result).toMatchObject({
        kind: 'refreshing',
        evidence: { kind: 'ready', signal: 'logs', data: { content: [{ body: 'cached' }] } }
      })
    );
    act(() => refresh.resolve(page([logRow({ body: 'fresh' })])));
    await waitFor(() =>
      expect(routed.current().result).toMatchObject({
        kind: 'ready',
        signal: 'logs',
        data: { content: [{ body: 'fresh' }] }
      })
    );
  });

  it('retains cached history after refresh failure only as stale error evidence', async () => {
    api.loadLogSignal.mockRejectedValue(new Error('refresh failed'));
    const query: ExploreQuery = { signal: 'logs', timeRange: 'last-30m', query: 'cached' };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    client.setQueryData(exploreQueryKeys.history(query, undefined, 0), {
      signal: 'logs',
      data: page([logRow({ body: 'cached' })])
    });

    const routed = renderController(['/explore?signal=logs&query=cached'], 0, client);

    await waitFor(() =>
      expect(routed.current().result).toMatchObject({
        kind: 'stale_error',
        errorKind: 'error',
        evidence: { kind: 'ready', signal: 'logs', data: { content: [{ body: 'cached' }] } }
      })
    );
  });

  it('carries evidence only across refresh generations, never across query identity changes', async () => {
    api.loadLogSignal.mockResolvedValueOnce(page([logRow({ body: 'generation-0' })]));
    const routed = renderController(['/explore?signal=logs&query=owned']);
    await waitFor(() =>
      expect(routed.current().result).toMatchObject({
        kind: 'ready',
        signal: 'logs',
        data: { content: [{ body: 'generation-0' }] }
      })
    );

    const refresh = deferred<ReturnType<typeof page>>();
    api.loadLogSignal.mockReturnValueOnce(refresh.promise);
    act(() => {
      void routed.current().refresh();
    });
    await waitFor(() =>
      expect(routed.current().result).toMatchObject({
        kind: 'refreshing',
        evidence: { data: { content: [{ body: 'generation-0' }] } }
      })
    );

    const nextIdentity = deferred<ReturnType<typeof page>>();
    api.loadLogSignal.mockReturnValueOnce(nextIdentity.promise);
    act(() => routed.current().updateQuery({ query: 'different' }));
    await waitFor(() => expect(routed.current().result).toEqual({ kind: 'loading' }));
  });

  it('rejects cached history evidence owned by another signal', async () => {
    api.loadMetricSignal.mockReturnValue(new Promise<MetricConsole>(() => undefined));
    const query: ExploreQuery = { signal: 'metrics', timeRange: 'last-30m' };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    client.setQueryData(exploreQueryKeys.history(query, undefined, 0), {
      signal: 'logs',
      data: page([logRow({ body: 'wrong signal' })])
    });

    const routed = renderController(['/explore?signal=metrics'], 0, client);

    await waitFor(() => expect(routed.current().result).toEqual({ kind: 'error' }));
    routed.unmount();
  });
});

function renderController(
  entries: Array<string | { pathname: string; search: string; state: unknown }>,
  initialIndex = 0,
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
) {
  let controller: ReturnType<typeof useExplorePageController> | undefined;
  let time: SharedTimeValue | undefined;
  function Probe() {
    controller = useExplorePageController();
    time = useSharedTime();
    return null;
  }
  const router = createMemoryRouter(
    [
      {
        path: '/explore',
        element: (
          <QueryClientProvider client={client}>
            <QueryContextProvider>
              <GlobalTimeProvider>
                <RouteTimeProvider policy="route_owned" canonicalizeInvalidExact={false}>
                  <Probe />
                </RouteTimeProvider>
              </GlobalTimeProvider>
            </QueryContextProvider>
          </QueryClientProvider>
        )
      }
    ],
    {
      initialEntries: entries,
      initialIndex
    }
  );
  const view = render(<RouterProvider router={router} />);
  return {
    router,
    unmount: view.unmount,
    current: () => {
      if (!controller) throw new Error('controller not mounted');
      return controller;
    },
    time: () => {
      if (!time) throw new Error('shared time not mounted');
      return time;
    }
  };
}

function metricConsole(
  frames: NonNullable<NonNullable<MetricConsole['results']>['frames']>,
  override: Partial<MetricConsole> = {}
): MetricConsole {
  return {
    context: null,
    query: null,
    datasource: null,
    queryMode: null,
    results: { refId: null, status: 200, msg: null, frames },
    stats: null,
    emptyStateReason: null,
    errorMessage: null,
    ...override
  };
}
function page(content: unknown[], totalElements = content.length, number = 0, totalPages = totalElements ? 1 : 0) {
  return { content, totalElements, totalPages, number, size: 20 };
}
function logRow(
  override: Partial<import('../model/explore-signal-contract').LogRow> = {}
): import('../model/explore-signal-contract').LogRow {
  return {
    timeUnixNano: null,
    observedTimeUnixNano: null,
    severityNumber: null,
    severityText: null,
    body: null,
    attributes: null,
    droppedAttributesCount: null,
    traceId: null,
    spanId: null,
    traceFlags: null,
    resource: null,
    resourceSchemaUrl: null,
    instrumentationScope: null,
    scopeSchemaUrl: null,
    ...override
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
