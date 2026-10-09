/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import { apiMessageGet } from '@/core/http/api-message';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogExploreQuery } from '../model/explore-model';
import { LOG_SCOPE_DIMENSIONS, type LogScopeDimension } from '../model/explore-log-scope-suggestions';
import { buildSignalApiPath } from './explore-api';

const groupSchema = z.object({
  groupBy: z.string(),
  groups: z.array(z.object({ value: z.string(), count: z.number().int().nonnegative().safe() })).max(20)
});
export function buildLogScopeSuggestionPath(
  query: LogExploreQuery,
  window: ExactTimeWindow,
  dimension: LogScopeDimension
) {
  const params = new URLSearchParams(
    buildSignalApiPath({ ...query, start: window.from, end: window.to, windowMode: undefined }).split('?')[1]
  );
  params.delete('pageIndex');
  params.delete('pageSize');
  params.set('groupBy', LOG_SCOPE_DIMENSIONS[dimension]);
  params.set('limit', '20');
  params.set('orderBy', 'count-desc');
  return `/api/logs/stats/group-by?${params}`;
}
export async function loadLogScopeSuggestions(path: string, dimension: LogScopeDimension, signal?: AbortSignal) {
  const response = groupSchema.parse(await apiMessageGet(path, signal ? { signal } : undefined));
  if (response.groupBy !== LOG_SCOPE_DIMENSIONS[dimension]) throw new Error('Log suggestion dimension mismatch');
  return [
    ...new Set(
      response.groups.map(group => group.value).filter(value => value.trim() && value.toLowerCase() !== 'unknown')
    )
  ];
}
