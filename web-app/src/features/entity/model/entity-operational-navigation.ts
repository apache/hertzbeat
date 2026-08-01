/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { buildExplorePath } from '@/features/explore';
import { alertRoutePaths, applicationRoutePaths, monitorRoutePaths } from '@/shared/navigation/app-paths';
import type { EntityDetail, EntityNextActionType, EntityResponseHandoff } from './entity-contract';
import { buildEntityDiscoveryPath, defaultEntityDiscoveryQuery } from './entity-discovery-model';
import { buildEntityEditRoute, safeEntityReturnTo } from './entity-view-model';

const exactHandoffTimeRange = 'last-30m';
const alertHandoffPageSize = '8';
const monitorHandoffPageSize = '10';
const alertHandoffStatuses = new Set(['firing', 'acknowledged', 'resolved']);
const alertHandoffSeverities = new Set(['info', 'warning', 'critical', 'emergency']);
const monitorHandoffStatuses = new Set(['0', '1', '2']);

export type EntityExploreSignal = 'metrics' | 'logs' | 'traces';

export function entityNextActionRequiresWrite(actionType: EntityNextActionType) {
  return (
    actionType === 'complete_owner' ||
    actionType === 'complete_runbook' ||
    actionType === 'bind_monitor' ||
    actionType === 'review_relations'
  );
}

export function entityExploreSignals(detail: EntityDetail): EntityExploreSignal[] {
  const hasContext = detail.entity.type === 'service' || uniqueMonitorInstance(detail) !== undefined;
  return [
    ...(hasContext && detail.monitorPreview.items.length > 0 ? (['metrics'] as const) : []),
    ...(hasContext && (detail.evidence?.logHintCount ?? 0) > 0 ? (['logs'] as const) : []),
    ...(hasTraceHandoff(detail.responseHandoffs?.traces) ? (['traces'] as const) : [])
  ];
}

export function buildEntityExplorePath(detail: EntityDetail, signal: EntityExploreSignal) {
  if (signal === 'logs') {
    const path = buildLogHandoffPath(detail.responseHandoffs?.logs);
    if (path) return path;
  }
  if (signal === 'traces') {
    const path = buildTraceHandoffPath(detail.responseHandoffs?.traces);
    if (path) return path;
  }
  const params = new URLSearchParams({ signal, timeRange: exactHandoffTimeRange });
  if (detail.entity.type === 'service') params.set('serviceName', detail.entity.name);
  else {
    const instance = uniqueMonitorInstance(detail);
    if (instance) params.set('instance', instance);
  }
  if (detail.entity.environment) params.set('environment', detail.entity.environment);
  return `${applicationRoutePaths.explore}?${params.toString()}`;
}

/**
 * Converts a backend recommendation into one known application route. Handoff
 * values are query context only; neither server text nor a server URL controls navigation.
 */
export function buildEntityNextActionPath(
  detail: EntityDetail,
  actionType: string,
  listReturnTo: string | null = null
) {
  if (actionType === 'review_alerts') return buildAlertHandoffPath(detail.responseHandoffs?.alerts);
  if (actionType === 'inspect_logs') return buildLogHandoffPath(detail.responseHandoffs?.logs);
  if (actionType === 'open_discovery') return buildDiscoveryHandoffPath(detail, listReturnTo);
  if (actionType === 'bind_monitor') {
    return detail.monitorPreview.total > 0
      ? buildMonitorHandoffPath(detail.responseHandoffs?.monitors)
      : buildDiscoveryHandoffPath(detail, listReturnTo);
  }
  if (isEditorAction(actionType)) return buildEditorHandoffPath(detail, actionType, listReturnTo);
  return undefined;
}

function buildAlertHandoffPath(handoff?: EntityResponseHandoff) {
  const params = new URLSearchParams({ pageIndex: '0', pageSize: alertHandoffPageSize });
  setText(params, 'search', handoff?.search);
  if (handoff?.status && alertHandoffStatuses.has(handoff.status)) params.set('status', handoff.status);
  if (handoff?.severity && alertHandoffSeverities.has(handoff.severity)) params.set('severity', handoff.severity);
  setText(params, 'serviceName', handoff?.serviceName);
  setText(params, 'serviceNamespace', handoff?.serviceNamespace);
  setText(params, 'environment', handoff?.environment);
  return `${alertRoutePaths.center}?${params.toString()}`;
}

