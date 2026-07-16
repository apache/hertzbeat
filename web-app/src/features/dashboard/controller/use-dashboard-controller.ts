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
import { ApiMessageError } from '@/core/http/api-message';
import { loadDashboardAlertSummary, loadDashboardSummary } from '../api/dashboard-api';
import { DashboardContractError, type DashboardData } from '../model/dashboard-model';

export type DashboardState =
  | { kind: 'loading' }
  | { kind: 'missing' | 'unavailable' | 'error' }
  | { kind: 'ready' | 'empty'; data: DashboardData };

export function useDashboardController() {
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: async ({ signal }) => {
      const [summary, alert] = await Promise.all([loadDashboardSummary(signal), loadDashboardAlertSummary(signal)]);
      return { summary, alert };
    },
    retry: false,
    refetchInterval: 30_000
  });
  return {
    state: dashboardState(query.isPending, query.error, query.data),
    refresh: () => query.refetch().then(() => undefined)
  };
}

function dashboardState(
  pending: boolean,
  error: Error | null,
  result: { summary: Awaited<ReturnType<typeof loadDashboardSummary>>;
    alert: Awaited<ReturnType<typeof loadDashboardAlertSummary>> } | undefined
): DashboardState {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyDashboardError(error) };
  if (!result) return { kind: 'error' };
  if (result.summary.apps === null) return { kind: 'missing' };
  const data = { apps: result.summary.apps, alert: result.alert };
  return { kind: data.apps.length === 0 ? 'empty' : 'ready', data };
}

function classifyDashboardError(error: Error): 'unavailable' | 'error' {
  if (error instanceof DashboardContractError) return 'error';
  if (error instanceof ApiMessageError
    && (error.cause !== undefined || error.status === undefined || [0, 502, 503, 504].includes(error.status))) return 'unavailable';
  return 'error';
}
