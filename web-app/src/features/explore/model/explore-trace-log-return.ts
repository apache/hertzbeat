/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import {
  buildExplorePath,
  mergeExploreQuery,
  parseExploreQuery,
  signalSelectionPatch,
  exploreHandoffState
} from './explore-model';
import type { ExploreQuery, TraceExploreQuery, LogExploreQuery } from './explore-query';
export function buildTraceLogsPath(query: TraceExploreQuery, traceId: string, spanId: string | undefined) {
  // The selected span belongs to the return context; only span-scoped log actions filter by it.
  const source = buildExplorePath({ ...query, traceId, spanId: spanId ?? query.spanId });
  return buildExplorePath(
    mergeExploreQuery(query, {
      ...signalSelectionPatch('logs'),
      traceId,
      spanId,
      resourceFilter: undefined,
      attributeFilter: undefined,
      traceReturnTo: source
    })
  );
}
export function validatedTraceReturn(query: ExploreQuery): string | undefined {
  if (query.signal !== 'logs') return undefined;
  const value = query.traceReturnTo;
  if (!value || value.length > 16384 || !value.startsWith('/explore?') || /[#\\\r\n]/u.test(value)) return undefined;
  const params = new URLSearchParams(value.slice('/explore?'.length));
  if (params.has('traceReturnTo') || [...params.keys()].some(key => params.getAll(key).length !== 1)) return undefined;
  const source = parseExploreQuery(params);
  if (!sameFocusedEvidence(source, query)) return undefined;
  return buildExplorePath(source) === value ? value : undefined;
}

function sameFocusedEvidence(source: ExploreQuery, query: LogExploreQuery) {
  if (source.signal !== 'traces' || exploreHandoffState(source) !== 'scoped') return false;
  if (!source.traceId || /^0+$/u.test(source.traceId) || (source.spanId && /^0+$/u.test(source.spanId))) return false;
  if (query.spanId != null && source.spanId !== query.spanId) return false;
  return ['traceId', 'start', 'end', 'timeZone'].every(
    key => source[key as keyof TraceExploreQuery] === query[key as keyof LogExploreQuery]
  );
}
