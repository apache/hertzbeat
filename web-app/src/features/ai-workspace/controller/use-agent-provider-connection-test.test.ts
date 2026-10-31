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

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { cancelAgentProviderTest, testAgentProvider } from '../api/agent-provider-test-api';
import type { ProviderTestResult } from '../model/agent-provider-test-contract';
import type { AgentProviderInput } from '../model/agent-workspace-contract';
import { useAgentProviderConnectionTest } from './use-agent-provider-connection-test';

vi.mock('../api/agent-provider-test-api', () => ({
  testAgentProvider: vi.fn(),
  cancelAgentProviderTest: vi.fn().mockResolvedValue(undefined)
}));
const input: AgentProviderInput = {
  type: 'openai-compatible',
  code: 'custom',
  baseUrl: 'https://fixture.invalid/v1',
  model: 'fixture',
  protocol: 'responses'
};
const success: ProviderTestResult = {
  protocol: 'responses',
  model: 'fixture',
  elapsedMs: 5,
  category: 'OK',
  httpStatus: 200
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});
describe('manual provider connection tests', () => {
  it('never sends on open; sends only after click without a persistence API', async () => {
    vi.mocked(testAgentProvider).mockResolvedValue(success);
    const { result } = renderHook(() => useAgentProviderConnectionTest(true));
    expect(testAgentProvider).not.toHaveBeenCalled();
    await act(() => result.current.start(input));
    expect(testAgentProvider).toHaveBeenCalledWith(expect.any(String), input, expect.any(AbortSignal));
    expect(result.current.state).toEqual({ phase: 'done', result: success });
  });
  it('blocks duplicate clicks, cancels server work and discards a late result on form edits', async () => {
    let finish!: (value: ProviderTestResult) => void;
    vi.mocked(testAgentProvider).mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const { result } = renderHook(() => useAgentProviderConnectionTest(true));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.start(input);
    });
    await act(() => result.current.start(input));
    expect(testAgentProvider).toHaveBeenCalledTimes(1);
    act(() => result.current.reset());
    expect(cancelAgentProviderTest).toHaveBeenCalledTimes(1);
    expect(vi.mocked(testAgentProvider).mock.calls[0]![2].aborted).toBe(true);
    await act(async () => {
      finish(success);
      await pending;
    });
    expect(result.current.state.phase).toBe('idle');
  });
  it('cancels when the dialog closes and clears prior evidence', async () => {
    vi.mocked(testAgentProvider).mockReturnValue(new Promise(() => {}));
    const { result, rerender } = renderHook(({ open }) => useAgentProviderConnectionTest(open), {
      initialProps: { open: true }
    });
    act(() => {
      void result.current.start(input);
    });
    rerender({ open: false });
    await waitFor(() => expect(result.current.state.phase).toBe('idle'));
    expect(cancelAgentProviderTest).toHaveBeenCalledTimes(1);
  });
  it('shows cancellation and never exposes arbitrary failure messages', async () => {
    vi.mocked(testAgentProvider).mockRejectedValue(new Error('secret-from-upstream'));
    const { result } = renderHook(() => useAgentProviderConnectionTest(true));
    await act(() => result.current.start(input));
    expect(JSON.stringify(result.current.state)).not.toContain('secret-from-upstream');
    expect(result.current.state).toMatchObject({ phase: 'done', result: { category: 'NETWORK' } });
    vi.mocked(testAgentProvider).mockReturnValue(new Promise(() => {}));
    act(() => {
      void result.current.start(input);
    });
    act(() => result.current.cancel());
    expect(result.current.state).toMatchObject({ phase: 'done', result: { category: 'CANCELLED' } });
  });
  it('bounds a hung request, requests server cancellation, and reports timeout', async () => {
    vi.useFakeTimers();
    vi.mocked(testAgentProvider).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAgentProviderConnectionTest(true));
    act(() => {
      void result.current.start(input);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(result.current.state).toMatchObject({ phase: 'done', result: { category: 'TIMEOUT' } });
    expect(cancelAgentProviderTest).toHaveBeenCalledOnce();
    expect(vi.mocked(testAgentProvider).mock.calls[0]![2].aborted).toBe(true);
  });
});
