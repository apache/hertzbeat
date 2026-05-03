import type { AlertSilence } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiMutator = <T>(url: string, payload?: unknown) => Promise<T>;
type AlertSilencePayload = Omit<AlertSilence, 'id'> & { id?: number };

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

export async function loadAlertSilenceDetail(apiGet: ApiGetter, id: number) {
  return apiGet<AlertSilence>(buildAlertSilenceDetailUrl(id));
}

export async function deleteAlertSilence(apiDelete: ApiMutator, id: number) {
  return apiDelete<void>(buildAlertSilenceDeleteUrl(id));
}

export async function deleteAlertSilences(apiDelete: ApiMutator, ids: number[]) {
  return apiDelete<void>(buildAlertSilenceDeleteUrl(ids));
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
