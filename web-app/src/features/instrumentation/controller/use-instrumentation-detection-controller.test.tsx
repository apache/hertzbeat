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

import type { DetectionRequest } from '../model/instrumentation-contract';
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
    const openPath = vi.fn();
    const { result } = renderHook(() => useInstrumentationDetectionController(createRequest, undefined, openPath));

    act(() => result.current.start());
    await act(async () => void (await Promise.resolve()));
    expect(result.current.state).toMatchObject({
      status: 'checking',
      response: {
        signals: {
          metrics: { status: 'waiting' },
          logs: { status: 'unsupported' },
          traces: { status: 'received' }
        }
      }
    });

    await act(async () => void (await vi.advanceTimersByTimeAsync(2_999)));
    expect(detectInstrumentationSignals).toHaveBeenCalledTimes(1);
    await act(async () => void (await vi.advanceTimersByTimeAsync(1)));
    expect(detectInstrumentationSignals).toHaveBeenCalledTimes(2);
    expect(detectInstrumentationSignals.mock.calls[0]?.[0].startedAt).toBe(
      detectInstrumentationSignals.mock.calls[1]?.[0].startedAt
    );
    expect(result.current.state.status).toBe('complete');
    expect(result.current.queryHandoff('metrics')).toContain('signal=metrics');
    expect(result.current.queryHandoff('logs')).toBeUndefined();
    act(() => result.current.openQuery('metrics'));
    expect(openPath).toHaveBeenCalledWith(
      '/explore?signal=metrics&serviceName=checkout-api&serviceNamespace=commerce&environment=prod&collectorId=collector-east&start=1710000000000&end=1710000001000'
    );
    expect(openPath.mock.calls[0]?.[0]).not.toContain('token');
    act(() => result.current.openQuery('logs'));
    expect(openPath).toHaveBeenCalledTimes(1);
  });

  it('does not navigate for disabled or non-received signal evidence', async () => {
    const openPath = vi.fn();
    detectInstrumentationSignals.mockImplementationOnce((current: DetectionRequest) =>
      Promise.resolve(response(current, 'manual_retry'))
    );
    const { result } = renderHook(() =>
      useInstrumentationDetectionController(startedAt => ({ ...request, startedAt }), undefined, openPath)
    );
    act(() => result.current.start());
    await act(async () => void (await Promise.resolve()));

    for (const signal of ['logs', 'traces'] as const) act(() => result.current.openQuery(signal));
    expect(openPath).not.toHaveBeenCalled();
    act(() => result.current.openQuery('metrics'));
    expect(openPath).toHaveBeenCalledOnce();
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
    await act(async () => void (await Promise.resolve()));
    expect(result.current.state).toMatchObject({
      status: 'manual_retry',
      response: {
        signals: {
          metrics: { status: 'received' },
          logs: { status: 'unavailable' },
          traces: { status: 'error' }
        }
      }
    });
    expect(result.current.state.status === 'manual_retry' && result.current.state.response.polling.deadlineAt).toBe(
      STARTED_AT + 120_000
    );

    vi.setSystemTime(STARTED_AT + 10_000);
    act(() => result.current.retry());
    await act(async () => void (await Promise.resolve()));
    expect(createRequest).toHaveBeenLastCalledWith(STARTED_AT + 10_000);
    expect(detectInstrumentationSignals.mock.calls[1]?.[0].startedAt).toBe(STARTED_AT + 10_000);
  });

  it('delegates schema and selection errors to the catalog refresh boundary', async () => {
    const refreshCatalog = vi.fn().mockResolvedValue(true);
    detectInstrumentationSignals.mockRejectedValue(
      new InstrumentationRequestError('instrumentation_selection_invalid')
    );
    const { result } = renderHook(() =>
      useInstrumentationDetectionController(startedAt => ({ ...request, startedAt }), refreshCatalog)
    );

    act(() => result.current.start());
    await act(async () => void (await Promise.resolve()));

    expect(refreshCatalog).toHaveBeenCalledOnce();
    expect(result.current.state.status).toBe('idle');
  });

  it('exposes one discriminated state instead of contradictory raw flags', async () => {
    let resolveDetection: ((value: ReturnType<typeof response>) => void) | undefined;
    detectInstrumentationSignals.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveDetection = resolve;
        })
    );
    const { result } = renderHook(() =>
      useInstrumentationDetectionController(startedAt => ({ ...request, startedAt }))
    );

    expect(result.current.state).toEqual({ status: 'idle' });
    expect(result.current).not.toHaveProperty('response');
    expect(result.current).not.toHaveProperty('error');
    expect(result.current).not.toHaveProperty('checking');

    act(() => result.current.start());
    expect(result.current.state).toEqual({ status: 'checking' });

    act(() => resolveDetection?.(response({ ...request, startedAt: STARTED_AT }, 'complete')));
    await act(async () => void (await Promise.resolve()));
    expect(result.current.state.status).toBe('complete');

    act(() => result.current.reset());
    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('represents request and request-factory failures only as error states', async () => {
    const requestFailure = new Error('storage unavailable');
    detectInstrumentationSignals.mockRejectedValueOnce(requestFailure);
    const remote = renderHook(() => useInstrumentationDetectionController(startedAt => ({ ...request, startedAt })));

    act(() => remote.result.current.start());
    await act(async () => void (await Promise.resolve()));
    expect(remote.result.current.state).toEqual({ status: 'error', error: requestFailure });
    remote.unmount();

    const factoryFailure = new Error('invalid context');
    const local = renderHook(() =>
      useInstrumentationDetectionController(() => {
        throw factoryFailure;
      })
    );
    act(() => local.result.current.start());
    expect(local.result.current.state).toEqual({ status: 'error', error: factoryFailure });
  });
});

