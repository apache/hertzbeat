/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ExactTimeWindow } from '@/shared/query-context';
import type { ExploreQuery } from './explore-query';
import { parseSavedExploreQuery } from './explore-saved-query-schema';
import { buildExplorePath } from './explore-url-model';

/** Share applied query/view intent, never drafts or another user's navigation chain. */
export function buildExploreSharePath(
  query: ExploreQuery,
  mode: 'exact' | 'relative',
  window: ExactTimeWindow | undefined,
  timeZone: string
): string | undefined {
  if (!canShareMode(query, mode, window)) return undefined;
  const shared = { ...query };
  delete shared.returnTo;
  delete shared.dashboardReturnTo;
  delete shared.servicesReturnTo;
  delete shared.savedView;
  if (shared.signal !== 'metrics') delete shared.pageIndex;
  delete shared.autoRefreshMs;
  delete shared.windowMode;
  if (shared.signal === 'logs') delete shared.traceReturnTo;
  shared.start = mode === 'exact' ? window?.from : undefined;
  shared.end = mode === 'exact' ? window?.to : undefined;
  shared.timeZone = mode === 'exact' ? timeZone : undefined;
  const validated = parseSavedExploreQuery(shared);
  return validated ? buildExplorePath(validated) : undefined;
}

function canShareMode(query: ExploreQuery, mode: 'exact' | 'relative', window: ExactTimeWindow | undefined) {
  if (mode === 'exact') return Boolean(window) && !(query.signal === 'logs' && query.live);
  if (query.signal === 'traces') return !query.traceId;
  return query.signal !== 'logs' || !query.logRecordUid;
}
