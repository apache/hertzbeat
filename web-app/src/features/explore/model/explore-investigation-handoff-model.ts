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

import { buildTopologyInvestigationPath } from '@/features/topology/navigation';

import type {
  InvestigationServiceIdentity,
  InvestigationTraceDetail,
  LogInvestigationSnapshot,
  TraceInvestigationSnapshot
} from './explore-investigation-contract';
import { buildExplorePath } from './explore-url-model';
import { mergeExploreQuery, signalSelectionPatch } from './explore-model';
import { exploreQueryContext, mergeExploreContextChanges } from './explore-context-model';
import type { LogExploreQuery, TraceExploreQuery } from './explore-query';

type HandoffIdentity = Pick<
  InvestigationServiceIdentity,
  'entityId' | 'serviceName' | 'serviceNamespace' | 'deploymentEnvironment'
>;

export function buildTraceInvestigationMetricsPath(query: TraceExploreQuery, snapshot: TraceInvestigationSnapshot) {
  const identity = traceIdentity(snapshot);
  return identity ? metricsPath(query, snapshot.window, identity) : undefined;
}

export function buildLogInvestigationMetricsPath(query: LogExploreQuery, snapshot: LogInvestigationSnapshot) {
  const identity = logIdentity(snapshot);
  return identity ? metricsPath(query, snapshot.window, identity) : undefined;
}

export function buildTraceInvestigationTopologyPath(snapshot: TraceInvestigationSnapshot) {
  const identity = traceIdentity(snapshot);
  const focusEntityId = safeEntityId(identity?.entityId);
  if (!identity || focusEntityId == null) return undefined;
  return buildTopologyInvestigationPath({
    entityId: focusEntityId,
    window: { from: snapshot.window.start, to: snapshot.window.end },
    ...(identity.deploymentEnvironment ? { environment: identity.deploymentEnvironment } : {})
  });
}

export function buildLogInvestigationTopologyPath(snapshot: LogInvestigationSnapshot) {
  const identity = selectedLogIdentity(snapshot);
  const focusEntityId = safeEntityId(identity?.entityId);
  if (!identity || focusEntityId == null) return undefined;
  return buildTopologyInvestigationPath({
    entityId: focusEntityId,
    window: { from: snapshot.window.start, to: snapshot.window.end },
    ...(identity.deploymentEnvironment ? { environment: identity.deploymentEnvironment } : {})
  });
}

export function traceInvestigationIdentity(snapshot: TraceInvestigationSnapshot) {
  return traceIdentity(snapshot);
}

export function logInvestigationIdentity(snapshot: LogInvestigationSnapshot) {
  return logIdentity(snapshot);
}

function metricsPath(
  source: TraceExploreQuery | LogExploreQuery,
  window: { start: number; end: number },
  identity: HandoffIdentity
) {
  return buildExplorePath(
    mergeExploreQuery(source, {
      ...signalSelectionPatch('metrics'),
      signal: 'metrics',
      start: window.start,
      end: window.end,
      ...metricsContext(source, identity)
    })
  );
}

function metricsContext(source: TraceExploreQuery | LogExploreQuery, identity: HandoffIdentity) {
  const sameIdentity = sameServiceIdentity(source, identity);
  const context = mergeExploreContextChanges(exploreQueryContext(source), {
    entityId: sameIdentity ? source.entityId : identity.entityId || undefined,
    serviceName: identity.serviceName,
    serviceNamespace: identity.serviceNamespace ?? undefined,
    environment: identity.deploymentEnvironment ?? undefined
  });
  return { ...context, entityId: identity.entityId || (sameIdentity ? source.entityId : undefined) };
}

function sameServiceIdentity(source: TraceExploreQuery | LogExploreQuery, identity: HandoffIdentity) {
  return (
    source.serviceName === identity.serviceName &&
    source.serviceNamespace === (identity.serviceNamespace ?? undefined) &&
    source.environment === (identity.deploymentEnvironment ?? undefined) &&
    (!source.entityId || !identity.entityId || source.entityId === identity.entityId)
  );
}

function traceIdentity(snapshot: TraceInvestigationSnapshot): HandoffIdentity | undefined {
  if (snapshot.red.state === 'ready' && snapshot.red.identity) return snapshot.red.identity;
  if (snapshot.gantt.state === 'ready' && snapshot.gantt.detail) {
    const selected = snapshot.gantt.detail.spans.find(span => span.spanId === snapshot.selectedSpanId);
    return selected ? detailIdentity(selected) : undefined;
  }
  return undefined;
}

function logIdentity(snapshot: LogInvestigationSnapshot): HandoffIdentity | undefined {
  const selectedIdentity = selectedLogIdentity(snapshot);
  if (selectedIdentity) return selectedIdentity;
  if (snapshot.trace.state === 'ready' && snapshot.trace.detail) return detailIdentity(snapshot.trace.detail);
  return undefined;
}

function selectedLogIdentity(snapshot: LogInvestigationSnapshot): HandoffIdentity | undefined {
  return snapshot.selectedLog.state === 'ready' && snapshot.selectedLog.log?.identity
    ? snapshot.selectedLog.log.identity
    : undefined;
}

function detailIdentity(
  detail: Pick<InvestigationTraceDetail, 'entityId' | 'serviceName' | 'serviceNamespace' | 'deploymentEnvironment'>
): HandoffIdentity | undefined {
  if (!detail.serviceName) return undefined;
  return {
    entityId: detail.entityId ?? '',
    serviceName: detail.serviceName,
    serviceNamespace: detail.serviceNamespace,
    deploymentEnvironment: detail.deploymentEnvironment
  };
}

function safeEntityId(value: string | undefined) {
  if (!value || !/^[1-9]\d*$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
