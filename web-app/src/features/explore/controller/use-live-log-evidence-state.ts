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

import { useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import type { LogRow } from '../model/explore-signal-contract';
import type { LiveLogStatus } from '../model/explore-signal-model';

const MAXIMUM_RETAINED_LIVE_LOG_ROWS = 500;
type ScopeState<T> = { scope: string; value: T };
type LiveLogConnectionStatus = Exclude<LiveLogStatus, 'paused' | 'degraded'>;
type EvidenceState = {
  scope: string;
  rows: LogRow[];
  integrity: 'complete' | 'degraded';
  gapDroppedCount: number | undefined;
  gapCountOverflowed: boolean;
};
export type EvidenceSetter = Dispatch<SetStateAction<EvidenceState>>;
export type ConnectionSetter = Dispatch<SetStateAction<ScopeState<LiveLogConnectionStatus>>>;
export type { LiveLogConnectionStatus };

export function useScopedLiveLogState(evidenceScope: string, connectionScope: string) {
  const [evidenceState, setEvidenceState] = useState<EvidenceState>(emptyEvidence(evidenceScope));
  const [connectionState, setConnectionState] = useState<ScopeState<LiveLogConnectionStatus>>({
    scope: connectionScope,
    value: 'waiting'
  });
  const evidenceScopeRef = useRef(evidenceScope);
  const committedEvidenceScope = useRef(evidenceScope);

  useLayoutEffect(() => {
    evidenceScopeRef.current = evidenceScope;
    if (committedEvidenceScope.current === evidenceScope) return;
    committedEvidenceScope.current = evidenceScope;
    setEvidenceState(emptyEvidence(evidenceScope));
  }, [evidenceScope]);

  return { evidenceState, setEvidenceState, connectionState, setConnectionState, evidenceScopeRef };
}

export function evidenceForScope(state: EvidenceState, scope: string): Omit<EvidenceState, 'scope'> {
  if (state.scope !== scope) return evidenceProjection(emptyEvidence(scope));
  return evidenceProjection(state);
}

export function valueForScope<T>(state: ScopeState<T>, scope: string, fallback: T) {
  return state.scope === scope ? state.value : fallback;
}

export function liveLogStatus(
  connection: LiveLogConnectionStatus,
  integrity: EvidenceState['integrity'],
  paused: boolean
): LiveLogStatus {
  if (paused) return 'paused';
  if (connection === 'unavailable' || connection === 'error' || connection === 'contract') return connection;
  return integrity === 'degraded' ? 'degraded' : connection;
}

export function degradeEvidence(setEvidenceState: EvidenceSetter, scope: string, droppedCount?: number) {
  setEvidenceState(current => {
    const evidence = evidenceForScope(current, scope);
    return {
      scope,
      rows: evidence.rows,
      integrity: 'degraded',
      ...accumulateGapCount(evidence, droppedCount)
    };
  });
}

export function appendLogEvidence(setEvidenceState: EvidenceSetter, scope: string, row: LogRow) {
  setEvidenceState(current => {
    const evidence = evidenceForScope(current, scope);
    return {
      scope,
      rows: [row, ...evidence.rows].slice(0, MAXIMUM_RETAINED_LIVE_LOG_ROWS),
      integrity: evidence.integrity,
      gapDroppedCount: evidence.gapDroppedCount,
      gapCountOverflowed: evidence.gapCountOverflowed
    };
  });
}

function emptyEvidence(scope: string): EvidenceState {
  return {
    scope,
    rows: [],
    integrity: 'complete',
    gapDroppedCount: undefined,
    gapCountOverflowed: false
  };
}

function evidenceProjection(state: EvidenceState): Omit<EvidenceState, 'scope'> {
  return {
    rows: state.rows,
    integrity: state.integrity,
    gapDroppedCount: state.gapDroppedCount,
    gapCountOverflowed: state.gapCountOverflowed
  };
}

function accumulateGapCount(
  evidence: Omit<EvidenceState, 'scope'>,
  droppedCount: number | undefined
): Pick<EvidenceState, 'gapDroppedCount' | 'gapCountOverflowed'> {
  if (droppedCount === undefined || evidence.gapCountOverflowed) {
    return {
      gapDroppedCount: evidence.gapDroppedCount,
      gapCountOverflowed: evidence.gapCountOverflowed
    };
  }
  const total = (evidence.gapDroppedCount ?? 0) + droppedCount;
  return Number.isSafeInteger(total)
    ? { gapDroppedCount: total, gapCountOverflowed: false }
    : { gapDroppedCount: undefined, gapCountOverflowed: true };
}
