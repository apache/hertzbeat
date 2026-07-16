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

import { useCallback, useEffect, useRef, useState } from 'react';

import { detectInstrumentationSignals } from '../api/instrumentation-api';
import {
  INSTRUMENTATION_SIGNALS,
  type DetectionRequest,
  type DetectionResponse,
  type InstrumentationSignal
} from '../api/instrumentation-contract';
import { buildExploreHandoff } from '../model/instrumentation-flow';

type RequestFactory = (startedAt: number) => DetectionRequest;
type ContractErrorHandler = (error: unknown) => Promise<boolean>;

export type InstrumentationDetectionState =
  | { status: 'idle' }
  | { status: 'checking'; response?: DetectionResponse }
  | { status: 'complete'; response: DetectionResponse }
  | { status: 'manual_retry'; response: DetectionResponse }
  | { status: 'error'; error: unknown };

export function useInstrumentationDetectionController(
  createRequest: RequestFactory,
  onContractError?: ContractErrorHandler
) {
  const [response, setResponse] = useState<DetectionResponse>();
  const [error, setError] = useState<unknown>();
  const [checking, setChecking] = useState(false);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abort = useRef<AbortController | undefined>(undefined);
  const runRef = useRef<((current: DetectionRequest, runGeneration: number) => Promise<void>) | undefined>(undefined);

  const clearPending = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    abort.current?.abort();
    abort.current = undefined;
  }, []);
  const run = useCallback(async (current: DetectionRequest, runGeneration: number) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    try {
      const next = await detectInstrumentationSignals(current, controller.signal);
      if (generation.current !== runGeneration) return;
      setResponse(next);
      setError(undefined);
      if (next.polling.decision === 'continue_polling') {
        setChecking(true);
        const delay = next.polling.pollAfterMs;
        if (delay == null) throw new Error('Detection polling delay was unavailable');
        timer.current = setTimeout(() => void runRef.current?.(current, runGeneration), delay);
      } else {
        setChecking(false);
      }
    } catch (reason: unknown) {
      if (controller.signal.aborted || generation.current !== runGeneration) return;
      try {
        await onContractError?.(reason);
      } catch {
        // Detection evidence stays authoritative even when a catalog refresh also fails.
      }
      setError(reason);
      setChecking(false);
    }
  }, [onContractError]);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const start = useCallback(() => {
    clearPending();
    const nextGeneration = generation.current + 1;
    generation.current = nextGeneration;
    setResponse(undefined);
    setError(undefined);
    setChecking(true);
    let request: DetectionRequest;
    try {
      request = createRequest(Date.now());
    } catch (reason: unknown) {
      setError(reason);
      setChecking(false);
      return;
    }
    void run(request, nextGeneration);
  }, [clearPending, createRequest, run]);
  const reset = useCallback(() => {
    generation.current += 1;
    clearPending();
    setResponse(undefined);
    setError(undefined);
    setChecking(false);
  }, [clearPending]);
  const queryHandoff = useCallback((signal: InstrumentationSignal) => {
    const jump = response?.queryJumps.find(item => item.signal === signal);
    return jump?.enabled ? buildExploreHandoff(jump.signal, jump.context) : undefined;
  }, [response]);

  useEffect(() => () => {
    generation.current += 1;
    clearPending();
  }, [clearPending]);

  return {
    state: detectionState(response, error, checking),
    response,
    error,
    checking,
    signalNames: INSTRUMENTATION_SIGNALS,
    start,
    retry: start,
    reset,
    queryHandoff
  };
}

function detectionState(
  response: DetectionResponse | undefined,
  error: unknown,
  checking: boolean
): InstrumentationDetectionState {
  if (error !== undefined) return { status: 'error', error };
  if (checking) return response ? { status: 'checking', response } : { status: 'checking' };
  if (!response) return { status: 'idle' };
  return response.polling.decision === 'complete'
    ? { status: 'complete', response }
    : { status: 'manual_retry', response };
}
