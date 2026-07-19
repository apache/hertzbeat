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

import { useCallback, useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';

import { detectInstrumentationSignals } from '../api/instrumentation-api';
import {
  INSTRUMENTATION_SIGNALS,
  type DetectionRequest,
  type DetectionResponse,
  type InstrumentationSignal
} from '../model/instrumentation-contract';
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
  const { state, start, reset } = useDetectionRequestLifecycle(createRequest, onContractError);
  const { queryHandoff, openQuery } = useDetectionNavigation(responseFromState(state), openPath);

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

function useDetectionRequestLifecycle(createRequest: RequestFactory, onContractError?: ContractErrorHandler) {
  // One state value prevents consumers from observing combinations such as
  // `checking + error` or a stale response beside a failed request.
  const [state, setState] = useState<InstrumentationDetectionState>({ status: 'idle' });
  const generationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const { clearPending, run } = useDetectionRunner(setState, generationRef, timerRef, abortRef, onContractError);

  const start = useCallback(() => {
    clearPending();
    const nextGeneration = generationRef.current + 1;
    generationRef.current = nextGeneration;
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
    generationRef.current += 1;
    clearPending();
    setState({ status: 'idle' });
  }, [clearPending]);
  useEffect(
    () => () => {
      generationRef.current += 1;
      clearPending();
    },
    [clearPending]
  );

  return { state, start, reset };
}

type DetectionStateSetter = Dispatch<SetStateAction<InstrumentationDetectionState>>;

function useDetectionRunner(
  setState: DetectionStateSetter,
  generationRef: RefObject<number>,
  timerRef: RefObject<ReturnType<typeof setTimeout> | undefined>,
  abortRef: RefObject<AbortController | undefined>,
  onContractError?: ContractErrorHandler
) {
  const runRef = useRef<((current: DetectionRequest, runGeneration: number) => Promise<void>) | undefined>(undefined);

  const clearPending = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = undefined;
    abortRef.current?.abort();
    abortRef.current = undefined;
  }, [abortRef, timerRef]);
  const handleRequestFailure = useCallback(
    async (reason: unknown, controller: AbortController, runGeneration: number) => {
      if (controller.signal.aborted || generationRef.current !== runGeneration) return;
      let contractRefreshed = false;
      try {
        contractRefreshed = (await onContractError?.(reason)) ?? false;
      } catch {
        // Detection evidence stays authoritative even when a catalog refresh also fails.
      }
      // Refreshing the catalog is asynchronous, so a reset may have superseded this run.
      if (controller.signal.aborted || generationRef.current !== runGeneration) return;
      setState(contractRefreshed ? { status: 'idle' } : { status: 'error', error: reason });
    },
    [generationRef, onContractError, setState]
  );
  const run = useCallback(
    async (current: DetectionRequest, runGeneration: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const next = await detectInstrumentationSignals(current, controller.signal);
        if (generationRef.current !== runGeneration) return;
        if (next.polling.decision === 'continue_polling') {
          setState({ status: 'checking', response: next });
          const delay = next.polling.pollAfterMs;
          if (delay == null) throw new Error('Detection polling delay was unavailable');
          timerRef.current = setTimeout(() => void runRef.current?.(current, runGeneration), delay);
        } else {
          setState(
            next.polling.decision === 'complete'
              ? { status: 'complete', response: next }
              : { status: 'manual_retry', response: next }
          );
        }
      } catch (reason: unknown) {
        await handleRequestFailure(reason, controller, runGeneration);
      }
    },
    [abortRef, generationRef, handleRequestFailure, setState, timerRef]
  );
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  return { clearPending, run };
}

function useDetectionNavigation(
  response: DetectionResponse | undefined,
  openPath: ((path: string) => void) | undefined
) {
  const queryHandoff = useCallback(
    (signal: InstrumentationSignal) => {
      if (response?.signals[signal].status !== 'received') return undefined;
      const jump = response.queryJumps.find(item => item.signal === signal);
      return jump?.enabled ? buildExploreHandoff(jump.signal, jump.context) : undefined;
    },
    [response]
  );
  const openQuery = useCallback(
    (signal: InstrumentationSignal) => {
      const path = queryHandoff(signal);
      if (path) openPath?.(path);
    },
    [openPath, queryHandoff]
  );
  return { queryHandoff, openQuery };
}

function responseFromState(state: InstrumentationDetectionState) {
  return 'response' in state ? state.response : undefined;
}

export type InstrumentationDetectionController = ReturnType<typeof useInstrumentationDetectionController>;
