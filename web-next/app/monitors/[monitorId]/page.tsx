'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { MonitorDetailConsole, type MonitorDetailConsoleTabKey } from '@/components/monitor-detail/monitor-detail-console';
import { MonitorDetailSections } from '@/components/monitor-detail/monitor-detail-sections';
import { useI18n } from '@/components/providers/i18n-provider';
import { apiMessageDelete, apiMessageGet, apiMessagePost } from '@/lib/api-client';
import { formatTime } from '@/lib/format';
import {
  addMonitorFavorite,
  buildMonitorGrafanaUrl,
  deleteMonitorGrafanaDashboard,
  loadMonitorDetailBundle,
  loadMonitorFavoriteMetrics,
  loadMonitorHistoryMetricCatalog,
  loadMonitorHistoryMetricData,
  loadMonitorRealtimeMetricData,
  removeMonitorFavorite,
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
  buildMonitorMetricTableMatrix
} from '@/lib/monitor-detail/view-model';
import {
  buildMonitorSignalHandoffLinks,
  readMonitorDetailNavigationContext,
  resolveActiveFavoriteRow,
  resolveFavoriteSurfaceMode,
  resolveFavoriteJumpTarget,
  resolveMonitorDetailRefreshTarget,
  shouldFallbackFromGrafanaTab
} from '@/lib/monitor-detail/detail-route-state';
import { buildMonitorDetailHref, buildMonitorEditHref, buildMonitorListReturnHref } from '@/lib/monitor-manage/navigation';
import { sanitizeTimeContext, type TimeContext } from '@/lib/time-context';
import type { GrafanaDashboard, Monitor, MonitorDetailMetric, MonitorHistoryData, MonitorRealtimeMetricData, Param } from '@/lib/types';

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

function historyWindowToTimeRange(value: string | undefined) {
  if (!value) return undefined;
  if (value.startsWith('last-')) return value.toLowerCase();
  return `last-${value.toLowerCase()}`;
}

function timeRangeToHistoryWindow(value: string | undefined) {
  if (!value) return null;
  const normalized = value.replace(/^last-/, '');
  const nextWindow = normalized.endsWith('w') ? normalized.replace('w', 'W') : normalized;
  return HISTORY_WINDOWS.some(option => option.value === nextWindow) ? nextWindow : null;
}

