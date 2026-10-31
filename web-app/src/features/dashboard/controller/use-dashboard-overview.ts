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

import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { dashboardQueryKeys } from './dashboard-query-keys';
import { useSession } from '@/core/auth/session-context';
import { loadAlertGroups } from '@/features/alert';
import { loadMonitors } from '@/features/monitor';
import { loadSavedQueries, useSavedViewDirectoryPreferences } from '@/features/explore';
import {
  monitorDistribution,
  savedContinueItems,
  type DashboardOverview,
  dashboardReadState
} from '../model/dashboard-overview';

const monitorQuery = {
  search: '',
  app: '',
  labels: '',
  sort: 'gmtUpdate' as const,
  order: 'desc' as const,
  pageIndex: 0,
  pageSize: 10
};
const alertQuery = {
  search: '',
  status: 'firing' as const,
  severity: '' as const,
  serviceName: '',
  serviceNamespace: '',
  environment: '',
  pageIndex: 0,
  pageSize: 8
};

export function useDashboardOverview(): DashboardOverview {
  const session = useSession().session;
  const identity = [session?.workspaceId, session?.username];
  const monitors = useQueries({
    queries: ['9', '0', '1', '2'].map(status => ({
      queryKey: dashboardQueryKeys.status(identity, status),
      queryFn: ({ signal }: { signal: AbortSignal }) => loadMonitors({ ...monitorQuery, status }, signal),
      retry: false,
      refetchInterval: 60_000
    }))
  });
  const alerts = useQuery({
    queryKey: dashboardQueryKeys.firing(identity),
    queryFn: ({ signal }) => loadAlertGroups(alertQuery, signal),
    retry: false,
    refetchInterval: 60_000
  });
  const { saved, records, directory } = useDashboardSavedDirectory(session);
  const { distribution, monitorState } = monitorDistributionRead(monitors);
  const visibleAlerts = visiblePage(alerts);
  const visibleDown = visiblePage(monitors[3]!);
  const visibleSaved = visiblePage(saved);
  return {
    distribution,
    monitorState,
    downMonitors: visibleDown?.content.slice(0, 2) ?? [],
    downState: dashboardReadState(monitors[3]!),
    alerts: visibleAlerts?.content.slice(0, 4) ?? [],
    alertTotal: visibleAlerts?.totalElements,
    alertState: dashboardReadState(alerts),
    savedState: dashboardReadState(saved),
    continueItems: visibleSaved
      ? savedContinueItems(records, directory.preferences.favoriteKeys, directory.preferences.recentKeys)
      : [],
    favoriteMetrics: visibleSaved
      ? records.filter(
          record => record.signal === 'metrics' && directory.preferences.favoriteKeys.includes(record.viewKey)
        )
      : [],
    recordOpen: directory.recordOpen,
    refreshing: [...monitors, alerts, saved].some(query => query.isFetching),
    refresh: () => Promise.all([...monitors.map(query => query.refetch()), alerts.refetch(), saved.refetch()])
  };
}

function useDashboardSavedDirectory(session: ReturnType<typeof useSession>['session']) {
  const identity = [session?.workspaceId, session?.username];
  const saved = useQuery({
    queryKey: dashboardQueryKeys.saved(identity),
    queryFn: async ({ signal }) =>
      (
        await Promise.all(
          ['metrics', 'logs', 'traces'].map(kind => loadSavedQueries(kind as 'metrics' | 'logs' | 'traces', signal))
        )
      ).flat(),
    retry: false
  });
  const records = useMemo(() => saved.data ?? [], [saved.data]);
  const directory = useSavedViewDirectoryPreferences(session ?? {}, records, saved.isSuccess && !saved.isFetching);
  return { saved, records, directory };
}

function visiblePage<T>(query: { isSuccess: boolean; isFetching: boolean; data: T | undefined }) {
  return query.isSuccess && !query.isFetching ? query.data : undefined;
}

function monitorDistributionRead(monitors: UseQueryResult<Awaited<ReturnType<typeof loadMonitors>>>[]) {
  const allMonitorReady = monitors.every(query => query.isSuccess && !query.isFetching);
  const distribution = allMonitorReady
    ? monitorDistribution(
        monitors[0]!.data!.totalElements,
        monitors.slice(1).map(query => query.data!.totalElements)
      )
    : null;
  let monitorState: DashboardOverview['monitorState'] = 'loading';
  if (allMonitorReady) monitorState = distribution ? 'ready' : 'error';
  if (monitors.some(query => dashboardReadState(query) === 'error')) monitorState = 'error';
  return { distribution, monitorState };
}
