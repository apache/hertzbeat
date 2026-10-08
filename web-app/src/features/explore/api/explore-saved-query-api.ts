/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';

import { apiMessageDelete, apiMessageGet, apiMessagePut } from '@/core/http/api-message';

import { isSavedQueryKey, type SavedQueryRecord } from '../model/explore-saved-query-model';
import type { ExploreSignal } from '../model/explore-query';
import { ExploreSignalContractError } from '../model/explore-signal-contract';

const recordSchema = z
  .object({
    id: z.number().int().positive().safe().optional(),
    revision: z.number().int().nonnegative().safe().nullable().optional(),
    creator: z.string().nullable().optional(),
    signal: z.enum(['metrics', 'logs', 'traces']),
    viewKey: z.string().refine(isSavedQueryKey),
    label: z.string(),
    description: z.string().nullable().optional(),
    route: z.string(),
    payload: z.string().nullable().optional(),
    querySnapshot: z.string().nullable().optional(),
    createTime: z.string().nullable().optional(),
    updateTime: z.string().nullable().optional()
  })
  .passthrough();
const basePath = '/api/signal/saved-view';

export async function loadSavedQueries(signal: ExploreSignal, abortSignal?: AbortSignal): Promise<SavedQueryRecord[]> {
  const raw = await apiMessageGet(`${basePath}/${signal}`, abortSignal ? { signal: abortSignal } : undefined);
  const parsed = z.array(recordSchema).safeParse(raw);
  if (
    !parsed.success ||
    parsed.data.some(record => record.signal !== signal) ||
    new Set(parsed.data.map(record => record.viewKey)).size !== parsed.data.length
  ) {
    throw new ExploreSignalContractError('Invalid saved query list');
  }
  return parsed.data;
}

export async function saveQueryRecord(request: SavedQueryRecord): Promise<SavedQueryRecord> {
  const response = recordSchema.safeParse(await apiMessagePut(basePath, request));
  if (
    !response.success ||
    response.data.revision == null ||
    (request.revision != null && response.data.revision !== request.revision + 1) ||
    (request.revision == null && response.data.revision !== 0) ||
    !sameSavedContent(request, response.data)
  ) {
    throw new ExploreSignalContractError('Saved query response does not match submitted content');
  }
  return response.data;
}

export async function deleteQueryRecord(signal: ExploreSignal, key: string, revision: number | null | undefined) {
  if (!Number.isSafeInteger(revision) || revision == null || revision < 0)
    throw new Error('Missing saved query revision');
  if (!isSavedQueryKey(key)) throw new Error('Invalid saved query key');
  await apiMessageDelete(`${basePath}/${signal}/${encodeURIComponent(key)}?revision=${revision}`);
}

function sameSavedContent(request: SavedQueryRecord, response: SavedQueryRecord) {
  return (
    (['signal', 'viewKey', 'label', 'route', 'payload'] as const).every(key => request[key] === response[key]) &&
    (request.description ?? '') === (response.description ?? '') &&
    (request.querySnapshot ?? '') === (response.querySnapshot ?? '')
  );
}
