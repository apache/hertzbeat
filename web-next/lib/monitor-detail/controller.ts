import type { GrafanaDashboard, Monitor, MonitorDetailMetric, MonitorHistoryData, Param } from '@/lib/types';
import { readEpochMillisTimeParam, readStepParam } from '@/lib/time-context';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiPost = <T>(url: string, payload: unknown) => Promise<T>;
type ApiDelete = <T>(url: string) => Promise<T>;
type MonitorRealtimeMetricReader = <T = unknown>(monitorId: string | number, metricName: string) => Promise<T>;
type MonitorHistoryMetricReader = (
  monitor: Monitor,
  item: MonitorHistoryMetricCatalogItem,
  query?: MonitorHistoryQuery
) => Promise<MonitorHistoryData>;
type MonitorHistoryStorageStatusReader = () => Promise<unknown>;
type MonitorHistoryCatalogDefineReader = (monitor: Monitor) => Promise<MonitorHistoryCatalogDefineResponse>;
export type MonitorDetailResponse = {
  monitor: Monitor;
  params?: Param[];
  metrics?: MonitorDetailMetric[];
};
type MonitorDetailReader = (monitorId: string | number) => Promise<MonitorDetailResponse>;
type MonitorGrafanaReader = <T = GrafanaDashboard | null>(monitorId: string | number) => Promise<T>;
type MonitorFavoriteMetricsReader = (monitorId: string | number) => Promise<string[]>;

export type MonitorDetailBundle = {
  monitor: Monitor;
  params: Param[];
  metrics: MonitorDetailMetric[];
  favoriteMetrics: string[];
  grafana: GrafanaDashboard;
};

export type MonitorHistoryMetricCatalogItem = {
  metrics: string;
  metric: string;
  unit?: string;
};

type MonitorHistoryQuery = {
  history?: string;
  interval?: boolean;
  start?: string;
  end?: string;
  step?: string;
};

function normalizeGrafanaDashboard(grafana: GrafanaDashboard | null | undefined): GrafanaDashboard {
  return grafana ?? { enabled: false };
}

export function buildMonitorDetailUrl(monitorId: string) {
  return `/monitor/${monitorId}`;
}

export async function loadMonitorDetail(apiGet: ApiGetter, monitorId: string) {
  return apiGet<Monitor>(buildMonitorDetailUrl(monitorId));
}

export function buildMonitorGrafanaUrl(monitorId: string) {
  return `/grafana/dashboard?monitorId=${monitorId}`;
}

export async function deleteMonitorGrafanaDashboard(apiDelete: ApiDelete, monitorId: string) {
  return apiDelete<void>(buildMonitorGrafanaUrl(monitorId));
}

export async function deleteMonitorGrafanaDashboardFromFacade(deleteGrafanaDashboard: (monitorId: string | number) => Promise<unknown>, monitorId: string | number) {
  return deleteGrafanaDashboard(monitorId);
}

export function buildMonitorFavoriteUrl(monitorId: string, metricName?: string) {
  return metricName == null
    ? `/metrics/favorite/${monitorId}`
    : `/metrics/favorite/${monitorId}/${encodeURIComponent(metricName)}`;
}

export function buildMonitorHistoryCatalogUrl(monitor: Monitor) {
  const app = monitor.scrape && monitor.scrape !== 'static' ? monitor.scrape : monitor.app;
  if (app === 'push') {
    return `/apps/${monitor.id}/pushdefine`;
  }
  if (app === 'prometheus') {
    return `/apps/${monitor.id}/define/dynamic`;
  }
  return `/apps/${app}/define`;
}

type AppDefineMetricField = {
  type?: number;
  field?: string;
  unit?: string;
};

type AppDefineMetric = {
  name: string;
  fields?: AppDefineMetricField[];
  visible?: boolean;
};

export type MonitorHistoryCatalogDefineResponse = {
  metrics?: AppDefineMetric[];
};

export function extractHistoryMetricCatalog(define: MonitorHistoryCatalogDefineResponse): MonitorHistoryMetricCatalogItem[] {
  const rows: MonitorHistoryMetricCatalogItem[] = [];
  for (const metric of define.metrics || []) {
    if (metric.visible === false) continue;
    for (const field of metric.fields || []) {
      if (field.type === 0 && field.field) {
        rows.push({
          metrics: metric.name,
          metric: field.field,
          unit: field.unit
        });
      }
    }
  }
  return rows;
}

export async function loadMonitorHistoryMetricCatalog(apiGet: ApiGetter, monitor: Monitor) {
  await apiGet<unknown>('/warehouse/storage/status');
  const define = await apiGet<MonitorHistoryCatalogDefineResponse>(buildMonitorHistoryCatalogUrl(monitor));
  return extractHistoryMetricCatalog(define);
}

export async function loadMonitorHistoryMetricCatalogFromFacade(
  readWarehouseStorageStatus: MonitorHistoryStorageStatusReader,
  readHistoryCatalogDefine: MonitorHistoryCatalogDefineReader,
  monitor: Monitor
) {
  await readWarehouseStorageStatus();
  const define = await readHistoryCatalogDefine(monitor);
  return extractHistoryMetricCatalog(define);
}

