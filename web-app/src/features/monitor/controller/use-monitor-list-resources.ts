/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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

import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { loadMonitorApps, loadMonitors } from '../api/monitor-api';
import type { MonitorQuery } from '../model/monitor-contract';
import { monitorQueryKeys } from './monitor-query-keys';
import type { MonitorListReadModeRef } from './use-monitor-list-snapshot';

export const monitorListAutoRefreshMs = 120_000;

export function monitorListQueryOptions(query: MonitorQuery) {
  return queryOptions({
    queryKey: monitorQueryKeys.list(query),
    queryFn: ({ signal }) => loadMonitors(query, signal),
    retry: false
  });
}

export function useMonitorListResources(query: MonitorQuery) {
  const queryClient = useQueryClient();
  const { app, labels, order, pageIndex, pageSize, search, sort, status } = query;
  const stableQuery = useMemo(
    () => ({ app, labels, order, pageIndex, pageSize, search, sort, status }),
    [app, labels, order, pageIndex, pageSize, search, sort, status]
  );
  const options = useMemo(() => monitorListQueryOptions(stableQuery), [stableQuery]);
  const readMode = useRef('authoritative') as MonitorListReadModeRef;
  const monitors = useQuery(options);
  const apps = useQuery({
    queryKey: monitorQueryKeys.apps(),
    queryFn: ({ signal }) => loadMonitorApps(signal),
    retry: false
  });

  useEffect(() => {
    const timer = setInterval(() => {
      if (readMode.current === 'idle') readMode.current = 'automatic';
      void queryClient.fetchQuery({ ...options, staleTime: 0 }).catch(() => undefined);
    }, monitorListAutoRefreshMs);
    return () => clearInterval(timer);
  }, [options, queryClient, readMode]);

  const reread = () => {
    readMode.current = 'authoritative';
    return queryClient.fetchQuery({ ...options, staleTime: 0 });
  };
  return { monitors, apps, readMode, reread };
}
