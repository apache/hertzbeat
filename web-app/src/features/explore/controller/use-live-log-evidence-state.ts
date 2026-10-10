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

import { markLogArrival } from '@/shared/log-arrival';
import isEqual from 'lodash/isEqual';
import { liveLogPayloadFingerprint } from './live-log-payload-fingerprint';

import type { LogFilterFailureReason, LogSyntaxDiagnostic } from '../model/explore-log-filter-failure';

import { useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { LIVE_LOG_RETENTION_LIMIT, type LiveLogRow } from '../model/explore-signal-contract';
import type { LiveLogStatus } from '../model/explore-signal-model';

type ScopeState<T> = {
  scope: string;
  value: T;
  invalidFilterReason?: LogFilterFailureReason | undefined;
  syntaxDiagnostic?: LogSyntaxDiagnostic | undefined;
};
type LiveLogConnectionStatus = Exclude<LiveLogStatus, 'paused' | 'degraded'>;
type EvidenceState = {
  scope: string;
  rows: LiveLogRow[];
  integrity: 'complete' | 'degraded';
  gapDroppedCount: number | undefined;
  gapCountOverflowed: boolean;
  locallyDroppedCount: number;
  pauseDisconnectGap: boolean;
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
  if (
    connection === 'unavailable' ||
    connection === 'error' ||
    connection === 'contract' ||
    connection === 'invalid_filter' ||
    connection === 'permission'
  )
    return connection;
  return integrity === 'degraded' ? 'degraded' : connection;
}

export function degradeEvidence(setEvidenceState: EvidenceSetter, scope: string, droppedCount?: number) {
  setEvidenceState(current => {
    const evidence = evidenceForScope(current, scope);
    return {
      scope,
      rows: evidence.rows,
      integrity: 'degraded',
      locallyDroppedCount: evidence.locallyDroppedCount,
      pauseDisconnectGap: evidence.pauseDisconnectGap,
      ...accumulateGapCount(evidence, droppedCount)
    };
  });
}

export function appendLogEvidence(setEvidenceState: EvidenceSetter, scope: string, rows: LiveLogRow[]) {
  if (!rows.length) return;
  const receivedAt = Date.now();
  setEvidenceState(current => {
    const evidence = evidenceForScope(current, scope);
    const replayIndex: ReplayIndex = new Map();
    for (const row of evidence.rows) replayBucket(replayIndex, row)?.rows.push(row);
    const objects = new Set(evidence.rows.filter(row => liveRecordId(row) === undefined));
    const accepted: LiveLogRow[] = [];
    for (const row of rows) {
      const bucket = replayBucket(replayIndex, row);
      const candidates = bucket ? payloadCandidates(bucket, row) : undefined;
      // IDs can collide across producers; only an identical complete payload proves replay.
      if (candidates ? candidates.some(previous => isEqual(previous, row)) : objects.has(row)) continue;
      markLogArrival(row, receivedAt);
      if (bucket) {
        bucket.rows.push(row);
        if (bucket.fingerprints) candidates!.push(row);
      } else objects.add(row);
      accepted.push(row);
    }
    const retainedRows = accepted.reverse().concat(evidence.rows).slice(0, LIVE_LOG_RETENTION_LIMIT);
    return {
      scope,
      rows: retainedRows,
      integrity: evidence.integrity,
      gapDroppedCount: evidence.gapDroppedCount,
      gapCountOverflowed: evidence.gapCountOverflowed,
      locallyDroppedCount:
        evidence.locallyDroppedCount + Math.max(0, evidence.rows.length + accepted.length - LIVE_LOG_RETENTION_LIMIT),
      pauseDisconnectGap: evidence.pauseDisconnectGap
    };
  });
}

const FINGERPRINT_BUCKET_THRESHOLD = 8;
type ReplayBucket = { rows: LiveLogRow[]; fingerprints?: Map<string, LiveLogRow[]> };
type ReplayIndex = Map<string, ReplayBucket>;

function replayBucket(index: ReplayIndex, row: LiveLogRow) {
  const id = liveRecordId(row);
  if (id === undefined) return undefined;
  let bucket = index.get(id);
  if (!bucket) {
    bucket = { rows: [] };
    index.set(id, bucket);
  }
  return bucket;
}

function payloadCandidates(bucket: ReplayBucket, row: LiveLogRow) {
  if (!bucket.fingerprints && bucket.rows.length < FINGERPRINT_BUCKET_THRESHOLD) return bucket.rows;
  if (!bucket.fingerprints) {
    bucket.fingerprints = new Map();
    for (const retained of bucket.rows) {
      const fingerprint = liveLogPayloadFingerprint(retained);
      const candidates = bucket.fingerprints.get(fingerprint) ?? [];
      candidates.push(retained);
      bucket.fingerprints.set(fingerprint, candidates);
    }
  }
  const fingerprint = liveLogPayloadFingerprint(row);
  let candidates = bucket.fingerprints.get(fingerprint);
  if (!candidates) {
    candidates = [];
    bucket.fingerprints.set(fingerprint, candidates);
  }
  return candidates;
}

function liveRecordId(row: LiveLogRow) {
  const id = row.attributes?.['log.record.uid'] ?? row.attributes?.['hertzbeat.event_id'];
  return typeof id === 'string' && id.length > 0 ? id : undefined;
}

function emptyEvidence(scope: string): EvidenceState {
  return {
    scope,
    rows: [],
    integrity: 'complete',
    gapDroppedCount: undefined,
    gapCountOverflowed: false,
    locallyDroppedCount: 0,
    pauseDisconnectGap: false
  };
}

function evidenceProjection(state: EvidenceState): Omit<EvidenceState, 'scope'> {
  return {
    rows: state.rows,
    integrity: state.integrity,
    gapDroppedCount: state.gapDroppedCount,
    gapCountOverflowed: state.gapCountOverflowed,
    locallyDroppedCount: state.locallyDroppedCount,
    pauseDisconnectGap: state.pauseDisconnectGap
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
