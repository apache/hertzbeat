/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ExploreQueryPatch } from './explore-query-patch';

export type TelemetrySource = 'external' | 'self';

export function sourceSelectionChanges(changes: ExploreQueryPatch): ExploreQueryPatch {
  return {
    ...changes,
    savedView: undefined,
    returnTo: undefined,
    traceReturnTo: undefined,
    servicesReturnTo: undefined,
    dashboardReturnTo: undefined,
    traceId: undefined,
    spanId: undefined,
    logRecordUid: undefined,
    logGroupSelection: undefined,
    pageIndex: undefined,
    hideInternal: undefined
  };
}

export function validTelemetrySelection(query: { source?: string | undefined; hideInternal?: boolean | undefined }) {
  if (query.source !== undefined && !['external', 'self'].includes(query.source)) return false;
  return query.source !== 'self' || !query.hideInternal;
}

export function readTelemetrySource(params: URLSearchParams) {
  const values = params.getAll('source');
  if (!values.length) return undefined;
  return values.length === 1 ? values[0] : 'invalid';
}
