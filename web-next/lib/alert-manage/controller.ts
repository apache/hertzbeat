import type { AlertSummary, EntityDetailDto, EntityNoiseControlSummary, GroupAlert, PageResult } from '@/lib/types';
import { SUPPLEMENTAL_MESSAGES } from '../i18n-runtime-messages';
import { buildAlertListUrl, normalizeAlertPageIndex, normalizeAlertPageSize, type AlertQueryState } from './query-state';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiPutter = <T>(url: string, payload: unknown) => Promise<T>;
type ApiDeleter = <T>(url: string) => Promise<T>;
type AlertGroupStatusMutation = 'acknowledged' | 'resolved' | 'firing';
type AlertClosureFacade = {
  groupStatus: (status: AlertGroupStatusMutation, ids: number | number[]) => Promise<unknown>;
  groupClose: (ids: number | number[]) => Promise<unknown>;
};
type AlertCenterDataFacade = {
  alerts: {
    summary: () => Promise<AlertSummary>;
    groupAlerts: (query: AlertQueryState) => Promise<PageResult<GroupAlert>>;
  };
  entities: {
    detail: (entityId: string | number) => Promise<EntityDetailDto>;
  };
};

const ALERT_GROUP_ID_REQUIRED_FALLBACK = SUPPLEMENTAL_MESSAGES['en-US']?.['alert.group.id-required'] ?? 'alert.group.id-required';

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
    return { ...query, status: 'acknowledged', pageIndex: 0 };
  }
  if (action === 'recover' || action === 'resolve') {
    return { ...query, status: 'resolved', pageIndex: 0 };
  }
  if (action === 'unacknowledge' || action === 'reopen') {
    return { ...query, status: 'firing', pageIndex: 0 };
  }
  return { ...query };
}

export function clampAlertCenterPageIndexAfterDelete(
  query: AlertQueryState,
  totalElements: number,
  deleteCount = 1
): AlertQueryState {
  const pageIndex = normalizeAlertPageIndex(query.pageIndex);
  const pageSize = normalizeAlertPageSize(query.pageSize);
  const removedCount = Number.isFinite(deleteCount) && deleteCount > 0 ? Math.floor(deleteCount) : 0;
  const remainingTotal = Math.max(0, totalElements - removedCount);
  const lastPageIndex = Math.max(0, Math.ceil(remainingTotal / pageSize) - 1);

  return {
    ...query,
    pageIndex: Math.min(pageIndex, lastPageIndex),
    pageSize
  };
}

function normalizeAlertGroupPageResult(alerts: PageResult<GroupAlert>, query: AlertQueryState): PageResult<GroupAlert> {
  const pageSize = normalizeAlertPageSize(query.pageSize);
  return {
    ...alerts,
    content: (alerts.content || []).slice(0, pageSize),
    pageSize
  };
}

export async function loadAlertCenterData(apiGet: ApiGetter, query: AlertQueryState): Promise<AlertPageData> {
  const [summary, alerts, entityDetail] = await Promise.all([
    apiGet<AlertSummary>('/alerts/summary'),
    apiGet<PageResult<GroupAlert>>(buildAlertListUrl(query)),
    loadEntityNoiseControlSummary(apiGet, query.entityId)
  ]);

  return {
    summary,
    groupAlerts: normalizeAlertGroupPageResult(alerts, query),
    noiseControlSummary: entityDetail?.noiseControlSummary
  };
}

export async function loadAlertCenterDataFromFacade(
  apiFacade: AlertCenterDataFacade,
  query: AlertQueryState
): Promise<AlertPageData> {
  const [summary, alerts, entityDetail] = await Promise.all([
    apiFacade.alerts.summary(),
    apiFacade.alerts.groupAlerts(query),
    loadEntityNoiseControlSummaryFromFacade(apiFacade, query.entityId)
  ]);

  return {
    summary,
    groupAlerts: normalizeAlertGroupPageResult(alerts, query),
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
    throw new Error(ALERT_GROUP_ID_REQUIRED_FALLBACK);
  }

  return normalized;
}

function buildAlertGroupIdsQuery(ids: number | number[]) {
  const params = new URLSearchParams();
  normalizeAlertGroupIds(ids).forEach(id => params.append('ids', String(id)));
  return params.toString();
}

export function buildAlertGroupStatusMutationUrl(status: AlertGroupStatusMutation, ids: number | number[]) {
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

export async function applyAlertClosureOperationFromFacade(
  apiAlerts: AlertClosureFacade,
  action: AlertClosureOperationAction,
  ids: number | number[]
) {
  if (action === 'acknowledge') {
    return apiAlerts.groupStatus('acknowledged', ids);
  }
  if (action === 'recover' || action === 'resolve') {
    return apiAlerts.groupStatus('resolved', ids);
  }
  if (action === 'unacknowledge' || action === 'reopen') {
    return apiAlerts.groupStatus('firing', ids);
  }
  return apiAlerts.groupClose(ids);
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

async function loadEntityNoiseControlSummaryFromFacade(
  apiFacade: AlertCenterDataFacade,
  entityId: string
): Promise<EntityDetailDto | undefined> {
  const numericEntityId = Number(entityId);

  if (!Number.isFinite(numericEntityId) || numericEntityId <= 0) {
    return undefined;
  }

  try {
    return await apiFacade.entities.detail(numericEntityId);
  } catch {
    return undefined;
  }
}
