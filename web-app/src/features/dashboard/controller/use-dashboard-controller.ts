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
import { useQuery } from '@tanstack/react-query';

import {
  collectorQueryKeys,
  loadCollectorManagementPage,
  resolveCollectorListState,
  type CollectorQuery
} from '@/features/settings/collector';
import { loadDashboardAlertSummary, loadDashboardRecentAlerts, loadDashboardSummary } from '../api/dashboard-api';
import {
  dashboardFailureKind,
  type DashboardAlertState,
  type DashboardMonitorState,
  type DashboardRecentAlertState
} from '../model/dashboard-model';
import { dashboardQueryKeys } from './dashboard-query-keys';

export const DASHBOARD_REFRESH_INTERVAL_MS = 30_000;
export const dashboardCollectorQuery: CollectorQuery = { name: '', pageIndex: 0, pageSize: 8 };

export function useDashboardController() {
  const monitorQuery = useQuery({
    queryKey: dashboardQueryKeys.monitorSummary(),
    queryFn: ({ signal }) => loadDashboardSummary(signal),
    retry: false,
    refetchInterval: DASHBOARD_REFRESH_INTERVAL_MS
  });
  const alertQuery = useQuery({
    queryKey: dashboardQueryKeys.alertSummary(),
    queryFn: ({ signal }) => loadDashboardAlertSummary(signal),
    retry: false,
    refetchInterval: DASHBOARD_REFRESH_INTERVAL_MS
  });
  const recentAlertQuery = useQuery({
    queryKey: dashboardQueryKeys.recentAlerts(),
    queryFn: ({ signal }) => loadDashboardRecentAlerts(signal),
    retry: false,
    refetchInterval: DASHBOARD_REFRESH_INTERVAL_MS
  });
  const collectorQuery = useQuery({
    queryKey: collectorQueryKeys.page(dashboardCollectorQuery),
    queryFn: ({ signal }) => loadCollectorManagementPage(dashboardCollectorQuery, signal),
    retry: false,
    refetchInterval: DASHBOARD_REFRESH_INTERVAL_MS
  });
  return {
    monitorState: monitorState(monitorQuery.isPending, monitorQuery.error, monitorQuery.data),
    alertState: alertState(alertQuery.isPending, alertQuery.error, alertQuery.data),
    recentAlertState: recentAlertState(recentAlertQuery.isPending, recentAlertQuery.error, recentAlertQuery.data),
    collectorState: resolveCollectorListState(collectorQuery, false, true),
    refresh: async () => {
      await Promise.allSettled([
        monitorQuery.refetch(),
        alertQuery.refetch(),
        recentAlertQuery.refetch(),
        collectorQuery.refetch()
      ]);
    }
  };
}

function recentAlertState(
  pending: boolean,
  error: Error | null,
  result: Awaited<ReturnType<typeof loadDashboardRecentAlerts>> | undefined
): DashboardRecentAlertState {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: dashboardFailureKind(error) };
  if (!result) return { kind: 'error' };
  if (result.content.length === 0) return { kind: 'empty' };
  return { kind: 'ready', records: result.content, total: result.totalElements };
}

function monitorState(
  pending: boolean,
  error: Error | null,
  result: Awaited<ReturnType<typeof loadDashboardSummary>> | undefined
): DashboardMonitorState {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: dashboardFailureKind(error) };
  if (!result) return { kind: 'error' };
  if (result.apps === null) return { kind: 'missing' };
  return { kind: result.apps.length === 0 ? 'empty' : 'ready', apps: result.apps };
}

function alertState(
  pending: boolean,
  error: Error | null,
  result: Awaited<ReturnType<typeof loadDashboardAlertSummary>> | undefined
): DashboardAlertState {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: dashboardFailureKind(error) };
  if (!result) return { kind: 'missing' };
  return { kind: result.total === 0 ? 'empty' : 'ready', summary: result };
}
