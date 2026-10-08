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

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/core/auth/session-context';
import { useSharedTimeOptional } from '@/shared/time';
import { classifyExploreSignalError, loadMetricInventory } from '../api/explore-api';
import {
  exploreHandoffState,
  exploreUsesExactWindow,
  timeRangeMilliseconds,
  type ExploreQuery
} from '../model/explore-model';
import { METRIC_INVENTORY_LIMIT, type MetricInventoryViewModel } from '../model/explore-metric-inventory';
import { exploreQueryKeys } from './explore-query-keys';

export function useMetricInventory(query: ExploreQuery): MetricInventoryViewModel {
  const { session } = useSession();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const trimmed = search.trim();
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(trimmed), 250);
    return () => clearTimeout(timeout);
  }, [trimmed]);
  const { window, ready, refreshRevision } = useInventoryWindow(query);
  const identity = JSON.stringify(session ? [session.username, session.workspaceId, session.roles] : []);
  const result = useQuery({
    queryKey: exploreQueryKeys.metricInventory(
      query,
      window,
      identity,
      trimmed,
      METRIC_INVENTORY_LIMIT,
      refreshRevision
    ),
    queryFn: ({ signal }) =>
      loadMetricInventory(
        { ...query, signal: 'metrics', start: window.from, end: window.to, windowMode: undefined },
        trimmed,
        signal
      ),
    enabled:
      query.signal === 'metrics' &&
      Boolean(session?.authenticated) &&
      exploreHandoffState(query) !== 'invalid' &&
      trimmed === debounced &&
      ready,
    retry: false,
    staleTime: 0
  });
  const pending = trimmed !== debounced || result.isPending || !ready;
  return {
    search,
    setSearch,
    state: inventoryState(pending, result.error),
    data: pending || result.error ? undefined : result.data,
    retry: () => {
      void result.refetch();
    }
  };
}

function useInventoryWindow(query: ExploreQuery) {
  const sharedTime = useSharedTimeOptional();
  const refreshRevision = sharedTime?.refreshRevision ?? 0;
  const owner = JSON.stringify([query.timeRange, refreshRevision]);
  const [capture, setCapture] = useState(() => ({ owner, to: Date.now() }));
  useEffect(() => {
    if (capture.owner === owner) return undefined;
    const timer = setTimeout(() => setCapture({ owner, to: Date.now() }), 0);
    return () => clearTimeout(timer);
  }, [capture.owner, owner]);
  if (exploreUsesExactWindow(query))
    return { window: { from: query.start!, to: query.end! }, ready: true, refreshRevision };
  const to = sharedTime?.window?.to ?? capture.to;
  return {
    window: { from: to - timeRangeMilliseconds(query.timeRange), to },
    refreshRevision,
    ready: Boolean(sharedTime?.window) || capture.owner === owner
  };
}

function inventoryState(pending: boolean, error: Error | null): MetricInventoryViewModel['state'] {
  if (pending) return 'loading';
  if (error) return classifyExploreSignalError(error) === 'permission' ? 'permission' : 'error';
  return 'ready';
}