function buildLogHandoffPath(handoff?: EntityResponseHandoff) {
  if (!handoff) return undefined;
  return buildExplorePath({
    signal: 'logs',
    timeRange: exactHandoffTimeRange,
    traceId: handoff.traceId,
    spanId: handoff.spanId,
    serviceName: handoff.serviceName,
    serviceNamespace: handoff.serviceNamespace,
    environment: handoff.environment,
    severityText: handoff.severityText,
    query: handoff.search,
    start: validHandoffWindow(handoff) ? handoff.start : undefined,
    end: validHandoffWindow(handoff) ? handoff.end : undefined
  });
}

function buildTraceHandoffPath(handoff?: EntityResponseHandoff) {
  if (!handoff) return undefined;
  return buildExplorePath({
    signal: 'traces',
    timeRange: exactHandoffTimeRange,
    traceId: handoff.traceId,
    spanId: handoff.spanId,
    serviceName: handoff.serviceName,
    serviceNamespace: handoff.serviceNamespace,
    environment: handoff.environment,
    // The backend uses the latest trace ID as its fallback search token. Do not
    // also submit that value as an operation-name filter or the exact trace is excluded.
    query: handoff.search === handoff.traceId ? undefined : handoff.search,
    start: validHandoffWindow(handoff) ? handoff.start : undefined,
    end: validHandoffWindow(handoff) ? handoff.end : undefined
  });
}

function buildMonitorHandoffPath(handoff?: EntityResponseHandoff) {
  const params = new URLSearchParams({ pageIndex: '0', pageSize: monitorHandoffPageSize });
  setText(params, 'search', handoff?.content);
  setText(params, 'app', handoff?.app);
  if (handoff?.status && monitorHandoffStatuses.has(handoff.status)) params.set('status', handoff.status);
  return `${monitorRoutePaths.list}?${params.toString()}`;
}

function buildDiscoveryHandoffPath(detail: EntityDetail, listReturnTo: string | null) {
  const handoff = detail.responseHandoffs?.discovery;
  return buildEntityDiscoveryPath(
    { ...defaultEntityDiscoveryQuery, search: handoff?.query ?? detail.entity.name },
    safeEntityReturnTo(listReturnTo)
  );
}

function buildEditorHandoffPath(detail: EntityDetail, actionType: EntityNextActionType, listReturnTo: string | null) {
  const path = buildEntityEditRoute(detail.entity.id, listReturnTo);
  // One response handoff describes the backend's highest-priority editor gap.
  // Each visible recommendation still owns its destination, so a relation action
  // must not inherit an unrelated ownership focus from that shared handoff.
  const focus = actionType === 'review_relations' ? 'relations' : 'ownership';
  const url = new URL(path, 'https://hertzbeat.local');
  url.searchParams.set('focus', focus);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function isEditorAction(value: string): value is EntityNextActionType {
  return value === 'complete_owner' || value === 'complete_runbook' || value === 'review_relations';
}

function validHandoffWindow(handoff: EntityResponseHandoff) {
  return handoff.start !== undefined && handoff.end !== undefined && handoff.start > 0 && handoff.start < handoff.end;
}

function hasTraceHandoff(handoff?: EntityResponseHandoff) {
  return Boolean(handoff && (handoff.traceId || handoff.serviceName));
}

function setText(params: URLSearchParams, key: string, value?: string) {
  if (value) params.set(key, value);
}

function uniqueMonitorInstance(detail: EntityDetail) {
  if (!detail.monitorPreview.complete) return undefined;
  const instances = [
    ...new Set(
      detail.monitorPreview.items.map(monitor => monitor.instance).filter((value): value is string => Boolean(value))
    )
  ];
  return instances.length === 1 ? instances[0] : undefined;
}
