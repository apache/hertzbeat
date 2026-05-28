import type { AlertSilence, PageResult, SingleAlert } from '@/lib/types';
import { DEFAULT_ALERT_LABEL_OPTIONS, type AlertLabelOptions } from '../alert-label-options';
import { type AlertSilenceListQuery } from './query-state';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiMutator = <T>(url: string, payload?: unknown) => Promise<T>;
type AlertSilencePayload = Omit<AlertSilence, 'id'> & { id?: number };
type AlertSilenceListReader = (query: AlertSilenceListQuery) => Promise<PageResult<AlertSilence>>;
type AlertSilenceDetailReader = (id: number) => Promise<AlertSilence>;
type EntityAlertReader = (entityId: number) => Promise<PageResult<SingleAlert>>;
type AlertLabelOptionsReader = () => Promise<AlertLabelOptions>;
type AlertSilenceWriter = (payload: AlertSilencePayload) => Promise<unknown>;
type AlertSilenceDeleter = (ids: number[]) => Promise<unknown>;

export type AlertSilenceFormDraft = {
  id?: number;
  name: string;
  enable: boolean;
  matchAll: boolean;
  type: '0' | '1';
  labelsText: string;
  daysText: string;
  periodStart: string;
  periodEnd: string;
};

export type AlertSilenceEntityPrefillResult = {
  draftPatch: Partial<AlertSilenceFormDraft>;
  source: 'alerts-common-labels' | 'none';
  warning: string | null;
};

type AlertSilenceFormDraftFallback = Partial<AlertSilenceFormDraft>;

export function buildAlertSilenceDetailUrl(id: number) {
  return `/alert/silence/${id}`;
}

export function buildAlertSilenceDeleteUrl(ids: number | number[]) {
  const params = new URLSearchParams();
  const values = Array.isArray(ids) ? ids : [ids];
  values.forEach(id => params.append('ids', String(id)));
  return `/alert/silences?${params.toString()}`;
}

export function buildEntityAlertsForSilencePrefillUrl(entityId: number) {
  const params = new URLSearchParams({
    pageIndex: '0',
    pageSize: '20',
    status: 'firing'
  });
  return `/entities/${entityId}/alerts?${params.toString()}`;
}

