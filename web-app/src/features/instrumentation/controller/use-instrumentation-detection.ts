/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, type MutableRefObject } from 'react';
import { detectInstrumentationSignals } from '../api/instrumentation-api';
import { buildDetectionRequest } from '../model/instrumentation-flow';
import type { InstrumentationControllerState } from './instrumentation-controller-state';

type DetectionLifetime = {
  startedAtRef: MutableRefObject<number | undefined>;
  timerRef: MutableRefObject<number | undefined>;
  generationRef: MutableRefObject<number>;
};

export function useInstrumentationDetection(state: InstrumentationControllerState, lifetime: DetectionLifetime) {
  const { draft, setDetection, setDetecting, setDetectionError } = state;
  const { startedAtRef, timerRef, generationRef } = lifetime;
  const detect = useCallback(
    async function runDetection() {
      const currentGeneration = generationRef.current;
      const start = startedAtRef.current;
      if (start === undefined) {
        setDetecting(false);
        setDetectionError(true);
        setDetection(undefined);
        return;
      }
      setDetecting(true);
      setDetectionError(false);
      try {
        const response = await detectInstrumentationSignals(buildDetectionRequest(draft, start));
        if (generationRef.current !== currentGeneration) return;
        setDetection(response);
        if (response.polling.decision === 'continue_polling' && Date.now() < response.polling.deadlineAt) {
          const remaining = response.polling.deadlineAt - Date.now();
          const delay = response.polling.pollAfterMs;
          if (delay && delay <= remaining) {
            timerRef.current = window.setTimeout(() => void runDetection(), delay);
          } else setDetecting(false);
        } else {
          setDetecting(false);
        }
      } catch {
        if (generationRef.current !== currentGeneration) return;
        setDetecting(false);
        setDetectionError(true);
        setDetection(undefined);
      }
    },
    [draft, generationRef, setDetection, setDetecting, setDetectionError, startedAtRef, timerRef]
  );
  return { detect, startNewDetection: () => restartDetection(state, lifetime, detect) };
}

async function restartDetection(
  state: InstrumentationControllerState,
  lifetime: DetectionLifetime,
  detect: () => Promise<void>
) {
  if (!state.guide || state.tokenAcknowledgementRequiredRef.current) return;
  const { generationRef, timerRef, startedAtRef } = lifetime;
  generationRef.current += 1;
  if (timerRef.current) window.clearTimeout(timerRef.current);
  timerRef.current = undefined;
  startedAtRef.current = Date.now();
  state.setDetection(undefined);
  await detect();
}
