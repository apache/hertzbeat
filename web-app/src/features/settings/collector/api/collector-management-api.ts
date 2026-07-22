/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { apiMessageDelete, apiMessageGet, apiMessagePut } from '@/core/http/api-message';
import { parseCollectorIntakeAdvertisementRequest, parseExactCollectorInstrumentationIntake } from '@/shared/collector';

import { CollectorContractError, immutableCollectorName, type CollectorMutationAction } from '../model/collector-model';
import type { CollectorQuery } from '../model/collector-query-model';
import { parseCollectorManagementPage, parseCollectorMutationProofPage } from './collector-management-schema';

export { CollectorContractError } from '../model/collector-model';

export const collectorEndpoint = '/api/collector';

export async function loadCollectorManagementPage(query: CollectorQuery, signal?: AbortSignal) {
  return loadCollectorPage(query, signal, parseCollectorManagementPage);
}

export async function loadCollectorMutationProofPage(query: CollectorQuery, signal?: AbortSignal) {
  return loadCollectorPage(query, signal, parseCollectorMutationProofPage);
}

async function loadCollectorPage(
  query: CollectorQuery,
  signal: AbortSignal | undefined,
  parse: typeof parseCollectorManagementPage
) {
  const canonicalQuery = { ...query, name: query.name.trim() };
  const params = new URLSearchParams({
    pageIndex: String(canonicalQuery.pageIndex),
    pageSize: String(canonicalQuery.pageSize)
  });
  if (canonicalQuery.name) params.set('name', canonicalQuery.name);
  const value = await apiMessageGet(`${collectorEndpoint}?${params.toString()}`, signal ? { signal } : undefined);
  signal?.throwIfAborted();
  return parse(value, canonicalQuery);
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

export async function saveCollectorInstrumentationIntake(collector: string, value: unknown) {
  const collectorId = normalizeCollectorId(collector);
  const request = parseCollectorIntakeAdvertisementRequest(value);
  if (!request) throw new CollectorContractError();
  const response = await apiMessagePut(collectorIntakePath(collectorId), request);
  return requireExactIntakeResponse(response, collectorId);
}

export async function clearCollectorInstrumentationIntake(collector: string) {
  const collectorId = normalizeCollectorId(collector);
  const response = await apiMessageDelete(collectorIntakePath(collectorId));
  return requireExactIntakeResponse(response, collectorId);
}

function normalizeCollectorId(value: string) {
  const collectorId = value.trim();
  if (
    !collectorId ||
    collectorId.length > 128 ||
    Array.from(collectorId).some(character => /\p{Cc}/u.test(character))
  ) {
    throw new CollectorContractError();
  }
  return collectorId;
}

function collectorIntakePath(collectorId: string) {
  return `${collectorEndpoint}/${encodeURIComponent(collectorId)}/instrumentation-intake`;
}

function requireExactIntakeResponse(value: unknown, collectorId: string) {
  const intake = parseExactCollectorInstrumentationIntake(value, collectorId);
  if (!intake) throw new CollectorContractError();
  return intake;
}
