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
