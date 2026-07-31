/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { Monitor } from '@/features/monitor';
import { entityRoutePaths } from '@/shared/navigation/app-paths';
import { safeEntityListPath } from './entity-query';

export const defaultEntityDiscoveryQuery: EntityDiscoveryQuery = { search: '', pageIndex: 0, pageSize: 8 };

export class EntityDiscoveryContractError extends Error {
  constructor() {
    super('Resource discovery response is invalid');
    this.name = 'EntityDiscoveryContractError';
  }
}

export type EntityDiscoveryQuery = { search: string; pageIndex: number; pageSize: number };
type EntityDiscoveryMonitor = Pick<Monitor, 'id' | 'name' | 'app' | 'instance' | 'status'>;
type EntityDiscoveryMatch = 'already_bound' | 'direct' | 'suggested';
export type EntityDiscoveryCandidate = {
  resourceId: number;
  resourceName: string;
  resourceType: string;
  match: EntityDiscoveryMatch;
  matchedKeys: string[];
};
export type EntityDiscoveryRow = { monitor: EntityDiscoveryMonitor; candidates: EntityDiscoveryCandidate[] };
export type EntityDiscoveryPage = {
  schemaVersion: 1;
  pageIndex: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  content: EntityDiscoveryRow[];
};
export type EntityDiscoveryFailure = 'not-found' | 'unsupported' | 'unavailable' | 'error';
export type EntityDiscoveryEvidence =
  | EntityDiscoveryState<'loading' | 'empty' | EntityDiscoveryFailure>
  | { kind: 'ready'; records: EntityDiscoveryRow[]; total: number };
type EntityDiscoveryState<Kind extends string> = Kind extends string ? { kind: Kind } : never;
export type EntityDiscoveryViewModel = {
  state: {
    query: EntityDiscoveryQuery;
    draft: string;
    evidence: EntityDiscoveryEvidence;
    refreshing: boolean;
    canWrite: boolean;
  };
  actions: {
    updateDraft: (value: string) => void;
    submit: () => void;
    changePage: (page: number, pageSize: number) => void;
    refresh: () => void;
    back: () => void;
    create: () => void;
    openCandidate: (resourceId: number) => void;
  };
};

export function readEntityDiscoveryQuery(params: URLSearchParams): EntityDiscoveryQuery {
  return {
    search: normalizeDiscoverySearch(params.get('search')),
    pageIndex: validPageIndex(params.get('pageIndex')),
    pageSize: validPageSize(params.get('pageSize'))
  };
}

export function writeEntityDiscoveryQuery(query: EntityDiscoveryQuery) {
  const normalized = normalizeEntityDiscoveryQuery(query);
  const params = new URLSearchParams({
    pageIndex: String(normalized.pageIndex),
    pageSize: String(normalized.pageSize)
  });
  if (normalized.search) params.set('search', normalized.search);
  return params;
}

export function normalizeEntityDiscoveryQuery(query: EntityDiscoveryQuery): EntityDiscoveryQuery {
  return {
    search: normalizeDiscoverySearch(query.search),
    pageIndex: Number.isSafeInteger(query.pageIndex) && query.pageIndex >= 0 ? query.pageIndex : 0,
    pageSize: Number.isSafeInteger(query.pageSize) && query.pageSize >= 1 && query.pageSize <= 50 ? query.pageSize : 8
  };
}

export function safeEntityDiscoveryPath(value?: string | null) {
  if (!value?.startsWith('/')) return entityRoutePaths.discovery;
  const url = new URL(value, 'https://hertzbeat.local');
  if (url.pathname !== entityRoutePaths.discovery) return entityRoutePaths.discovery;
  const query = writeEntityDiscoveryQuery(readEntityDiscoveryQuery(url.searchParams));
  const returnTo = url.searchParams.get('returnTo');
  if (returnTo !== null) query.set('returnTo', safeEntityListPath(returnTo));
  return `${entityRoutePaths.discovery}?${query.toString()}`;
}

export function buildEntityDiscoveryPath(query: EntityDiscoveryQuery, returnTo?: string | null) {
  const params = writeEntityDiscoveryQuery(query);
  if (returnTo) params.set('returnTo', safeEntityListPath(returnTo));
  return `${entityRoutePaths.discovery}?${params.toString()}`;
}

export function buildEntityDiscoveryDetailPath(
  resourceId: number,
  query: EntityDiscoveryQuery,
  catalogReturnTo?: string | null
) {
  return withReturnTo(
    entityRoutePaths.detail.replace(':entityId', String(resourceId)),
    buildEntityDiscoveryPath(query, catalogReturnTo)
  );
}

export function buildEntityDiscoveryCreatePath(query: EntityDiscoveryQuery, catalogReturnTo?: string | null) {
  return withReturnTo(entityRoutePaths.create, buildEntityDiscoveryPath(query, catalogReturnTo));
}

function normalizeDiscoverySearch(value?: string | null) {
  return value?.trim().slice(0, 200) ?? '';
}

function validPageIndex(value: string | null) {
  if (!value || !/^(?:0|[1-9]\d*)$/.test(value)) return 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : 0;
}

function validPageSize(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return 8;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 50 ? parsed : 8;
}

function withReturnTo(path: string, returnTo: string) {
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}
