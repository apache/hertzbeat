'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { HzButton, HzInlineFeedback, HzLoadingState } from '@hertzbeat/ui';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { MonitorDetailConsole, type MonitorDetailConsoleTabKey } from '@/components/monitor-detail/monitor-detail-console';
import { MonitorDetailSections } from '@/components/monitor-detail/monitor-detail-sections';
import { useI18n } from '@/components/providers/i18n-provider';
import { api } from '@/lib/monitor-api-facade';
import { formatTime } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import {
  buildMonitorDetailUrl,
  buildMonitorFavoriteUrl,
  buildMonitorGrafanaUrl,
  addMonitorFavoriteFromFacade,
  deleteMonitorGrafanaDashboardFromFacade,
  loadMonitorDetailBundleFromFacade,
  loadMonitorHistoryMetricCatalogFromFacade,
  loadMonitorHistoryMetricDataFromFacade,
  loadMonitorRealtimeMetricDataFromFacade,
  removeMonitorFavoriteFromFacade,
  type MonitorDetailResponse,
  type MonitorHistoryMetricCatalogItem
} from '@/lib/monitor-detail/controller';
import {
  buildMonitorFavoriteJumpRows,
  filterMonitorHistoryMetricCatalog,
  filterMonitorHistorySeriesRows,
  filterMonitorMetricCatalog,
  buildMonitorHistoryMetricRows,
  buildMonitorHistorySeriesRows,
  buildMonitorMetricCatalogRows,
  resolveMonitorMetricTableMode,
  buildMonitorMetricTableMatrix,
  normalizeMonitorFavoriteNames
} from '@/lib/monitor-detail/view-model';
import {
  readMonitorDetailNavigationContext,
  type MonitorDetailRefreshableTab,
  resolveActiveFavoriteRow,
  resolveFavoriteSurfaceMode,
  resolveFavoriteJumpTarget,
  resolveMonitorDetailRefreshTarget,
  shouldFallbackFromGrafanaTab
} from '@/lib/monitor-detail/detail-route-state';
import { buildMonitorEditHref, buildMonitorListReturnHref } from '@/lib/monitor-manage/navigation';
import {
  appendTimeContextParams,
  parseTimeContextFromParams,
  resolveAppliedTimeContext,
  resolveTimeContextRefreshInterval,
  sanitizeTimeContext,
  TIME_CONTEXT_REFRESH_INTERVAL_SECONDS,
  TIME_CONTEXT_QUERY_KEYS,
  timeContextRefreshIntervalToContext,
  timeRangeToExpressionRange,
  timeRangeToTimeWindow,
  timeWindowToTimeRange,
  type TimeContext
} from '@/lib/time-context';
import type {
  EntityMonitorBindingCandidate,
  GrafanaDashboard,
  Monitor,
  MonitorDetailMetric,
  MonitorHistoryData,
  MonitorRealtimeMetricData,
  Param
} from '@/lib/types';

type MonitorDetailData = {
  monitor: Monitor;
  params: Param[];
  metrics: MonitorDetailMetric[];
  favoriteMetrics: string[];
  grafana: GrafanaDashboard;
};

type MetricCardPayloadState = {
  payload: MonitorRealtimeMetricData | null;
  loading: boolean;
  error: string | null;
};

const HISTORY_WINDOWS = [
  { value: '30m', labelKey: 'monitor.detail.history.range.last-30m' },
  { value: '1h', labelKey: 'monitor.detail.history.range.last-1h' },
  { value: '6h', labelKey: 'monitor.detail.history.range.last-6h' },
  { value: '1d', labelKey: 'monitor.detail.history.range.last-1d' },
  { value: '1W', labelKey: 'monitor.detail.history.range.last-1w' },
  { value: '4W', labelKey: 'monitor.detail.history.range.last-4w' },
  { value: '12W', labelKey: 'monitor.detail.history.range.last-12w' }
] as const;

const HISTORY_MODES = [
  { value: false, labelKey: 'monitor.detail.history.mode.raw' },
  { value: true, labelKey: 'monitor.detail.history.mode.aggregated' }
] as const;

const DEFAULT_HISTORY_TIME_CONTEXT: TimeContext = {
  timeRange: 'last-1h',
  from: 'now-1h',
  to: 'now',
  live: 'false'
};
const MONITOR_DETAIL_DEFAULT_REFRESH_INTERVAL_SECONDS = 90;
const MONITOR_DETAIL_REALTIME_PAGE_SIZE = 10;
const MONITOR_DETAIL_FAVORITE_REALTIME_PAGE_SIZE = 6;
const MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE = 6;

function resolveMonitorHistoryWindow(value: string | undefined) {
  const nextWindow = timeRangeToTimeWindow(value);
  return HISTORY_WINDOWS.some(option => option.value === nextWindow) ? nextWindow : null;
}

function resolveMonitorHistoryTimeContextFallback(context: TimeContext, fallback: TimeContext) {
  const nextFallback = { ...fallback };
  if (Object.prototype.hasOwnProperty.call(context, 'live') && context.live == null) {
    delete nextFallback.live;
  }
  if (Object.prototype.hasOwnProperty.call(context, 'refresh') && context.refresh == null) {
    delete nextFallback.refresh;
  }
  if (context.refresh) {
    delete nextFallback.live;
  }
  if (context.live === 'false') {
    delete nextFallback.refresh;
  }
  return nextFallback;
}

function normalizeMonitorHistoryTimeContext(context: TimeContext, fallback: TimeContext = DEFAULT_HISTORY_TIME_CONTEXT) {
  const sanitized = sanitizeTimeContext(context);
  const fallbackContext = resolveMonitorHistoryTimeContextFallback(context, fallback);
  const relativeRange = timeRangeToExpressionRange(sanitized.timeRange);
  const expressionFrom = sanitized.from || relativeRange?.from || undefined;
  const expressionTo = sanitized.to || relativeRange?.to || 'now';
  const expressionContext = expressionFrom && !sanitized.start && !sanitized.end
    ? { ...sanitized, from: expressionFrom, to: expressionTo }
    : sanitized;
  return resolveAppliedTimeContext(expressionContext, fallbackContext, 'last-1h');
}

function resolveMonitorDetailAppContext(monitor: Monitor, navigationContext: { app?: string | null }) {
  const scrapeApp = monitor.scrape && monitor.scrape !== 'static' ? monitor.scrape : null;
  return scrapeApp || navigationContext.app || monitor.app || null;
}

function buildMonitorHistoryTimeRoute(monitorId: string | number, searchParams: { toString(): string }, context: TimeContext) {
  const next = new URLSearchParams(searchParams.toString());
  TIME_CONTEXT_QUERY_KEYS.forEach(key => next.delete(key));
  appendTimeContextParams(next, context);
  const query = next.toString();
  return query ? `/monitors/${encodeURIComponent(String(monitorId))}?${query}` : `/monitors/${encodeURIComponent(String(monitorId))}`;
}

