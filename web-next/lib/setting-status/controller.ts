import type { PageResult, StatusPageComponent, StatusPageIncident, StatusPageOrg } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiPoster = <T>(url: string, payload: unknown) => Promise<T>;
type ApiPut = <T>(url: string, payload: unknown) => Promise<T>;
type ApiDelete = <T>(url: string) => Promise<T>;
export type StatusIncidentListQuery = {
  search?: string;
  pageIndex?: number;
  pageSize?: number;
};

const STATUS_PAGE_ORG_NOT_FOUND = 'Status Page Organization Not Found';

function isStatusPageOrgNotFound(error: unknown) {
  return error instanceof Error && error.message.includes(STATUS_PAGE_ORG_NOT_FOUND);
}

function resolveStatusPageOrg(error: unknown): StatusPageOrg {
  if (isStatusPageOrgNotFound(error)) {
    return {};
  }
  throw error;
}

function normalizePageIndex(value?: number) {
  return Number.isFinite(value) && value != null && value >= 0 ? Math.trunc(value) : 0;
}

function normalizePageSize(value?: number) {
  return Number.isFinite(value) && value != null && value > 0 ? Math.trunc(value) : 8;
}

export function buildStatusIncidentListUrl(query: StatusIncidentListQuery = {}) {
  const params = new URLSearchParams({
    pageIndex: String(normalizePageIndex(query.pageIndex)),
    pageSize: String(normalizePageSize(query.pageSize))
  });
  const trimmedSearch = query.search?.trim();
  if (trimmedSearch) {
    params.set('search', trimmedSearch);
  }
  return `/status/page/incident?${params.toString()}`;
}

export async function loadStatusManagementData(apiGet: ApiGetter, incidentQuery: StatusIncidentListQuery = {}) {
  const [org, components, incidents] = await Promise.all([
    apiGet<StatusPageOrg>('/status/page/org').catch(resolveStatusPageOrg),
    apiGet<StatusPageComponent[]>('/status/page/component'),
    apiGet<PageResult<StatusPageIncident>>(buildStatusIncidentListUrl(incidentQuery))
  ]);

  return { org, components, incidents };
}

export async function saveStatusPageOrg(apiPost: ApiPoster, org: StatusPageOrg) {
  return apiPost<StatusPageOrg>('/status/page/org', org);
}

export async function createStatusPageComponent(apiPost: ApiPoster, component: StatusPageComponent) {
  return apiPost<void>('/status/page/component', component);
}

export async function updateStatusPageComponent(apiPut: ApiPut, component: StatusPageComponent) {
  return apiPut<void>('/status/page/component', component);
}

export async function deleteStatusPageComponent(apiDelete: ApiDelete, componentId: number) {
  return apiDelete<void>(`/status/page/component/${componentId}`);
}

export async function createStatusPageIncident(apiPost: ApiPoster, incident: StatusPageIncident) {
  return apiPost<void>('/status/page/incident', incident);
}

export async function updateStatusPageIncident(apiPut: ApiPut, incident: StatusPageIncident) {
  return apiPut<void>('/status/page/incident', incident);
}

export async function deleteStatusPageIncident(apiDelete: ApiDelete, incidentId: number) {
  return apiDelete<void>(`/status/page/incident/${incidentId}`);
}
