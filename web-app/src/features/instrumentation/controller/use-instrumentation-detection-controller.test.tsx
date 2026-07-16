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

import type { DetectionRequest } from '../api/instrumentation-contract';
import { InstrumentationRequestError } from '../api/instrumentation-api';

const { detectInstrumentationSignals } = vi.hoisted(() => ({ detectInstrumentationSignals: vi.fn() }));
vi.mock('../api/instrumentation-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/instrumentation-api')>()),
  detectInstrumentationSignals
}));

import { useInstrumentationDetectionController } from './use-instrumentation-detection-controller';

describe('instrumentation detection controller', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('polls the same scoped attempt at 3 seconds and exposes only enabled typed handoffs', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(STARTED_AT);
    detectInstrumentationSignals
      .mockImplementationOnce((current: DetectionRequest) => Promise.resolve(response(current, 'continue_polling')))
      .mockImplementationOnce((current: DetectionRequest) => Promise.resolve(response(current, 'complete')));
    const createRequest = vi.fn(startedAt => ({ ...request, startedAt }));
    const { result } = renderHook(() => useInstrumentationDetectionController(createRequest));

    act(() => result.current.start());
    await act(async () => void await Promise.resolve());
    expect(result.current.state.status).toBe('checking');
    expect(result.current.response?.signals).toMatchObject({
      metrics: { status: 'waiting' }, logs: { status: 'unsupported' }, traces: { status: 'received' }
    });

    await act(async () => void await vi.advanceTimersByTimeAsync(2_999));
    expect(detectInstrumentationSignals).toHaveBeenCalledTimes(1);
    await act(async () => void await vi.advanceTimersByTimeAsync(1));
    expect(detectInstrumentationSignals).toHaveBeenCalledTimes(2);
    expect(detectInstrumentationSignals.mock.calls[0]?.[0].startedAt)
      .toBe(detectInstrumentationSignals.mock.calls[1]?.[0].startedAt);
    expect(result.current.state.status).toBe('complete');
    expect(result.current.queryHandoff('metrics')).toContain('signal=metrics');
    expect(result.current.queryHandoff('logs')).toBeUndefined();
  });

  it('stops on unavailable/error and starts a new 120-second attempt on manual retry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(STARTED_AT);
    detectInstrumentationSignals
      .mockImplementationOnce((current: DetectionRequest) => Promise.resolve(response(current, 'manual_retry')))
      .mockImplementationOnce((current: DetectionRequest) => Promise.resolve(response(current, 'manual_retry')));
    const createRequest = vi.fn(startedAt => ({ ...request, startedAt }));
    const { result } = renderHook(() => useInstrumentationDetectionController(createRequest));

    act(() => result.current.start());
    await act(async () => void await Promise.resolve());
    expect(result.current.state.status).toBe('manual_retry');
    expect(result.current.response?.signals).toMatchObject({
      metrics: { status: 'received' }, logs: { status: 'unavailable' }, traces: { status: 'error' }
    });
    expect(result.current.response?.polling.deadlineAt).toBe(STARTED_AT + 120_000);

    vi.setSystemTime(STARTED_AT + 10_000);
    act(() => result.current.retry());
    await act(async () => void await Promise.resolve());
    expect(createRequest).toHaveBeenLastCalledWith(STARTED_AT + 10_000);
    expect(detectInstrumentationSignals.mock.calls[1]?.[0].startedAt).toBe(STARTED_AT + 10_000);
  });

  it('delegates schema and selection errors to the catalog refresh boundary', async () => {
    const refreshCatalog = vi.fn();
    detectInstrumentationSignals.mockRejectedValue(
      new InstrumentationRequestError('instrumentation_selection_invalid')
    );
    const { result } = renderHook(() => useInstrumentationDetectionController(
      startedAt => ({ ...request, startedAt }),
      refreshCatalog
    ));

    act(() => result.current.start());
    await act(async () => void await Promise.resolve());

    expect(refreshCatalog).toHaveBeenCalledOnce();
    expect(result.current.state.status).toBe('error');
  });
});

const STARTED_AT = 1_710_000_000_000;
const request = {
  schemaVersion: 1, language: 'go', framework: 'go_generic', method: 'sdk', environment: 'docker',
  platform: 'linux_amd64', service: { name: 'checkout-api', namespace: 'commerce', environment: 'prod' },
  collectorId: 'collector-east'
} as const;

function response(current: DetectionRequest, decision: 'continue_polling' | 'complete' | 'manual_retry') {
  const detectedAt = current.startedAt + 1_000;
  const context = {
    serviceName: current.service.name, serviceNamespace: current.service.namespace,
    environment: current.service.environment, collectorId: current.collectorId,
    startedAt: current.startedAt, detectedAt
  };
  const received = { status: 'received' as const, lastReceivedAt: detectedAt, errorCode: null };
  const signals = decision === 'continue_polling'
    ? {
        metrics: { status: 'waiting' as const, lastReceivedAt: null, errorCode: 'signal_not_received' as const },
        logs: { status: 'unsupported' as const, lastReceivedAt: null, errorCode: 'signal_not_supported' as const },
        traces: received
      }
    : decision === 'complete'
      ? { metrics: received, logs: {
          status: 'unsupported' as const, lastReceivedAt: null, errorCode: 'signal_not_supported' as const
        }, traces: received }
      : {
          metrics: received,
          logs: { status: 'unavailable' as const, lastReceivedAt: null, errorCode: 'storage_unavailable' as const },
          traces: { status: 'error' as const, lastReceivedAt: null, errorCode: 'storage_query_failed' as const }
        };
  return {
    schemaVersion: 1 as const, detectedAt, context: current, signals,
    polling: {
      decision, pollAfterMs: decision === 'continue_polling' ? 3_000 : null,
      deadlineAt: current.startedAt + 120_000
    },
    queryJumpContext: context,
    queryJumps: (['metrics', 'logs', 'traces'] as const).map(signal => ({
      signal, enabled: signals[signal].status === 'received', context
    }))
  };
}
