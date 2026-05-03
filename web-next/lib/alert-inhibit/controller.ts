import type { AlertInhibit } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiMutator = <T>(url: string, payload?: unknown) => Promise<T>;
type AlertInhibitPayload = Omit<AlertInhibit, 'id'> & { id?: number };

export type AlertInhibitFormDraft = {
  id?: number;
  name: string;
  enable: boolean;
  sourceLabelsText: string;
  targetLabelsText: string;
  equalLabelsText: string;
};

type AlertInhibitFormDraftFallback = Partial<AlertInhibitFormDraft>;

export function buildAlertInhibitDetailUrl(id: number) {
  return `/alert/inhibit/${id}`;
}

export function buildAlertInhibitDeleteUrl(ids: number | number[]) {
  const params = new URLSearchParams();
  const values = Array.isArray(ids) ? ids : [ids];
  values.forEach(id => params.append('ids', String(id)));
  return `/alert/inhibits?${params.toString()}`;
}

export async function loadAlertInhibitDetail(apiGet: ApiGetter, id: number) {
  return apiGet<AlertInhibit>(buildAlertInhibitDetailUrl(id));
}

export async function deleteAlertInhibit(apiDelete: ApiMutator, id: number) {
  return apiDelete<void>(buildAlertInhibitDeleteUrl(id));
}

export async function deleteAlertInhibits(apiDelete: ApiMutator, ids: number[]) {
  return apiDelete<void>(buildAlertInhibitDeleteUrl(ids));
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

function parseEqualLabels(text: string) {
  return text
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function buildAlertInhibitFormDraft(inhibit?: AlertInhibit | null, fallback: AlertInhibitFormDraftFallback = {}): AlertInhibitFormDraft {
  if (!inhibit) {
    return {
      name: fallback.name || '',
      enable: fallback.enable ?? true,
      sourceLabelsText: fallback.sourceLabelsText || '',
      targetLabelsText: fallback.targetLabelsText || '',
      equalLabelsText: fallback.equalLabelsText || '',
    };
  }

  return {
    id: inhibit?.id,
    name: inhibit?.name || '',
    enable: inhibit?.enable ?? true,
    sourceLabelsText: Object.entries(inhibit?.sourceLabels || {}).map(([key, value]) => `${key}:${value}`).join(', '),
    targetLabelsText: Object.entries(inhibit?.targetLabels || {}).map(([key, value]) => `${key}:${value}`).join(', '),
    equalLabelsText: (inhibit?.equalLabels || []).join(', '),
  };
}

export function buildAlertInhibitPayload(draft: AlertInhibitFormDraft): AlertInhibitPayload {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    enable: draft.enable,
    sourceLabels: parseLabelRecord(draft.sourceLabelsText),
    targetLabels: parseLabelRecord(draft.targetLabelsText),
    equalLabels: parseEqualLabels(draft.equalLabelsText),
  };
}

export async function createAlertInhibit(apiPost: ApiMutator, draft: AlertInhibitFormDraft) {
  return apiPost<void>('/alert/inhibit', buildAlertInhibitPayload(draft));
}

export async function updateAlertInhibit(apiPut: ApiMutator, draft: AlertInhibitFormDraft) {
  return apiPut<void>('/alert/inhibit', buildAlertInhibitPayload(draft));
}
