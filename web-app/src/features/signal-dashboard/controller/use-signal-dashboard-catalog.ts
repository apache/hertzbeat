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

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadSignalDashboards } from '../api/signal-dashboard-api';
import { readSignalDashboard, type SignalDashboardRecord } from '../model/signal-dashboard-record';
import { signalDashboardQueryKeys } from './signal-dashboard-query-keys';

export function useSignalDashboardCatalog(scope: string, enabled: boolean, key?: string) {
  const client = useQueryClient();
  const queryKey = signalDashboardQueryKeys.list(scope);
  const query = useQuery({ queryKey, queryFn: ({ signal }) => loadSignalDashboards(signal), enabled, retry: false });
  const records = query.data ?? [];
  const active = records.find(record => record.dashboardKey === key);
  const read = useMemo(() => (active ? readSignalDashboard(active) : undefined), [active]);
  return {
    query,
    records,
    active,
    read,
    refresh: () => query.refetch(),
    saved: (record: SignalDashboardRecord) => {
      client.setQueryData<SignalDashboardRecord[]>(queryKey, rows => [
        ...(rows ?? []).filter(row => row.dashboardKey !== record.dashboardKey),
        record
      ]);
      void client.invalidateQueries({ queryKey, exact: true });
    },
    removed: (key: string) => {
      client.setQueryData<SignalDashboardRecord[]>(queryKey, rows =>
        (rows ?? []).filter(row => row.dashboardKey !== key)
      );
      void client.invalidateQueries({ queryKey, exact: true });
    }
  };
}
