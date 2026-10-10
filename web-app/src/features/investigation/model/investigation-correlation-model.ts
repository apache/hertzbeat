/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { InvestigationTimeWindow, QueryContext } from '@/shared/query-context';

import {
  createInvestigationAnchor,
  type InvestigationAnchor,
  type InvestigationCapabilityState
} from './investigation-anchor-model';
import { normalizeOpaqueId, normalizePositiveId, requireRecord } from './investigation-model-validation';

export type CorrelationReason =
  | { kind: 'exact-span'; level: 1 }
  | { kind: 'exact-trace'; level: 1 }
  | { kind: 'same-entity'; level: 2 }
  | { kind: 'bound-monitor'; level: 3 }
  | { kind: 'canonical-otel-identity'; level: 4 }
  | { kind: 'topology-related'; level: 5 }
  | { kind: 'time-proximity'; level: 6 };

type CorrelationConfidence = 'exact' | 'high' | 'medium' | 'low';
type EvidenceSummary = { state: InvestigationCapabilityState; count?: number | undefined };
type CandidateQueryMetadata = { key: string; anchor: InvestigationAnchor };
type TopologyRelation = { sourceEntityId: string; targetEntityId: string };

export type InvestigationCorrelationCandidate = {
  candidateQuery: CandidateQueryMetadata;
  summary: EvidenceSummary;
  topologyRelation?: TopologyRelation | undefined;
};

export type InvestigationEvidenceSummary = {
  summary: EvidenceSummary;
  candidateQuery: CandidateQueryMetadata;
  reason: CorrelationReason;
  confidence: CorrelationConfidence;
};

const evidenceStates: readonly InvestigationCapabilityState[] = ['available', 'empty', 'unavailable', 'unknown'];
const MAX_TIME_PROXIMITY_MS = 5 * 60_000;

const correlationRules = {
  'exact-span': { level: 1, order: 0, confidence: 'exact' },
  'exact-trace': { level: 1, order: 1, confidence: 'exact' },
  'same-entity': { level: 2, order: 2, confidence: 'high' },
  'bound-monitor': { level: 3, order: 3, confidence: 'high' },
  'canonical-otel-identity': { level: 4, order: 4, confidence: 'medium' },
  'topology-related': { level: 5, order: 5, confidence: 'medium' },
  'time-proximity': { level: 6, order: 6, confidence: 'low' }
} as const satisfies Record<
  CorrelationReason['kind'],
  { level: CorrelationReason['level']; order: number; confidence: CorrelationConfidence }
>;

export function correlateInvestigationEvidence(
  inputAnchor: InvestigationAnchor,
  inputCandidates: readonly InvestigationCorrelationCandidate[]
): InvestigationEvidenceSummary[] {
  const anchor = createInvestigationAnchor(inputAnchor);
  const ranked = inputCandidates.flatMap(input => {
    const candidate = normalizeCandidate(input);
    const reasonKind = correlationReason(anchor, candidate);
    if (!reasonKind) return [];
    const rule = correlationRules[reasonKind];
    const evidence: InvestigationEvidenceSummary = {
      summary: candidate.summary,
      candidateQuery: candidate.candidateQuery,
      reason: { kind: reasonKind, level: rule.level } as CorrelationReason,
      confidence: rule.confidence
    };
    return [{ evidence, order: rule.order, fingerprint: JSON.stringify(evidence) }];
  });

  ranked.sort(
    (left, right) =>
      left.order - right.order ||
      compareText(left.evidence.candidateQuery.key, right.evidence.candidateQuery.key) ||
      compareText(left.fingerprint, right.fingerprint)
  );
  const seen = new Set<string>();
  return ranked.flatMap(item => {
    const key = item.evidence.candidateQuery.key;
    if (seen.has(key)) return [];
    seen.add(key);
    return [item.evidence];
  });
}

