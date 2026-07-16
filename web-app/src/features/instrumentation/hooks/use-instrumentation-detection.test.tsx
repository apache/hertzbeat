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

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { detectInstrumentationSignals } = vi.hoisted(() => ({ detectInstrumentationSignals: vi.fn() }));
vi.mock('../api/instrumentation-api', () => ({ detectInstrumentationSignals }));

import { useInstrumentationDetection } from './use-instrumentation-detection';

describe('useInstrumentationDetection', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('starts at the user action, follows server polling, and stops at a terminal decision', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_710_000_000_000);
    detectInstrumentationSignals
      .mockResolvedValueOnce(response('continue_polling', 'waiting'))
      .mockResolvedValueOnce(response('complete', 'received'));
    const createRequest = vi.fn(startedAt => ({ ...request, startedAt }));
    const { result } = renderHook(() => useInstrumentationDetection(createRequest));

    act(() => result.current.start());
    await act(async () => void await Promise.resolve());
    expect(createRequest).toHaveBeenCalledWith(1_710_000_000_000);
    expect(result.current.response?.signals.metrics.status).toBe('waiting');

    await act(async () => void await vi.advanceTimersByTimeAsync(3_000));
    await act(async () => void await Promise.resolve());
    expect(result.current.response?.signals.metrics.status).toBe('received');
    expect(detectInstrumentationSignals).toHaveBeenCalledTimes(2);
    expect(result.current.checking).toBe(false);
  });
});

const request = {
  schemaVersion: 1, language: 'go', framework: 'go_generic', method: 'sdk', environment: 'docker',
  platform: 'linux_amd64', service: { name: 'checkout-api', namespace: 'commerce', environment: 'prod' },
  collectorId: 'collector-east'
} as const;

function response(decision: 'continue_polling' | 'complete', status: 'waiting' | 'received') {
  const startedAt = 1_710_000_000_000;
  const detectedAt = status === 'waiting' ? startedAt + 1_000 : startedAt + 4_000;
  const signal = status === 'waiting'
    ? { status, lastReceivedAt: null, errorCode: 'signal_not_received' as const }
    : { status, lastReceivedAt: detectedAt, errorCode: null };
  const context = {
    serviceName: 'checkout-api', serviceNamespace: 'commerce', environment: 'prod', collectorId: 'collector-east',
    startedAt, detectedAt
  };
  return {
    schemaVersion: 1 as const, detectedAt,
    context: { ...request, startedAt },
    signals: { metrics: signal, logs: signal, traces: signal },
    polling: { decision, pollAfterMs: decision === 'continue_polling' ? 3_000 : null, deadlineAt: startedAt + 120_000 },
    queryJumpContext: context,
    queryJumps: ['metrics', 'logs', 'traces'].map(value => ({ signal: value, enabled: status === 'received', context }))
  };
}
