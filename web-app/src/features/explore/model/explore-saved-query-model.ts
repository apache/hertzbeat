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

import { z } from 'zod';

import { applicationRoutePaths } from '@/shared/navigation/app-paths';
import { normalizeSavedQueryKey } from '@/shared/navigation/signal-route-paths';

import { convertSavedQueryRoute } from './explore-saved-query-conversion';
import { parseSavedExploreQuery } from './explore-saved-query-schema';
import { normalizeExploreQuery } from './explore-url-model';
import type { ExploreQuery, ExploreSignal } from './explore-query';

export type SavedQueryRecord = {
  id?: number | undefined;
  revision?: number | null | undefined;
  creator?: string | null | undefined;
  signal: ExploreSignal;
  viewKey: string;
  label: string;
  description?: string | null | undefined;
  route: string;
  querySnapshot?: string | null | undefined;
  payload?: string | null | undefined;
  createTime?: string | null | undefined;
  updateTime?: string | null | undefined;
};
export type SavedQueryRead =
  | { kind: 'ready'; query: ExploreQuery; legacy: boolean }
  | {
      kind: 'unavailable';
      reason: 'invalidPayload' | 'unsupportedVersion' | 'invalidQuery' | 'legacyUnsupported' | 'retiredReferenceJoin';
    };

const envelope = z.object({ version: z.literal(1), query: z.unknown() }).strict();
const metadata = z.object({ createdAt: z.number().finite() }).strict();

export function isSavedQueryKey(value: unknown): value is string {
  return typeof value === 'string' && normalizeSavedQueryKey(value) !== undefined;
}

export function isSavedViewReference(search: string) {
  const params = new URLSearchParams(search);
  return (
    params.has('savedView') &&
    [undefined, 'structured-v1'].includes(params.get('searchSyntax') ?? undefined) &&
    [...params.keys()].every(key => ['signal', 'timeRange', 'savedView', 'searchSyntax'].includes(key))
  );
}

export function readSavedQuery(record: SavedQueryRecord): SavedQueryRead {
  let payload: unknown;
  if (record.payload?.trim()) {
    try {
      payload = JSON.parse(record.payload);
    } catch {
      return unavailable('invalidPayload');
    }
    if (payload && typeof payload === 'object' && 'version' in payload) return readVersioned(record, payload);
    if (!metadata.safeParse(payload).success) return unavailable('invalidPayload');
  }
  const query = convertSavedQueryRoute(record.signal, record.route);
  return query ? { kind: 'ready', query, legacy: true } : unavailable('legacyUnsupported');
}

export function buildSavedQueryPayload(
  query: ExploreQuery,
  viewKey: string,
  label: string,
  description: string
): SavedQueryRecord {
  if (!isSavedQueryKey(viewKey) || !label.trim() || label.trim().length > 255 || description.length > 512) {
    throw new Error('Invalid saved query metadata');
  }
  const persisted = savedQueryConditions(query);
  if (!parseSavedExploreQuery(persisted)) throw new Error('Invalid saved query conditions');
  const payload = JSON.stringify({ version: 1, query: persisted });
  if (new TextEncoder().encode(payload).length > 65_535) throw new Error('Saved query is too long');
  return {
    signal: query.signal,
    viewKey,
    label: label.trim(),
    description: description.trim(),
    route: `${applicationRoutePaths.explore}?signal=${query.signal}`,
    payload
  };
}

export function savedQueryConditions(query: ExploreQuery): ExploreQuery {
  const normalized = normalizeExploreQuery(query);
  const fields = { ...normalized } as ExploreQuery & { pageIndex?: number; savedView?: string };
  delete fields.returnTo;
  if (fields.signal === 'logs') delete fields.traceReturnTo;
  delete fields.servicesReturnTo;
  delete fields.dashboardReturnTo;
  delete fields.pageIndex;
  delete fields.savedView;
  if (fields.start != null && fields.end != null && !fields.timeZone) {
    fields.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return fields;
}

function readVersioned(record: SavedQueryRecord, value: object & Record<'version', unknown>): SavedQueryRead {
  if (value.version !== 1) return unavailable('unsupportedVersion');
  const parsed = envelope.safeParse(value);
  if (!parsed.success) return unavailable('invalidPayload');
  if (parsed.data.query && typeof parsed.data.query === 'object' && 'logReferenceJoin' in parsed.data.query)
    return unavailable('retiredReferenceJoin');
  const query = parseSavedExploreQuery(parsed.data.query);
  if (
    !query ||
    query.signal !== record.signal ||
    record.route !== `${applicationRoutePaths.explore}?signal=${record.signal}`
  ) {
    return unavailable('invalidQuery');
  }
  return { kind: 'ready', query, legacy: false };
}

function unavailable(reason: Extract<SavedQueryRead, { kind: 'unavailable' }>['reason']): SavedQueryRead {
  return { kind: 'unavailable', reason };
}
