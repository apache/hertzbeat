/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError, apiMessageGet } from '@/core/http/api-message';
import { EntityContractError, type EntityQuery } from '../model/entity-contract';
import { writeEntityQuery } from '../model/entity-query';
import { parseEntityDetail, parseEntityPage } from './entity-schema';

class EntityMissingError extends Error {
  constructor() {
    super('Entity detail is missing');
    this.name = 'EntityMissingError';
  }
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

export function classifyEntityReadError(error: unknown): 'unavailable' | 'error' {
  if (error instanceof EntityContractError) return 'error';
  if (
    error instanceof ApiMessageError &&
    (error.cause !== undefined || [0, 502, 503, 504].includes(error.status ?? 0))
  ) {
    return 'unavailable';
  }
  return 'error';
}

export function classifyEntityDetailError(error: unknown): 'missing' | 'unavailable' | 'error' {
  if (
    error instanceof EntityMissingError ||
    (error instanceof ApiMessageError && (error.status === 404 || (error.status === 200 && error.code === 15)))
  ) {
    return 'missing';
  }
  return classifyEntityReadError(error);
}
