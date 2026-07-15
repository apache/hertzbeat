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

import type { DetectionRequest, DetectionResponse } from './instrumentation-contract';
import { detectInstrumentationSignals } from './instrumentation-api';

type RequestFactory = (startedAt: number) => DetectionRequest;

export function useInstrumentationDetection(createRequest: RequestFactory) {
  const [response, setResponse] = useState<DetectionResponse>();
  const [error, setError] = useState<unknown>();
  const [checking, setChecking] = useState(false);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const request = useRef<DetectionRequest | undefined>(undefined);
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
        timer.current = setTimeout(() => void runRef.current?.(current, runGeneration), next.polling.pollAfterMs ?? 3_000);
      } else {
        setChecking(false);
      }
    } catch (reason: unknown) {
      if (controller.signal.aborted || generation.current !== runGeneration) return;
      setError(reason);
      setChecking(false);
    }
  }, []);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const start = useCallback(() => {
    clearPending();
    const nextGeneration = generation.current + 1;
    generation.current = nextGeneration;
    const nextRequest = createRequest(Date.now());
    request.current = nextRequest;
    setResponse(undefined);
    setError(undefined);
    setChecking(true);
    void run(nextRequest, nextGeneration);
  }, [clearPending, createRequest, run]);

  const retry = useCallback(() => {
    if (!request.current) return start();
    clearPending();
    const nextGeneration = generation.current + 1;
    generation.current = nextGeneration;
    setError(undefined);
    setChecking(true);
    void run(request.current, nextGeneration);
  }, [clearPending, run, start]);

  const reset = useCallback(() => {
    generation.current += 1;
    clearPending();
    request.current = undefined;
    setResponse(undefined);
    setError(undefined);
    setChecking(false);
  }, [clearPending]);

  useEffect(() => () => {
    generation.current += 1;
    clearPending();
  }, [clearPending]);

  return { response, error, checking, start, retry, reset };
}
