/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { RemotePageState, RemotePayloadState } from '@/shared/remote-state';
import {
  alertRoutePaths,
  applicationRoutePaths,
  buildEntityEditPath,
  entityRoutePaths
} from '@/shared/navigation/app-paths';
import { compactTablePageSizes } from '@/shared/pagination';
import type { EntityDetail, EntityQuery, EntitySummary } from './entity-contract';
import {
  buildEntityDiscoveryPath,
  defaultEntityDiscoveryQuery,
  safeEntityDiscoveryPath
} from './entity-discovery-model';
import { safeEntityListPath, writeEntityQuery } from './entity-query';
import { buildEntityImportPath } from './entity-import-model';
import { buildEntityDefinitionRoute } from './entity-definition-model';

export const defaultEntityQuery: EntityQuery = {
  search: '',
  type: '',
  status: '',
  owner: '',
  source: '',
  environment: '',
  lifecycle: '',
  tier: '',
  system: '',
  sort: 'gmtUpdate',
  order: 'desc',
  pageIndex: 0,
  pageSize: 10
};

export type EntityListEvidence = RemotePageState<EntitySummary, 'unavailable' | 'error'>;
export type EntityDetailEvidence = RemotePayloadState<{ detail: EntityDetail }, 'missing' | 'unavailable' | 'error'>;
export type EntityExploreSignal = 'metrics' | 'logs';
export type EntityNoiseControlType = 'silence' | 'inhibit';

export type EntityListViewState = {
  query: EntityQuery;
  draft: string;
  evidence: EntityListEvidence;
  refreshing: boolean;
};
export type EntityListViewActions = {
  updateDraft: (value: string) => void;
  submit: () => void;
  changeFilter: (key: EntityFilterKey, value: string) => void;
  changeSort: (sort: EntityQuery['sort'], order: EntityQuery['order']) => void;
  changePage: (page: number, pageSize: number) => void;
  refresh: () => void;
  discover: () => void;
  importDefinitions: () => void;
  create: () => void;
  open: (id: number) => void;
};
export type EntityFilterKey = Exclude<keyof EntityQuery, 'search' | 'sort' | 'order' | 'pageIndex' | 'pageSize'>;

export function buildEntityDetailPath(id: number, query: EntityQuery) {
  const returnTo = `${entityRoutePaths.list}?${writeEntityQuery(query).toString()}`;
  const detail = entityRoutePaths.detail.replace(':entityId', String(id));
  return `${detail}?returnTo=${encodeURIComponent(returnTo)}`;
}

export function safeEntityReturnTo(value: string | null) {
  if (value?.startsWith(entityRoutePaths.discovery)) return safeEntityDiscoveryPath(value);
  return safeEntityListPath(value);
}

export function buildEntityDiscoveryRoute(query: EntityQuery) {
  return buildEntityDiscoveryPath(defaultEntityDiscoveryQuery, entityListPath(query));
}

export function buildEntityImportRoute(query: EntityQuery) {
  return buildEntityImportPath(entityListPath(query));
}

export function buildEntityCreatePath(query: EntityQuery) {
  return withReturnTo(entityRoutePaths.create, entityListPath(query));
}

export function buildEntityEditRoute(id: number, listReturnTo: string | null) {
  const detailReturnTo = withReturnTo(
    entityRoutePaths.detail.replace(':entityId', String(id)),
    safeEntityReturnTo(listReturnTo)
  );
  return withReturnTo(buildEntityEditPath(id), detailReturnTo);
}

export { buildEntityDefinitionRoute };

export function safeEntityEditorReturnTo(value: string | null, id?: number) {
  if (value?.startsWith(`${entityRoutePaths.list}?`)) return safeEntityReturnTo(value);
  if (value?.startsWith(entityRoutePaths.discovery)) return safeEntityDiscoveryPath(value);
  if (!value?.startsWith('/') || id === undefined) return entityRoutePaths.list;
  const url = new URL(value, 'https://hertzbeat.local');
  const detail = entityRoutePaths.detail.replace(':entityId', String(id));
  if (url.pathname !== detail) return entityRoutePaths.list;
  return withReturnTo(detail, safeEntityReturnTo(url.searchParams.get('returnTo')));
}

export function entityEditorListReturnTo(value: string) {
  if (value.startsWith(`${entityRoutePaths.list}?`)) return safeEntityReturnTo(value);
  if (value.startsWith(entityRoutePaths.discovery)) return safeEntityDiscoveryPath(value);
  const url = new URL(value, 'https://hertzbeat.local');
  return safeEntityReturnTo(url.searchParams.get('returnTo'));
}

export function buildEntitySavedDetailPath(id: number, listReturnTo: string) {
  return withReturnTo(entityRoutePaths.detail.replace(':entityId', String(id)), safeEntityReturnTo(listReturnTo));
}

export function entityExploreSignals(detail: EntityDetail): EntityExploreSignal[] {
  const hasContext = detail.entity.type === 'service' || uniqueMonitorInstance(detail) !== undefined;
  return [
    ...(hasContext && detail.boundMonitors.length > 0 ? (['metrics'] as const) : []),
    ...(hasContext && (detail.evidence?.logHintCount ?? 0) > 0 ? (['logs'] as const) : [])
  ];
}

export function buildEntityExplorePath(detail: EntityDetail, signal: EntityExploreSignal) {
  const params = new URLSearchParams({ signal, timeRange: 'last-30m' });
  if (detail.entity.type === 'service') params.set('serviceName', detail.entity.name);
  else {
    const instance = uniqueMonitorInstance(detail);
    if (instance) params.set('instance', instance);
  }
  if (detail.entity.environment) params.set('environment', detail.entity.environment);
  return `${applicationRoutePaths.explore}?${params.toString()}`;
}

export function buildEntityNoiseControlPath(detail: EntityDetail, ruleType: EntityNoiseControlType) {
  const params = new URLSearchParams({
    pageIndex: '0',
    pageSize: String(compactTablePageSizes[0]),
    entityId: String(detail.entity.id),
    entityName: detail.entity.displayName || detail.entity.name,
    returnTo: entityRoutePaths.detail.replace(':entityId', String(detail.entity.id)),
    matchMode: 'entity-noise-controls',
    matchingRuleType: ruleType
  });
  const rules = ruleType === 'silence' ? detail.noiseControls?.activeSilences : detail.noiseControls?.matchingInhibits;
  // Summary counts can exceed these bounded backend previews. Carry only the
  // exact rule identities returned as evidence; never synthesize the remainder.
  const ids = rules?.map(rule => rule.id) ?? [];
  if (ids.length > 0) params.set('matchingRuleIds', ids.join(','));
  const path = ruleType === 'silence' ? alertRoutePaths.silences : alertRoutePaths.inhibits;
  return `${path}?${params.toString()}`;
}

function uniqueMonitorInstance(detail: EntityDetail) {
  const instances = [
    ...new Set(detail.boundMonitors.map(monitor => monitor.instance).filter((value): value is string => Boolean(value)))
  ];
  return instances.length === 1 ? instances[0] : undefined;
}

function entityListPath(query: EntityQuery) {
  return `${entityRoutePaths.list}?${writeEntityQuery(query).toString()}`;
}

function withReturnTo(path: string, returnTo: string) {
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}
