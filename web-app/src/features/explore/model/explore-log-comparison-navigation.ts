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
