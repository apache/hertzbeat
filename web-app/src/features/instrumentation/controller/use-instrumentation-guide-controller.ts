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

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { CollectorTarget, InstrumentationCollector } from '../model/instrumentation-collector';
import type { GuideRenderResponse, GuideSnippet } from '../model/instrumentation-contract';
import { buildGuideRequest, createTransientCollectorTarget } from '../model/instrumentation-requests';
import { materializeGuideSnippet } from '../model/instrumentation-snippet';
import type { InstrumentationFlowDraft } from '../model/instrumentation-flow';
import { useInstrumentationGuideRenderer } from './use-instrumentation-guide-renderer';

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
  const renderer = useInstrumentationGuideRenderer();
  const advertisedTarget = useMemo(
    () => collectorTargetFromInventory(draft.collectorId, collectors),
    [collectors, draft.collectorId]
  );
  const contract = useGuideContractState(draft, advertisedTarget, renderer.reset);
  const render = useCallback(async () => {
    const collector = collectors.find(item => item.collectorId === draft.collectorId);
    if (!collector || !collector.online) throw new Error('Selected Collector is unavailable');
    return renderer.render(buildGuideRequest(draft, collector, contract.transientTarget));
  }, [collectors, contract.transientTarget, draft, renderer]);
  const guide = renderer.state.status === 'ready' ? renderer.state.guide : undefined;
  const materializeSnippet = useCallback(
    (snippet: GuideSnippet) => {
      if (!guide) throw new Error('Guide is unavailable');
      return materializeGuideSnippet(snippet, guide, contract.token);
    },
    [contract.token, guide]
  );

  return {
    state: guideState(draft, collectors, contract.transientTarget, renderer.state),
    guide,
    ...contract,
    render,
    materializeSnippet,
    reset: renderer.reset
  };
}

function useGuideContractState(
  draft: InstrumentationFlowDraft,
  advertisedTarget: CollectorTarget | undefined,
  reset: () => void
) {
  const [transientTarget, setTarget] = useState<CollectorTarget>();
  const targetRef = useRef<CollectorTarget | undefined>(undefined);
  const [token, setToken] = useState('');
  const clearContractState = useCallback(() => {
    reset();
    setToken('');
  }, [reset]);
  const setTransientTarget = useCallback(
    (target: CollectorTarget | undefined) => {
      const nextTarget = target ? createTransientCollectorTarget(target) : undefined;
      if (sameCollectorTarget(targetRef.current, nextTarget)) return;
      targetRef.current = nextTarget;
      setTarget(nextTarget);
      setToken('');
      reset();
    },
    [reset]
  );
  const previousDraft = useRef(draft);
  useLayoutEffect(() => {
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
  useLayoutEffect(() => {
    setTransientTarget(advertisedTarget);
  }, [advertisedTarget, setTransientTarget]);

  return {
    token,
    setToken,
    transientTarget,
    setTransientTarget,
    clearContractState
  };
}

function collectorTargetFromInventory(
  collectorId: string,
  collectors: InstrumentationCollector[]
): CollectorTarget | undefined {
  const intake = collectors.find(item => item.collectorId === collectorId)?.intake;
  if (intake?.status !== 'available' || (intake.otlpHttpEndpoint === null && intake.otlpGrpcEndpoint === null)) {
    return undefined;
  }
  return {
    collectorId: intake.collectorId,
    otlpHttpEndpoint: intake.otlpHttpEndpoint,
    otlpGrpcEndpoint: intake.otlpGrpcEndpoint,
    authorizationHeader: intake.authorizationHeader
  };
}

function sameCollectorTarget(left: CollectorTarget | undefined, right: CollectorTarget | undefined) {
  return (
    left?.collectorId === right?.collectorId &&
    left?.otlpHttpEndpoint === right?.otlpHttpEndpoint &&
    left?.otlpGrpcEndpoint === right?.otlpGrpcEndpoint &&
    left?.authorizationHeader === right?.authorizationHeader
  );
}

function guideState(
  draft: InstrumentationFlowDraft,
  collectors: InstrumentationCollector[],
  target: CollectorTarget | undefined,
  renderState: Exclude<InstrumentationGuideState, { status: 'unavailable' }>
): InstrumentationGuideState {
  const collector = collectors.find(item => item.collectorId === draft.collectorId);
  if (!collector || !collector.online) return { status: 'unavailable', reason: 'collector_unavailable' };
  if (!target) return { status: 'unavailable', reason: 'collector_intake_unavailable' };
  return renderState;
}
