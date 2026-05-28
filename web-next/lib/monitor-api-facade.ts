import { apiDownload, apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from './api-client';
import {
  buildMonitorDetailUrl,
  buildMonitorFavoriteUrl,
  buildMonitorGrafanaUrl,
  buildMonitorHistoryCatalogUrl,
  buildMonitorHistoryMetricDataUrl,
  buildMonitorRealtimeMetricUrl,
  type MonitorHistoryCatalogDefineResponse,
  type MonitorHistoryMetricCatalogItem
} from './monitor-detail/controller';
import {
  buildMonitorEditorCollectorsUrl,
  buildMonitorEditorMonitorUrl,
  buildMonitorEditorParamDefinesUrl,
  type MonitorDetailResponse
} from './monitor-editor/controller';
import {
  buildCopyMonitorUrl,
  buildDeleteMonitorsUrl,
  buildEnableMonitorsUrl,
  buildExportAllMonitorsUrl,
  buildExportMonitorsUrl,
  buildImportMonitorsUrl,
  buildPauseMonitorsUrl
} from './monitor-manage/controller';
import { buildMonitorUrl, type MonitorQueryState } from './monitor-manage/query-state';
import type { CollectorSummary, Monitor, MonitorHistoryData, PageResult, ParamDefine } from './types';

type MonitorListQuery = string | URLSearchParams | Record<string, string | number | boolean | undefined | null>;

function appendQuery(path: string, query?: MonitorListQuery) {
  if (!query) return path;
  const params =
    typeof query === 'string'
      ? new URLSearchParams(query.startsWith('?') ? query.slice(1) : query)
      : query instanceof URLSearchParams
        ? query
        : new URLSearchParams(
            Object.entries(query).flatMap(([key, value]) => (value == null || value === '' ? [] : [[key, String(value)]]))
          );
  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export const api = {
  monitors: {
    list: <T = PageResult<Monitor>>(query?: MonitorListQuery) => apiMessageGet<T>(appendQuery('/monitors/manage', query)),
    page: <T = PageResult<Monitor>>(query: MonitorQueryState) => apiMessageGet<T>(buildMonitorUrl(query)),
    detail: <T = Monitor>(monitorId: string | number) => apiMessageGet<T>(buildMonitorDetailUrl(String(monitorId))),
    editorDetail: <T = MonitorDetailResponse>(monitorId: string | number) =>
      apiMessageGet<T>(buildMonitorEditorMonitorUrl(String(monitorId))),
    editorCollectors: <T = { content?: CollectorSummary[] }>() => apiMessageGet<T>(buildMonitorEditorCollectorsUrl()),
    editorParamDefines: (app: string) => apiMessageGet<ParamDefine[]>(buildMonitorEditorParamDefinesUrl(app)),
    favoriteMetrics: (monitorId: string | number) => apiMessageGet<string[]>(buildMonitorFavoriteUrl(String(monitorId))),
    addFavoriteMetric: (monitorId: string | number, metricName: string) =>
      apiMessagePost<unknown>(buildMonitorFavoriteUrl(String(monitorId), metricName), null),
    removeFavoriteMetric: (monitorId: string | number, metricName: string) =>
      apiMessageDelete<unknown>(buildMonitorFavoriteUrl(String(monitorId), metricName)),
    grafanaDashboard: <T = unknown>(monitorId: string | number) => apiMessageGet<T>(buildMonitorGrafanaUrl(String(monitorId))),
    deleteGrafanaDashboard: (monitorId: string | number) => apiMessageDelete<unknown>(buildMonitorGrafanaUrl(String(monitorId))),
    realtimeMetric: <T = unknown>(monitorId: string | number, metricName: string) =>
      apiMessageGet<T>(buildMonitorRealtimeMetricUrl(String(monitorId), metricName)),
    warehouseStorageStatus: <T = unknown>() => apiMessageGet<T>('/warehouse/storage/status'),
    historyMetricCatalogDefine: (monitor: Monitor) =>
      apiMessageGet<MonitorHistoryCatalogDefineResponse>(buildMonitorHistoryCatalogUrl(monitor)),
    historyMetric: (monitor: Monitor, item: MonitorHistoryMetricCatalogItem, query?: Parameters<typeof buildMonitorHistoryMetricDataUrl>[2]) =>
      apiMessageGet<MonitorHistoryData>(buildMonitorHistoryMetricDataUrl(monitor, item, query)),
    copy: (monitorId: string | number) => apiMessagePost<unknown>(buildCopyMonitorUrl(monitorId), null),
    enable: (ids: Array<string | number>) => apiMessageGet<unknown>(buildEnableMonitorsUrl(ids)),
    pause: (ids: Array<string | number>) => apiMessageDelete<unknown>(buildPauseMonitorsUrl(ids)),
    delete: (ids: Array<string | number>) => apiMessageDelete<unknown>(buildDeleteMonitorsUrl(ids)),
    appHierarchy: <T = unknown>(locale?: string | null) =>
      apiMessageGet<T>(`/apps/hierarchy${locale ? `?lang=${encodeURIComponent(locale)}` : ''}`),
    create: <T = unknown>(payload: unknown) => apiMessagePost<T>('/monitor', payload),
    update: <T = unknown>(payload: unknown) => apiMessagePut<T>('/monitor', payload),
    detect: <T = unknown>(payload: unknown) => apiMessagePost<T>('/monitor/detect', payload),
    import: <T = unknown>(body: FormData) => apiMessagePost<T>(buildImportMonitorsUrl(), body),
    export: (ids: Array<string | number>, type: 'JSON' | 'EXCEL') => apiMessageGet<Blob>(buildExportMonitorsUrl(ids, type)),
    exportAll: (type: 'JSON' | 'EXCEL') => apiMessageGet<Blob>(buildExportAllMonitorsUrl(type)),
    exportResponse: (ids: Array<string | number>, type: 'JSON' | 'EXCEL') => apiDownload(buildExportMonitorsUrl(ids, type)),
    exportAllResponse: (type: 'JSON' | 'EXCEL') => apiDownload(buildExportAllMonitorsUrl(type))
  }
};
