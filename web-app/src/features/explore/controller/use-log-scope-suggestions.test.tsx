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
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadLogScopeSuggestions } from '../api/explore-log-scope-suggestions';
import { useLogScopeSuggestions } from './use-log-scope-suggestions';
import type { LogExploreQuery } from '../model/explore-model';
import type { ExplorePageResultState } from '../model/explore-result-model';
vi.mock('../api/explore-log-scope-suggestions', async original => ({
  ...(await original<typeof import('../api/explore-log-scope-suggestions')>()),
  loadLogScopeSuggestions: vi.fn()
}));
const query: LogExploreQuery = { signal: 'logs', timeRange: 'last-30m', query: '', start: 100000, end: 200000 };
const loading: ExplorePageResultState = { kind: 'loading' };
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe('submitted log scope suggestions', () => {
  it('fetches two dimensions once for a committed scope and caches equivalent rerenders', async () => {
    vi.mocked(loadLogScopeSuggestions).mockResolvedValue(['checkout']);
    const hook = renderHook(({ value }) => useLogScopeSuggestions(value, loading), {
      initialProps: { value: query },
      wrapper: wrapper()
    });
    await waitFor(() => expect(hook.result.current.serviceName.state).toBe('ready'));
    hook.rerender({ value: { ...query, pageIndex: 3 } });
    expect(loadLogScopeSuggestions).toHaveBeenCalledTimes(2);
    expect(hook.result.current.serviceName.values).toEqual(['checkout']);
  });
  it('aborts a previous scope and never displays its late response', async () => {
    const requests: { signal?: AbortSignal | undefined; resolve: (values: string[]) => void }[] = [];
    vi.mocked(loadLogScopeSuggestions).mockImplementation(
      (_path, _dimension, signal) => new Promise(resolve => requests.push({ signal, resolve }))
    );
    const hook = renderHook(({ value }) => useLogScopeSuggestions(value, loading), {
      initialProps: { value: query },
      wrapper: wrapper()
    });
    await waitFor(() => expect(requests).toHaveLength(2));
    hook.rerender({ value: { ...query, serviceName: 'payment' } });
    await waitFor(() => expect(requests).toHaveLength(4));
    expect(requests[0]!.signal!.aborted).toBe(true);
    requests[0]!.resolve(['old']);
    requests[1]!.resolve(['old']);
    requests[2]!.resolve(['payment']);
    requests[3]!.resolve([]);
    await waitFor(() => expect(hook.result.current.serviceName.values).toEqual(['payment']));
    expect(hook.result.current.environment).toEqual({ state: 'empty', values: [] });
  });
  it('disables live, invalid and malformed-window scopes and separates failed suggestions', async () => {
    const hook = renderHook(({ value, result }) => useLogScopeSuggestions(value, result), {
      initialProps: { value: { ...query, live: true }, result: loading as ExplorePageResultState },
      wrapper: wrapper()
    });
    expect(loadLogScopeSuggestions).not.toHaveBeenCalled();
    hook.rerender({ value: { ...query, live: false }, result: { kind: 'invalid' } });
    hook.rerender({ value: { ...query, live: false, end: 1 }, result: loading });
    expect(loadLogScopeSuggestions).not.toHaveBeenCalled();
    vi.mocked(loadLogScopeSuggestions).mockRejectedValue(new Error('unavailable'));
    hook.rerender({ value: { ...query, live: false }, result: loading });
    await waitFor(() => expect(hook.result.current.serviceName).toEqual({ state: 'error', values: [] }));
  });
});
