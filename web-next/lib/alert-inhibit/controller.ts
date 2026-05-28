import type { AlertInhibit, PageResult, SingleAlert } from '@/lib/types';
import { DEFAULT_ALERT_LABEL_OPTIONS, type AlertLabelOptions } from '../alert-label-options';
import { type AlertInhibitListQuery } from './query-state';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiMutator = <T>(url: string, payload?: unknown) => Promise<T>;
type AlertInhibitPayload = Omit<AlertInhibit, 'id'> & { id?: number };
type AlertInhibitListReader = (query: AlertInhibitListQuery) => Promise<PageResult<AlertInhibit>>;
type AlertInhibitDetailReader = (id: number) => Promise<AlertInhibit>;
type EntityAlertReader = (entityId: number) => Promise<PageResult<SingleAlert>>;
type AlertLabelOptionsReader = () => Promise<AlertLabelOptions>;
type AlertInhibitWriter = (payload: AlertInhibitPayload) => Promise<unknown>;
type AlertInhibitDeleter = (ids: number[]) => Promise<unknown>;

export type AlertInhibitFormDraft = {
  id?: number;
  name: string;
  enable: boolean;
  sourceLabelsText: string;
  targetLabelsText: string;
  equalLabelsText: string;
};

export type AlertInhibitEntityPrefillResult = {
  draftPatch: Partial<AlertInhibitFormDraft>;
  source: 'alerts-common-labels' | 'none';
  warning: string | null;
};

type AlertInhibitFormDraftFallback = Partial<AlertInhibitFormDraft>;
const ALERT_INHIBIT_EQUAL_LABEL_CANDIDATES = new Set(['alertname', 'instance', 'job', 'service', 'host', 'env']);

export function buildAlertInhibitDetailUrl(id: number) {
  return `/alert/inhibit/${id}`;
}

export function buildAlertInhibitDeleteUrl(ids: number | number[]) {
  const params = new URLSearchParams();
  const values = Array.isArray(ids) ? ids : [ids];
  values.forEach(id => params.append('ids', String(id)));
  return `/alert/inhibits?${params.toString()}`;
}

export function buildEntityAlertsForInhibitPrefillUrl(entityId: number) {
  const params = new URLSearchParams({
    pageIndex: '0',
    pageSize: '20',
    status: 'firing'
  });
  return `/entities/${entityId}/alerts?${params.toString()}`;
}