function buildMonitorEntityDraftHref(monitorId: string | number, currentHref: string) {
  const params = new URLSearchParams();
  params.set('source', 'telemetry');
  params.set('monitorId', String(monitorId));
  params.set('returnTo', currentHref);
  return `/entities/new?${params.toString()}`;
}

function buildMonitorBoundEntityHref(entityId: string | number, monitorId: string | number, currentHref: string) {
  const params = new URLSearchParams();
  params.set('monitorId', String(monitorId));
  params.set('returnTo', currentHref);
  return `/entities/${encodeURIComponent(String(entityId))}?${params.toString()}`;
}

function findAlreadyBoundEntityCandidate(candidates: EntityMonitorBindingCandidate[] | null) {
  return candidates?.find(candidate => candidate?.alreadyBound && candidate.entityId != null) ?? null;
}

function MonitorDetailWorkbench({ data }: { data: MonitorDetailData }) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const searchParamString = searchParams.toString();
  const { monitor, params, metrics, favoriteMetrics, grafana } = data;
  const navigationContext = readMonitorDetailNavigationContext(searchParams);
  const rawRouteTimeContext = useMemo(
    () => parseTimeContextFromParams(new URLSearchParams(searchParamString)),
    [searchParamString]
  );
  const routeHistoryTimeContext = useMemo(
    () => normalizeMonitorHistoryTimeContext(rawRouteTimeContext),
    [rawRouteTimeContext]
  );
  const [grafanaState, setGrafanaState] = useState<GrafanaDashboard>(grafana ?? { enabled: false });
  const [grafanaMessage, setGrafanaMessage] = useState<string | null>(null);
  const [grafanaError, setGrafanaError] = useState<string | null>(null);
  const [selectedMetricKey, setSelectedMetricKey] = useState<string | null>(null);
  const [favoriteNames, setFavoriteNames] = useState<string[]>(() => normalizeMonitorFavoriteNames(favoriteMetrics));
  const [favoriteMessage, setFavoriteMessage] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [historyMetrics, setHistoryMetrics] = useState<MonitorHistoryMetricCatalogItem[]>([]);
  const [metricSearch, setMetricSearch] = useState('');
  const [historyMetricSearch, setHistoryMetricSearch] = useState('');
  const [historySeriesSearch, setHistorySeriesSearch] = useState('');
  const [selectedHistoryMetricKey, setSelectedHistoryMetricKey] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPayload, setHistoryPayload] = useState<MonitorHistoryData | null>(null);
  const [historyChartPayloads, setHistoryChartPayloads] = useState<Record<string, MonitorHistoryData | null>>({});
  const [historyChartLoadingKeys, setHistoryChartLoadingKeys] = useState<string[]>([]);
  const [historyChartErrors, setHistoryChartErrors] = useState<Record<string, string>>({});
  const [historyPayloadLoading, setHistoryPayloadLoading] = useState(false);
  const [historyPayloadError, setHistoryPayloadError] = useState<string | null>(null);
  const [selectedHistorySeriesKey, setSelectedHistorySeriesKey] = useState<string | null>(null);
  const [selectedHistoryPointIndex, setSelectedHistoryPointIndex] = useState<number | null>(null);
  const [historyWindow, setHistoryWindow] = useState<(typeof HISTORY_WINDOWS)[number]['value']>(
    (resolveMonitorHistoryWindow(routeHistoryTimeContext.timeRange) as (typeof HISTORY_WINDOWS)[number]['value'] | null) ?? '1h'
  );
  const [historyTimeContext, setHistoryTimeContext] = useState<TimeContext>(routeHistoryTimeContext);
  const [historyInterval, setHistoryInterval] = useState<(typeof HISTORY_MODES)[number]['value']>(false);
  const [historyCatalogReloadToken, setHistoryCatalogReloadToken] = useState(0);
  const [historyReloadToken, setHistoryReloadToken] = useState(0);
  const [historyFullscreen, setHistoryFullscreen] = useState(false);
  const [metricPayload, setMetricPayload] = useState<unknown>(null);
  const [metricPayloadLoading, setMetricPayloadLoading] = useState(false);
  const [metricPayloadError, setMetricPayloadError] = useState<string | null>(null);
  const [metricCardPayloads, setMetricCardPayloads] = useState<Record<string, MetricCardPayloadState>>({});
  const [metricReloadToken, setMetricReloadToken] = useState(0);
  const [selectedMetricRowKey, setSelectedMetricRowKey] = useState<string | null>(null);
  const [metricTableMode, setMetricTableMode] = useState<'table' | 'detail'>('table');
  const [metricFullscreen, setMetricFullscreen] = useState(false);
  const [currentTab, setCurrentTab] = useState<MonitorDetailConsoleTabKey>('realtime');
  const [lastRefreshableTab, setLastRefreshableTab] = useState<MonitorDetailRefreshableTab>('realtime');
  const [favoriteSurfaceMode, setFavoriteSurfaceMode] = useState<'realtime' | 'history'>('realtime');
  const [entityBindingCandidates, setEntityBindingCandidates] = useState<EntityMonitorBindingCandidate[] | null>(null);
  const [visibleRealtimeMetricCount, setVisibleRealtimeMetricCount] = useState(MONITOR_DETAIL_REALTIME_PAGE_SIZE);
  const [visibleFavoriteRealtimeMetricCount, setVisibleFavoriteRealtimeMetricCount] = useState(MONITOR_DETAIL_FAVORITE_REALTIME_PAGE_SIZE);
  const [visibleHistoryChartCount, setVisibleHistoryChartCount] = useState(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);
  const [visibleFavoriteHistoryChartCount, setVisibleFavoriteHistoryChartCount] = useState(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);
  const routeRefreshInterval = resolveTimeContextRefreshInterval(
    rawRouteTimeContext,
    TIME_CONTEXT_REFRESH_INTERVAL_SECONDS,
    MONITOR_DETAIL_DEFAULT_REFRESH_INTERVAL_SECONDS
  );
  const [refreshInterval, setRefreshInterval] = useState<number>(() => routeRefreshInterval);
  const [refreshCountdown, setRefreshCountdown] = useState<number>(() => (routeRefreshInterval > 0 ? routeRefreshInterval : -1));
  const [favoriteReloadToken, setFavoriteReloadToken] = useState(0);
  const [grafanaReloadToken, setGrafanaReloadToken] = useState(0);
  const shouldLoadRealtimeMetrics = currentTab === 'realtime' || (currentTab === 'favorites' && favoriteSurfaceMode === 'realtime');
  const shouldLoadHistoryCatalog = currentTab === 'history' || (currentTab === 'favorites' && favoriteSurfaceMode === 'history');
  const shouldLoadHistoryPayloads = currentTab === 'history' || (currentTab === 'favorites' && favoriteSurfaceMode === 'history');

  const invalidateMonitorDetailQuery = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.monitors.detail(monitor.id) }),
    [monitor.id, queryClient]
  );

  const filteredMetrics = useMemo(() => filterMonitorMetricCatalog(metrics, metricSearch), [metricSearch, metrics]);
  const displayedMetrics = filteredMetrics.slice(0, visibleRealtimeMetricCount);
  const displayedMetricNames = displayedMetrics.map(metric => metric.name).filter(Boolean);
  const displayedMetricNameKey = displayedMetricNames.join('\u0000');
  const metricRows = buildMonitorMetricCatalogRows(displayedMetrics, t);
  const realtimeMetricHasMore = visibleRealtimeMetricCount < filteredMetrics.length;
  const selectedMetric = filteredMetrics.find(metric => metric.name === selectedMetricKey) ?? filteredMetrics[0] ?? null;
  const filteredHistoryMetrics = useMemo(
    () => filterMonitorHistoryMetricCatalog(historyMetrics, historyMetricSearch),
    [historyMetricSearch, historyMetrics]
  );
  const historyRows = buildMonitorHistoryMetricRows(filteredHistoryMetrics, t);
  const displayedHistoryChartItems = useMemo(
    () => filteredHistoryMetrics.slice(0, visibleHistoryChartCount),
    [filteredHistoryMetrics, visibleHistoryChartCount]
  );
  const historyChartHasMore = visibleHistoryChartCount < filteredHistoryMetrics.length;
  const selectedHistoryMetric = filteredHistoryMetrics.find(item => `${item.metrics}:${item.metric}` === selectedHistoryMetricKey) ?? filteredHistoryMetrics[0] ?? null;
  const historySeriesRows = filterMonitorHistorySeriesRows(buildMonitorHistorySeriesRows(historyPayload, t, formatTime), historySeriesSearch);
  const favoriteJumpRows = useMemo(() => buildMonitorFavoriteJumpRows(favoriteNames, metrics, historyMetrics, t), [favoriteNames, historyMetrics, metrics, t]);
  const favoriteRealtimeRows = useMemo(() => favoriteJumpRows.filter(row => row.targetKind === 'realtime'), [favoriteJumpRows]);
  const favoriteRealtimeMetricHasMore = visibleFavoriteRealtimeMetricCount < favoriteRealtimeRows.length;
  const historyMetricByKey = useMemo(() => new Map(historyMetrics.map(item => [`${item.metrics}:${item.metric}`, item])), [historyMetrics]);
  const favoriteHistoryCatalogItems = useMemo(
    () =>
      favoriteJumpRows
        .filter(row => row.targetKind === 'history')
        .map(row => historyMetricByKey.get(row.targetKey))
        .filter((item): item is MonitorHistoryMetricCatalogItem => Boolean(item)),
    [favoriteJumpRows, historyMetricByKey]
  );
  const favoriteHistoryCatalogItemKey = favoriteHistoryCatalogItems.map(item => `${item.metrics}:${item.metric}`).join('\u0000');
  const favoriteHistoryChartItems = useMemo(
    () => favoriteHistoryCatalogItems.slice(0, visibleFavoriteHistoryChartCount),
    [favoriteHistoryCatalogItems, visibleFavoriteHistoryChartCount]
  );
  const favoriteHistoryChartHasMore = visibleFavoriteHistoryChartCount < favoriteHistoryCatalogItems.length;
  const favoriteHistoryChartItemKey = favoriteHistoryChartItems.map(item => `${item.metrics}:${item.metric}`).join('\u0000');
  const [selectedFavoriteKey, setSelectedFavoriteKey] = useState<string | null>(null);

  const resetHistoryInvestigationSelection = useCallback((items: MonitorHistoryMetricCatalogItem[] = filteredHistoryMetrics) => {
    const first = items[0];
    setSelectedHistoryMetricKey(first ? `${first.metrics}:${first.metric}` : null);
    setSelectedHistorySeriesKey(null);
    setSelectedHistoryPointIndex(null);
    setHistoryPayload(null);
    setHistoryPayloadError(null);
  }, [filteredHistoryMetrics]);

  const readMonitorHistoryMetricPanelData = useCallback(
    (item: MonitorHistoryMetricCatalogItem) =>
      queryClient.fetchQuery({
        queryKey: queryKeys.monitors.history(monitor.id, `${item.metrics}.${item.metric}`, {
          monitorId: monitor.id,
          metric: `${item.metrics}.${item.metric}`,
          history: historyWindow,
          interval: historyInterval,
          start: historyTimeContext.start,
          end: historyTimeContext.end
        }),
        queryFn: () =>
          loadMonitorHistoryMetricDataFromFacade(api.monitors.historyMetric, monitor, item, {
            history: historyWindow,
            interval: historyInterval,
            start: historyTimeContext.start,
            end: historyTimeContext.end
          }),
        staleTime: 5000
      }),
    [historyInterval, historyTimeContext.end, historyTimeContext.start, historyWindow, monitor, queryClient]
  );

  function resetActiveHistoryInvestigationSelection() {
    resetHistoryInvestigationSelection(currentTab === 'favorites' && favoriteSurfaceMode === 'history' ? favoriteHistoryCatalogItems : filteredHistoryMetrics);
  }

  useEffect(() => {
    const nextWindow = resolveMonitorHistoryWindow(routeHistoryTimeContext.timeRange);
    if (nextWindow) {
      setHistoryWindow(nextWindow as (typeof HISTORY_WINDOWS)[number]['value']);
    }
    setHistoryTimeContext(routeHistoryTimeContext);
  }, [routeHistoryTimeContext]);

  useEffect(() => {
    setRefreshInterval(routeRefreshInterval);
  }, [routeRefreshInterval]);

  useEffect(() => {
    setVisibleRealtimeMetricCount(MONITOR_DETAIL_REALTIME_PAGE_SIZE);
  }, [metricSearch, metrics]);

  useEffect(() => {
    setVisibleHistoryChartCount(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);
  }, [historyMetricSearch, historyMetrics]);

  useEffect(() => {
    setVisibleFavoriteHistoryChartCount(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);
  }, [favoriteNames, historyMetrics]);

  useEffect(() => {
    setVisibleFavoriteRealtimeMetricCount(MONITOR_DETAIL_FAVORITE_REALTIME_PAGE_SIZE);
  }, [favoriteNames, metrics]);

  useEffect(() => {
    if (currentTab !== 'favorites' || favoriteSurfaceMode !== 'history') return;
    const first = favoriteHistoryCatalogItems[0];
    setSelectedHistoryMetricKey(first ? `${first.metrics}:${first.metric}` : null);
    setSelectedHistorySeriesKey(null);
    setSelectedHistoryPointIndex(null);
    setHistoryPayload(null);
    setHistoryPayloadError(null);
  }, [currentTab, favoriteHistoryCatalogItemKey, favoriteHistoryCatalogItems, favoriteSurfaceMode]);

  function resolveHistoryFavoriteToken(item: MonitorHistoryMetricCatalogItem) {
    const fullPath = `${item.metrics}.${item.metric}`;
    return favoriteNames.find(name => name === fullPath || name === item.metrics || name === item.metric) ?? null;
  }

  useEffect(() => {
    setGrafanaState(grafana ?? { enabled: false });
  }, [grafana]);

  useEffect(() => {
    setFavoriteNames(normalizeMonitorFavoriteNames(favoriteMetrics));
  }, [favoriteMetrics]);

  useEffect(() => {
    let cancelled = false;
    api.monitors.favoriteMetrics(monitor.id)
      .then(result => {
        if (!cancelled) {
          setFavoriteNames(normalizeMonitorFavoriteNames(result || []));
        }
      })
      .catch(() => {
        // Keep the current optimistic/local favorites state if refresh fails.
      });

    return () => {
      cancelled = true;
    };
  }, [favoriteMetrics, favoriteReloadToken, monitor.id]);

  useEffect(() => {
    let cancelled = false;
    api.monitors.grafanaDashboard<GrafanaDashboard | null>(monitor.id)
      .then(result => {
        if (!cancelled) {
          setGrafanaState(result ?? { enabled: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGrafanaState({ enabled: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [grafana, grafanaReloadToken, monitor.id]);

  useEffect(() => {
    if (shouldFallbackFromGrafanaTab(grafanaState.enabled, currentTab)) {
      setCurrentTab(lastRefreshableTab);
    }
  }, [currentTab, grafanaState.enabled, lastRefreshableTab]);

  useEffect(() => {
    setSelectedMetricKey(prev => (prev && filteredMetrics.some(metric => metric.name === prev) ? prev : filteredMetrics[0]?.name || null));
  }, [filteredMetrics, metricSearch, metrics]);

  useEffect(() => {
    const metricNames = displayedMetricNameKey ? displayedMetricNameKey.split('\u0000').filter(Boolean) : [];
    if (!shouldLoadRealtimeMetrics) {
      setMetricCardPayloads({});
      return;
    }
    if (metricNames.length === 0) {
      setMetricCardPayloads({});
      return;
    }

    let cancelled = false;
    setMetricCardPayloads(previous => {
      const next: Record<string, MetricCardPayloadState> = {};
      metricNames.forEach(name => {
        next[name] = {
          payload: previous[name]?.payload ?? null,
          loading: true,
          error: null
        };
      });
      return next;
    });

    Promise.all(
      metricNames.map(name =>
        loadMonitorRealtimeMetricDataFromFacade(api.monitors.realtimeMetric, monitor.id, name)
          .then(payload => ({ name, payload: payload as MonitorRealtimeMetricData | null, error: null }))
          .catch(error => ({
            name,
            payload: null,
            error: error instanceof Error ? error.message : t('common.load-failed')
          }))
      )
    ).then(results => {
      if (cancelled) return;
      setMetricCardPayloads(() => {
        const next: Record<string, MetricCardPayloadState> = {};
        results.forEach(result => {
          next[result.name] = {
            payload: result.payload,
            loading: false,
            error: result.error
          };
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [displayedMetricNameKey, metricReloadToken, monitor.id, shouldLoadRealtimeMetrics, t]);

  useEffect(() => {
    if (!shouldLoadHistoryCatalog) return;

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    loadMonitorHistoryMetricCatalogFromFacade(api.monitors.warehouseStorageStatus, api.monitors.historyMetricCatalogDefine, monitor)
      .then(rows => {
        if (!cancelled) {
          setHistoryMetrics(rows);
          setHistoryError(null);
        }
      })
      .catch(error => {
        if (!cancelled) {
          setHistoryMetrics([]);
          setHistoryError(error instanceof Error ? error.message : t('common.load-failed'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [historyCatalogReloadToken, monitor, shouldLoadHistoryCatalog, t]);

  useEffect(() => {
    setSelectedHistoryMetricKey(prev =>
      prev && filteredHistoryMetrics.some(item => `${item.metrics}:${item.metric}` === prev)
        ? prev
        : filteredHistoryMetrics[0]
          ? `${filteredHistoryMetrics[0].metrics}:${filteredHistoryMetrics[0].metric}`
          : null
    );
  }, [filteredHistoryMetrics, historyMetricSearch, historyMetrics]);

  useEffect(() => {
    const seriesKeys = historySeriesRows.map(row => row.key);
    setSelectedHistorySeriesKey(prev => (prev && seriesKeys.includes(prev) ? prev : seriesKeys[0] || null));
  }, [historyPayload, historySeriesRows, historySeriesSearch]);

  useEffect(() => {
    if (!selectedHistorySeriesKey || !historyPayload?.values?.[selectedHistorySeriesKey]?.length) {
      setSelectedHistoryPointIndex(null);
      return;
    }

    const values = historyPayload.values[selectedHistorySeriesKey];
    setSelectedHistoryPointIndex(prev => (prev != null && values[prev] ? prev : values.length - 1));
  }, [historyPayload, selectedHistorySeriesKey]);

  useEffect(() => {
    setSelectedFavoriteKey(prev => resolveActiveFavoriteRow(favoriteJumpRows, prev, favoriteSurfaceMode)?.key ?? null);
  }, [favoriteJumpRows, favoriteSurfaceMode]);

  useEffect(() => {
    setFavoriteSurfaceMode(current => resolveFavoriteSurfaceMode(current, favoriteJumpRows, selectedFavoriteKey));
  }, [favoriteJumpRows, selectedFavoriteKey]);

  useEffect(() => {
    if (!selectedFavoriteKey) return;
    const row = resolveActiveFavoriteRow(favoriteJumpRows, selectedFavoriteKey, favoriteSurfaceMode);
    if (!row) return;
    const target = resolveFavoriteJumpTarget(row);

    setFavoriteSurfaceMode(row.targetKind);

    if (row.targetKind === 'realtime') {
      setSelectedMetricKey(current => (current === target.targetKey ? current : target.targetKey));
      return;
    }

    setSelectedHistoryMetricKey(current => (current === target.targetKey ? current : target.targetKey));
  }, [favoriteJumpRows, favoriteSurfaceMode, selectedFavoriteKey]);

  useEffect(() => {
    if (!shouldLoadHistoryPayloads || !selectedHistoryMetric) {
      setHistoryPayload(null);
      setHistoryPayloadError(null);
      return;
    }
    let cancelled = false;
    setHistoryPayloadLoading(true);
    setHistoryPayloadError(null);
    readMonitorHistoryMetricPanelData(selectedHistoryMetric)
      .then(result => {
        if (!cancelled) {
          setHistoryPayload(result);
          setHistoryPayloadError(null);
        }
      })
      .catch(error => {
        if (!cancelled) {
          setHistoryPayload(null);
          setHistoryPayloadError(error instanceof Error ? error.message : t('common.load-failed'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryPayloadLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    historyInterval,
    historyReloadToken,
    historyTimeContext.end,
    historyTimeContext.from,
    historyTimeContext.start,
    historyTimeContext.timezone,
    historyTimeContext.to,
    historyWindow,
    monitor,
    readMonitorHistoryMetricPanelData,
    selectedHistoryMetric,
    shouldLoadHistoryPayloads,
    t
  ]);

  useEffect(() => {
    const shouldLoadChartGrid = currentTab === 'history' || (currentTab === 'favorites' && favoriteSurfaceMode === 'history');
    if (!shouldLoadChartGrid) return;

    const chartItems =
      currentTab === 'favorites' && favoriteSurfaceMode === 'history'
        ? favoriteHistoryChartItems
        : displayedHistoryChartItems;
    if (chartItems.length === 0) {
      setHistoryChartPayloads({});
      setHistoryChartLoadingKeys([]);
      setHistoryChartErrors({});
      return;
    }

    let cancelled = false;
    const chartKeys = chartItems.map(item => `${item.metrics}:${item.metric}`);
    setHistoryChartLoadingKeys(chartKeys);
    setHistoryChartErrors({});

    Promise.all(
      chartItems.map(item =>
        readMonitorHistoryMetricPanelData(item)
          .then(payload => ({ key: `${item.metrics}:${item.metric}`, payload }))
          .catch(error => ({
            key: `${item.metrics}:${item.metric}`,
            error: error instanceof Error ? error.message : t('common.load-failed')
          }))
      )
    ).then(results => {
      if (cancelled) return;

      const nextPayloads: Record<string, MonitorHistoryData | null> = {};
      const nextErrors: Record<string, string> = {};
      results.forEach(result => {
        if ('payload' in result) {
          nextPayloads[result.key] = result.payload;
          return;
        }
        nextPayloads[result.key] = null;
        nextErrors[result.key] = result.error;
      });
      setHistoryChartPayloads(nextPayloads);
      setHistoryChartErrors(nextErrors);
      setHistoryChartLoadingKeys([]);
    });

    return () => {
      cancelled = true;
    };
  }, [
    currentTab,
    favoriteHistoryChartItems,
    favoriteHistoryChartItemKey,
    favoriteSurfaceMode,
    displayedHistoryChartItems,
    historyInterval,
    historyMetricSearch,
    historyMetrics,
    historyReloadToken,
    historyTimeContext.end,
    historyTimeContext.from,
    historyTimeContext.start,
    historyTimeContext.timezone,
    historyTimeContext.to,
    historyWindow,
    monitor,
    readMonitorHistoryMetricPanelData,
    t
  ]);

  useEffect(() => {
    if (!shouldLoadRealtimeMetrics || !selectedMetric?.name) {
      setMetricPayload(null);
      setMetricPayloadError(null);
      return;
    }
    let cancelled = false;
    setMetricPayloadLoading(true);
    setMetricPayloadError(null);
    loadMonitorRealtimeMetricDataFromFacade(api.monitors.realtimeMetric, monitor.id, selectedMetric.name)
      .then(result => {
        if (!cancelled) {
          setMetricPayload(result);
          setMetricPayloadError(null);
        }
      })
      .catch(error => {
        if (!cancelled) {
          setMetricPayload(null);
          setMetricPayloadError(error instanceof Error ? error.message : t('common.load-failed'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMetricPayloadLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [metricReloadToken, monitor.id, selectedMetric?.name, shouldLoadRealtimeMetrics, t]);

  useEffect(() => {
    const tableRows = buildMonitorMetricTableMatrix(metricPayload as any, t).rows;
    setSelectedMetricRowKey(prev => (prev && tableRows.some(row => row.key === prev) ? prev : tableRows[0]?.key || null));
  }, [metricPayload, t]);

  useEffect(() => {
    setMetricTableMode(prev => resolveMonitorMetricTableMode(metricPayload as any, prev));
  }, [metricPayload]);

  const resetRealtimeInvestigationSelection = useCallback(() => {
    setMetricPayload(null);
    setMetricPayloadError(null);
    setSelectedMetricRowKey(null);
    setMetricTableMode('table');
  }, []);

  const handleRefresh = useCallback(() => {
    const refreshTarget = resolveMonitorDetailRefreshTarget(currentTab, lastRefreshableTab);
    if (refreshInterval > 0) {
      setRefreshCountdown(refreshInterval);
    }
    if (refreshTarget === 'history') {
      setVisibleHistoryChartCount(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);
      setHistoryReloadToken(prev => prev + 1);
      return;
    }
    if (refreshTarget === 'favorites') {
      setFavoriteReloadToken(prev => prev + 1);
      if (favoriteSurfaceMode === 'history') {
        resetHistoryInvestigationSelection(favoriteHistoryCatalogItems);
        setVisibleFavoriteHistoryChartCount(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);
        setHistoryReloadToken(prev => prev + 1);
      } else {
        setVisibleFavoriteRealtimeMetricCount(MONITOR_DETAIL_FAVORITE_REALTIME_PAGE_SIZE);
        resetRealtimeInvestigationSelection();
        setMetricReloadToken(prev => prev + 1);
      }
      return;
    }
    if (refreshTarget === 'grafana') {
      setGrafanaReloadToken(prev => prev + 1);
      return;
    }
    setVisibleRealtimeMetricCount(MONITOR_DETAIL_REALTIME_PAGE_SIZE);
    resetRealtimeInvestigationSelection();
    setMetricReloadToken(prev => prev + 1);
  }, [
    currentTab,
    favoriteHistoryCatalogItems,
    favoriteSurfaceMode,
    lastRefreshableTab,
    refreshInterval,
    resetHistoryInvestigationSelection,
    resetRealtimeInvestigationSelection
  ]);

  useEffect(() => {
    if (refreshInterval <= 0) return;

    const timer = window.setInterval(() => {
      handleRefresh();
    }, refreshInterval * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [handleRefresh, refreshInterval]);

  useEffect(() => {
    if (refreshInterval <= 0) {
      setRefreshCountdown(-1);
      return;
    }

    setRefreshCountdown(refreshInterval);
    const timer = window.setInterval(() => {
      setRefreshCountdown(current => (current <= 1 ? refreshInterval : current - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [refreshInterval]);

  async function handleToggleFavorite(metricName: string) {
    const favorited = favoriteNames.includes(metricName);
    try {
      if (favorited) {
        await removeMonitorFavoriteFromFacade(api.monitors.removeFavoriteMetric, monitor.id, metricName);
        setFavoriteNames(prev => normalizeMonitorFavoriteNames(prev.filter(item => item !== metricName)));
      } else {
        await addMonitorFavoriteFromFacade(api.monitors.addFavoriteMetric, monitor.id, metricName);
        setFavoriteNames(prev => normalizeMonitorFavoriteNames([...prev, metricName]));
      }
      setFavoriteMessage(t(favorited ? 'monitor.favorite.remove.success' : 'monitor.favorite.add.success'));
      setFavoriteError(null);
      void invalidateMonitorDetailQuery();
    } catch (error) {
      setFavoriteError(error instanceof Error ? error.message : t(favorited ? 'monitor.favorite.remove.failed' : 'monitor.favorite.add.failed'));
    }
  }

  async function handleToggleHistoryFavorite(item: MonitorHistoryMetricCatalogItem) {
    const favoriteToken = resolveHistoryFavoriteToken(item);
    const nextToken = `${item.metrics}.${item.metric}`;
    try {
      if (favoriteToken) {
        await removeMonitorFavoriteFromFacade(api.monitors.removeFavoriteMetric, monitor.id, favoriteToken);
        setFavoriteNames(prev => normalizeMonitorFavoriteNames(prev.filter(name => name !== favoriteToken)));
      } else {
        await addMonitorFavoriteFromFacade(api.monitors.addFavoriteMetric, monitor.id, nextToken);
        setFavoriteNames(prev => normalizeMonitorFavoriteNames([...prev, nextToken]));
      }
      setFavoriteMessage(t(favoriteToken ? 'monitor.favorite.remove.success' : 'monitor.favorite.add.success'));
      setFavoriteError(null);
      void invalidateMonitorDetailQuery();
    } catch (error) {
      setFavoriteError(error instanceof Error ? error.message : t(favoriteToken ? 'monitor.favorite.remove.failed' : 'monitor.favorite.add.failed'));
    }
  }

  function handlePreviewFavorite(key: string) {
    setSelectedFavoriteKey(key);
    const row = favoriteJumpRows.find(item => item.key === key);
    if (!row) return;
    setFavoriteSurfaceMode(row.targetKind);
    if (row.targetKind === 'realtime') {
      const target = resolveFavoriteJumpTarget(row);
      resetRealtimeInvestigationSelection();
      setSelectedMetricKey(target.targetKey);
    } else {
      const target = resolveFavoriteJumpTarget(row);
      setHistoryPayload(null);
      setHistoryPayloadError(null);
      setSelectedHistorySeriesKey(null);
      setSelectedHistoryPointIndex(null);
      setSelectedHistoryMetricKey(target.targetKey);
    }
  }

  function handleSelectFavorite(key: string) {
    handlePreviewFavorite(key);
    const row = favoriteJumpRows.find(item => item.key === key);
    if (!row) return;
    const nextTab = resolveFavoriteJumpTarget(row).tab;
    setLastRefreshableTab(nextTab);
    setCurrentTab(nextTab);
  }

  function handleSelectDetailTab(tab: MonitorDetailConsoleTabKey) {
    if (tab !== 'grafana') {
      setLastRefreshableTab(tab);
    }
    if (tab === 'realtime') {
      setVisibleRealtimeMetricCount(MONITOR_DETAIL_REALTIME_PAGE_SIZE);
      resetRealtimeInvestigationSelection();
      setMetricReloadToken(prev => prev + 1);
    }
    if (tab === 'history') {
      setVisibleHistoryChartCount(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);
      resetHistoryInvestigationSelection(filteredHistoryMetrics);
      setHistoryCatalogReloadToken(prev => prev + 1);
      setHistoryReloadToken(prev => prev + 1);
    }
    if (tab === 'favorites') {
      setVisibleFavoriteRealtimeMetricCount(MONITOR_DETAIL_FAVORITE_REALTIME_PAGE_SIZE);
      setVisibleFavoriteHistoryChartCount(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);
      setFavoriteReloadToken(prev => prev + 1);
      if (favoriteSurfaceMode === 'history') {
        resetHistoryInvestigationSelection(favoriteHistoryCatalogItems);
        setHistoryReloadToken(prev => prev + 1);
      } else {
        setMetricReloadToken(prev => prev + 1);
      }
    }
    setCurrentTab(tab);
  }

  function handleSetFavoriteSurfaceMode(mode: 'realtime' | 'history') {
    setFavoriteSurfaceMode(mode);
    if (mode === 'history') {
      setVisibleFavoriteHistoryChartCount(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);
    } else {
      setVisibleFavoriteRealtimeMetricCount(MONITOR_DETAIL_FAVORITE_REALTIME_PAGE_SIZE);
    }
    const rows = favoriteJumpRows.filter(row => row.targetKind === mode);
    const nextRow = rows.find(row => row.key === selectedFavoriteKey) ?? rows[0];
    if (nextRow) {
      handlePreviewFavorite(nextRow.key);
    }
  }

  function replaceMonitorHistoryTimeRoute(context: TimeContext) {
    const route = buildMonitorHistoryTimeRoute(monitor.id, searchParamString, context);
    router.replace(route);
    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', route);
    }
  }

  function handleApplyHistoryTimeContext(context: TimeContext) {
    const applied = normalizeMonitorHistoryTimeContext(context, historyTimeContext);
    const nextWindow = resolveMonitorHistoryWindow(applied.timeRange);
    if (nextWindow) {
      setHistoryWindow(nextWindow as (typeof HISTORY_WINDOWS)[number]['value']);
    }
    setHistoryTimeContext(applied);
    resetActiveHistoryInvestigationSelection();
    replaceMonitorHistoryTimeRoute(applied);
  }

  function handleSelectRefreshInterval(value: number) {
    setRefreshInterval(value);
    setRefreshCountdown(value > 0 ? value : -1);
    const nextRefreshContext = timeContextRefreshIntervalToContext(value);
    const applied = normalizeMonitorHistoryTimeContext({ ...historyTimeContext, ...nextRefreshContext }, DEFAULT_HISTORY_TIME_CONTEXT);
    setHistoryTimeContext(applied);
    replaceMonitorHistoryTimeRoute(applied);
  }

  function handleHistoryWindowChange(value: string) {
    const nextWindow = value as (typeof HISTORY_WINDOWS)[number]['value'];
    const nextContext = normalizeMonitorHistoryTimeContext({ timeRange: timeWindowToTimeRange(nextWindow) }, historyTimeContext);
    setHistoryWindow(nextWindow);
    setHistoryTimeContext(nextContext);
    resetActiveHistoryInvestigationSelection();
    replaceMonitorHistoryTimeRoute(nextContext);
  }

  function handleHistoryModeChange(value: boolean) {
    setHistoryInterval(value);
    resetActiveHistoryInvestigationSelection();
  }

  function handleSelectHistoryMetricKey(key: string) {
    setSelectedHistoryMetricKey(key);
    setSelectedHistorySeriesKey(null);
    setSelectedHistoryPointIndex(null);
    setHistoryPayload(null);
    setHistoryPayloadError(null);
  }

  function handleSelectMetricKey(key: string) {
    setSelectedMetricKey(key);
    resetRealtimeInvestigationSelection();
  }

  function handleMetricRefresh() {
    resetRealtimeInvestigationSelection();
    setMetricReloadToken(prev => prev + 1);
  }

  function handleHistoryRefresh() {
    if (refreshInterval > 0) {
      setRefreshCountdown(refreshInterval);
    }
    resetHistoryInvestigationSelection(filteredHistoryMetrics);
    setVisibleHistoryChartCount(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);
    setHistoryCatalogReloadToken(prev => prev + 1);
    setHistoryReloadToken(prev => prev + 1);
  }

  function handleFavoriteHistoryRefresh() {
    if (refreshInterval > 0) {
      setRefreshCountdown(refreshInterval);
    }
    resetHistoryInvestigationSelection(favoriteHistoryCatalogItems);
    setVisibleFavoriteHistoryChartCount(MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE);
    setFavoriteReloadToken(prev => prev + 1);
    setHistoryReloadToken(prev => prev + 1);
  }

  async function handleRemoveFavoriteToken(token: string) {
    try {
      await removeMonitorFavoriteFromFacade(api.monitors.removeFavoriteMetric, monitor.id, token);
      setFavoriteNames(prev => normalizeMonitorFavoriteNames(prev.filter(name => name !== token)));
      setFavoriteMessage(t('monitor.favorite.remove.success'));
      setFavoriteError(null);
      void invalidateMonitorDetailQuery();
    } catch (error) {
      setFavoriteError(error instanceof Error ? error.message : t('monitor.favorite.remove.failed'));
    }
  }

  async function handleDeleteGrafanaDashboard() {
    try {
      await deleteMonitorGrafanaDashboardFromFacade(api.monitors.deleteGrafanaDashboard, monitor.id);
      setGrafanaState({ enabled: false });
      setGrafanaMessage(t('common.delete-success'));
      setGrafanaError(null);
      void invalidateMonitorDetailQuery();
    } catch (error) {
      setGrafanaError(error instanceof Error ? error.message : t('common.delete-failed'));
    }
  }

  useEffect(() => {
    let disposed = false;
    if (navigationContext.entityId) {
      setEntityBindingCandidates([]);
      return () => {
        disposed = true;
      };
    }
    setEntityBindingCandidates(null);
    api.entities.monitorCandidates(monitor.id)
      .then(candidates => {
        if (!disposed) {
          setEntityBindingCandidates(Array.isArray(candidates) ? candidates : []);
        }
      })
      .catch(() => {
        if (!disposed) {
          setEntityBindingCandidates([]);
        }
      });
    return () => {
      disposed = true;
    };
  }, [monitor.id, navigationContext.entityId]);

  const appDefinitionKey = resolveMonitorDetailAppContext(monitor, navigationContext);
  const detailNavigationContext = appDefinitionKey ? { ...navigationContext, app: appDefinitionKey } : navigationContext;
  const backHref = buildMonitorListReturnHref({ ...navigationContext, app: appDefinitionKey });
  const editHref = buildMonitorEditHref(monitor.id, navigationContext);
  const helpHref = appDefinitionKey ? `https://hertzbeat.apache.org/docs/help/${encodeURIComponent(appDefinitionKey)}` : null;
  const currentMonitorHref = searchParamString
    ? `/monitors/${encodeURIComponent(String(monitor.id))}?${searchParamString}`
    : `/monitors/${encodeURIComponent(String(monitor.id))}`;
  const alreadyBoundEntity = findAlreadyBoundEntityCandidate(entityBindingCandidates);
  const entityBindingLoading = !navigationContext.entityId && entityBindingCandidates == null;
  const navigationEntityHref = navigationContext.entityId != null
    ? buildMonitorBoundEntityHref(navigationContext.entityId, monitor.id, currentMonitorHref)
    : null;
  const navigationEntityName = navigationContext.entityName ?? null;
  const entityBoundHref = alreadyBoundEntity?.entityId != null
    ? buildMonitorBoundEntityHref(alreadyBoundEntity.entityId, monitor.id, currentMonitorHref)
    : navigationEntityHref;
  const entityBoundName = alreadyBoundEntity?.entityName ?? navigationEntityName;
  const monitorEntityDraftHref = navigationContext.entityId || entityBindingLoading || entityBoundHref
    ? null
    : buildMonitorEntityDraftHref(monitor.id, currentMonitorHref);
  const sections = MonitorDetailSections({
    monitor,
    editHref,
    params,
    selectedMetric,
    metricSearch,
    metricRows,
    realtimeMetricTotalCount: filteredMetrics.length,
    realtimeMetricHasMore,
    metricCardPayloads,
    metrics,
    favoriteNames,
    favoriteJumpRows,
    selectedFavoriteKey,
    favoriteSurfaceMode,
    favoriteRealtimeMetricVisibleCount: visibleFavoriteRealtimeMetricCount,
    favoriteRealtimeMetricTotalCount: favoriteRealtimeRows.length,
    favoriteRealtimeMetricHasMore,
    selectedMetricKey,
    metricPayload,
    metricPayloadLoading,
    metricPayloadError,
    selectedMetricRowKey,
    metricTableMode,
    metricFullscreen,
    historyLoading,
    historyError,
    historyMetrics,
    historyMetricSearch,
    historyRows,
    historyChartVisibleCount: visibleHistoryChartCount,
    historyChartTotalCount: filteredHistoryMetrics.length,
    historyChartHasMore,
    selectedHistoryMetricKey,
    historySeriesSearch,
    historySeriesRows,
    selectedHistorySeriesKey,
    selectedHistoryPointIndex,
    historyPayload,
    historyChartPayloads,
    historyChartLoadingKeys,
    historyChartErrors,
    historyPayloadLoading,
    historyPayloadError,
    historyInterval,
    historyWindow,
    historyTimeContext,
    historyWindows: HISTORY_WINDOWS.map(option => ({ value: option.value, label: t(option.labelKey) })),
    historyModes: HISTORY_MODES.map(option => ({ value: option.value, label: t(option.labelKey) })),
    historyFullscreen,
    favoriteHistoryChartVisibleCount: visibleFavoriteHistoryChartCount,
    favoriteHistoryChartTotalCount: favoriteHistoryCatalogItems.length,
    favoriteHistoryChartHasMore,
    grafanaState,
    grafanaMessage,
    grafanaError,
    favoriteMessage,
    favoriteError,
    onMetricSearchChange: setMetricSearch,
    onSelectMetric: handleSelectMetricKey,
    onToggleFavorite: handleToggleFavorite,
    onLoadMoreRealtimeMetrics: () =>
      setVisibleRealtimeMetricCount(prev => Math.min(prev + MONITOR_DETAIL_REALTIME_PAGE_SIZE, filteredMetrics.length)),
    onSelectMetricRow: setSelectedMetricRowKey,
    onMetricModeChange: setMetricTableMode,
    onMetricRefresh: handleMetricRefresh,
    onMetricFullscreenToggle: () => setMetricFullscreen(prev => !prev),
    onHistoryMetricSearchChange: setHistoryMetricSearch,
    onSelectHistoryMetric: handleSelectHistoryMetricKey,
    onToggleHistoryFavorite: handleToggleHistoryFavorite,
    onHistorySeriesSearchChange: setHistorySeriesSearch,
    onSelectHistorySeries: setSelectedHistorySeriesKey,
    onSelectHistoryPoint: setSelectedHistoryPointIndex,
    onHistoryRefresh: handleHistoryRefresh,
    onFavoriteHistoryRefresh: handleFavoriteHistoryRefresh,
    onLoadMoreHistoryCharts: () =>
      setVisibleHistoryChartCount(prev => Math.min(prev + MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE, filteredHistoryMetrics.length)),
    onHistoryWindowChange: handleHistoryWindowChange,
    onHistoryTimeContextApply: handleApplyHistoryTimeContext,
    onApplyHistoryChartZoomTimeRange: handleApplyHistoryTimeContext,
    onHistoryModeChange: handleHistoryModeChange,
    onHistoryFullscreenToggle: () => setHistoryFullscreen(prev => !prev),
    onSelectFavorite: handleSelectFavorite,
    onSetFavoriteSurfaceMode: handleSetFavoriteSurfaceMode,
    onLoadMoreFavoriteRealtimeMetrics: () =>
      setVisibleFavoriteRealtimeMetricCount(prev =>
        Math.min(prev + MONITOR_DETAIL_FAVORITE_REALTIME_PAGE_SIZE, favoriteRealtimeRows.length)
      ),
    onLoadMoreFavoriteHistoryCharts: () =>
      setVisibleFavoriteHistoryChartCount(prev =>
        Math.min(prev + MONITOR_DETAIL_HISTORY_CHART_PAGE_SIZE, favoriteHistoryCatalogItems.length)
      ),
    onRemoveFavoriteToken: handleRemoveFavoriteToken,
    onDeleteGrafanaDashboard: handleDeleteGrafanaDashboard,
    t
  });

  return (
    <MonitorDetailConsole
      monitor={monitor}
      currentTab={currentTab}
      refreshTarget={resolveMonitorDetailRefreshTarget(currentTab, lastRefreshableTab)}
      grafanaRefreshFallbackTab={lastRefreshableTab}
      refreshInterval={refreshInterval}
      refreshCountdown={refreshCountdown}
      backHref={backHref}
      editHref={editHref}
      helpHref={helpHref}
      entityDraftHref={monitorEntityDraftHref}
      entityBoundHref={entityBoundHref}
      entityBoundName={entityBoundName}
      appHref={appDefinitionKey ? `/setting/define?app=${encodeURIComponent(appDefinitionKey)}` : null}
      grafanaUrl={grafanaState.enabled ? grafanaState.url : null}
      navigationContext={detailNavigationContext}
      onSelectTab={handleSelectDetailTab}
      onSelectRefreshInterval={handleSelectRefreshInterval}
      onRefresh={handleRefresh}
      realtimeContent={sections.realtimeContent}
      historyContent={sections.historyContent}
      favoritesContent={sections.favoritesContent}
      grafanaContent={sections.grafanaContent}
      t={t}
    />
  );
}

export default function MonitorDetailPage({ monitorId }: { monitorId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const routeNavigationContext = useMemo(() => readMonitorDetailNavigationContext(searchParams), [searchParams]);
  const routeListReturnHref = useMemo(() => buildMonitorListReturnHref(routeNavigationContext), [routeNavigationContext]);
  const monitorDetailUrl = useMemo(() => buildMonitorDetailUrl(monitorId), [monitorId]);
  const monitorDetailGrafanaUrl = useMemo(() => buildMonitorGrafanaUrl(monitorId), [monitorId]);
  const monitorDetailFavoriteUrl = useMemo(() => buildMonitorFavoriteUrl(monitorId), [monitorId]);
  const monitorDetailCacheKey = useMemo(
    () => ['monitor-detail', monitorDetailUrl, monitorDetailGrafanaUrl, monitorDetailFavoriteUrl].join(':'),
    [monitorDetailFavoriteUrl, monitorDetailGrafanaUrl, monitorDetailUrl]
  );
  const load = useCallback(async (): Promise<MonitorDetailData> => {
    return queryClient.fetchQuery({
      queryKey: queryKeys.monitors.detail(monitorId),
      queryFn: () =>
        loadMonitorDetailBundleFromFacade(
          api.monitors.detail<MonitorDetailResponse>,
          api.monitors.grafanaDashboard,
          api.monitors.favoriteMetrics,
          monitorId
        ),
      staleTime: 5000
    });
  }, [monitorId, queryClient]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('monitor.detail.loading')}
      cacheKey={monitorDetailCacheKey}
      renderLoading={visible => (
        <section
          className="mx-auto w-full max-w-[1320px] px-3 py-6"
          data-monitor-detail-route-state={visible ? 'loading' : 'deferred'}
          data-monitor-detail-route-state-owner="hertzbeat-ui-loading-state"
          data-monitor-detail-loading-state="angular-route-state"
          aria-busy="true"
        >
          {visible ? (
            <HzLoadingState
              title={t('monitor.route-state.loading.title')}
              description={t('monitor.route-state.loading.copy')}
              rows={3}
              data-monitor-detail-route-state-loading="true"
            />
          ) : null}
        </section>
      )}
      renderError={(message, retry) => (
        <section
          className="mx-auto w-full max-w-[1320px] px-3 py-6"
          data-monitor-detail-route-state="error"
          data-monitor-detail-route-state-owner="hertzbeat-ui-inline-feedback"
          data-monitor-detail-error-state="angular-route-state"
        >
          <HzInlineFeedback
            tone="critical"
            title={t('monitor.route-state.error.title')}
            description={(
              <>
                {t('monitor.route-state.error.copy')}
                <span className="sr-only"> {message}</span>
              </>
            )}
            variant="embedded"
            data-monitor-detail-route-state-feedback="error"
          />
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <HzButton
              size="sm"
              intent="primary"
              data-monitor-detail-route-state-retry="true"
              data-monitor-detail-route-state-retry-owner="hertzbeat-ui-button"
              onClick={retry}
            >
              {t('monitor.route-state.action.retry')}
            </HzButton>
            <HzButton
              size="sm"
              intent="secondary"
              data-monitor-detail-route-state-list-return="true"
              data-monitor-detail-route-state-list-return-owner="hertzbeat-ui-button"
              data-monitor-detail-route-state-list-return-target={routeListReturnHref}
              onClick={() => router.push(routeListReturnHref)}
            >
              {t('monitor.detail.back')}
            </HzButton>
          </div>
        </section>
      )}
    >
      {data => <MonitorDetailWorkbench data={data} />}
    </ClientWorkbench>
  );
}
