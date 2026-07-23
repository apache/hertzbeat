/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError, apiMessageGet } from '@/core/http/api-message';
import {
  EntityDiscoveryContractError,
  normalizeEntityDiscoveryQuery,
  type EntityDiscoveryQuery
} from '../model/entity-discovery-model';
import { parseEntityDiscoveryPage } from './entity-discovery-schema';

export function buildEntityDiscoveryApiPath(query: EntityDiscoveryQuery) {
  const normalized = normalizeEntityDiscoveryQuery(query);
  const params = new URLSearchParams({
    search: normalized.search,
    pageIndex: String(normalized.pageIndex),
    pageSize: String(normalized.pageSize)
  });
  return `/api/entities/discovery?${params.toString()}`;
}

export async function loadEntityDiscovery(query: EntityDiscoveryQuery, signal?: AbortSignal) {
  const normalized = normalizeEntityDiscoveryQuery(query);
  const value = await apiMessageGet(buildEntityDiscoveryApiPath(normalized), signal ? { signal } : undefined);
  return parseEntityDiscoveryPage(value, normalized);
}

export function classifyEntityDiscoveryError(error: unknown): 'unavailable' | 'error' {
  if (error instanceof EntityDiscoveryContractError) return 'error';
  if (
    error instanceof ApiMessageError &&
    (error.message === 'entity_discovery_unavailable' ||
      error.cause !== undefined ||
      [0, 502, 503, 504].includes(error.status ?? 0))
  ) {
    return 'unavailable';
  }
  return 'error';
}
