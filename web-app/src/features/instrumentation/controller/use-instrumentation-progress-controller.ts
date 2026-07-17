/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import type { QueryContext } from '@/shared/query-context';

import type { FlowStage, InstrumentationFlowDraft } from '../model/instrumentation-flow';
import { clearFlowSelection } from '../model/instrumentation-flow';
import {
  parseInstrumentationProgress,
  writeInstrumentationProgress
} from '../model/instrumentation-progress';

export function useInstrumentationProgressController(context: QueryContext) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const search = params.toString();
  const restored = useMemo(
    () => parseInstrumentationProgress(params, context),
    [context, params]
  );
  const stage = ephemeralStage(location.state) ?? restored.stage;

  const setStage = useCallback((next: FlowStage, draft: InstrumentationFlowDraft) => {
    const updated = writeInstrumentationProgress(params, draft, next);
    setParams(updated, { state: next > 3 ? { instrumentationStage: next } : null });
  }, [params, setParams]);
  const persistDraft = useCallback((draft: InstrumentationFlowDraft) => {
    const updated = writeInstrumentationProgress(params, draft, stage);
    if (updated.toString() !== search) setParams(updated, { replace: true });
  }, [params, search, setParams, stage]);
  const clearMismatch = useCallback((draft: InstrumentationFlowDraft) => {
    const updated = writeInstrumentationProgress(params, clearFlowSelection(draft), 1);
    if (updated.toString() !== search || location.state != null) {
      setParams(updated, { replace: true, state: null });
    }
  }, [location.state, params, search, setParams]);

  return { restored, search, stage, setStage, persistDraft, clearMismatch };
}

function ephemeralStage(state: unknown): Extract<FlowStage, 4 | 5> | undefined {
  if (!state || typeof state !== 'object') return undefined;
  const value = (state as { instrumentationStage?: unknown }).instrumentationStage;
  return value === 4 || value === 5 ? value : undefined;
}
