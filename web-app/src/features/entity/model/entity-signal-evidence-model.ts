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

import {
  correlateInvestigationEvidence,
  createInvestigationAnchor,
  type InvestigationAnchor,
  type SignalCapabilities
} from '@/features/investigation';

import type { EntityDetail } from './entity-contract';
import type { EntitySignalEvidence, EntitySignalPlan } from './entity-signal-view-model';

export function resolveEntitySignalEvidence(
  plan: EntitySignalPlan,
  detail: EntityDetail | undefined,
  capabilities: SignalCapabilities
): EntitySignalEvidence[] {
  const uniqueMonitor =
    detail?.monitorPreview.complete && detail.monitorPreview.total === 1 ? detail.monitorPreview.items[0] : undefined;
  const correlationAnchor = uniqueMonitor
    ? createInvestigationAnchor({
        ...plan.anchor,
        context: { ...plan.anchor.context, monitorId: String(uniqueMonitor.id) }
      })
    : plan.anchor;
  const candidates = [
    ...sameEntityCandidates(plan, capabilities),
    ...(uniqueMonitor && detail ? [boundMonitorCandidate(plan, detail, uniqueMonitor.id)] : []),
    ...(detail && capabilities.topology === 'available' && detail.relations.some(relation => relation.entityId != null)
      ? [topologyCandidate(plan.anchor, detail)]
      : [])
  ];
  const keys = new Map(candidates.map(candidate => [candidate.candidateQuery.key, candidate.key]));
  const correlationCandidates = candidates.map(candidate => ({
    candidateQuery: candidate.candidateQuery,
    summary: candidate.summary,
    ...('topologyRelation' in candidate ? { topologyRelation: candidate.topologyRelation } : {})
  }));
  return correlateInvestigationEvidence(correlationAnchor, correlationCandidates).map(item => ({
    ...item,
    key: keys.get(item.candidateQuery.key) as EntitySignalEvidence['key']
  }));
}

function boundMonitorCandidate(plan: EntitySignalPlan, detail: EntityDetail, monitorId: number) {
  return {
    key: 'collection' as const,
    candidateQuery: {
      key: 'collection',
      anchor: createInvestigationAnchor({
        source: 'monitor',
        context: { monitorId: String(monitorId) },
        window: plan.anchor.window
      })
    },
    summary: { state: 'available' as const, count: detail.monitorPreview.total }
  };
}

function sameEntityCandidates(plan: EntitySignalPlan, capabilities: SignalCapabilities) {
  return (['metrics', 'logs', 'traces'] as const).flatMap(key =>
    capabilities[key] === 'available'
      ? [
          {
            key,
            candidateQuery: { key, anchor: evidenceAnchor(plan, key) },
            summary: { state: 'available' as const }
          }
        ]
      : []
  );
}

function evidenceAnchor(plan: EntitySignalPlan, key: 'metrics' | 'logs' | 'traces') {
  const base = { context: plan.anchor.context, window: plan.anchor.window };
  if (key === 'metrics') return createInvestigationAnchor({ ...base, source: 'metric' });
  if (key === 'logs') {
    return createInvestigationAnchor({
      ...base,
      source: 'log',
      ...(plan.logsQuery.traceId ? { traceId: plan.logsQuery.traceId } : {}),
      ...(plan.logsQuery.spanId ? { spanId: plan.logsQuery.spanId } : {})
    });
  }
  return createInvestigationAnchor({
    ...base,
    source: 'trace',
    ...(plan.tracesQuery.queryKind === 'gantt' ? { traceId: plan.tracesQuery.traceId } : {}),
    ...(plan.tracesQuery.queryKind === 'gantt' && plan.tracesQuery.spanId ? { spanId: plan.tracesQuery.spanId } : {})
  });
}

function topologyCandidate(anchor: InvestigationAnchor, detail: EntityDetail) {
  const relation = detail.relations.find(item => item.entityId != null) as EntityDetail['relations'][number] & {
    entityId: number;
  };
  const relationCount = detail.opsSummary?.relationCount;
  if (relationCount == null || relationCount <= 0) throw new Error('Topology evidence requires an authoritative total');
  return {
    key: 'topology' as const,
    candidateQuery: {
      key: 'topology',
      anchor: createInvestigationAnchor({
        source: 'topology',
        context: { entityId: String(relation.entityId) },
        window: anchor.window
      })
    },
    summary: { state: 'available' as const, count: relationCount },
    topologyRelation: { sourceEntityId: String(detail.entity.id), targetEntityId: String(relation.entityId) }
  };
}
