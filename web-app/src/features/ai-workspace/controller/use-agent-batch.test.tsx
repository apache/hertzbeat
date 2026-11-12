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

import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgentBatch } from './use-agent-batch';
import { batchFixture } from '../model/agent-batch-fixture';
const api = vi.hoisted(() => ({ getAgentBatch: vi.fn() }));
vi.mock('../api/agent-batch-api', () => api);
function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
describe('explicit batch continuation', () => {
  beforeEach(() => api.getAgentBatch.mockResolvedValue(batchFixture()));
  it('never starts automatically and coalesces rapid clicks while the stream is pending', async () => {
    let release!: () => void;
    const execute = vi.fn(
      () =>
        new Promise<void>(resolve => {
          release = resolve;
        })
    );
    const { result } = renderHook(() => useAgentBatch('root', execute), { wrapper });
    await waitFor(() => expect(result.current.progress?.verified).toBe(1));
    expect(execute).not.toHaveBeenCalled();
    let first!: Promise<void>;
    await act(async () => {
      first = result.current.continue();
      await result.current.continue();
    });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({ runUid: 'root', planHash: 'a'.repeat(64) });
    await act(async () => {
      release();
      await first;
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it('does not let a stale continue handler advance a newly completed segment', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAgentBatch('root', execute), { wrapper });
    await waitFor(() => expect(result.current.progress?.runUid).toBe('root'));
    const staleContinue = result.current.continue;
    api.getAgentBatch.mockResolvedValue({ ...batchFixture(), runUid: 'child-1', segment: 1 });
    await act(async () => {
      await staleContinue();
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('reconnects through the same parent and never submits an automatic next segment after disconnect', async () => {
    api.getAgentBatch.mockResolvedValue({ ...batchFixture(), runUid: 'child-1', stage: 'RUNNING', nextAction: 'NONE' });
    const execute = vi.fn().mockRejectedValue(new Error('disconnected'));
    const { result } = renderHook(() => useAgentBatch('root', execute), { wrapper });
    await waitFor(() => expect(result.current.progress?.runUid).toBe('child-1'));
    await act(async () => {
      await result.current.continue();
    });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({ runUid: 'root', planHash: 'a'.repeat(64) });
    expect(result.current.unavailable).toBe(true);
  });
});
