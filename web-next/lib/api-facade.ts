import { apiDownload, apiGet, apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from './api-client';
import { buildAlertGroupDeleteUrl } from './alert-group/controller';
import { buildAlertGroupUrl, type AlertGroupListQuery } from './alert-group/query-state';
import { buildAlertInhibitDeleteUrl, buildAlertInhibitDetailUrl } from './alert-inhibit/controller';
import { buildAlertInhibitUrl, type AlertInhibitListQuery } from './alert-inhibit/query-state';
import { buildAlertGroupCloseMutationUrl, buildAlertGroupStatusMutationUrl } from './alert-manage/controller';
import { buildAlertListUrl, type AlertQueryState } from './alert-manage/query-state';
import {
  buildNoticeListUrl,
  buildNoticeReceiverPayload,
  buildNoticeRulePayload,
  buildNoticeTemplateListUrl,
  buildNoticeTemplatePayload,
  type NoticeReceiverDraft,
  type NoticeRuleDisplayNames,
  type NoticeRuleDraft,
  type NoticeListQuery,
  type NoticeTemplateDraft,
  type NoticeTemplateListQuery
} from './alert-notice/controller';
import { buildAlertSilenceDeleteUrl, buildAlertSilenceDetailUrl } from './alert-silence/controller';
import { buildAlertSilenceUrl, type AlertSilenceListQuery } from './alert-silence/query-state';
import { buildAlertDefineDeleteUrl, type DatasourceStatusPayload } from './alert-setting/controller';
import { buildDefineListUrl, type AlertSettingAppEntry } from './alert-setting/query-state';
import { buildEntityDetailUrl } from './entity-detail/controller';
import {
  buildEntityDefinitionActivitiesUrl,
  buildEntityDefinitionTemplatesUrl,
  buildEntityDefinitionUrl
} from './entity-definition/controller';
import { buildDiscoveryGovernanceActivitiesUrl, buildDiscoveryGovernancePresetsUrl } from './entity-discovery/controller';
import { buildEntityEditorCatalogSuggestionsUrl, buildEntityEditorEntityUrl } from './entity-editor/controller';
import { buildImportActivitiesUrl, buildImportTemplatesUrl } from './entity-import/controller';
import { buildEntityUrl, type EntityQueryState } from './entity-manage/query-state';
import {
  buildMonitorDetailUrl,
  buildMonitorFavoriteUrl,
  buildMonitorGrafanaUrl,
  buildMonitorHistoryCatalogUrl,
  buildMonitorRealtimeMetricUrl,
  type MonitorHistoryMetricCatalogItem,
  type MonitorHistoryCatalogDefineResponse,
  buildMonitorHistoryMetricDataUrl
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
import { buildTopologyApiUrl } from './topology-surface/controller';
import type { EntityTopologyApiGraph, TopologyRouteContext } from './topology-surface/view-model';
import type {
  EntityCatalogSuggestions,
  EntityDefinitionActivity,
  EntityDefinitionFormat,
  EntityDefinitionWorkspaceTemplate,
  EntityDiscoveryGovernanceActivity,
  EntityDiscoveryGovernancePreset,
  EntityDto,
  EntitySummaryInfo,
  AlertSummary,
  AlertGroupConverge,
  AlertDefine,
  GroupAlert,
  AlertInhibit,
  AlertSilence,
  Label,
  LogEntry,
  Monitor,
  MonitorHistoryData,
  NoticeReceiver,
  NoticeRule,
  NoticeTemplate,
  PageResult,
  CollectorSummary,
  DashboardSummary,
  ParamDefine,
  SingleAlert,
  TraceDetail,
  TraceSpanNode
} from './types';

type ApiReadOptions = RequestInit;
type MonitorListQuery = string | URLSearchParams | Record<string, string | number | boolean | undefined | null>;
type EntityAlertsQuery = {
  pageIndex?: number;
  pageSize?: number;
  severity?: string | null;
  status?: string | null;
};

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

function buildEntityAlertsUrl(entityId: string | number, query: EntityAlertsQuery = {}) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex ?? 0),
    pageSize: String(query.pageSize ?? 20)
  });
  const severity = query.severity?.trim();
  const status = query.status?.trim();
  if (severity) {
    params.set('severity', severity);
  }
  if (status) {
    params.set('status', status);
  }
  return `/entities/${encodeURIComponent(String(entityId))}/alerts?${params.toString()}`;
}