const STARTED_AT = 1_710_000_000_000;
const request = {
  schemaVersion: 1,
  language: 'go',
  framework: 'go_generic',
  method: 'sdk',
  environment: 'docker',
  platform: 'linux_amd64',
  service: { name: 'checkout-api', namespace: 'commerce', environment: 'prod' },
  collectorId: 'collector-east'
} as const;

function response(current: DetectionRequest, decision: 'continue_polling' | 'complete' | 'manual_retry') {
  const detectedAt = current.startedAt + 1_000;
  const context = {
    serviceName: current.service.name,
    serviceNamespace: current.service.namespace,
    environment: current.service.environment,
    collectorId: current.collectorId,
    startedAt: current.startedAt,
    detectedAt
  };
  const received = { status: 'received' as const, lastReceivedAt: detectedAt, errorCode: null };
  const signals = signalsForDecision(decision, received);
  return {
    schemaVersion: 1 as const,
    detectedAt,
    context: current,
    signals,
    polling: {
      decision,
      pollAfterMs: decision === 'continue_polling' ? 3_000 : null,
      deadlineAt: current.startedAt + 120_000
    },
    queryJumpContext: context,
    queryJumps: (['metrics', 'logs', 'traces'] as const).map(signal => ({
      signal,
      enabled: signals[signal].status === 'received',
      context
    }))
  };
}

function signalsForDecision(
  decision: 'continue_polling' | 'complete' | 'manual_retry',
  received: { status: 'received'; lastReceivedAt: number; errorCode: null }
) {
  if (decision === 'continue_polling') {
    return {
      metrics: { status: 'waiting' as const, lastReceivedAt: null, errorCode: 'signal_not_received' as const },
      logs: { status: 'unsupported' as const, lastReceivedAt: null, errorCode: 'signal_not_supported' as const },
      traces: received
    };
  }
  if (decision === 'complete') {
    return {
      metrics: received,
      logs: { status: 'unsupported' as const, lastReceivedAt: null, errorCode: 'signal_not_supported' as const },
      traces: received
    };
  }
  return {
    metrics: received,
    logs: { status: 'unavailable' as const, lastReceivedAt: null, errorCode: 'storage_unavailable' as const },
    traces: { status: 'error' as const, lastReceivedAt: null, errorCode: 'storage_query_failed' as const }
  };
}
