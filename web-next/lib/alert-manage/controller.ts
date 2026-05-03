import type { AlertSummary, EntityDetailDto, EntityNoiseControlSummary, GroupAlert, PageResult } from '@/lib/types';
import { buildAlertListUrl, type AlertQueryState } from './query-state';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiPutter = <T>(url: string, payload: unknown) => Promise<T>;
type ApiDeleter = <T>(url: string) => Promise<T>;

export type AlertClosureOperationAction =
  | 'acknowledge'
  | 'recover'
  | 'close'
  | 'resolve'
  | 'unacknowledge'
  | 'reopen'
  | 'delete';

export type AlertPageData = {
  summary: AlertSummary;
  groupAlerts: PageResult<GroupAlert>;
  noiseControlSummary?: EntityNoiseControlSummary;
};

export function buildAlertQueryAfterClosureOperation(
  query: AlertQueryState,
  action: AlertClosureOperationAction
): AlertQueryState {
  if (action === 'acknowledge') {
    return { ...query, status: 'acknowledged' };
  }
  if (action === 'recover' || action === 'resolve') {
    return { ...query, status: 'resolved' };
  }
  if (action === 'unacknowledge' || action === 'reopen') {
    return { ...query, status: 'firing' };
  }
  if (action === 'close' || action === 'delete') {
    return { ...query, status: '' };
  }
  return { ...query };
}

export async function loadAlertCenterData(apiGet: ApiGetter, query: AlertQueryState): Promise<AlertPageData> {
  const [summary, alerts, entityDetail] = await Promise.all([
    apiGet<AlertSummary>('/alerts/summary'),
    apiGet<PageResult<GroupAlert>>(buildAlertListUrl(query)),
    loadEntityNoiseControlSummary(apiGet, query.entityId)
  ]);

  return {
    summary,
    groupAlerts: alerts,
    noiseControlSummary: entityDetail?.noiseControlSummary
  };
}

function normalizeAlertGroupIds(ids: number | number[]) {
  const values = Array.isArray(ids) ? ids : [ids];
  const normalized = Array.from(
    new Set(
      values
        .map(id => Number(id))
        .filter(id => Number.isFinite(id) && id > 0)
    )
  );

  if (normalized.length === 0) {
    throw new Error('Alert group id is required');
  }

  return normalized;
}

function buildAlertGroupIdsQuery(ids: number | number[]) {
  const params = new URLSearchParams();
  normalizeAlertGroupIds(ids).forEach(id => params.append('ids', String(id)));
  return params.toString();
}

export function buildAlertGroupStatusMutationUrl(status: 'acknowledged' | 'resolved' | 'firing', ids: number | number[]) {
  return `/alerts/group/status/${status}?${buildAlertGroupIdsQuery(ids)}`;
}

export function buildAlertGroupCloseMutationUrl(ids: number | number[]) {
  return `/alerts/group?${buildAlertGroupIdsQuery(ids)}`;
}

export async function applyAlertClosureOperation(
  apiPut: ApiPutter,
  apiDelete: ApiDeleter,
  action: AlertClosureOperationAction,
  ids: number | number[]
) {
  if (action === 'acknowledge') {
    return apiPut<void>(buildAlertGroupStatusMutationUrl('acknowledged', ids), null);
  }
  if (action === 'recover' || action === 'resolve') {
    return apiPut<void>(buildAlertGroupStatusMutationUrl('resolved', ids), null);
  }
  if (action === 'unacknowledge' || action === 'reopen') {
    return apiPut<void>(buildAlertGroupStatusMutationUrl('firing', ids), null);
  }
  return apiDelete<void>(buildAlertGroupCloseMutationUrl(ids));
}

async function loadEntityNoiseControlSummary(apiGet: ApiGetter, entityId: string): Promise<EntityDetailDto | undefined> {
  const numericEntityId = Number(entityId);

  if (!Number.isFinite(numericEntityId) || numericEntityId <= 0) {
    return undefined;
  }

  try {
    return await apiGet<EntityDetailDto>(`/entities/${numericEntityId}/detail`);
  } catch {
    return undefined;
  }
}
