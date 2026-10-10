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
    if (
      (source.source ?? 'external') === (query.source ?? 'external') &&
      exploreInvestigationRoute(source).kind === 'inactive' &&
      !(source.signal === 'logs' && source.live)
    ) {
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
