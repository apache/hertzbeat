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

import { applicationRoutePaths } from './app-paths';
import {
  parseQueryContext,
  writeQueryContext,
  normalizeInvestigationTimeZone,
  type QueryContext
} from '@/shared/query-context';

export type ServicesQuery = QueryContext & {
  view?: string | undefined;
  sort?: string | undefined;
  order?: string | undefined;
  search?: string | undefined;
  environmentFilter?: string | undefined;
  operation?: string | undefined;
  errorsOnly?: boolean | undefined;
  pageIndex?: number | undefined;
  start?: number | undefined;
  end?: number | undefined;
  timeZone?: string | undefined;
};
const textFields = ['search', 'environmentFilter', 'operation', 'view', 'sort', 'order'] as const;

export const serviceSortKeys = ['errorCount', 'errorRate', 'requestCount', 'latencyP95Ms', 'name'] as const;
const directoryEnums = { view: ['performance', 'registered'], sort: serviceSortKeys, order: ['asc', 'desc'] } as const;

export function parseServicesQuery(params: URLSearchParams): ServicesQuery {
  const query: ServicesQuery = {
    ...parseQueryContext(params),
    ...Object.fromEntries(textFields.flatMap(key => (params.get(key)?.trim() ? [[key, params.get(key)!.trim()]] : []))),
    ...(params.get('errorsOnly') === 'true' ? { errorsOnly: true } : {}),
    ...Object.fromEntries(
      ['pageIndex', 'start', 'end'].flatMap(key => {
        const value = params.get(key);
        if (value == null || (key === 'pageIndex' && !/^[1-9]\d*$/u.test(value))) return [];
        return [[key, /^[1-9]\d*$/u.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : NaN]];
      })
    ),
    ...(params.has('timeZone') ? { timeZone: params.get('timeZone')! } : {})
  };
  for (const key of ['view', 'sort', 'order'] as const) {
    const value = query[key];
    if (value !== undefined && !(directoryEnums[key] as readonly string[]).includes(value)) {
      delete query[key];
      delete query.pageIndex;
    }
  }
  return query;
}

export function buildServicesPath(query: ServicesQuery = {}) {
  const params = writeQueryContext(new URLSearchParams(), query);
  textFields.forEach(key => {
    if (query[key]?.trim()) params.set(key, query[key].trim());
  });
  if (query.errorsOnly) params.set('errorsOnly', 'true');
  if (query.pageIndex) params.set('pageIndex', String(query.pageIndex));
  for (const key of ['start', 'end'] as const) if (query[key] != null) params.set(key, String(query[key]));
  if (query.timeZone) params.set('timeZone', query.timeZone);
  return `${applicationRoutePaths.services}${params.size ? `?${params}` : ''}`;
}

export function servicesExactWindow(query: ServicesQuery) {
  const { start, end } = query;
  if (query.timeZone != null && !normalizeInvestigationTimeZone(query.timeZone)) return undefined;
  return Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    start! > 0 &&
    end! > start! &&
    end! - start! <= 86_400_000
    ? { from: start!, to: end! }
    : undefined;
}

export function canonicalServicesReturnPath(value: string | null | undefined) {
  const prefix = `${applicationRoutePaths.services}?`;
  if (!value || value.length > 8192 || !value.startsWith(prefix) || /[#\\\r\n]/u.test(value)) return undefined;
  const query = parseServicesQuery(new URLSearchParams(value.slice(prefix.length)));
  if (!servicesExactWindow(query) || !normalizeInvestigationTimeZone(query.timeZone)) return undefined;
  if (query.entityId != null && !/^[1-9]\d*$/u.test(query.entityId)) return undefined;
  const canonical = buildServicesPath(query);
  return canonical === value ? canonical : undefined;
}
