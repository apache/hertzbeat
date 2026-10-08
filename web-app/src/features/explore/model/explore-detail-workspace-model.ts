/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { exploreInvestigationRoute } from './explore-investigation-model';
import { buildExplorePath, mergeExploreQuery, normalizeExploreReturnTo, parseExploreQuery } from './explore-model';
import { createTraceNavigation } from './explore-trace-navigation';
import type { ExplorePageResultState } from './explore-result-model';
import type { ExploreQuery } from './explore-query';

export function traceBackgroundQuery(query: ExploreQuery): ExploreQuery {
  if (exploreInvestigationRoute(query).kind !== 'trace') return query;
  const returnTo = normalizeExploreReturnTo(query.returnTo);
  if (returnTo) {
    const source = parseExploreQuery(new URLSearchParams(returnTo.split('?')[1]));
    if (exploreInvestigationRoute(source).kind === 'inactive' && !(source.signal === 'logs' && source.live)) {
      return source;
    }
  }
  return mergeExploreQuery(query, { traceId: undefined, spanId: undefined, returnTo: undefined });
}

export function traceBackgroundPath(query: ExploreQuery) {
  return buildExplorePath(traceBackgroundQuery(query));
}

export function traceSiblingPaths(query: ExploreQuery, focused: ExploreQuery, result: ExplorePageResultState) {
  if (
    query.signal !== 'traces' ||
    focused.signal !== 'traces' ||
    result.kind !== 'ready' ||
    result.signal !== 'traces'
  ) {
    return {};
  }
  const rows = result.data.content;
  const index = rows.findIndex(row => row.traceId === focused.traceId);
  if (index < 0) return {};
  const { links } = createTraceNavigation(rows, query, result.window, focused.timeZone ?? 'UTC', '');
  return {
    previous: index > 0 ? links[rows[index - 1]!.traceId] : undefined,
    next: index + 1 < rows.length ? links[rows[index + 1]!.traceId] : undefined
  };
}
