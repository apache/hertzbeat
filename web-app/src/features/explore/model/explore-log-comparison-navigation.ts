/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { shiftedLogWindow, type LogAnalysisState, type LogComparisonGroup } from '@/platform/perses';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogExploreQuery } from './explore-query';

import { logAnalysisDrilldownPath } from './explore-log-analysis-navigation';
import { buildExplorePath, normalizeExploreReturnTo, parseExploreQuery } from './explore-url-model';
export function logComparisonDrilldownPath(
  query: LogExploreQuery,
  window: ExactTimeWindow,
  analysis: LogAnalysisState,
  group: LogComparisonGroup,
  source: 'a' | 'b'
) {
  if (!analysis.comparison) return undefined;
  const scoped =
    source === 'a'
      ? query
      : { ...query, query: analysis.comparison.search, searchSyntax: analysis.comparison.searchSyntax };
  const sourceWindow = source === 'b' ? shiftedLogWindow(window, analysis.comparison.timeShiftMs) : window;
  if (!sourceWindow) return undefined;
  const path = logAnalysisDrilldownPath(scoped, sourceWindow, null, {
    kind: group.keys.length ? null : 'all',
    value: null,
    ...(group.keys.length ? { keys: group.keys } : {}),
    count: group.a.count,
    buckets: []
  });
  const returnTo = normalizeExploreReturnTo(
    buildExplorePath({
      ...query,
      start: window.from,
      end: window.to,
      windowMode: undefined,
      autoRefreshMs: undefined,
      returnTo: undefined
    })
  );
  if (!path || !returnTo) return undefined;
  return buildExplorePath({ ...parseExploreQuery(new URLSearchParams(path.split('?')[1])), returnTo });
}
