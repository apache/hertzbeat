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

import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeActiveRun } from './agent-run-observation';
const api = vi.hoisted(() => ({ getAgentRun: vi.fn() }));
vi.mock('../api/agent-gateway-api', () => api);

describe('bounded read-only approval observation', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });
  it('observes a fifty-five-second native batch completion without resubmitting any operation', async () => {
    vi.useFakeTimers();
    const start = Date.now();
    api.getAgentRun.mockImplementation(() =>
      Promise.resolve({
        runUid: 'run',
        sessionUid: 'session',
        status: Date.now() - start >= 55_000 ? 'SUCCEEDED' : 'RUNNING',
        result: 'Verified',
        replayAvailable: true
      })
    );
    const refs = {
      isMounted: () => true,
      getStreamedSession: () => 'session',
      setLastRequest: vi.fn(),
      setStreamedSession: vi.fn(),
      setConversation: vi.fn()
    };
    const dispatch = vi.fn();
    const converge = vi.fn().mockResolvedValue(undefined);
    const observed = observeActiveRun('run', 'conversation', new AbortController(), refs, dispatch, converge);
    await vi.advanceTimersByTimeAsync(56_000);
    await observed;
    expect(
      dispatch.mock.calls.some(
        ([event]) =>
          event.type === 'RUN_STATUS' &&
          event.payload.status === 'SUCCEEDED' &&
          event.payload.observationExpired === false
      )
    ).toBe(true);
    expect(api.getAgentRun).toHaveBeenCalledTimes(56);
    expect(converge).toHaveBeenCalledWith('session', false, expect.any(AbortSignal));
  });
  it('stops observation after ninety seconds while preserving the unknown running state', async () => {
    vi.useFakeTimers();
    api.getAgentRun.mockResolvedValue({
      runUid: 'run',
      sessionUid: 'session',
      status: 'RUNNING',
      replayAvailable: true
    });
    const refs = {
      isMounted: () => true,
      getStreamedSession: () => 'session',
      setLastRequest: vi.fn(),
      setStreamedSession: vi.fn(),
      setConversation: vi.fn()
    };
    const dispatch = vi.fn();
    const converge = vi.fn().mockResolvedValue(undefined);
    const observed = observeActiveRun('run', 'conversation', new AbortController(), refs, dispatch, converge);
    await vi.advanceTimersByTimeAsync(91_000);
    await observed;
    expect(
      dispatch.mock.calls.some(
        ([event]) =>
          event.type === 'RUN_STATUS' && event.payload.status === 'RUNNING' && event.payload.observationExpired === true
      )
    ).toBe(true);
    expect(api.getAgentRun).toHaveBeenCalledTimes(91);
    expect(converge).toHaveBeenCalledWith('session', true, expect.any(AbortSignal));
  });
  it('excludes explicit human approval wait from execution observation and remains read only', async () => {
    vi.useFakeTimers();
    const start = Date.now();
    api.getAgentRun.mockImplementation(() => {
      const elapsed = Date.now() - start;
      return Promise.resolve({
        runUid: 'run',
        sessionUid: 'session',
        status: elapsed >= 267_000 ? 'SUCCEEDED' : 'RUNNING',
        replayAvailable: true,
        recoveredApprovals: elapsed < 212_000 ? [{ status: 'WAITING_APPROVAL', canDecide: true }] : []
      });
    });
    const refs = {
      isMounted: () => true,
      getStreamedSession: () => 'session',
      setLastRequest: vi.fn(),
      setStreamedSession: vi.fn(),
      setConversation: vi.fn()
    };
    const dispatch = vi.fn();
    const observed = observeActiveRun(
      'run',
      'conversation',
      new AbortController(),
      refs,
      dispatch,
      vi.fn().mockResolvedValue(undefined)
    );
    await vi.advanceTimersByTimeAsync(268_000);
    await observed;
    expect(
      dispatch.mock.calls.some(
        ([event]) =>
          event.type === 'RUN_STATUS' &&
          event.payload.status === 'SUCCEEDED' &&
          event.payload.observationExpired === false
      )
    ).toBe(true);
    expect(api.getAgentRun).toHaveBeenCalledTimes(268);
  });
});