export function extractExactCommonAlertLabels(alerts: SingleAlert[]): Record<string, string> {
  if (alerts.length === 0) return {};
  const firstLabels = alerts[0]?.labels || {};
  return Object.entries(firstLabels).reduce<Record<string, string>>((acc, [key, value]) => {
    if (alerts.every(alert => alert.labels != null && alert.labels[key] === value)) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function formatLabelsText(labels: Record<string, string>) {
  return Object.entries(labels)
    .map(([key, value]) => `${key}:${value}`)
    .join(', ');
}

export async function buildAlertSilenceEntityPrefill(
  apiGet: ApiGetter,
  entityId: string,
  warningCopy: string,
  noEntityIdWarningCopy: string
): Promise<AlertSilenceEntityPrefillResult> {
  const normalizedEntityId = Number(entityId);
  if (!Number.isFinite(normalizedEntityId) || normalizedEntityId <= 0) {
    return { draftPatch: { labelsText: '' }, source: 'none', warning: noEntityIdWarningCopy };
  }

  try {
    const page = await apiGet<PageResult<SingleAlert>>(buildEntityAlertsForSilencePrefillUrl(normalizedEntityId));
    const alerts = page.content || [];
    const commonLabels = extractExactCommonAlertLabels(alerts);
    if (alerts.length > 0 && Object.keys(commonLabels).length > 0) {
      return {
        draftPatch: {
          matchAll: false,
          labelsText: formatLabelsText(commonLabels)
        },
        source: 'alerts-common-labels',
        warning: null
      };
    }
  } catch {
    // Fall through to the Angular-compatible manual-entry warning.
  }

  return { draftPatch: { labelsText: '' }, source: 'none', warning: warningCopy };
}

export async function buildAlertSilenceEntityPrefillFromFacade(
  readEntityAlerts: EntityAlertReader,
  entityId: string,
  warningCopy: string,
  noEntityIdWarningCopy: string
): Promise<AlertSilenceEntityPrefillResult> {
  const normalizedEntityId = Number(entityId);
  if (!Number.isFinite(normalizedEntityId) || normalizedEntityId <= 0) {
    return { draftPatch: { labelsText: '' }, source: 'none', warning: noEntityIdWarningCopy };
  }

  try {
    const page = await readEntityAlerts(normalizedEntityId);
    const alerts = page.content || [];
    const commonLabels = extractExactCommonAlertLabels(alerts);
    if (alerts.length > 0 && Object.keys(commonLabels).length > 0) {
      return {
        draftPatch: {
          matchAll: false,
          labelsText: formatLabelsText(commonLabels)
        },
        source: 'alerts-common-labels',
        warning: null
      };
    }
  } catch {
    // Fall through to the Angular-compatible manual-entry warning.
  }

  return { draftPatch: { labelsText: '' }, source: 'none', warning: warningCopy };
}

export async function loadAlertSilenceDetail(apiGet: ApiGetter, id: number) {
  return apiGet<AlertSilence>(buildAlertSilenceDetailUrl(id));
}

export async function loadAlertSilenceDetailFromFacade(readDetail: AlertSilenceDetailReader, id: number) {
  return readDetail(id);
}

export async function loadAlertSilenceDataFromFacade(
  readers: {
    list: AlertSilenceListReader;
    labelOptions: AlertLabelOptionsReader;
  },
  query: AlertSilenceListQuery
) {
  const [list, labelOptions] = await Promise.all([
    readers.list(query),
    readers.labelOptions().catch(() => DEFAULT_ALERT_LABEL_OPTIONS)
  ]);
  return { list, labelOptions };
}

export async function loadMatchedAlertSilencesFromFacade(readDetail: AlertSilenceDetailReader, ids: number[]) {
  const results = await Promise.allSettled(ids.map(id => readDetail(id)));
  const matched = results
    .filter((result): result is PromiseFulfilledResult<AlertSilence> => result.status === 'fulfilled' && result.value != null)
    .map(result => result.value)
    .sort((left, right) => (Number(right.id) || 0) - (Number(left.id) || 0));
  return {
    matched,
    missingMatchedRuleCount: Math.max(0, ids.length - matched.length)
  };
}

export async function deleteAlertSilence(apiDelete: ApiMutator, id: number) {
  return apiDelete<void>(buildAlertSilenceDeleteUrl(id));
}

export async function deleteAlertSilences(apiDelete: ApiMutator, ids: number[]) {
  return apiDelete<void>(buildAlertSilenceDeleteUrl(ids));
}

export async function deleteAlertSilenceFromFacade(deleteSilences: AlertSilenceDeleter, id: number) {
  return deleteSilences([id]);
}

export async function deleteAlertSilencesFromFacade(deleteSilences: AlertSilenceDeleter, ids: number[]) {
  return deleteSilences(ids);
}

function parseLabelRecord(text: string) {
  return text
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, entry) => {
      const [key, ...rest] = entry.split(':');
      const normalizedKey = key?.trim();
      if (!normalizedKey) return acc;
      acc[normalizedKey] = rest.join(':').trim() || normalizedKey;
      return acc;
    }, {});
}

function parseDays(text: string) {
  return text
    .split(',')
    .map(item => Number.parseInt(item.trim(), 10))
    .filter(day => Number.isFinite(day) && day >= 1 && day <= 7);
}

function toDateTimeLocal(value?: string | number | Date | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toTimeInput(value?: string | number | Date | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(11, 16);
}

function toIsoDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function toTodayIsoTime(value: string) {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(item => Number.parseInt(item, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function buildDefaultOneTimeRange() {
  const start = new Date();
  const end = new Date(start);
  end.setHours(end.getHours() + 6);
  return {
    periodStart: toDateTimeLocal(start),
    periodEnd: toDateTimeLocal(end)
  };
}

export function buildAlertSilenceFormDraft(silence?: AlertSilence | null, fallback: AlertSilenceFormDraftFallback = {}): AlertSilenceFormDraft {
  if (!silence) {
    const { periodStart, periodEnd } = buildDefaultOneTimeRange();
    return {
      name: fallback.name || '',
      enable: fallback.enable ?? true,
      matchAll: fallback.matchAll ?? false,
      type: fallback.type || '0',
      labelsText: fallback.labelsText || '',
      daysText: fallback.daysText || '7,1,2,3,4,5,6',
      periodStart: fallback.periodStart || periodStart,
      periodEnd: fallback.periodEnd || periodEnd,
    };
  }

  const type = silence?.type === 1 ? '1' : '0';
  return {
    ...fallback,
    id: silence?.id,
    name: silence?.name || '',
    enable: silence?.enable ?? true,
    matchAll: silence?.matchAll ?? true,
    type,
    labelsText: Object.entries(silence?.labels || {})
      .map(([key, value]) => `${key}:${value}`)
      .join(', '),
    daysText: (silence?.days || [1, 2, 3, 4, 5, 6, 7]).join(', '),
    periodStart: type === '0' ? toDateTimeLocal(silence?.periodStart) : toTimeInput(silence?.periodStart),
    periodEnd: type === '0' ? toDateTimeLocal(silence?.periodEnd) : toTimeInput(silence?.periodEnd),
  };
}

export function buildAlertSilencePayload(draft: AlertSilenceFormDraft): AlertSilencePayload {
  const type = Number.parseInt(draft.type, 10) === 1 ? 1 : 0;
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    enable: draft.enable,
    matchAll: draft.matchAll,
    type,
    labels: draft.matchAll ? {} : parseLabelRecord(draft.labelsText),
    days: type === 1 ? parseDays(draft.daysText) : [],
    periodStart: type === 0 ? toIsoDateTime(draft.periodStart) : toTodayIsoTime(draft.periodStart),
    periodEnd: type === 0 ? toIsoDateTime(draft.periodEnd) : toTodayIsoTime(draft.periodEnd),
  };
}

export async function createAlertSilence(apiPost: ApiMutator, draft: AlertSilenceFormDraft) {
  return apiPost<void>('/alert/silence', buildAlertSilencePayload(draft));
}

export async function updateAlertSilence(apiPut: ApiMutator, draft: AlertSilenceFormDraft) {
  return apiPut<void>('/alert/silence', buildAlertSilencePayload(draft));
}

export async function createAlertSilenceFromFacade(createSilence: AlertSilenceWriter, draft: AlertSilenceFormDraft) {
  return createSilence(buildAlertSilencePayload(draft));
}

export async function updateAlertSilenceFromFacade(updateSilence: AlertSilenceWriter, draft: AlertSilenceFormDraft) {
  return updateSilence(buildAlertSilencePayload(draft));
}

export async function updateAlertSilenceEnabledFromFacade(
  updateSilence: AlertSilenceWriter,
  silence: AlertSilence,
  enabled: boolean
) {
  return updateSilence(
    buildAlertSilencePayload({
      ...buildAlertSilenceFormDraft(silence),
      enable: enabled
    })
  );
}
