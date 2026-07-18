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
import { buildExploreHandoff } from '../model/instrumentation-requests';

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
  onContractError?: ContractErrorHandler,
  openPath?: (path: string) => void
) {
  // One state value prevents consumers from observing combinations such as
  // `checking + error` or a stale response beside a failed request.
  const [state, setState] = useState<InstrumentationDetectionState>({ status: 'idle' });
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
  const handleRequestFailure = useCallback(async (
    reason: unknown,
    controller: AbortController,
    runGeneration: number
  ) => {
    if (controller.signal.aborted || generation.current !== runGeneration) return;
    let contractRefreshed = false;
    try {
      contractRefreshed = await onContractError?.(reason) ?? false;
    } catch {
      // Detection evidence stays authoritative even when a catalog refresh also fails.
    }
    // Refreshing the catalog is asynchronous, so a reset may have superseded this run.
    if (controller.signal.aborted || generation.current !== runGeneration) return;
    setState(contractRefreshed ? { status: 'idle' } : { status: 'error', error: reason });
  }, [onContractError]);
  const run = useCallback(async (current: DetectionRequest, runGeneration: number) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    try {
      const next = await detectInstrumentationSignals(current, controller.signal);
      if (generation.current !== runGeneration) return;
      if (next.polling.decision === 'continue_polling') {
        setState({ status: 'checking', response: next });
        const delay = next.polling.pollAfterMs;
        if (delay == null) throw new Error('Detection polling delay was unavailable');
        timer.current = setTimeout(() => void runRef.current?.(current, runGeneration), delay);
      } else {
        setState(next.polling.decision === 'complete'
          ? { status: 'complete', response: next }
          : { status: 'manual_retry', response: next });
      }
    } catch (reason: unknown) {
      await handleRequestFailure(reason, controller, runGeneration);
    }
  }, [handleRequestFailure]);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const start = useCallback(() => {
    clearPending();
    const nextGeneration = generation.current + 1;
    generation.current = nextGeneration;
    setState({ status: 'checking' });
    let request: DetectionRequest;
    try {
      request = createRequest(Date.now());
    } catch (reason: unknown) {
      setState({ status: 'error', error: reason });
      return;
    }
    void run(request, nextGeneration);
  }, [clearPending, createRequest, run]);
  const reset = useCallback(() => {
    generation.current += 1;
    clearPending();
    setState({ status: 'idle' });
  }, [clearPending]);
  const { queryHandoff, openQuery } = useDetectionNavigation(responseFromState(state), openPath);

  useEffect(() => () => {
    generation.current += 1;
    clearPending();
  }, [clearPending]);

  return {
    state,
    signalNames: INSTRUMENTATION_SIGNALS,
    start,
    retry: start,
    reset,
    queryHandoff,
    openQuery
  };
}

function useDetectionNavigation(response: DetectionResponse | undefined, openPath: ((path: string) => void) | undefined) {
  const queryHandoff = useCallback((signal: InstrumentationSignal) => {
    if (response?.signals[signal].status !== 'received') return undefined;
    const jump = response.queryJumps.find(item => item.signal === signal);
    return jump?.enabled ? buildExploreHandoff(jump.signal, jump.context) : undefined;
  }, [response]);
  const openQuery = useCallback((signal: InstrumentationSignal) => {
    const path = queryHandoff(signal);
    if (path) openPath?.(path);
  }, [openPath, queryHandoff]);
  return { queryHandoff, openQuery };
}

function responseFromState(state: InstrumentationDetectionState) {
  return 'response' in state ? state.response : undefined;
}

export type InstrumentationDetectionController = ReturnType<typeof useInstrumentationDetectionController>;
