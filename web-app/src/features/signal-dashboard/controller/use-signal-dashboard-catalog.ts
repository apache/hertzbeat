/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
