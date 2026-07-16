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

import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { InstrumentationCollector } from '../api/collector-api';
import type {
  CollectorTarget,
  GuideRenderRequest,
  GuideRenderResponse,
  GuideSnippet
} from '../api/instrumentation-contract';
import { renderInstrumentationGuide } from '../api/instrumentation-api';
import {
  buildGuideRequest,
  createTransientCollectorTarget,
  materializeGuideSnippet,
  type InstrumentationFlowDraft
} from '../model/instrumentation-flow';

export type InstrumentationGuideState =
  | { status: 'unavailable'; reason: 'collector_unavailable' | 'collector_intake_unavailable' }
  | { status: 'idle' }
  | { status: 'rendering' }
  | { status: 'ready'; guide: GuideRenderResponse }
  | { status: 'error'; error: Error };

export function useInstrumentationGuideController(
  draft: InstrumentationFlowDraft,
  collectors: InstrumentationCollector[]
) {
  const [transientTarget, setTarget] = useState<CollectorTarget>();
  const targetRef = useRef<CollectorTarget | undefined>(undefined);
  const [token, setToken] = useState('');
  const mutation = useMutation<GuideRenderResponse, Error, GuideRenderRequest>({
    mutationFn: request => renderInstrumentationGuide(request)
  });
  const reset = mutation.reset;
  const clearContractState = useCallback(() => {
    reset();
    setToken('');
  }, [reset]);
  const setTransientTarget = useCallback((target: CollectorTarget | undefined) => {
    const nextTarget = target ? createTransientCollectorTarget(target) : undefined;
    if (sameCollectorTarget(targetRef.current, nextTarget)) return;
    targetRef.current = nextTarget;
    setTarget(nextTarget);
    setToken('');
    reset();
  }, [reset]);
  const previousDraft = useRef(draft);
  useEffect(() => {
    if (previousDraft.current === draft) return;
    const collectorChanged = previousDraft.current.collectorId !== draft.collectorId;
    previousDraft.current = draft;
    reset();
    if (collectorChanged) {
      targetRef.current = undefined;
      setTarget(undefined);
      setToken('');
    }
  }, [draft, reset]);
  const advertisedTarget = useMemo(
    () => collectorTargetFromInventory(draft.collectorId, collectors),
    [collectors, draft.collectorId]
  );
  useEffect(() => {
    setTransientTarget(advertisedTarget);
  }, [advertisedTarget, setTransientTarget]);
  const render = useCallback(async () => {
    const collector = collectors.find(item => item.collectorId === draft.collectorId);
    if (!collector || !collector.online) throw new Error('Selected Collector is unavailable');
    return mutation.mutateAsync(buildGuideRequest(draft, collector, transientTarget));
  }, [collectors, draft, mutation, transientTarget]);
  const materializeSnippet = useCallback((snippet: GuideSnippet) => {
    if (!mutation.data) throw new Error('Guide is unavailable');
    return materializeGuideSnippet(snippet, mutation.data, token);
  }, [mutation.data, token]);

  return {
    state: guideState(draft, collectors, transientTarget, mutation.data, mutation.error, mutation.isPending),
    guide: mutation.data,
    token,
    setToken,
    transientTarget,
    setTransientTarget,
    render,
    materializeSnippet,
    clearContractState,
    reset
  };
}

function collectorTargetFromInventory(
  collectorId: string,
  collectors: InstrumentationCollector[]
): CollectorTarget | undefined {
  const intake = collectors.find(item => item.collectorId === collectorId)?.intake;
  if (intake?.status !== 'available') return undefined;
  return {
    collectorId: intake.collectorId,
    otlpHttpEndpoint: intake.otlpHttpEndpoint,
    otlpGrpcEndpoint: intake.otlpGrpcEndpoint,
    authorizationHeader: intake.authorizationHeader
  };
}

function sameCollectorTarget(left: CollectorTarget | undefined, right: CollectorTarget | undefined) {
  return left?.collectorId === right?.collectorId
    && left?.otlpHttpEndpoint === right?.otlpHttpEndpoint
    && left?.otlpGrpcEndpoint === right?.otlpGrpcEndpoint
    && left?.authorizationHeader === right?.authorizationHeader;
}

function guideState(
  draft: InstrumentationFlowDraft,
  collectors: InstrumentationCollector[],
  target: CollectorTarget | undefined,
  guide: GuideRenderResponse | undefined,
  error: Error | null,
  pending: boolean
): InstrumentationGuideState {
  const collector = collectors.find(item => item.collectorId === draft.collectorId);
  if (!collector || !collector.online) return { status: 'unavailable', reason: 'collector_unavailable' };
  if (!target) return { status: 'unavailable', reason: 'collector_intake_unavailable' };
  if (pending) return { status: 'rendering' };
  if (error) return { status: 'error', error };
  return guide ? { status: 'ready', guide } : { status: 'idle' };
}