export const api = {
  session: {
    current: <T = unknown>() => apiMessageGet<T>('/account/session'),
    refresh: <T = unknown>() => apiMessagePost<T>('/account/auth/refresh', null)
  },
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
  },
  entities: {
    list: <T = PageResult<EntitySummaryInfo>>(query: EntityQueryState) => apiMessageGet<T>(buildEntityUrl(query)),
    detail: <T = unknown>(entityId: string | number) => apiMessageGet<T>(buildEntityDetailUrl(String(entityId))),
    alerts: (entityId: string | number, query?: EntityAlertsQuery) => apiMessageGet<PageResult<SingleAlert>>(buildEntityAlertsUrl(entityId, query)),
    editorEntity: <T = EntityDto>(entityId: string | number) => apiMessageGet<T>(buildEntityEditorEntityUrl(String(entityId))),
    catalogSuggestions: <T = EntityCatalogSuggestions>(limit = 120) =>
      apiMessageGet<T>(buildEntityEditorCatalogSuggestionsUrl(limit)),
    definition: (entityId: string | number, format: EntityDefinitionFormat) =>
      apiMessageGet<string>(buildEntityDefinitionUrl(String(entityId), format)),
    definitionActivities: (entityId: string | number, limit = 8) =>
      apiMessageGet<EntityDefinitionActivity[]>(buildEntityDefinitionActivitiesUrl(String(entityId), limit)),
    definitionTemplates: (limit = 8) => apiMessageGet<EntityDefinitionWorkspaceTemplate[]>(buildEntityDefinitionTemplatesUrl(limit)),
    importActivities: (limit = 8) => apiMessageGet<EntityDefinitionActivity[]>(buildImportActivitiesUrl(limit)),
    importTemplates: (limit = 8) => apiMessageGet<EntityDefinitionWorkspaceTemplate[]>(buildImportTemplatesUrl(limit)),
    discoveryGovernancePresets: (limit = 8) =>
      apiMessageGet<EntityDiscoveryGovernancePreset[]>(buildDiscoveryGovernancePresetsUrl(limit)),
    discoveryGovernanceActivities: (limit = 8) =>
      apiMessageGet<EntityDiscoveryGovernanceActivity[]>(buildDiscoveryGovernanceActivitiesUrl(limit))
  },
  metrics: {
    monitorRealtime: <T = unknown>(monitorId: string | number, metricName: string) =>
      apiMessageGet<T>(buildMonitorRealtimeMetricUrl(String(monitorId), metricName)),
    query: <T = unknown>(path: string, init?: ApiReadOptions) => apiMessageGet<T>(path, init)
  },
  logs: {
    list: (query?: MonitorListQuery) => apiMessageGet<PageResult<LogEntry>>(appendQuery('/logs/list', query)),
    query: <T = unknown>(path: string, init?: ApiReadOptions) => apiMessageGet<T>(path, init)
  },
  traces: {
    detail: (traceId: string) => apiMessageGet<TraceDetail>(`/traces/${encodeURIComponent(traceId)}`),
    spans: (traceId: string) => apiMessageGet<TraceSpanNode[]>(`/traces/${encodeURIComponent(traceId)}/spans`),
    query: <T = unknown>(path: string, init?: ApiReadOptions) => apiMessageGet<T>(path, init)
  },
  topology: {
    graph: (context: TopologyRouteContext = {}, init?: ApiReadOptions) =>
      apiMessageGet<EntityTopologyApiGraph>(buildTopologyApiUrl(context), init),
    request: <T = unknown>(path: string, init?: ApiReadOptions) => apiMessageGet<T>(path, init)
  },
  overview: {
    summary: () => apiMessageGet<DashboardSummary>('/summary'),
    alerts: (query?: MonitorListQuery) => apiMessageGet<PageResult<SingleAlert>>(appendQuery('/alerts', query))
  },
  alerts: {
    list: <T = unknown>(query?: MonitorListQuery) => apiMessageGet<T>(appendQuery('/alerts', query)),
    settings: <T = unknown>(query?: MonitorListQuery) => apiMessageGet<T>(appendQuery('/alert/setting', query)),
    summary: () => apiMessageGet<AlertSummary>('/alerts/summary'),
    groupAlerts: (query: AlertQueryState) => apiMessageGet<PageResult<GroupAlert>>(buildAlertListUrl(query)),
    query: <T = unknown>(path: string, init?: ApiReadOptions) => apiMessageGet<T>(path, init),
    update: <T = unknown>(path: string, body: unknown) => apiMessagePut<T>(path, body),
    groupStatus: (status: 'acknowledged' | 'resolved' | 'firing', ids: number | number[]) =>
      apiMessagePut<unknown>(buildAlertGroupStatusMutationUrl(status, ids), null),
    groupClose: (ids: number | number[]) => apiMessageDelete<unknown>(buildAlertGroupCloseMutationUrl(ids))
  },
  alertSettings: {
    list: (search = '', pageIndex = 0, pageSize = 8, appEntries: AlertSettingAppEntry[] = []) =>
      apiMessageGet<PageResult<AlertDefine>>(buildDefineListUrl(search, pageIndex, pageSize, appEntries)),
    appDefines: (locale?: string | null) =>
      apiMessageGet<Record<string, string>>(`/apps/defines?lang=${encodeURIComponent(locale || 'en_US')}`),
    datasourceStatus: () => apiGet<DatasourceStatusPayload>('/alert/define/datasource/status'),
    detail: (id: number) => apiMessageGet<AlertDefine>(`/alert/define/${id}`),
    create: (payload: unknown) => apiMessagePost<unknown>('/alert/define', payload),
    update: (payload: unknown) => apiMessagePut<unknown>('/alert/define', payload),
    delete: (ids: number[]) => apiMessageDelete<unknown>(buildAlertDefineDeleteUrl(ids))
  },
  alertGroups: {
    list: (query: AlertGroupListQuery) => apiMessageGet<PageResult<AlertGroupConverge>>(buildAlertGroupUrl(query)),
    detail: (id: number) => apiMessageGet<AlertGroupConverge>(`/alert/group/${id}`),
    create: (payload: unknown) => apiMessagePost<unknown>('/alert/group', payload),
    update: (payload: unknown) => apiMessagePut<unknown>('/alert/group', payload),
    delete: (ids: number[]) => apiMessageDelete<unknown>(buildAlertGroupDeleteUrl(ids))
  },
  alertLabels: {
    list: () => apiMessageGet<PageResult<Label>>('/label?pageIndex=0&pageSize=9999')
  },
  alertNotice: {
    receivers: {
      list: (query?: NoticeListQuery) => apiMessageGet<PageResult<NoticeReceiver>>(buildNoticeListUrl('/notice/receivers', query)),
      options: () => apiMessageGet<PageResult<NoticeReceiver>>(buildNoticeListUrl('/notice/receivers', { pageIndex: 0, pageSize: 1000 })),
      detail: (id: number) => apiMessageGet<NoticeReceiver>(`/notice/receiver/${id}`),
      create: (draft: NoticeReceiverDraft) => apiMessagePost<unknown>('/notice/receiver', buildNoticeReceiverPayload(draft)),
      update: (draft: NoticeReceiverDraft) => apiMessagePut<unknown>('/notice/receiver', buildNoticeReceiverPayload(draft)),
      delete: (id: number) => apiMessageDelete<unknown>(`/notice/receiver/${id}`),
      sendTest: (draft: NoticeReceiverDraft) => apiMessagePost<unknown>('/notice/receiver/send-test-msg', buildNoticeReceiverPayload(draft))
    },
    rules: {
      list: (query?: NoticeListQuery) => apiMessageGet<PageResult<NoticeRule>>(buildNoticeListUrl('/notice/rules', query)),
      detail: (id: number) => apiMessageGet<NoticeRule>(`/notice/rule/${id}`),
      create: (draft: NoticeRuleDraft, displayNames?: NoticeRuleDisplayNames) => apiMessagePost<unknown>('/notice/rule', buildNoticeRulePayload(draft, displayNames)),
      update: (draft: NoticeRuleDraft, displayNames?: NoticeRuleDisplayNames) => apiMessagePut<unknown>('/notice/rule', buildNoticeRulePayload(draft, displayNames)),
      delete: (id: number) => apiMessageDelete<unknown>(`/notice/rule/${id}`)
    },
    templates: {
      list: (query?: NoticeTemplateListQuery) => apiMessageGet<PageResult<NoticeTemplate>>(buildNoticeTemplateListUrl(query)),
      options: async () => {
        const [presetTemplates, customTemplates] = await Promise.all([
          apiMessageGet<PageResult<NoticeTemplate>>(buildNoticeTemplateListUrl({ pageIndex: 0, pageSize: 1000, preset: true })),
          apiMessageGet<PageResult<NoticeTemplate>>(buildNoticeTemplateListUrl({ pageIndex: 0, pageSize: 1000, preset: false }))
        ]);
        return {
          content: [...presetTemplates.content, ...customTemplates.content],
          totalElements: (presetTemplates.totalElements || 0) + (customTemplates.totalElements || 0),
          pageIndex: 0,
          pageSize: presetTemplates.content.length + customTemplates.content.length
        };
      },
      detail: (id: number) => apiMessageGet<NoticeTemplate>(`/notice/template/${id}`),
      create: (draft: NoticeTemplateDraft) => apiMessagePost<unknown>('/notice/template', { ...buildNoticeTemplatePayload(draft), preset: false }),
      update: (draft: NoticeTemplateDraft) => apiMessagePut<unknown>('/notice/template', buildNoticeTemplatePayload(draft)),
      delete: (id: number) => apiMessageDelete<unknown>(`/notice/template/${id}`)
    }
  },
  alertInhibits: {
    list: (query: AlertInhibitListQuery) => apiMessageGet<PageResult<AlertInhibit>>(buildAlertInhibitUrl(query)),
    detail: (id: number) => apiMessageGet<AlertInhibit>(buildAlertInhibitDetailUrl(id)),
    create: (payload: unknown) => apiMessagePost<unknown>('/alert/inhibit', payload),
    update: (payload: unknown) => apiMessagePut<unknown>('/alert/inhibit', payload),
    delete: (ids: number[]) => apiMessageDelete<unknown>(buildAlertInhibitDeleteUrl(ids))
  },
  alertSilences: {
    list: (query: AlertSilenceListQuery) => apiMessageGet<PageResult<AlertSilence>>(buildAlertSilenceUrl(query)),
    detail: (id: number) => apiMessageGet<AlertSilence>(buildAlertSilenceDetailUrl(id)),
    create: (payload: unknown) => apiMessagePost<unknown>('/alert/silence', payload),
    update: (payload: unknown) => apiMessagePut<unknown>('/alert/silence', payload),
    delete: (ids: number[]) => apiMessageDelete<unknown>(buildAlertSilenceDeleteUrl(ids))
  }
} as const;

export type HertzBeatApiFacade = typeof api;
