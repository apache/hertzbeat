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

import { useEffect, useMemo, useRef } from 'react';

import type { SharedTimeValue } from '@/shared/time';

import type { ExploreQuery, ExploreQueryPatch } from '../model/explore-model';

export function useExploreRouteTime(
  query: ExploreQuery,
  sharedTime: SharedTimeValue | null,
  updateQuery: (patch: ExploreQueryPatch) => void
) {
  const previousUrlInterval = useRef(query.autoRefreshMs);
  useEffect(() => {
    if (!sharedTime) return;
    const previous = previousUrlInterval.current;
    previousUrlInterval.current = query.autoRefreshMs;
    if (query.autoRefreshMs != null && sharedTime.autoRefreshMs !== query.autoRefreshMs) {
      sharedTime.setAutoRefresh(query.autoRefreshMs);
    } else if (previous != null && query.autoRefreshMs == null && sharedTime.autoRefreshMs !== 0) {
      sharedTime.setAutoRefresh(0);
    }
  }, [query.autoRefreshMs, sharedTime]);

  return useMemo(
    () =>
      sharedTime
        ? {
            ...sharedTime,
            setAutoRefresh: (intervalMs: number) =>
              updateQuery({ autoRefreshMs: intervalMs > 0 ? intervalMs : undefined })
          }
        : null,
    [sharedTime, updateQuery]
  );
}
