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

import { ApiMessageError } from '@/core/http/api-message';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryContextProvider } from '@/shared/query-context';
import { GlobalTimeProvider, RouteTimeProvider, useSharedTime, type SharedTimeValue } from '@/shared/time';

import { buildTraceInvestigationPath } from '../model/explore-investigation-model';
import { buildSignalApiPath } from '../api/explore-api';
import { parseExploreQuery, type ExploreQuery, type ExploreQueryPatch } from '../model/explore-model';
import type { MetricConsole } from '../model/explore-signal-contract';
import { exploreQueryKeys } from './explore-query-keys';
import { useExplorePageController } from './use-explore-page-controller';

const api = vi.hoisted(() => ({ loadLogSignal: vi.fn(), loadMetricSignal: vi.fn(), loadTraceSignal: vi.fn() }));
const cachedWindow = { from: 1_000, to: 2_000 } as const;
vi.mock('../api/explore-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/explore-api')>()),
  ...api,
  loadLogHistoryEvidence: api.loadLogSignal
}));

describe('Explore page controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadMetricSignal.mockResolvedValue(metricConsole([]));
    api.loadLogSignal.mockResolvedValue(logEvidence(page([])));
    api.loadTraceSignal.mockResolvedValue(page([]));
  });

  it('binds syntax diagnostics to the failed historical query and drops them after a new request', async () => {
    api.loadLogSignal.mockRejectedValueOnce(
      new ApiMessageError('observability_log_filter_invalid', {
        status: 400,
        data: { syntaxIssue: 'missing_value', start: 8, end: 8 }
      })
    );
    const routed = renderController([
      '/explore?signal=logs&searchSyntax=structured-v1&query=service%3A&start=1000&end=2000'
    ]);
    await waitFor(() =>
      expect(routed.current().result).toMatchObject({
        kind: 'invalid_filter',
        syntaxDiagnostic: { issue: 'missing_value', start: 8, end: 8, expression: 'service:' }
      })
    );
    act(() => routed.current().updateQuery({ query: 'service:checkout' }));
    await waitFor(() => expect(routed.current().result.kind).toBe('empty'));
    expect(routed.current().result).not.toHaveProperty('syntaxDiagnostic');
  });

  it('keeps explicit-query history stable when the browser regains focus', async () => {
    const routed = renderController(['/explore?signal=logs&start=1000&end=2000']);
    await waitFor(() => expect(routed.current().result.kind).toBe('empty'));
    const calls = api.loadLogSignal.mock.calls.length;
    act(() => focusManager.setFocused(false));
    await act(async () => {
      focusManager.setFocused(true);
      await Promise.resolve();
    });
    expect(api.loadLogSignal).toHaveBeenCalledTimes(calls);
    focusManager.setFocused(undefined);
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
    expect(routed.router.state.location.search).toBe(
      '?signal=logs&timeRange=last-30m&query=%22previous%22&searchSyntax=structured-v1'
    );
  });

  it('freezes the observed window when switching signals and retains common filters', async () => {
    const routed = renderController([
      '/explore?signal=traces&resourceFilter=service.version%3D2&attributeFilter=http.route%3D%2Fcheckout&serviceName=checkout'
    ]);
    await waitFor(() => expect(routed.current().result).toMatchObject({ kind: 'empty' }));
    const request = api.loadTraceSignal.mock.lastCall?.[0] as ExploreQuery;
    act(() => routed.current().updateQuery({ signal: 'logs' }));
    await waitFor(() => expect(api.loadLogSignal).toHaveBeenCalledOnce());
    expect(api.loadLogSignal.mock.lastCall?.[0]).toMatchObject({
      start: request.start,
      end: request.end,
      serviceName: 'checkout',
      resourceFilter: 'service.version=2',
      attributeFilter: 'http.route=/checkout'
    });
    expect(routed.router.state.location.search).toContain('start=' + request.start);
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

  it.each(['/explore?signal=logs&logRecordUid=record-1&start=1000&end=2000&timeZone=UTC'])(
    'bypasses ordinary history loaders for a valid focused route: %s',
    async path => {
      const routed = renderController([path]);
      await waitFor(() => expect(routed.current().investigationRoute.kind).not.toBe('inactive'));
      expect(api.loadMetricSignal).not.toHaveBeenCalled();
      expect(api.loadLogSignal).not.toHaveBeenCalled();
      expect(api.loadTraceSignal).not.toHaveBeenCalled();
    }
  );

  it('retains the result query while changing and closing a focused trace', async () => {
    const source = '/explore?signal=traces&serviceName=checkout&errorOnly=true&start=1000&end=2000&sort=duration_desc';
    const routed = renderController([source]);
    await waitFor(() => expect(routed.current().result.kind).toBe('empty'));
    const focus =
      source + '&traceId=0123456789abcdef0123456789abcdef&timeZone=UTC&returnTo=' + encodeURIComponent(source);
    await act(async () => routed.router.navigate(focus));
    expect(routed.current().query).toMatchObject({ traceId: undefined });
    expect(routed.current().investigationRoute.kind).toBe('trace');
    expect(routed.current().query).toMatchObject({ serviceName: 'checkout', errorOnly: true, sort: 'duration_desc' });
    expect(api.loadTraceSignal).toHaveBeenCalledOnce();
    await act(async () => routed.router.navigate(focus + '&spanId=0123456789abcdef'));
    expect(api.loadTraceSignal).toHaveBeenCalledOnce();
    await act(async () => routed.router.navigate(source));
    expect(routed.current().result.kind).toBe('empty');
    expect(api.loadTraceSignal).toHaveBeenCalledOnce();
  });

  it('keeps a relative-window result when opening its frozen detail and closing to the frozen list', async () => {
    const routed = renderController(['/explore?signal=traces']);
    await waitFor(() => expect(routed.current().result.kind).toBe('empty'));
    const source = routed.current();
    if (source.result.kind !== 'empty') throw new Error('Expected result');
    const path = buildTraceInvestigationPath(
      source.query,
      {
        traceId: '0123456789abcdef0123456789abcdef',
        startTime: null,
        durationNanos: null
      },
      source.result.window,
      'UTC'
    );
    await act(async () => routed.router.navigate(path));
    expect(routed.current().result.kind).toBe('empty');
    expect(api.loadTraceSignal).toHaveBeenCalledOnce();
    const returnTo = new URLSearchParams(path.split('?')[1]).get('returnTo');
    if (!returnTo) throw new Error('Missing frozen return');
    await act(async () => routed.router.navigate(returnTo));
    expect(routed.current().result.kind).toBe('empty');
    expect(api.loadTraceSignal).toHaveBeenCalledOnce();
  });

  it.each(['filter', 'revision', 'fetching', 'failed', 'window'])(
    'does not promote a non-equivalent %s history candidate into a focused background',
    async mismatch => {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const query = canonicalQuery('signal=traces&query=' + (mismatch === 'filter' ? 'other' : 'current'));
      const key = exploreQueryKeys.history(query, undefined, mismatch === 'revision' ? 1 : 0);
      client.setQueryData(key, {
        signal: 'traces',
        data: page([]),
        revision: 0,
        window: mismatch === 'window' ? { from: 1000, to: 3000 } : { from: 1000, to: 2000 }
      });
      const candidate = client.getQueryCache().find({ queryKey: key });
      if (mismatch === 'fetching') candidate?.setState({ fetchStatus: 'fetching' });
      if (mismatch === 'failed') candidate?.setState({ status: 'error', error: new Error('Failed refresh') });
      api.loadTraceSignal.mockReturnValue(new Promise(() => undefined));
      const routed = renderController(
        [
          '/explore?signal=traces&query=current&traceId=0123456789abcdef0123456789abcdef&start=1000&end=2000&timeZone=UTC'
        ],
        0,
        client
      );
      await waitFor(() => expect(api.loadTraceSignal).toHaveBeenCalledOnce());
      expect(routed.current().result.kind).toBe('loading');
      routed.unmount();
    }
  );

  it('loads a bounded background list on a direct trace link without querying history by focused ID', async () => {
    const routed = renderController([
      '/explore?signal=traces&traceId=0123456789abcdef0123456789abcdef&start=1000&end=2000&timeZone=UTC'
    ]);
    await waitFor(() => expect(api.loadTraceSignal).toHaveBeenCalledOnce());
    expect(api.loadTraceSignal.mock.lastCall?.[0]).toMatchObject({ start: 1000, end: 2000, traceId: undefined });
    expect(routed.current().investigationRoute.kind).toBe('trace');
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

  it('keeps preset URLs relative while transport and evidence freeze one exact request window', async () => {
    const relative = renderController(['/explore?signal=metrics']);
    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalled());
    const first = api.loadMetricSignal.mock.calls[0]?.[0] as ExploreQuery;
    expect(first).toMatchObject({ timeRange: 'last-30m', windowMode: undefined });
    expect(first.end! - first.start!).toBe(30 * 60 * 1_000);
    await waitFor(() =>
      expect(relative.current().result).toMatchObject({ window: { from: first.start, to: first.end }, revision: 0 })
    );
    expect(relative.router.state.location.search).not.toMatch(/[?&](?:start|end)=/u);
    act(() => relative.current().updateQuery({ timeRange: 'last-1h', start: undefined, end: undefined }));
    await waitFor(() =>
      expect((api.loadMetricSignal.mock.lastCall?.[0] as ExploreQuery | undefined)?.timeRange).toBe('last-1h')
    );
    const second = api.loadMetricSignal.mock.lastCall?.[0] as ExploreQuery;
    expect(second).toMatchObject({ timeRange: 'last-1h', windowMode: undefined });
    expect(second.end! - second.start!).toBe(60 * 60 * 1_000);
    const requestCount = api.loadMetricSignal.mock.calls.length;
    await act(async () => relative.current().refresh());
    await waitFor(() => expect(api.loadMetricSignal.mock.calls.length).toBeGreaterThan(requestCount));
    const refreshed = api.loadMetricSignal.mock.lastCall?.[0] as ExploreQuery;
    expect(refreshed).toMatchObject({ timeRange: 'last-1h', windowMode: undefined });
    expect(refreshed.end! - refreshed.start!).toBe(60 * 60 * 1_000);
    expect(relative.router.state.location.search).not.toMatch(/[?&](?:start|end)=/u);
    relative.unmount();

    const exact = renderController([
      '/explore?signal=metrics&serviceName=checkout&serviceNamespace=shop&environment=prod&collectorId=east&start=1000&end=2000'
    ]);
    await waitFor(() => expect(api.loadMetricSignal.mock.lastCall?.[0]).toMatchObject({ start: 1000, end: 2000 }));
    expect(api.loadMetricSignal.mock.lastCall?.[0]).toMatchObject({ start: 1000, end: 2000 });
    const exactRequestCount = api.loadMetricSignal.mock.calls.length;
    await act(async () => exact.current().refresh());
    await waitFor(() => expect(api.loadMetricSignal.mock.calls.length).toBeGreaterThan(exactRequestCount));
    expect(api.loadMetricSignal.mock.lastCall?.[0]).toMatchObject({ start: 1000, end: 2000 });
  });

  it('resumes a fixed log window into route-owned sliding refresh', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(2_000_000);
      const paths: string[] = [];
      api.loadLogSignal.mockImplementation((query: ExploreQuery) => {
        paths.push(buildSignalApiPath(query, Date.now()));
        return Promise.resolve(logEvidence(page([])));
      });
      const routed = renderController(['/explore?signal=logs&timeRange=last-15m&start=1100000&end=2000000']);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(api.loadLogSignal).toHaveBeenCalledTimes(1);

      act(() => routed.current().updateQuery({ start: undefined, end: undefined, autoRefreshMs: 30_000 }));
      expect(routed.router.state.location.search).toContain('autoRefresh=30000');
      expect(routed.router.state.location.search).not.toMatch(/[?&](?:start|end)=/u);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(api.loadLogSignal).toHaveBeenCalledTimes(2);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(api.loadLogSignal).toHaveBeenCalledTimes(3);
      expect(paths[2]).toContain('start=1130000&end=2030000');
    } finally {
      vi.useRealTimers();
    }
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
          return Promise.resolve(
            signal === 'metrics' ? metricConsole([]) : signal === 'logs' ? logEvidence(page([])) : page([])
          );
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
    ['invalid numeric data', metricConsole([{ schema: null, data: [[1000, 'not-a-number']] }]), 'contract_error'],
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

  it('stages sorting until Query, resets the page, and ignores the aborted previous ordering response', async () => {
    const previous = deferred<ReturnType<typeof page>>();
    let previousSignal: AbortSignal | undefined;
    api.loadTraceSignal
      .mockImplementationOnce((_query: ExploreQuery, signal: AbortSignal) => {
        previousSignal = signal;
        return previous.promise;
      })
      .mockResolvedValue(page([{ traceId: 'current-duration-order' }]));
    const routed = renderController(['/explore?signal=traces&page=2&errorOnly=true&start=1000&end=2000']);
    await waitFor(() => expect(api.loadTraceSignal).toHaveBeenCalledOnce());
    act(() => routed.current().submission.updateField({ field: 'sort', value: 'duration_desc' }));
    expect(api.loadTraceSignal).toHaveBeenCalledOnce();
    act(() => routed.current().submission.submit());
    await waitFor(() =>
      expect(routed.current().result).toMatchObject({
        kind: 'ready',
        data: { content: [{ traceId: 'current-duration-order' }] }
      })
    );
    expect(api.loadTraceSignal.mock.lastCall?.[0]).toMatchObject({
      sort: 'duration_desc',
      pageIndex: undefined,
      errorOnly: true,
      start: 1000,
      end: 2000
    });
    expect(previousSignal?.aborted).toBe(true);
    act(() => previous.resolve(page([{ traceId: 'late-newest-order' }])));
    await act(async () => previous.promise);
    expect(routed.current().result).toMatchObject({
      kind: 'ready',
      data: { content: [{ traceId: 'current-duration-order' }] }
    });
  });

  it('does not let a stale previous-signal promise replace the current result', async () => {
    const metric = deferred<MetricConsole>();
    let metricSignal: AbortSignal | undefined;
    api.loadMetricSignal.mockImplementation((_query: ExploreQuery, signal: AbortSignal) => {
      metricSignal = signal;
      return metric.promise;
    });
    api.loadLogSignal.mockResolvedValue(logEvidence(page([logRow({ body: 'current' })])));
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
    ['exact time', { start: 1000, end: 2000, timeZone: 'UTC', windowMode: undefined, pageIndex: undefined }],
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
    const refresh = deferred<ReturnType<typeof logEvidence>>();
    let refreshSignal: AbortSignal | undefined;
    api.loadLogSignal.mockImplementation((_query: ExploreQuery, signal: AbortSignal) => {
      refreshSignal = signal;
      return refresh.promise;
    });
    const query = canonicalQuery('signal=logs&timeRange=last-30m&query=cached');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(exploreQueryKeys.history(query, undefined, 0), {
      signal: 'logs',
      data: logEvidence(page([logRow({ body: 'cached' })])),
      window: cachedWindow,
      revision: 0
    });

    const routed = renderController(['/explore?signal=logs&query=cached'], 0, client);

    await waitFor(() =>
      expect(routed.current().result).toMatchObject({
        kind: 'refreshing',
        evidence: {
          kind: 'ready',
          signal: 'logs',
          data: { content: [{ body: 'cached' }] },
          window: cachedWindow,
          revision: 0
        }
      })
    );
    expect(api.loadLogSignal).toHaveBeenCalledOnce();
    routed.unmount();
    await waitFor(() => expect(refreshSignal?.aborted).toBe(true));
  });

  it('projects cached history as refreshing until a successful request atomically replaces it', async () => {
    const refresh = deferred<ReturnType<typeof logEvidence>>();
    api.loadLogSignal.mockReturnValue(refresh.promise);
    const query = canonicalQuery('signal=logs&timeRange=last-30m&query=cached');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(exploreQueryKeys.history(query, undefined, 0), {
      signal: 'logs',
      data: logEvidence(page([logRow({ body: 'cached' })])),
      window: cachedWindow,
      revision: 0
    });

    const routed = renderController(['/explore?signal=logs&query=cached'], 0, client);

    await waitFor(() =>
      expect(routed.current().result).toMatchObject({
        kind: 'refreshing',
        evidence: {
          kind: 'ready',
          signal: 'logs',
          data: { content: [{ body: 'cached' }] },
          window: cachedWindow,
          revision: 0
        }
      })
    );
    act(() => refresh.resolve(logEvidence(page([logRow({ body: 'fresh' })]))));
    await waitFor(() =>
      expect(routed.current().result).toMatchObject({
        kind: 'ready',
        signal: 'logs',
        data: { content: [{ body: 'fresh' }] }
      })
    );
    expect(routed.current().result).not.toMatchObject({ window: cachedWindow });
  });

  it('retains the prior log page as refreshing evidence while an adjacent page loads', async () => {
    const nextPage = deferred<ReturnType<typeof logEvidence>>();
    api.loadLogSignal.mockReturnValue(nextPage.promise);
    const query = canonicalQuery('signal=logs&start=1000&end=2000&query=cached');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(exploreQueryKeys.history(query, cachedWindow, 0), {
      signal: 'logs',
      data: logEvidence(page([logRow({ body: 'previous page' })], 46, 0, 3)),
      window: cachedWindow,
      revision: 0
    });

    const routed = renderController(['/explore?signal=logs&start=1000&end=2000&query=cached'], 0, client);
    await waitFor(() => expect(routed.current().result.kind).toBe('refreshing'));
    act(() => routed.current().updateQuery({ pageIndex: 1 }));

    await waitFor(() =>
      expect(routed.current().result).toMatchObject({
        kind: 'refreshing',
        evidence: { kind: 'ready', data: { content: [{ body: 'previous page' }], number: 0 } }
      })
    );
    expect(api.loadLogSignal).toHaveBeenCalledTimes(2);
    routed.unmount();
  });

  it('retains cached history after refresh failure only as stale error evidence', async () => {
    api.loadLogSignal.mockRejectedValue(new Error('refresh failed'));
    const query = canonicalQuery('signal=logs&timeRange=last-30m&query=cached');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(exploreQueryKeys.history(query, undefined, 0), {
      signal: 'logs',
      data: logEvidence(page([logRow({ body: 'cached' })])),
      window: cachedWindow,
      revision: 0
    });

    const routed = renderController(['/explore?signal=logs&query=cached'], 0, client);

    await waitFor(() =>
      expect(routed.current().result).toMatchObject({
        kind: 'stale_error',
        errorKind: 'error',
        evidence: {
          kind: 'ready',
          signal: 'logs',
          data: { content: [{ body: 'cached' }] },
          window: cachedWindow,
          revision: 0
        }
      })
    );
  });

  it('carries evidence only across refresh generations, never across query identity changes', async () => {
    api.loadLogSignal.mockResolvedValueOnce(logEvidence(page([logRow({ body: 'generation-0' })])));
    const routed = renderController(['/explore?signal=logs&query=owned']);
    await waitFor(() =>
      expect(routed.current().result).toMatchObject({
        kind: 'ready',
        signal: 'logs',
        data: { content: [{ body: 'generation-0' }] }
      })
    );

    const refresh = deferred<ReturnType<typeof logEvidence>>();
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

    const nextIdentity = deferred<ReturnType<typeof logEvidence>>();
    api.loadLogSignal.mockReturnValueOnce(nextIdentity.promise);
    act(() => routed.current().updateQuery({ query: 'different' }));
    await waitFor(() => expect(routed.current().result).toEqual({ kind: 'loading' }));
  });

  it('rejects cached history evidence owned by another signal', async () => {
    api.loadMetricSignal.mockReturnValue(new Promise<MetricConsole>(() => undefined));
    const query = canonicalQuery('signal=metrics&timeRange=last-30m');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(exploreQueryKeys.history(query, undefined, 0), {
      signal: 'logs',
      data: logEvidence(page([logRow({ body: 'wrong signal' })])),
      window: cachedWindow,
      revision: 0
    });

    const routed = renderController(['/explore?signal=metrics'], 0, client);

    await waitFor(() => expect(routed.current().result).toEqual({ kind: 'loading' }));
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

function canonicalQuery(search: string) {
  return parseExploreQuery(new URLSearchParams(search));
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
function logEvidence(data: ReturnType<typeof page>) {
  return {
    page: data,
    overview: {
      kind: 'ready' as const,
      data: {
        totalCount: data.totalElements,
        traceCount: 0,
        debugCount: 0,
        infoCount: 0,
        warnCount: 0,
        errorCount: 0,
        fatalCount: 0
      }
    },
    trend: {
      kind: 'ready' as const,
      data: { start: 1_754_467_200_000, end: 1_754_469_000_000, intervalMs: 60_000, buckets: [] }
    }
  };
}
function logRow(
  override: Partial<import('../model/explore-signal-contract').LogRow> = {}
): import('../model/explore-signal-contract').LogRow {
  return {
    logRecordUid: null,
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
