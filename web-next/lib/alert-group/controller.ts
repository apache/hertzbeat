import type { AlertGroupConverge } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiMutator = <T>(url: string, payload?: unknown) => Promise<T>;
type AlertGroupPayload = Omit<AlertGroupConverge, 'id'> & { id?: number };

export type AlertGroupFormDraft = {
  id?: number;
  name: string;
  enable: boolean;
  groupLabelsText: string;
  groupWait: string;
  groupInterval: string;
  repeatInterval: string;
};

export function buildAlertGroupDetailUrl(id: number) {
  return `/alert/group/${id}`;
}

export function buildAlertGroupDeleteUrl(ids: number | number[]) {
  const params = new URLSearchParams();
  const values = Array.isArray(ids) ? ids : [ids];
  values.forEach(id => params.append('ids', String(id)));
  return `/alert/groups?${params.toString()}`;
}

export async function loadAlertGroupDetail(apiGet: ApiGetter, id: number) {
  return apiGet<AlertGroupConverge>(buildAlertGroupDetailUrl(id));
}

export async function deleteAlertGroup(apiDelete: ApiMutator, id: number) {
  return apiDelete<void>(buildAlertGroupDeleteUrl(id));
}

export async function deleteAlertGroups(apiDelete: ApiMutator, ids: number[]) {
  return apiDelete<void>(buildAlertGroupDeleteUrl(ids));
}

function parseLabels(text: string) {
  return text
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseNonNegativeInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function buildAlertGroupPayload(draft: AlertGroupFormDraft): AlertGroupPayload {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    enable: draft.enable,
    groupLabels: parseLabels(draft.groupLabelsText),
    groupWait: parseNonNegativeInt(draft.groupWait, 30),
    groupInterval: parseNonNegativeInt(draft.groupInterval, 300),
    repeatInterval: parseNonNegativeInt(draft.repeatInterval, 14400),
  };
}

export async function createAlertGroup(apiPost: ApiMutator, draft: AlertGroupFormDraft) {
  return apiPost<void>('/alert/group', buildAlertGroupPayload(draft));
}

export async function updateAlertGroup(apiPut: ApiMutator, draft: AlertGroupFormDraft) {
  return apiPut<void>('/alert/group', buildAlertGroupPayload(draft));
}
