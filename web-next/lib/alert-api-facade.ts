import { apiGet, apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from './api-client';
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
  type NoticeListQuery,
  type NoticeReceiverDraft,
  type NoticeRuleDisplayNames,
  type NoticeRuleDraft,
  type NoticeTemplateDraft,
  type NoticeTemplateListQuery
} from './alert-notice/controller';
import { buildAlertSilenceDeleteUrl, buildAlertSilenceDetailUrl } from './alert-silence/controller';
import { buildAlertSilenceUrl, type AlertSilenceListQuery } from './alert-silence/query-state';
import { buildAlertDefineDeleteUrl, type DatasourceStatusPayload } from './alert-setting/controller';
import { buildDefineListUrl, type AlertSettingAppEntry } from './alert-setting/query-state';
import type {
  AlertDefine,
  AlertGroupConverge,
  AlertInhibit,
  AlertSilence,
  AlertSummary,
  GroupAlert,
  Label,
  NoticeReceiver,
  NoticeRule,
  NoticeTemplate,
  PageResult,
  SingleAlert
} from './types';

type ApiReadOptions = RequestInit;
type AlertListQuery = string | URLSearchParams | Record<string, string | number | boolean | undefined | null>;
type EntityAlertsQuery = {
  pageIndex?: number;
  pageSize?: number;
  severity?: string | null;
  status?: string | null;
};

function appendQuery(path: string, query?: AlertListQuery) {
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
  entities: {
    alerts: (entityId: string | number, query?: EntityAlertsQuery) => apiMessageGet<PageResult<SingleAlert>>(buildEntityAlertsUrl(entityId, query))
  },
  alerts: {
    list: <T = unknown>(query?: AlertListQuery) => apiMessageGet<T>(appendQuery('/alerts', query)),
    settings: <T = unknown>(query?: AlertListQuery) => apiMessageGet<T>(appendQuery('/alert/setting', query)),
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

export type HertzBeatAlertApiFacade = typeof api;
