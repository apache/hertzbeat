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

import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MonitorQuery } from '../model/monitor-contract';
import { monitorQueryKeys } from './monitor-query-keys';
import { monitorListAutoRefreshMs, useMonitorListResources } from './use-monitor-list-resources';

const query: MonitorQuery = {
  search: '',
  app: '',
  status: '',
  labels: '',
  sort: 'gmtUpdate',
  order: 'desc',
  pageIndex: 0,
  pageSize: 10
};
const page = { content: [], totalElements: 0 };

describe('useMonitorListResources', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    focusManager.setFocused(undefined);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('waits for the next interval tick after focus returns', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false, staleTime: Infinity } }
    });
    client.setQueryData(monitorQueryKeys.list(query), page);
    client.setQueryData(monitorQueryKeys.apps(), []);
    const fetchQuery = vi.spyOn(client, 'fetchQuery');
    focusManager.setFocused(false);
    const rendered = renderHook(() => useMonitorListResources(query), { wrapper: wrapper(client) });
    rendered.result.current.readMode.current = 'idle';

    act(() => {
      vi.advanceTimersByTime(monitorListAutoRefreshMs);
    });
    expect(fetchQuery).not.toHaveBeenCalled();
    expect(rendered.result.current.readMode.current).toBe('idle');

    focusManager.setFocused(true);
    expect(fetchQuery).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(monitorListAutoRefreshMs);
    });
    expect(fetchQuery).toHaveBeenCalledTimes(1);
    expect(rendered.result.current.readMode.current).toBe('automatic');
  });
});

function wrapper(client: QueryClient) {
  return function QueryWrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
