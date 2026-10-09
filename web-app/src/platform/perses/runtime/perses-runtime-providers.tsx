/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ThemeProvider } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ChartsProvider, SnackbarProvider } from '@perses-dev/components';
import type {
  DashboardResource,
  DatasourceApi,
  DatasourceResource,
  GlobalDatasourceResource
} from '@perses-dev/client';
import { DatasourceStoreProvider, VariableProvider } from '@perses-dev/dashboards';
import { PluginRegistry, RouterProvider, TimeRangeProvider, type PluginLoader } from '@perses-dev/plugin-system';
import type { DurationString, TimeRangeValue } from '@perses-dev/spec';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { useRuntimeTheme } from '@/core/runtime-theme-context';
import type { ExactTimeWindow } from '@/shared/query-context';

import { HERTZBEAT_SNAPSHOT_QUERY_KIND } from '../plugins/hertzbeat-snapshot-query';
import { createHertzBeatPersesTheme } from './hertzbeat-perses-theme';
import { createHertzBeatChartsTheme } from './hertzbeat-perses-charts-theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false, staleTime: Number.POSITIVE_INFINITY } }
});

const dashboard = {
  kind: 'Dashboard',
  metadata: { name: 'hertzbeat-investigation-runtime', project: 'hertzbeat' },
  spec: { duration: '30m', variables: [], panels: {}, layouts: [] }
} as DashboardResource;

const datasourceApi: DatasourceApi = {
  getDatasource: (): Promise<DatasourceResource | undefined> => Promise.resolve(undefined),
  getGlobalDatasource: (): Promise<GlobalDatasourceResource | undefined> => Promise.resolve(undefined),
  listDatasources: (): Promise<DatasourceResource[]> => Promise.resolve([]),
  listGlobalDatasources: (): Promise<GlobalDatasourceResource[]> => Promise.resolve([])
};

type PersesRuntimeProviderProps = {
  children: ReactNode;
  timeWindow: ExactTimeWindow;
  pluginLoader: PluginLoader;
  contentSurface?: boolean | undefined;
  compactChart?: boolean | undefined;
  compactChartCountAxisMax?: number | undefined;
  enableChartPinning?: boolean | undefined;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
  timeWindowChangeEnabled?: boolean | undefined;
};

export function PersesRuntimeProviders({
  children,
  timeWindow,
  pluginLoader,
  contentSurface = false,
  compactChart = false,
  compactChartCountAxisMax,
  enableChartPinning = false,
  onTimeWindowChange,
  timeWindowChangeEnabled = true
}: PersesRuntimeProviderProps) {
  const { theme } = useRuntimeTheme();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { persesTimeRange, refreshInterval, setRefreshInterval, updateTimeRange } = usePersesTimeRange(
    timeWindow,
    timeWindowChangeEnabled,
    onTimeWindowChange
  );
  const muiTheme = useMemo(() => createHertzBeatPersesTheme(theme, contentSurface), [theme, contentSurface]);
  const chartsTheme = useMemo(
    () => createHertzBeatChartsTheme(muiTheme, compactChart, reducedMotion, compactChartCountAxisMax),
    [muiTheme, compactChart, reducedMotion, compactChartCountAxisMax]
  );

  return (
    <ThemeProvider theme={muiTheme}>
      <ChartsProvider chartsTheme={chartsTheme} enablePinning={enableChartPinning}>
        <SnackbarProvider anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} variant="default" content="">
          <PluginRegistry
            pluginLoader={pluginLoader}
            defaultPluginKinds={{ Panel: 'TimeSeriesChart', TimeSeriesQuery: HERTZBEAT_SNAPSHOT_QUERY_KIND }}
          >
            <RouterProvider RouterComponent={undefined} navigate={undefined}>
              <QueryClientProvider client={queryClient}>
                <TimeRangeProvider
                  timeRange={persesTimeRange}
                  refreshInterval={refreshInterval}
                  setTimeRange={updateTimeRange}
                  setRefreshInterval={setRefreshInterval}
                >
                  <VariableProvider>
                    <DatasourceStoreProvider dashboardResource={dashboard} datasourceApi={datasourceApi}>
                      {children}
                    </DatasourceStoreProvider>
                  </VariableProvider>
                </TimeRangeProvider>
              </QueryClientProvider>
            </RouterProvider>
          </PluginRegistry>
        </SnackbarProvider>
      </ChartsProvider>
    </ThemeProvider>
  );
}

function toTimeRange(window: ExactTimeWindow): TimeRangeValue {
  return { start: new Date(window.from), end: new Date(window.to) };
}

function exactWindow(value: TimeRangeValue): ExactTimeWindow | undefined {
  if (!('start' in value)) return undefined;
  const from = value.start.getTime();
  const to = value.end.getTime();
  return Number.isSafeInteger(from) && Number.isSafeInteger(to) && from > 0 && from < to ? { from, to } : undefined;
}

function sameWindow(current: ExactTimeWindow, next: ExactTimeWindow) {
  return current.from === next.from && current.to === next.to;
}

function usePersesTimeRange(
  timeWindow: ExactTimeWindow,
  timeWindowChangeEnabled: boolean,
  onTimeWindowChange: ((window: ExactTimeWindow) => void) | undefined
) {
  const [persesTimeRange, setPersesTimeRange] = useState<TimeRangeValue>(() => toTimeRange(timeWindow));
  const [lastAbsoluteWindow, setLastAbsoluteWindow] = useState(timeWindow);
  const [refreshInterval, setRefreshInterval] = useState<DurationString>('0s');
  const [externalWindow, setExternalWindow] = useState(timeWindow);
  if (!sameWindow(externalWindow, timeWindow)) {
    setExternalWindow(timeWindow);
    setPersesTimeRange(toTimeRange(timeWindow));
    setLastAbsoluteWindow(timeWindow);
  }
  const updateTimeRange = useCallback(
    (value: TimeRangeValue) => {
      if (!timeWindowChangeEnabled) return;
      setPersesTimeRange(value);
      const nextWindow = exactWindow(value);
      if (!nextWindow || sameWindow(lastAbsoluteWindow, nextWindow)) return;
      setLastAbsoluteWindow(nextWindow);
      onTimeWindowChange?.(nextWindow);
    },
    [lastAbsoluteWindow, onTimeWindowChange, timeWindowChangeEnabled]
  );

  return { persesTimeRange, refreshInterval, setRefreshInterval, updateTimeRange };
}