function resolveMonitorHistoryApp(monitor: Monitor) {
  const app = monitor.scrape && monitor.scrape !== 'static' ? monitor.scrape : monitor.app;
  if (app === 'prometheus') {
    return `_prometheus_${monitor.name}`;
  }
  return app;
}

export function buildMonitorHistoryMetricDataUrl(
  monitor: Monitor,
  item: MonitorHistoryMetricCatalogItem,
  query: MonitorHistoryQuery = {}
) {
  const params = new URLSearchParams({
    history: query.history || '30m',
    interval: String(query.interval ?? false)
  });
  const start = readEpochMillisTimeParam(query.start);
  const end = readEpochMillisTimeParam(query.end);
  const step = readStepParam(query.step);
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  if (step) params.set('step', step);
  const metricFull = `${resolveMonitorHistoryApp(monitor)}.${item.metrics}.${item.metric}`;
  return `/monitor/${encodeURIComponent(monitor.instance)}/metric/${metricFull}?${params.toString()}`;
}

export async function loadMonitorHistoryMetricData(
  apiGet: ApiGetter,
  monitor: Monitor,
  item: MonitorHistoryMetricCatalogItem,
  query?: MonitorHistoryQuery
) {
  return apiGet<MonitorHistoryData>(buildMonitorHistoryMetricDataUrl(monitor, item, query));
}

export async function loadMonitorHistoryMetricDataFromFacade(
  readHistoryMetric: MonitorHistoryMetricReader,
  monitor: Monitor,
  item: MonitorHistoryMetricCatalogItem,
  query?: MonitorHistoryQuery
) {
  return readHistoryMetric(monitor, item, query);
}

export function buildMonitorRealtimeMetricUrl(monitorId: string, metricName: string) {
  return `/monitor/${monitorId}/metrics/${encodeURIComponent(metricName)}`;
}

export async function loadMonitorFavoriteMetrics(apiGet: ApiGetter, monitorId: string) {
  return apiGet<string[]>(buildMonitorFavoriteUrl(monitorId));
}

export async function addMonitorFavorite(apiPost: ApiPost, monitorId: string, metricName: string) {
  return apiPost<void>(buildMonitorFavoriteUrl(monitorId, metricName), null);
}

export async function addMonitorFavoriteFromFacade(addFavorite: (monitorId: string | number, metricName: string) => Promise<unknown>, monitorId: string | number, metricName: string) {
  return addFavorite(monitorId, metricName);
}

export async function removeMonitorFavorite(apiDelete: ApiDelete, monitorId: string, metricName: string) {
  return apiDelete<void>(buildMonitorFavoriteUrl(monitorId, metricName));
}

export async function removeMonitorFavoriteFromFacade(removeFavorite: (monitorId: string | number, metricName: string) => Promise<unknown>, monitorId: string | number, metricName: string) {
  return removeFavorite(monitorId, metricName);
}

export async function loadMonitorRealtimeMetricData(apiGet: ApiGetter, monitorId: string, metricName: string) {
  return apiGet<unknown>(buildMonitorRealtimeMetricUrl(monitorId, metricName));
}

export async function loadMonitorRealtimeMetricDataFromFacade(
  readRealtimeMetric: MonitorRealtimeMetricReader,
  monitorId: string | number,
  metricName: string
) {
  return readRealtimeMetric<unknown>(monitorId, metricName);
}

export async function loadMonitorDetailBundle(apiGet: ApiGetter, monitorId: string) {
  const [detail, grafana, favoriteMetrics] = await Promise.all([
    apiGet<MonitorDetailResponse>(buildMonitorDetailUrl(monitorId)),
    apiGet<GrafanaDashboard | null>(buildMonitorGrafanaUrl(monitorId))
      .then(result => normalizeGrafanaDashboard(result))
      .catch(() => ({ enabled: false } satisfies GrafanaDashboard)),
    apiGet<string[]>(buildMonitorFavoriteUrl(monitorId)).catch(() => [])
  ]);

  return {
    monitor: detail.monitor,
    params: detail.params || [],
    metrics: detail.metrics || [],
    favoriteMetrics: favoriteMetrics || [],
    grafana: normalizeGrafanaDashboard(grafana)
  } satisfies MonitorDetailBundle;
}

export async function loadMonitorDetailBundleFromFacade(
  readMonitorDetail: MonitorDetailReader,
  readGrafanaDashboard: MonitorGrafanaReader,
  readFavoriteMetrics: MonitorFavoriteMetricsReader,
  monitorId: string | number
) {
  const [detail, grafana, favoriteMetrics] = await Promise.all([
    readMonitorDetail(monitorId),
    readGrafanaDashboard<GrafanaDashboard | null>(monitorId)
      .then(result => normalizeGrafanaDashboard(result))
      .catch(() => ({ enabled: false } satisfies GrafanaDashboard)),
    readFavoriteMetrics(monitorId).catch(() => [])
  ]);

  return {
    monitor: detail.monitor,
    params: detail.params || [],
    metrics: detail.metrics || [],
    favoriteMetrics: favoriteMetrics || [],
    grafana: normalizeGrafanaDashboard(grafana)
  } satisfies MonitorDetailBundle;
}
