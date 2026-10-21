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
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { loadLogAnalysis, DEFAULT_LOG_ANALYSIS, type LogAnalysisState } from '@/platform/perses';

import { useLogAnalysis } from './use-log-analysis';
vi.mock('@/platform/perses', async original => ({
  ...(await original<typeof import('@/platform/perses')>()),
  loadLogAnalysis: vi.fn()
}));
const query = { signal: 'logs' as const, timeRange: 'last-30m' as const, serviceName: 'checkout' };
const window = { from: 1000, to: 2000 };
const response = {
  window: { start: 1000, end: 2000 },
  field: null,
  view: 'groups' as const,
  limit: 20,
  order: 'count-desc' as const,
  minCount: 1,
  matchingTotal: 0,
  truncated: false,
  intervalMs: null,
  groups: []
};
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('does not fetch disabled drafts and reuses group evidence when only representation changes', async () => {
  vi.mocked(loadLogAnalysis).mockResolvedValue(response);
  const state: LogAnalysisState = { ...DEFAULT_LOG_ANALYSIS, representation: 'table' };
  const hook = renderHook(({ analysis, enabled }) => useLogAnalysis(query, analysis, window, enabled), {
    initialProps: { analysis: state, enabled: false },
    wrapper: wrapper()
  });
  expect(loadLogAnalysis).not.toHaveBeenCalled();
  hook.rerender({ analysis: state, enabled: true });
  await waitFor(() => expect(hook.result.current.state).toBe('ready'));
  hook.rerender({ analysis: { ...state, representation: 'toplist' }, enabled: true });
  expect(loadLogAnalysis).toHaveBeenCalledTimes(1);
});
it('cancels previous scope and does not expose its delayed result for a new scope', async () => {
  let oldSignal: AbortSignal | undefined;
  vi.mocked(loadLogAnalysis)
    .mockImplementationOnce((_path, _window, _analysis, signal) => {
      oldSignal = signal;
      return new Promise(() => {});
    })
    .mockResolvedValueOnce(response);
  const hook = renderHook(
    ({ service }) =>
      useLogAnalysis({ ...query, serviceName: service }, { ...DEFAULT_LOG_ANALYSIS, representation: 'table' }, window),
    { initialProps: { service: 'old' }, wrapper: wrapper() }
  );
  await waitFor(() => expect(loadLogAnalysis).toHaveBeenCalledTimes(1));
  hook.rerender({ service: 'new' });
  await waitFor(() => expect(hook.result.current.state).toBe('ready'));
  expect(oldSignal?.aborted).toBe(true);
  expect(hook.result.current.data).toEqual(response);
});
it('refreshes the same applied analysis when the parent query is refreshed', async () => {
  vi.mocked(loadLogAnalysis).mockResolvedValue(response);
  const state: LogAnalysisState = { ...DEFAULT_LOG_ANALYSIS, representation: 'table' };
  const hook = renderHook(({ refresh }) => useLogAnalysis(query, state, window, true, refresh), {
    initialProps: { refresh: false },
    wrapper: wrapper()
  });
  await waitFor(() => expect(hook.result.current.state).toBe('ready'));
  hook.rerender({ refresh: true });
  await waitFor(() => expect(loadLogAnalysis).toHaveBeenCalledTimes(2));
});

it('cancels an old extra-measure definition before exposing a new atomic result', async () => {
  let oldSignal: AbortSignal | undefined;
  vi.mocked(loadLogAnalysis)
    .mockImplementationOnce((_path, _window, _analysis, signal) => {
      oldSignal = signal;
      return new Promise(() => {});
    })
    .mockResolvedValueOnce(response);
  const hook = renderHook(
    ({ field }) =>
      useLogAnalysis(
        query,
        { ...DEFAULT_LOG_ANALYSIS, representation: 'table', additionalMeasures: [{ function: 'avg', field }] },
        window
      ),
    {
      initialProps: { field: 'attribute:old' },
      wrapper: wrapper()
    }
  );
  await waitFor(() => expect(loadLogAnalysis).toHaveBeenCalledTimes(1));
  hook.rerender({ field: 'attribute:new' });
  await waitFor(() => expect(hook.result.current.state).toBe('ready'));
  expect(oldSignal?.aborted).toBe(true);
  expect(vi.mocked(loadLogAnalysis).mock.calls[1]?.[0]).toContain(encodeURIComponent('attribute:new'));
});