function normalizeCandidate(input: InvestigationCorrelationCandidate): InvestigationCorrelationCandidate {
  requireRecord(input, ['candidateQuery', 'summary', 'topologyRelation']);
  requireRecord(input.candidateQuery, ['key', 'anchor']);
  const key = normalizeRequiredMetadata(input.candidateQuery.key);
  const topologyRelation = input.topologyRelation ? normalizeTopologyRelation(input.topologyRelation) : undefined;
  return {
    candidateQuery: { key, anchor: createInvestigationAnchor(input.candidateQuery.anchor) },
    summary: normalizeEvidenceSummary(input.summary),
    ...(topologyRelation ? { topologyRelation } : {})
  };
}

function normalizeEvidenceSummary(input: EvidenceSummary): EvidenceSummary {
  requireRecord(input, ['state', 'count']);
  if (!evidenceStates.includes(input.state)) throw new Error('Investigation evidence state is invalid');
  const count = input.count;
  if (count == null) return { state: input.state };
  const countContradictsState =
    input.state === 'unavailable' ||
    input.state === 'unknown' ||
    (input.state === 'empty' && count !== 0) ||
    (input.state === 'available' && count === 0);
  if (!Number.isSafeInteger(count) || count < 0 || countContradictsState) {
    throw new Error('Investigation evidence count is invalid');
  }
  return { state: input.state, count };
}

function normalizeTopologyRelation(input: TopologyRelation): TopologyRelation {
  requireRecord(input, ['sourceEntityId', 'targetEntityId']);
  const sourceEntityId = normalizePositiveId(input.sourceEntityId);
  const targetEntityId = normalizePositiveId(input.targetEntityId);
  if (!sourceEntityId || !targetEntityId || sourceEntityId === targetEntityId) {
    throw new Error('Investigation topology relation is invalid');
  }
  return { sourceEntityId, targetEntityId };
}

function correlationReason(
  anchor: InvestigationAnchor,
  candidate: InvestigationCorrelationCandidate
): CorrelationReason['kind'] | undefined {
  const target = candidate.candidateQuery.anchor;
  if (anchor.traceId && anchor.traceId === target.traceId) {
    if (anchor.spanId && anchor.spanId === target.spanId) return 'exact-span';
    return 'exact-trace';
  }
  if (sameContextId(anchor.context.entityId, target.context.entityId)) return 'same-entity';
  if (sameContextId(anchor.context.monitorId, target.context.monitorId)) return 'bound-monitor';
  if (sameOtelIdentity(anchor.context, target.context)) return 'canonical-otel-identity';
  if (candidate.topologyRelation && connectsEntities(anchor, target, candidate.topologyRelation)) {
    return 'topology-related';
  }
  if (windowGap(anchor.window, target.window) <= MAX_TIME_PROXIMITY_MS) return 'time-proximity';
  return undefined;
}

function sameContextId(left: string | undefined, right: string | undefined) {
  return left != null && right != null && left === right;
}

function sameOtelIdentity(left: QueryContext, right: QueryContext) {
  if (left.instance != null && left.instance === right.instance) return true;
  return (
    left.serviceName != null &&
    left.serviceName === right.serviceName &&
    left.serviceNamespace === right.serviceNamespace &&
    left.environment === right.environment
  );
}

function connectsEntities(left: InvestigationAnchor, right: InvestigationAnchor, relation: TopologyRelation) {
  const leftId = left.context.entityId;
  const rightId = right.context.entityId;
  return (
    leftId != null &&
    rightId != null &&
    ((relation.sourceEntityId === leftId && relation.targetEntityId === rightId) ||
      (relation.sourceEntityId === rightId && relation.targetEntityId === leftId))
  );
}

function windowGap(left: InvestigationTimeWindow, right: InvestigationTimeWindow) {
  if (left.to < right.from) return right.from - left.to;
  if (right.to < left.from) return left.from - right.to;
  return 0;
}

function normalizeRequiredMetadata(value: string) {
  const normalized = normalizeOpaqueId(value);
  if (!normalized) throw new Error('Investigation candidate query key is invalid');
  return normalized;
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}
