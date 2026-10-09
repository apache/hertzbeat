/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogRow } from '../model/explore-signal-contract';
import type { LogExploreQuery } from '../model/explore-query';
import { buildTraceInvestigationPath } from '../model/explore-investigation-model';
export function traceAction(
  row: LogRow,
  query: LogExploreQuery,
  window: ExactTimeWindow,
  openPath: (path: string) => void
) {
  if (!row.traceId || traceIdProblem(row.traceId)) return undefined;
  const selected = { traceId: row.traceId, selectedSpanId: row.spanId, startTime: null, durationNanos: null };
  return () =>
    openPath(buildTraceInvestigationPath(query, selected, window, Intl.DateTimeFormat().resolvedOptions().timeZone));
}

function traceIdProblem(traceId: string | null | undefined) {
  if (!traceId) return 'explore.perses.traceActionMissingId' as const;
  if (!/^[0-9a-f]{32}$/u.test(traceId)) return 'explore.perses.traceActionInvalidId' as const;
  return undefined;
}

export function traceActionReason(traceId: string | null | undefined, current: boolean, hasAction: boolean) {
  if (!current) return 'explore.perses.traceActionStale' as const;
  if (hasAction) return undefined;
  return traceIdProblem(traceId) ?? 'explore.perses.traceActionUnavailable';
}
