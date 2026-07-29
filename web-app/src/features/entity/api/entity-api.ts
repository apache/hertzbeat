/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError, apiMessageDelete, apiMessageGet } from '@/core/http/api-message';
import { z } from 'zod';

import { EntityContractError, type EntityMonitorQuery, type EntityQuery } from '../model/entity-contract';
import { normalizeEntityMonitorQuery } from '../model/entity-monitor-query';
import { writeEntityQuery } from '../model/entity-query';
import { parseEntityDetail, parseEntityMonitorPage, parseEntityPage } from './entity-schema';

class EntityMissingError extends Error {
  constructor() {
    super('Entity detail is missing');
    this.name = 'EntityMissingError';
  }
}

const entityMissingResponseCodes = new Set([3, 15]);
const entityMonitorQuerySchema = z
  .object({
    status: z.number().int().nonnegative().safe().optional(),
    app: z.string().trim().min(1).optional(),
    pageIndex: z.number().int().nonnegative().safe(),
    pageSize: z.literal(50)
  })
  .strict();

// HertzBeat reports domain-level missing records inside an HTTP 200 envelope.
// Code 3 is the current backend contract; code 15 keeps rolling upgrades readable.
function isEntityMissingResponse(error: ApiMessageError) {
  return (
    error.status === 404 ||
    (error.status === 200 && error.code !== undefined && entityMissingResponseCodes.has(error.code))
  );
}

export function buildEntityListPath(query: EntityQuery) {
  return `/api/entities?${writeEntityQuery(query).toString()}`;
}

export async function loadEntities(query: EntityQuery, signal?: AbortSignal) {
  const value = await apiMessageGet(buildEntityListPath(query), signal ? { signal } : undefined);
  const page = parseEntityPage(value);
  if (page.number !== query.pageIndex || page.size !== query.pageSize) {
    throw new EntityContractError('Entity page does not match its request');
  }
  return page;
}

export async function loadEntityDetail(id: number, signal?: AbortSignal) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new EntityMissingError();
  const value = await apiMessageGet(`/api/entities/${id}/detail`, signal ? { signal } : undefined);
  if (value === null || value === undefined) throw new EntityMissingError();
  const detail = parseEntityDetail(value);
  if (detail.entity.id !== id) throw new EntityContractError('Entity detail does not match its request');
  return detail;
}

export async function loadEntityMonitors(id: number, input: EntityMonitorQuery, signal?: AbortSignal) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new EntityMissingError();
  const parsed = entityMonitorQuerySchema.safeParse(normalizeEntityMonitorQuery(input));
  if (!parsed.success) throw new EntityContractError('Entity monitor query is invalid');
  const query = normalizeEntityMonitorQuery(parsed.data);
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.status !== undefined) params.set('status', String(query.status));
  if (query.app) params.set('app', query.app);
  const value = await apiMessageGet(
    `/api/entities/${id}/monitors?${params.toString()}`,
    signal ? { signal } : undefined
  );
  const page = parseEntityMonitorPage(value);
  if (!validEntityMonitorPage(page, query)) {
    throw new EntityContractError('Entity monitor page does not match its request');
  }
  return page;
}

function validEntityMonitorPage(page: Awaited<ReturnType<typeof parseEntityMonitorPage>>, query: EntityMonitorQuery) {
  const expectedRows = Math.min(page.size, Math.max(0, page.totalElements - page.number * page.size));
  const ids = new Set(page.content.map(item => item.id));
  const normalizedApp = query.app?.toLocaleLowerCase();
  return (
    page.number === query.pageIndex &&
    page.size === query.pageSize &&
    page.totalPages === Math.ceil(page.totalElements / page.size) &&
    page.content.length === expectedRows &&
    ids.size === page.content.length &&
    (query.status === undefined || page.content.every(item => item.status === query.status)) &&
    (normalizedApp === undefined || page.content.every(item => item.app.toLocaleLowerCase() === normalizedApp))
  );
}

export async function deleteEntity(id: number) {
  await apiMessageDelete(`/api/entities/${id}`);
}

export function classifyEntityReadError(error: unknown): 'permission' | 'unavailable' | 'error' {
  if (error instanceof EntityContractError) return 'error';
  if (error instanceof ApiMessageError && [401, 403].includes(error.status ?? 0)) return 'permission';
  if (
    error instanceof ApiMessageError &&
    (error.cause !== undefined || [0, 502, 503, 504].includes(error.status ?? 0))
  ) {
    return 'unavailable';
  }
  return 'error';
}

export function classifyEntityDetailError(error: unknown): 'missing' | 'unavailable' | 'error' {
  if (error instanceof EntityMissingError || (error instanceof ApiMessageError && isEntityMissingResponse(error))) {
    return 'missing';
  }
  const failure = classifyEntityReadError(error);
  return failure === 'permission' ? 'error' : failure;
}

export function classifyEntityDetailReadError(error: unknown): 'missing' | 'permission' | 'unavailable' | 'error' {
  if (error instanceof EntityMissingError || (error instanceof ApiMessageError && isEntityMissingResponse(error))) {
    return 'missing';
  }
  return classifyEntityReadError(error);
}

export function classifyEntityDeleteError(
  error: unknown
): 'missing' | 'permission' | 'validation' | 'unavailable' | 'error' {
  if (error instanceof ApiMessageError) {
    if (isEntityMissingResponse(error)) return 'missing';
    if ([401, 403].includes(error.status ?? 0)) return 'permission';
    if (error.code === 1 || [400, 409, 422].includes(error.status ?? 0)) return 'validation';
    if (error.cause !== undefined || [0, 502, 503, 504].includes(error.status ?? 0)) return 'unavailable';
  }
  return 'error';
}
