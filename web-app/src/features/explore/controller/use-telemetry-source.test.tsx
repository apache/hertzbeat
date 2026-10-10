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
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSourceQuery, useTelemetrySource } from './use-telemetry-source';
import type { LogExploreQuery } from '../model/explore-query';
import { exploreQueryKeys } from './explore-query-keys';

const api = vi.hoisted(() => ({ status: vi.fn() }));
vi.mock('../api/explore-source-api', () => ({ loadTelemetrySources: api.status }));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: { authenticated: true, username: 'admin', workspaceId: 'a', roles: ['admin'] } })
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const query: LogExploreQuery = { signal: 'logs', timeRange: 'last-30m' };
function harness(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
function status(changes: Record<string, unknown> = {}) {
  return {
    external: { enabled: true, ready: true, accessible: true },
    self: {
      enabled: true,
      ready: true,
      accessible: true,
      workspaceId: 'a',
      reason: '',
      metricsStatus: 'READY',
      ...changes
    }
  };
}

describe('telemetry source lifecycle', () => {
  it('uses actual source identity for all request key shapes and ignores source text in search', () => {
    const window = { from: 1000, to: 2000 };
    for (const signal of ['logs', 'metrics', 'traces'] as const) {
      const external = { signal, timeRange: 'last-30m' as const, query: 'source=self' };
      const self = { ...external, source: 'self' };
      expect(isSourceQuery(exploreQueryKeys.history(external, window, 0), 'external')).toBe(true);
      expect(isSourceQuery(exploreQueryKeys.history(self, window, 0), 'external')).toBe(false);
      expect(isSourceQuery(exploreQueryKeys.metricInventory(self, window, 'source=self', '', 20), 'self')).toBe(true);
    }
    const pathKeys = [
      exploreQueryKeys.logFacets('/api/logs/facets?source=self'),
      exploreQueryKeys.traceAnalytics('/api/traces/stats?source=self'),
      exploreQueryKeys.logAnalysis('/api/logs/analysis?source=self'),
      exploreQueryKeys.metricLabels('/api/ingestion/otlp/metrics/labels?source=self', 'query'),
      exploreQueryKeys.logTransactions('/api/logs/transactions?source=self', 0),
      exploreQueryKeys.logScopeSuggestions('/api/logs/groups?source=self'),
      exploreQueryKeys.logQuerySet({ parameters: { source: 'self' }, queries: [] }),
      exploreQueryKeys.logInvestigation({}, window, 'event-7', 0, 'self'),
      ['session-identity', ...exploreQueryKeys.traceInvestigation({}, window, 'same-id', undefined, 0, 'self')]
    ];
    for (const key of pathKeys) expect(isSourceQuery(key, 'self')).toBe(true);
    expect(isSourceQuery(exploreQueryKeys.logFacets('/api/logs/facets?search=source%3Dself'), 'external')).toBe(true);
    expect(isSourceQuery(exploreQueryKeys.telemetrySources('session'), 'external')).toBe(false);
  });
  it.each([
    [{ enabled: false }, 'unconfigured'],
    [{ accessible: false }, 'forbidden'],
    [{ ready: false }, 'unready'],
    [{}, 'ready']
  ])('keeps availability %s explicit', async (changes, expected) => {
    api.status.mockResolvedValue(status(changes));
    const client = new QueryClient();
    const view = renderHook(() => useTelemetrySource({ ...query, source: 'self' }), { wrapper: harness(client) });
    await waitFor(() => expect(view.result.current.state).toBe(expected));
    client.clear();
  });
  it('cancels in-flight external queries and removes old cached evidence without clearing self evidence', async () => {
    api.status.mockResolvedValue(status());
    const client = new QueryClient();
    const oldKey = exploreQueryKeys.history(query, undefined, 0);
    const selfKey = exploreQueryKeys.history({ ...query, source: 'self' }, undefined, 0);
    client.setQueryData(selfKey, 'self evidence');
    let signal: AbortSignal | undefined;
    let finish: (value: string) => void = () => undefined;
    const pending = client
      .fetchQuery({
        queryKey: oldKey,
        queryFn: context => {
          signal = context.signal;
          return new Promise<string>(resolve => {
            finish = resolve;
          });
        }
      })
      .catch(() => undefined);
    const view = renderHook(({ source }) => useTelemetrySource({ ...query, source }), {
      initialProps: { source: 'external' },
      wrapper: harness(client)
    });
    view.rerender({ source: 'self' });
    await waitFor(() => expect(signal?.aborted).toBe(true));
    await waitFor(() => expect(client.getQueryState(oldKey)).toBeUndefined());
    await act(async () => {
      finish('late external evidence');
      await pending;
    });
    expect(client.getQueryData(selfKey)).toBe('self evidence');
    expect(client.getQueryData(oldKey)).toBeUndefined();
    client.clear();
  });
  it('does not treat storage readiness as proof that self metrics export is ready', async () => {
    api.status.mockResolvedValue(status({ metricsStatus: 'REGISTRY_UNAVAILABLE' }));
    const client = new QueryClient();
    const view = renderHook(() => useTelemetrySource({ signal: 'metrics', timeRange: 'last-30m', source: 'self' }), {
      wrapper: harness(client)
    });
    await waitFor(() => expect(view.result.current.state).toBe('metricsUnavailable'));
    client.clear();
  });
});
