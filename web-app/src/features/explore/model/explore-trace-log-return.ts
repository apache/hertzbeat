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
  if ((source.source ?? 'external') !== (query.source ?? 'external')) return false;
  if (source.signal !== 'traces' || exploreHandoffState(source) !== 'scoped') return false;
  if (!source.traceId || /^0+$/u.test(source.traceId) || (source.spanId && /^0+$/u.test(source.spanId))) return false;
  if (query.spanId != null && source.spanId !== query.spanId) return false;
  return ['traceId', 'start', 'end', 'timeZone'].every(
    key => source[key as keyof TraceExploreQuery] === query[key as keyof LogExploreQuery]
  );
}
