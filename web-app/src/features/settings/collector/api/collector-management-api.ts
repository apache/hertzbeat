/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { apiMessageDelete, apiMessageGet, apiMessagePut } from '@/core/http/api-message';

import { CollectorContractError, immutableCollectorName, type CollectorMutationAction } from '../model/collector-model';
import type { CollectorQuery } from '../model/collector-query-model';
import { parseCollectorManagementPage } from './collector-management-schema';

export { CollectorContractError } from '../model/collector-model';

export const collectorEndpoint = '/api/collector';

export async function loadCollectorManagementPage(query: CollectorQuery, signal?: AbortSignal) {
  const canonicalQuery = { ...query, name: query.name.trim() };
  const params = new URLSearchParams({
    pageIndex: String(canonicalQuery.pageIndex),
    pageSize: String(canonicalQuery.pageSize)
  });
  if (canonicalQuery.name) params.set('name', canonicalQuery.name);
  const value = await apiMessageGet(`${collectorEndpoint}?${params.toString()}`, signal ? { signal } : undefined);
  signal?.throwIfAborted();
  return parseCollectorManagementPage(value, canonicalQuery);
}

export function mutateCollectors(action: CollectorMutationAction, collectors: string[]) {
  const normalized = collectors.map(collector => collector.trim());
  if (
    normalized.length === 0 ||
    normalized.some(collector => !collector || collector === immutableCollectorName) ||
    new Set(normalized).size !== normalized.length
  ) {
    throw new CollectorContractError();
  }
  const params = new URLSearchParams();
  normalized.forEach(collector => params.append('collectors', collector));
  const path = `${collectorEndpoint}${action === 'delete' ? '' : `/${action}`}?${params.toString()}`;
  return action === 'delete' ? apiMessageDelete(path) : apiMessagePut(path, null);
}
