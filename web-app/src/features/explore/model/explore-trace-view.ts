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

import type { ExploreQuery, ExploreQueryPatch } from './explore-query';
import { DEFAULT_TRACE_COLUMNS, type HertzBeatTraceColumn } from '@/platform/perses';
import { parseTraceView, encodeTraceView, readTraceView, type TraceView } from '@/platform/perses';
export {
  DEFAULT_TRACE_VIEW,
  parseTraceView,
  encodeTraceView,
  readTraceView,
  validTraceView,
  type TraceView
} from '@/platform/perses';

export function traceViewPatch(query: ExploreQuery, traceView: string): ExploreQueryPatch {
  const previous = query.signal === 'traces' ? readTraceView(query.traceView) : undefined;
  const next = parseTraceView(traceView);
  if (previous?.population === next.population) return { traceView };
  if (
    previous &&
    sameColumns(previous.columns, defaultTraceColumns(previous.population)) &&
    sameColumns(next.columns, previous.columns)
  ) {
    next.columns = defaultTraceColumns(next.population);
  }
  return { traceView: encodeTraceView(next), pageIndex: undefined };
}
export function defaultTraceColumns(population: TraceView['population']): HertzBeatTraceColumn[] {
  return population === 'matched_spans'
    ? ['traceName', 'service', 'errorCount', 'duration', 'startTime']
    : [...DEFAULT_TRACE_COLUMNS];
}
function sameColumns(left: HertzBeatTraceColumn[], right: HertzBeatTraceColumn[]) {
  return left.length === right.length && left.every((column, index) => column === right[index]);
}