export function extractExactCommonInhibitAlertLabels(alerts: SingleAlert[]): Record<string, string> {
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

function removeSeverityFromLabelMap(labels: Record<string, string>) {
  const nextLabels = { ...labels };
  delete nextLabels.severity;
  return nextLabels;
}

function formatEqualLabelsText(labels: Record<string, string>) {
  return Object.keys(labels)
    .filter(label => ALERT_INHIBIT_EQUAL_LABEL_CANDIDATES.has(label))
    .join(', ');
}

export async function buildAlertInhibitEntityPrefill(
  apiGet: ApiGetter,
  entityId: string,
  warningCopy: string,
  noEntityIdWarningCopy: string
): Promise<AlertInhibitEntityPrefillResult> {
  const normalizedEntityId = Number(entityId);
  if (!Number.isFinite(normalizedEntityId) || normalizedEntityId <= 0) {
    return {
      draftPatch: { sourceLabelsText: '', targetLabelsText: '', equalLabelsText: '' },
      source: 'none',
      warning: noEntityIdWarningCopy
    };
  }

  try {
    const page = await apiGet<PageResult<SingleAlert>>(buildEntityAlertsForInhibitPrefillUrl(normalizedEntityId));
    const alerts = page.content || [];
    const commonLabels = extractExactCommonInhibitAlertLabels(alerts);
    if (alerts.length > 0 && Object.keys(commonLabels).length > 0) {
      return {
        draftPatch: {
          sourceLabelsText: formatLabelsText(commonLabels),
          targetLabelsText: formatLabelsText(removeSeverityFromLabelMap(commonLabels)),
          equalLabelsText: formatEqualLabelsText(commonLabels)
        },
        source: 'alerts-common-labels',
        warning: null
      };
    }
  } catch {
    // Fall through to the Angular-compatible manual-entry warning.
  }

  return {
    draftPatch: { sourceLabelsText: '', targetLabelsText: '', equalLabelsText: '' },
    source: 'none',
    warning: warningCopy
  };
}

export async function buildAlertInhibitEntityPrefillFromFacade(
  readEntityAlerts: EntityAlertReader,
  entityId: string,
  warningCopy: string,
  noEntityIdWarningCopy: string
): Promise<AlertInhibitEntityPrefillResult> {
  const normalizedEntityId = Number(entityId);
  if (!Number.isFinite(normalizedEntityId) || normalizedEntityId <= 0) {
    return {
      draftPatch: { sourceLabelsText: '', targetLabelsText: '', equalLabelsText: '' },
      source: 'none',
      warning: noEntityIdWarningCopy
    };
  }

  try {
    const page = await readEntityAlerts(normalizedEntityId);
    const alerts = page.content || [];
    const commonLabels = extractExactCommonInhibitAlertLabels(alerts);
    if (alerts.length > 0 && Object.keys(commonLabels).length > 0) {
      return {
        draftPatch: {
          sourceLabelsText: formatLabelsText(commonLabels),
          targetLabelsText: formatLabelsText(removeSeverityFromLabelMap(commonLabels)),
          equalLabelsText: formatEqualLabelsText(commonLabels)
        },
        source: 'alerts-common-labels',
        warning: null
      };
    }
  } catch {
    // Fall through to the Angular-compatible manual-entry warning.
  }

  return {
    draftPatch: { sourceLabelsText: '', targetLabelsText: '', equalLabelsText: '' },
    source: 'none',
    warning: warningCopy
  };
}

export async function loadAlertInhibitDetail(apiGet: ApiGetter, id: number) {
  return apiGet<AlertInhibit>(buildAlertInhibitDetailUrl(id));
}

export async function loadAlertInhibitDetailFromFacade(readDetail: AlertInhibitDetailReader, id: number) {
  return readDetail(id);
}

export async function loadAlertInhibitDataFromFacade(
  readers: {
    list: AlertInhibitListReader;
    labelOptions: AlertLabelOptionsReader;
  },
  query: AlertInhibitListQuery
) {
  const [list, labelOptions] = await Promise.all([
    readers.list(query),
    readers.labelOptions().catch(() => DEFAULT_ALERT_LABEL_OPTIONS)
  ]);
  return { list, labelOptions };
}

export async function loadMatchedAlertInhibitsFromFacade(readDetail: AlertInhibitDetailReader, ids: number[]) {
  const results = await Promise.allSettled(ids.map(id => readDetail(id)));
  const matched = results
    .filter((result): result is PromiseFulfilledResult<AlertInhibit> => result.status === 'fulfilled' && result.value != null)
    .map(result => result.value)
    .sort((left, right) => (Number(right.id) || 0) - (Number(left.id) || 0));
  return {
    matched,
    missingMatchedRuleCount: Math.max(0, ids.length - matched.length)
  };
}

export async function deleteAlertInhibit(apiDelete: ApiMutator, id: number) {
  return apiDelete<void>(buildAlertInhibitDeleteUrl(id));
}

export async function deleteAlertInhibits(apiDelete: ApiMutator, ids: number[]) {
  return apiDelete<void>(buildAlertInhibitDeleteUrl(ids));
}

export async function deleteAlertInhibitFromFacade(deleteInhibits: AlertInhibitDeleter, id: number) {
  return deleteInhibits([id]);
}

export async function deleteAlertInhibitsFromFacade(deleteInhibits: AlertInhibitDeleter, ids: number[]) {
  return deleteInhibits(ids);
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

export async function createAlertInhibitFromFacade(createInhibit: AlertInhibitWriter, draft: AlertInhibitFormDraft) {
  return createInhibit(buildAlertInhibitPayload(draft));
}

export async function updateAlertInhibitFromFacade(updateInhibit: AlertInhibitWriter, draft: AlertInhibitFormDraft) {
  return updateInhibit(buildAlertInhibitPayload(draft));
}

export async function updateAlertInhibitEnabledFromFacade(
  updateInhibit: AlertInhibitWriter,
  inhibit: AlertInhibit,
  enabled: boolean
) {
  return updateInhibit(
    buildAlertInhibitPayload({
      ...buildAlertInhibitFormDraft(inhibit),
      enable: enabled
    })
  );
}
