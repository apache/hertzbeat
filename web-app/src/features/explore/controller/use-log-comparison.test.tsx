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

import { ApiMessageError } from '@/core/http/api-message';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { loadLogComparison, DEFAULT_LOG_ANALYSIS } from '@/platform/perses';

import { useLogComparison } from './use-log-comparison';
vi.mock('@/platform/perses', async original => ({
  ...(await original<typeof import('@/platform/perses')>()),
  loadLogComparison: vi.fn()
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it.each(['search', 'additionalMeasures', 'timeShiftMs'])(
  'cancels old paired request when %s changes and ignores its late error',
  async changed => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    let oldSignal: AbortSignal | undefined;
    let rejectOld!: (error: Error) => void;
    const analysis = {
      ...DEFAULT_LOG_ANALYSIS,
      representation: 'table' as const,
      comparison: { version: 1 as const, search: 'old' }
    };
    const response = {
      window: { start: 1000000000, end: 1000001000 },
      analysis: {
        field: null,
        view: 'groups' as const,
        limit: 20,
        order: 'count-desc' as const,
        minCount: 1,
        measure: null,
        grouping: null
      },
      matchingA: 0,
      matchingB: 0,
      truncated: false,
      intervalMs: null,
      groups: []
    };
    vi.mocked(loadLogComparison)
      .mockImplementationOnce((_request, _window, _analysis, signal) => {
        oldSignal = signal;
        return new Promise((_resolve, reject) => {
          rejectOld = reject;
        });
      })
      .mockResolvedValueOnce(response);
    const hook = renderHook(
      ({ search, enabled }) =>
        useLogComparison(
          { signal: 'logs', timeRange: 'last-30m' },
          {
            ...analysis,
            comparison: {
              ...analysis.comparison,
              search: changed === 'search' ? search : '',
              ...(changed === 'timeShiftMs' ? { timeShiftMs: search === 'old' ? 3600000 : 86400000 } : {})
            },
            ...(changed === 'additionalMeasures'
              ? { additionalMeasures: [{ function: 'avg' as const, field: `attribute:${search}` }] }
              : {})
          },
          { from: 1000000000, to: 1000001000 },
          enabled
        ),
      { initialProps: { search: 'old', enabled: false }, wrapper }
    );
    expect(loadLogComparison).not.toHaveBeenCalled();
    hook.rerender({ search: 'old', enabled: true });
    await waitFor(() => expect(loadLogComparison).toHaveBeenCalledTimes(1));
    hook.rerender({ search: 'new', enabled: true });
    await waitFor(() => expect(hook.result.current.state).toBe('ready'));
    expect(oldSignal?.aborted).toBe(true);
    rejectOld(
      new ApiMessageError('observability_log_filter_invalid', {
        status: 400,
        data: { source: 'b', reason: 'cidr_unsupported' }
      })
    );
    expect(hook.result.current.data).toEqual(response);
    expect(hook.result.current.invalidFilter).toBeUndefined();
  }
);
it('reports over-budget request as a query error without throwing during render', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () =>
      useLogComparison(
        { signal: 'logs', timeRange: 'last-30m', query: 'x'.repeat(40000) },
        { ...DEFAULT_LOG_ANALYSIS, representation: 'table', comparison: { version: 1, search: '' } },
        { from: 1000, to: 2000 }
      ),
    { wrapper }
  );
  await waitFor(() => expect(hook.result.current.state).toBe('error'));
  expect(loadLogComparison).not.toHaveBeenCalled();
});
it('retains invalid-filter details for b without changing permission failures', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  vi.mocked(loadLogComparison)
    .mockRejectedValueOnce(
      new ApiMessageError('observability_log_filter_invalid', {
        status: 400,
        data: { source: 'b', reason: 'cidr_unsupported' }
      })
    )
    .mockRejectedValueOnce(new ApiMessageError('Forbidden', { status: 403 }));
  const hook = renderHook(
    ({ search }) =>
      useLogComparison(
        { signal: 'logs', timeRange: 'last-30m' },
        { ...DEFAULT_LOG_ANALYSIS, representation: 'table', comparison: { version: 1, search } },
        { from: 1000, to: 2000 }
      ),
    { initialProps: { search: 'CIDR(@ip,10.0.0.0/8)' }, wrapper }
  );
  await waitFor(() => expect(hook.result.current.state).toBe('invalid_filter'));
  expect(hook.result.current.invalidFilter).toEqual({ source: 'b', reason: 'cidr_unsupported' });
  hook.rerender({ search: 'new' });
  await waitFor(() => expect(hook.result.current.state).toBe('permission'));
  expect(hook.result.current.invalidFilter).toBeUndefined();
});
