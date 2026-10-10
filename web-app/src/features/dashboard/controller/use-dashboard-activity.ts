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

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { ApiMessageError } from '@/core/http/api-message';
import { alertFailureKind, loadAlertSummary } from '@/features/alert';
import { classifyEntityReadError, loadEntities, readEntityQuery } from '@/features/entity/queries';
import { classifyMonitorReadError, loadMonitors } from '@/features/monitor';
import { alertRoutePaths, applicationRoutePaths, monitorRoutePaths } from '@/shared/navigation/app-paths';
import type { DashboardActivityModel, DashboardCountEvidence } from '../model/dashboard-activity';
import { dashboardQueryKeys } from './dashboard-query-keys';

const monitorQuery = {
  search: '',
  app: '',
  status: '9',
  labels: '',
  sort: 'gmtUpdate' as const,
  order: 'desc' as const,
  pageIndex: 0,
  pageSize: 10
};
const serviceQuery = readEntityQuery(new URLSearchParams({ type: 'service' }));

export function useDashboardActivity(): DashboardActivityModel {
  const monitors = useQuery({
    queryKey: dashboardQueryKeys.monitors(),
    queryFn: ({ signal }) => loadMonitors(monitorQuery, signal),
    retry: false
  });
  const alerts = useQuery({
    queryKey: dashboardQueryKeys.alerts(),
    queryFn: ({ signal }) => loadAlertSummary(signal),
    retry: false
  });
  const services = useQuery({
    queryKey: dashboardQueryKeys.services(),
    queryFn: ({ signal }) => loadEntities(serviceQuery, signal),
    retry: false
  });
  const monitorState = countEvidence(monitors, value => value.totalElements, monitorFailure);
  const alertState = countEvidence(alerts, value => value.total - value.dealNum, alertFailureKind);
  const serviceState = countEvidence(services, value => value.totalElements, classifyEntityReadError);
  return {
    targets: {
      monitors: monitorRoutePaths.list,
      alerts: alertRoutePaths.center,
      services: applicationRoutePaths.services,
      signals: applicationRoutePaths.explore
    },
    monitors: monitorState,
    alerts: alertState,
    services: serviceState,
    firstUse:
      !monitors.error &&
      !alerts.error &&
      !services.error &&
      monitors.data?.totalElements === 0 &&
      services.data?.totalElements === 0 &&
      alerts.data?.total === 0,
    refreshing: monitors.isFetching || alerts.isFetching || services.isFetching,
    refresh: () => Promise.all([monitors.refetch(), alerts.refetch(), services.refetch()])
  };
}

function countEvidence<T>(
  result: UseQueryResult<T>,
  count: (data: T) => number,
  failure: (error: unknown) => 'permission' | 'unavailable' | 'error'
): DashboardCountEvidence {
  if (result.error) return { kind: failure(result.error) };
  if (result.isFetching || result.isPending) return { kind: 'loading' };
  return result.data ? { kind: 'ready', count: count(result.data) } : { kind: 'error' };
}

function monitorFailure(error: unknown) {
  if (error instanceof ApiMessageError && [401, 403].includes(error.status ?? 0)) return 'permission';
  return classifyMonitorReadError(error);
}