function MonitorDetailWorkbench({ data }: { data: MonitorDetailData }) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const { monitor, params, metrics, favoriteMetrics, grafana } = data;
  const navigationContext = readMonitorDetailNavigationContext(searchParams);
  const [grafanaState, setGrafanaState] = useState<GrafanaDashboard>(grafana ?? { enabled: false });
  const [grafanaMessage, setGrafanaMessage] = useState<string | null>(null);
  const [grafanaError, setGrafanaError] = useState<string | null>(null);
  const [selectedMetricKey, setSelectedMetricKey] = useState<string | null>(null);
  const [favoriteNames, setFavoriteNames] = useState<string[]>(favoriteMetrics);
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
  const [historyWindow, setHistoryWindow] = useState<(typeof HISTORY_WINDOWS)[number]['value']>('1h');
  const [historyTimeContext, setHistoryTimeContext] = useState<TimeContext>({ timeRange: 'last-1h' });
  const [historyInterval, setHistoryInterval] = useState<(typeof HISTORY_MODES)[number]['value']>(false);
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
  const [favoriteSurfaceMode, setFavoriteSurfaceMode] = useState<'realtime' | 'history'>('realtime');
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [refreshCountdown, setRefreshCountdown] = useState<number>(30);
  const [favoriteReloadToken, setFavoriteReloadToken] = useState(0);
  const [grafanaReloadToken, setGrafanaReloadToken] = useState(0);

  const filteredMetrics = filterMonitorMetricCatalog(metrics, metricSearch);
  const displayedMetrics = filteredMetrics.slice(0, 10);
  const displayedMetricNames = displayedMetrics.map(metric => metric.name).filter(Boolean);
  const displayedMetricNameKey = displayedMetricNames.join('\u0000');
  const metricRows = buildMonitorMetricCatalogRows(displayedMetrics, t);
  const selectedMetric = filteredMetrics.find(metric => metric.name === selectedMetricKey) ?? filteredMetrics[0] ?? null;
  const filteredHistoryMetrics = filterMonitorHistoryMetricCatalog(historyMetrics, historyMetricSearch);
  const historyRows = buildMonitorHistoryMetricRows(filteredHistoryMetrics, t);
  const selectedHistoryMetric = filteredHistoryMetrics.find(item => `${item.metrics}:${item.metric}` === selectedHistoryMetricKey) ?? filteredHistoryMetrics[0] ?? null;
  const historySeriesRows = filterMonitorHistorySeriesRows(buildMonitorHistorySeriesRows(historyPayload, t, formatTime), historySeriesSearch);
  const favoriteJumpRows = buildMonitorFavoriteJumpRows(favoriteNames, metrics, historyMetrics, t);
  const [selectedFavoriteKey, setSelectedFavoriteKey] = useState<string | null>(null);

  function resolveHistoryFavoriteToken(item: MonitorHistoryMetricCatalogItem) {
    const fullPath = `${item.metrics}.${item.metric}`;
    return favoriteNames.find(name => name === fullPath || name === item.metrics || name === item.metric) ?? null;
  }

  useEffect(() => {
    setGrafanaState(grafana ?? { enabled: false });
  }, [grafana]);

  useEffect(() => {
    setFavoriteNames(favoriteMetrics);
  }, [favoriteMetrics]);

  useEffect(() => {
    let cancelled = false;
    loadMonitorFavoriteMetrics(apiMessageGet as any, String(monitor.id))
      .then(result => {
        if (!cancelled) {
          setFavoriteNames(result || []);
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
    apiMessageGet<GrafanaDashboard | null>(buildMonitorGrafanaUrl(String(monitor.id)))
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
      setCurrentTab('realtime');
    }
  }, [currentTab, grafanaState.enabled]);

  useEffect(() => {
    setSelectedMetricKey(prev => (prev && filteredMetrics.some(metric => metric.name === prev) ? prev : filteredMetrics[0]?.name || null));
  }, [filteredMetrics, metricSearch, metrics]);

  useEffect(() => {
    const metricNames = displayedMetricNameKey ? displayedMetricNameKey.split('\u0000').filter(Boolean) : [];
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
        loadMonitorRealtimeMetricData(apiMessageGet, String(monitor.id), name)
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
  }, [displayedMetricNameKey, metricReloadToken, monitor.id, t]);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    loadMonitorHistoryMetricCatalog(apiMessageGet, monitor)
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
  }, [monitor, t]);

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
    setSelectedFavoriteKey(prev => resolveActiveFavoriteRow(favoriteJumpRows, prev)?.key ?? null);
  }, [favoriteJumpRows]);

  useEffect(() => {
    setFavoriteSurfaceMode(current => resolveFavoriteSurfaceMode(current, favoriteJumpRows, selectedFavoriteKey));
  }, [favoriteJumpRows, selectedFavoriteKey]);

  useEffect(() => {
    const row = resolveActiveFavoriteRow(favoriteJumpRows, selectedFavoriteKey);
    if (!row) return;
    const target = resolveFavoriteJumpTarget(row);

    setFavoriteSurfaceMode(row.targetKind);

    if (row.targetKind === 'realtime') {
      setSelectedMetricKey(current => (current === target.targetKey ? current : target.targetKey));
      return;
    }

    setSelectedHistoryMetricKey(current => (current === target.targetKey ? current : target.targetKey));
  }, [favoriteJumpRows, selectedFavoriteKey]);

  useEffect(() => {
    if (!selectedHistoryMetric) {
      setHistoryPayload(null);
      setHistoryPayloadError(null);
      return;
    }
    let cancelled = false;
    setHistoryPayloadLoading(true);
    setHistoryPayloadError(null);
    loadMonitorHistoryMetricData(apiMessageGet, monitor, selectedHistoryMetric, {
      history: historyWindow,
      interval: historyInterval,
      start: historyTimeContext.start,
      end: historyTimeContext.end
    })
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
  }, [historyInterval, historyReloadToken, historyTimeContext.end, historyTimeContext.start, historyWindow, monitor, selectedHistoryMetric, t]);

  useEffect(() => {
    if (currentTab !== 'history') return;

    const chartItems = filterMonitorHistoryMetricCatalog(historyMetrics, historyMetricSearch).slice(0, 6);
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
        loadMonitorHistoryMetricData(apiMessageGet, monitor, item, {
          history: historyWindow,
          interval: historyInterval,
          start: historyTimeContext.start,
          end: historyTimeContext.end
        })
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
  }, [currentTab, historyInterval, historyMetricSearch, historyMetrics, historyReloadToken, historyTimeContext.end, historyTimeContext.start, historyWindow, monitor, t]);

  useEffect(() => {
    if (!selectedMetric?.name) {
      setMetricPayload(null);
      setMetricPayloadError(null);
      return;
    }
    let cancelled = false;
    setMetricPayloadLoading(true);
    setMetricPayloadError(null);
    loadMonitorRealtimeMetricData(apiMessageGet, String(monitor.id), selectedMetric.name)
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
  }, [metricReloadToken, monitor.id, selectedMetric?.name, t]);

  useEffect(() => {
    const tableRows = buildMonitorMetricTableMatrix(metricPayload as any, t).rows;
    setSelectedMetricRowKey(prev => (prev && tableRows.some(row => row.key === prev) ? prev : tableRows[0]?.key || null));
  }, [metricPayload, t]);

  useEffect(() => {
    setMetricTableMode(prev => resolveMonitorMetricTableMode(metricPayload as any, prev));
  }, [metricPayload]);

  const handleRefresh = useCallback(() => {
    const refreshTarget = resolveMonitorDetailRefreshTarget(currentTab);
    if (refreshInterval > 0) {
      setRefreshCountdown(refreshInterval);
    }
    if (refreshTarget === 'history') {
      setHistoryReloadToken(prev => prev + 1);
      return;
    }
    if (refreshTarget === 'favorites') {
      setFavoriteReloadToken(prev => prev + 1);
      return;
    }
    if (refreshTarget === 'grafana') {
      setGrafanaReloadToken(prev => prev + 1);
      return;
    }
    setMetricReloadToken(prev => prev + 1);
  }, [currentTab, refreshInterval]);

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
    try {
      if (favoriteNames.includes(metricName)) {
        await removeMonitorFavorite(apiMessageDelete as any, String(monitor.id), metricName);
        setFavoriteNames(prev => prev.filter(item => item !== metricName));
      } else {
        await addMonitorFavorite(apiMessagePost as any, String(monitor.id), metricName);
        setFavoriteNames(prev => [...prev, metricName]);
      }
      setFavoriteMessage(t('common.save-success'));
      setFavoriteError(null);
    } catch (error) {
      setFavoriteError(error instanceof Error ? error.message : t('common.save-failed'));
    }
  }

  async function handleToggleHistoryFavorite(item: MonitorHistoryMetricCatalogItem) {
    const favoriteToken = resolveHistoryFavoriteToken(item);
    const nextToken = `${item.metrics}.${item.metric}`;
    try {
      if (favoriteToken) {
        await removeMonitorFavorite(apiMessageDelete as any, String(monitor.id), favoriteToken);
        setFavoriteNames(prev => prev.filter(name => name !== favoriteToken));
      } else {
        await addMonitorFavorite(apiMessagePost as any, String(monitor.id), nextToken);
        setFavoriteNames(prev => [...prev, nextToken]);
      }
      setFavoriteMessage(t('common.save-success'));
      setFavoriteError(null);
    } catch (error) {
      setFavoriteError(error instanceof Error ? error.message : t('common.save-failed'));
    }
  }

  function handlePreviewFavorite(key: string) {
    setSelectedFavoriteKey(key);
    const row = favoriteJumpRows.find(item => item.key === key);
    if (!row) return;
    setFavoriteSurfaceMode(row.targetKind);
    if (row.targetKind === 'realtime') {
      const target = resolveFavoriteJumpTarget(row);
      setMetricPayload(null);
      setMetricPayloadError(null);
      setSelectedMetricRowKey(null);
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
    setCurrentTab(resolveFavoriteJumpTarget(row).tab);
  }

  function handleSetFavoriteSurfaceMode(mode: 'realtime' | 'history') {
    setFavoriteSurfaceMode(mode);
    const rows = favoriteJumpRows.filter(row => row.targetKind === mode);
    const nextRow = rows.find(row => row.key === selectedFavoriteKey) ?? rows[0];
    if (nextRow) {
      handlePreviewFavorite(nextRow.key);
    }
  }

  function handleApplyHistoryTimeContext(context: TimeContext) {
    const sanitized = sanitizeTimeContext(context);
    const nextWindow = timeRangeToHistoryWindow(sanitized.timeRange);
    if (nextWindow) {
      setHistoryWindow(nextWindow as (typeof HISTORY_WINDOWS)[number]['value']);
    }
    setHistoryTimeContext(
      sanitized.start && sanitized.end
        ? sanitized
        : { timeRange: sanitized.timeRange || historyWindowToTimeRange(historyWindow) }
    );
  }

  function handleHistoryWindowChange(value: string) {
    const nextWindow = value as (typeof HISTORY_WINDOWS)[number]['value'];
    setHistoryWindow(nextWindow);
    setHistoryTimeContext({ timeRange: historyWindowToTimeRange(nextWindow) });
  }

  async function handleRemoveFavoriteToken(token: string) {
    try {
      await removeMonitorFavorite(apiMessageDelete as any, String(monitor.id), token);
      setFavoriteNames(prev => prev.filter(name => name !== token));
      setFavoriteMessage(t('common.save-success'));
      setFavoriteError(null);
    } catch (error) {
      setFavoriteError(error instanceof Error ? error.message : t('common.save-failed'));
    }
  }

  async function handleDeleteGrafanaDashboard() {
    try {
      await deleteMonitorGrafanaDashboard(apiMessageDelete as any, String(monitor.id));
      setGrafanaState({ enabled: false });
      setGrafanaMessage(t('common.delete-success'));
      setGrafanaError(null);
    } catch (error) {
      setGrafanaError(error instanceof Error ? error.message : t('common.delete-failed'));
    }
  }

  const backHref = buildMonitorListReturnHref(navigationContext);
  const editHref = buildMonitorEditHref(monitor.id, navigationContext);
  const detailHref = buildMonitorDetailHref(monitor.id, navigationContext);
  const signalHandoffLinks = buildMonitorSignalHandoffLinks(monitor, navigationContext, detailHref);
  const helpHref = navigationContext.app || monitor.app ? `https://hertzbeat.apache.org/docs/help/${encodeURIComponent(navigationContext.app || monitor.app)}` : null;
  const sections = MonitorDetailSections({
    monitor,
    editHref,
    params,
    selectedMetric,
    metricSearch,
    metricRows,
    metricCardPayloads,
    metrics,
    favoriteNames,
    favoriteJumpRows,
    selectedFavoriteKey,
    favoriteSurfaceMode,
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
    grafanaState,
    grafanaMessage,
    grafanaError,
    favoriteMessage,
    favoriteError,
    onMetricSearchChange: setMetricSearch,
    onSelectMetric: setSelectedMetricKey,
    onToggleFavorite: handleToggleFavorite,
    onSelectMetricRow: setSelectedMetricRowKey,
    onMetricModeChange: setMetricTableMode,
    onMetricRefresh: () => setMetricReloadToken(prev => prev + 1),
    onMetricFullscreenToggle: () => setMetricFullscreen(prev => !prev),
    onHistoryMetricSearchChange: setHistoryMetricSearch,
    onSelectHistoryMetric: setSelectedHistoryMetricKey,
    onToggleHistoryFavorite: handleToggleHistoryFavorite,
    onHistorySeriesSearchChange: setHistorySeriesSearch,
    onSelectHistorySeries: setSelectedHistorySeriesKey,
    onSelectHistoryPoint: setSelectedHistoryPointIndex,
    onHistoryRefresh: () => setHistoryReloadToken(prev => prev + 1),
    onHistoryWindowChange: handleHistoryWindowChange,
    onHistoryTimeContextApply: handleApplyHistoryTimeContext,
    onApplyHistoryChartZoomTimeRange: handleApplyHistoryTimeContext,
    onHistoryModeChange: setHistoryInterval,
    onHistoryFullscreenToggle: () => setHistoryFullscreen(prev => !prev),
    onSelectFavorite: handleSelectFavorite,
    onSetFavoriteSurfaceMode: handleSetFavoriteSurfaceMode,
    onRemoveFavoriteToken: handleRemoveFavoriteToken,
    onDeleteGrafanaDashboard: handleDeleteGrafanaDashboard,
    t
  });

  return (
    <MonitorDetailConsole
      monitor={monitor}
      currentTab={currentTab}
      refreshInterval={refreshInterval}
      refreshCountdown={refreshCountdown}
      backHref={backHref}
      editHref={editHref}
      helpHref={helpHref}
      appHref={navigationContext.app ? `/setting/define?app=${encodeURIComponent(navigationContext.app)}` : null}
      grafanaUrl={grafanaState.enabled ? grafanaState.url : null}
      navigationContext={navigationContext}
      signalHandoffLinks={signalHandoffLinks}
      onSelectTab={setCurrentTab}
      onSelectRefreshInterval={setRefreshInterval}
      onRefresh={handleRefresh}
      realtimeContent={sections.realtimeContent}
      historyContent={sections.historyContent}
      favoritesContent={sections.favoritesContent}
      grafanaContent={sections.grafanaContent}
      t={t}
    />
  );
}

export default function MonitorDetailPage({ params }: { params: Promise<{ monitorId: string }> }) {
  const { t } = useI18n();
  const load = useCallback(async (): Promise<MonitorDetailData> => {
    const resolved = await params;
    return loadMonitorDetailBundle(apiMessageGet, resolved.monitorId);
  }, [params]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('monitor.detail.loading')}>
      {data => <MonitorDetailWorkbench data={data} />}
    </ClientWorkbench>
  );
}
