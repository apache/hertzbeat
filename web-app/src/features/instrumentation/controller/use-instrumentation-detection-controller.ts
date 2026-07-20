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

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction
} from 'react';

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
  openPath?: (path: string) => void,
  requestIdentity?: string
) {
  const { state, start, reset } = useDetectionRequestLifecycle(createRequest, onContractError, requestIdentity);
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

function useDetectionRequestLifecycle(
  createRequest: RequestFactory,
  onContractError?: ContractErrorHandler,
  requestIdentity?: string
) {
  // One state value prevents consumers from observing combinations such as
  // `checking + error` or a stale response beside a failed request.
  const [state, setState] = useState<InstrumentationDetectionState>({ status: 'idle' });
  const generationRef = useRef(0);
  const activeRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const { clearPending, run } = useDetectionRunner(
    setState,
    generationRef,
    activeRef,
    timerRef,
    abortRef,
    onContractError
  );

  const start = useCallback(() => {
    // This lock is synchronous because two click handlers can run before React
    // publishes the first `checking` state.
    if (activeRef.current) return;
    clearPending();
    activeRef.current = true;
    const nextGeneration = generationRef.current + 1;
    generationRef.current = nextGeneration;
    setState({ status: 'checking' });
    let request: DetectionRequest;
    try {
      request = createRequest(Date.now());
    } catch (reason: unknown) {
      activeRef.current = false;
      setState({ status: 'error', error: reason });
      return;
    }
    void run(request, nextGeneration);
  }, [clearPending, createRequest, run]);
  const reset = useCallback(() => {
    generationRef.current += 1;
    activeRef.current = false;
    clearPending();
    setState({ status: 'idle' });
  }, [clearPending]);
  const previousRequestIdentity = useRef(requestIdentity);
  useLayoutEffect(() => {
    if (Object.is(previousRequestIdentity.current, requestIdentity)) return;
    previousRequestIdentity.current = requestIdentity;
    generationRef.current += 1;
    activeRef.current = false;
    clearPending();
    setState({ status: 'idle' });
  }, [clearPending, requestIdentity]);
  useEffect(
    () => () => {
      generationRef.current += 1;
      activeRef.current = false;
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
  activeRef: RefObject<boolean>,
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
      activeRef.current = false;
      setState(contractRefreshed ? { status: 'idle' } : { status: 'error', error: reason });
    },
    [activeRef, generationRef, onContractError, setState]
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
          if (next.polling.pollAfterMs == null) throw new Error('Detection polling delay was unavailable');
          timerRef.current = setTimeout(() => void runRef.current?.(current, runGeneration), next.polling.pollAfterMs);
        } else {
          activeRef.current = false;
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
    [abortRef, activeRef, generationRef, handleRequestFailure, setState, timerRef]
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
