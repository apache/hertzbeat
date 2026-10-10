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

import { logColumnSortField as logSortField } from '@/platform/perses';
export { logColumnSortField as logSortField } from '@/platform/perses';
import type { TFunction } from 'i18next';
import { logFieldSortSchema as schema, type LogFieldSort } from '@/shared/log-sort';
export type { LogFieldSort } from '@/shared/log-sort';
import type { LogColumn } from './explore-log-columns';
export function readLogSort(raw: string | undefined): LogFieldSort | undefined {
  if (raw === undefined || raw.length > 1024) return undefined;
  try {
    const value = schema.parse(JSON.parse(raw));
    // The strict descriptor has four primitive members. Inspect raw member names before accepting duplicate JSON keys.
    const keys = [...raw.matchAll(/("(?:\\.|[^"\\])*")\s*:/gu)].map(match => JSON.parse(match[1]!) as unknown);
    return keys.length === 4 && new Set(keys).size === 4 ? value : undefined;
  } catch {
    return undefined;
  }
}
export function validLogSort(raw: string | undefined, sort?: string) {
  return raw === undefined || ((sort === undefined || sort === 'newest') && readLogSort(raw) !== undefined);
}
export function logOrderLabel(logSort: string | undefined, sort: string | undefined, t: TFunction) {
  const value = readLogSort(logSort);
  if (logSort !== undefined && !value) return t('explore.logSort.invalid');
  if (!value) return t(`explore.logColumns.${sort === 'oldest' ? 'oldest' : 'newest'}`);
  return `${value.field} · ${t(`explore.logSort.${value.type}${value.direction === 'asc' ? 'Asc' : 'Desc'}`)}`;
}
export type LogSortControls = {
  draft: { logSort?: string | undefined; sort?: string | undefined };
  change: (logSort: string | undefined, sort: 'newest' | 'oldest') => void;
};

export function appliedLogColumnSort(
  column: LogColumn,
  query: LogSortControls['draft'] & { live?: boolean | undefined }
) {
  if (query.live) return undefined;
  const descriptor = readLogSort(query.logSort);
  if (descriptor && descriptor.field === logSortField(column))
    return descriptor.direction === 'asc' ? ('ascending' as const) : ('descending' as const);
  if (!descriptor && column.kind === 'time') return query.sort === 'oldest' ? 'ascending' : 'descending';
  return undefined;
}

export function isLogSortPending(
  draft: LogSortControls['draft'],
  query: LogSortControls['draft'] & { live?: boolean | undefined }
) {
  return draft.logSort !== query.logSort || (draft.sort ?? 'newest') !== (query.sort ?? 'newest');
}
export function logRowOrder(query: LogSortControls['draft'] & { live?: boolean | undefined }) {
  if (!query.live && query.logSort) return 'preserve';
  return query.sort === 'oldest' ? 'oldest' : 'newest';
}
