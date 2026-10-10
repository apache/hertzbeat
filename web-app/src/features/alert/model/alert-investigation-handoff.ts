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

import { buildExplorePath } from '@/features/explore';
import { buildTopologyInvestigationPath } from '@/features/topology/navigation';

import type {
  AlertInvestigationIdentity,
  AlertInvestigationLogRecord,
  AlertInvestigationSnapshot,
  AlertInvestigationTraceSummary
} from './alert-investigation-contract';
import type { AlertInvestigationRoute } from './alert-investigation-route';

type ReadyRoute = Extract<AlertInvestigationRoute, { kind: 'ready' }>;

export function buildAlertInvestigationMetricPath(route: ReadyRoute, snapshot: AlertInvestigationSnapshot) {
  if (snapshot.metrics.state !== 'ready') return undefined;
  const context = exploreContext(snapshot.identity.identity);
  return context ? buildSignalPath(route, 'metrics', context) : undefined;
}

export function buildAlertInvestigationLogPath(
  route: ReadyRoute,
  snapshot: AlertInvestigationSnapshot,
  record: AlertInvestigationLogRecord
) {
  if (
    snapshot.logs.state !== 'ready' ||
    !snapshot.logs.records.some(item => item.logRecordUid === record.logRecordUid)
  ) {
    return undefined;
  }
  return buildSignalPath(route, 'logs', exploreContext(snapshot.identity.identity) ?? {}, {
    logRecordUid: record.logRecordUid,
    traceId: record.traceId ?? undefined,
    spanId: record.spanId ?? undefined
  });
}

export function buildAlertInvestigationTracePath(
  route: ReadyRoute,
  snapshot: AlertInvestigationSnapshot,
  trace: AlertInvestigationTraceSummary
) {
  if (snapshot.traces.state !== 'ready' || !snapshot.traces.traces.some(item => item.traceId === trace.traceId)) {
    return undefined;
  }
  return buildSignalPath(route, 'traces', exploreContext(snapshot.identity.identity) ?? {}, { traceId: trace.traceId });
}

export function buildAlertInvestigationTopologyPath(route: ReadyRoute, snapshot: AlertInvestigationSnapshot) {
  const identity = snapshot.identity.identity;
  if (
    snapshot.topology.state !== 'ready' ||
    !identity?.entityId ||
    !identity.entityType ||
    !Number.isSafeInteger(identity.entityId)
  ) {
    return undefined;
  }
  return buildTopologyInvestigationPath({
    entityId: identity.entityId,
    window: route.window,
    ...(identity.deploymentEnvironment ? { environment: identity.deploymentEnvironment } : {})
  });
}

function buildSignalPath(
  route: ReadyRoute,
  signal: 'metrics' | 'logs' | 'traces',
  context: ReturnType<typeof exploreContext> extends infer Value ? NonNullable<Value> : never,
  selection: Record<string, string | undefined> = {}
) {
  return buildExplorePath({
    signal,
    timeRange: 'last-30m',
    start: route.window.from,
    end: route.window.to,
    timeZone: route.window.timeZone,
    ...context,
    ...selection
  });
}

function exploreContext(identity: AlertInvestigationIdentity | null) {
  if (!identity) return undefined;
  const context = {
    ...(identity.entityId ? { entityId: String(identity.entityId) } : {}),
    ...(identity.monitorId ? { monitorId: String(identity.monitorId) } : {}),
    ...(identity.serviceName ? { serviceName: identity.serviceName } : {}),
    ...(identity.serviceNamespace ? { serviceNamespace: identity.serviceNamespace } : {}),
    ...(identity.deploymentEnvironment ? { environment: identity.deploymentEnvironment } : {})
  };
  return Object.keys(context).length > 0 ? context : undefined;
}
