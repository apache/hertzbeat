import type { StatusPageComponent, StatusPageHistory, StatusPageIncident, StatusPageOrg } from '@/lib/types';
import { buildCompatRedirectTarget, type SearchParamsRecord } from '../compat/search-params';
import { SUPPLEMENTAL_MESSAGES } from '../i18n-runtime-messages';

export type { SearchParamsRecord } from '../compat/search-params';

type ApiGetter = <T>(url: string) => Promise<T>;

export const PUBLIC_STATUS_ROUTE = '/status';

export function buildPublicStatusCompatRouteUrl(searchParams?: SearchParamsRecord) {
  return buildCompatRedirectTarget(PUBLIC_STATUS_ROUTE, searchParams);
}

export type StatusIncidentListQuery = {
  search?: string;
  startTime?: number;
  endTime?: number;
  pageIndex?: number;
  pageSize?: number;
};

type PublicStatusPageComponent = StatusPageComponent & {
  info?: StatusPageComponent;
  history?: StatusPageHistory[];
};

type PublicStatusPageIncidents = {
  content?: StatusPageIncident[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
};

export type StatusIncidentFeedOptions = {
  selectedYear: number;
  currentYear?: number;
  reloadToken?: number;
  initialIncidents?: StatusPageIncident[];
};

const STATUS_PAGE_ORG_NOT_FOUND = 'Status Page Organization Not Found';
const STATUS_INCIDENTS_LOAD_FAILED_FALLBACK = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.incidents.load-failed'] ?? 'status.public.incidents.load-failed';

function isStatusPageOrgNotFound(error: unknown) {
  return error instanceof Error && error.message.includes(STATUS_PAGE_ORG_NOT_FOUND);
}

function resolveStatusPageOrg(error: unknown): StatusPageOrg {
  if (isStatusPageOrgNotFound(error)) {
    return {};
  }
  throw error;
}

function describeLoadFailure(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export function describeStatusIncidentLoadFailure(error: unknown, fallback = STATUS_INCIDENTS_LOAD_FAILED_FALLBACK) {
  return describeLoadFailure(error, fallback || STATUS_INCIDENTS_LOAD_FAILED_FALLBACK);
}

function normalizePageIndex(value?: number) {
  return Number.isFinite(value) && value != null && value >= 0 ? Math.trunc(value) : 0;
}

function normalizePageSize(value?: number) {
  return Number.isFinite(value) && value != null && value > 0 ? Math.trunc(value) : 9999;
}

function normalizeTime(value?: number | string | null) {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const numericValue = Number.parseInt(value, 10);
    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
    const parsedValue = Date.parse(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }
  return null;
}

function pickLatestTime(...values: Array<number | string | null | undefined>) {
  return values.reduce<number | string | null>((latest, value) => {
    const latestTime = normalizeTime(latest);
    const nextTime = normalizeTime(value);
    if (nextTime == null) return latest;
    if (latestTime == null || nextTime > latestTime) {
      return value ?? null;
    }
    return latest;
  }, null);
}

function normalizeHistory(history: StatusPageHistory[] | undefined) {
  return [...(history || [])].sort((left, right) => {
    const leftTime = normalizeTime(left.timestamp) ?? 0;
    const rightTime = normalizeTime(right.timestamp) ?? 0;
    return rightTime - leftTime;
  });
}

function normalizePublicComponent(component: PublicStatusPageComponent): StatusPageComponent {
  const info = component.info ?? component;
  const history = normalizeHistory(component.history ?? info.history);
  const status = info.status ?? info.state;
  const latestTime = pickLatestTime(info.latestTime, info.gmtUpdate, info.gmtCreate, ...history.map(item => item.timestamp));

  return {
    ...info,
    ...(status != null ? { status } : {}),
    ...(latestTime != null ? { latestTime } : {}),
    ...(history.length > 0 ? { history } : {})
  };
}

function normalizePublicIncident(incident: StatusPageIncident): StatusPageIncident {
  const contents = [...(incident.contents ?? [])].sort((left, right) => {
    const leftTime = normalizeTime(left.timestamp) ?? 0;
    const rightTime = normalizeTime(right.timestamp) ?? 0;
    return leftTime - rightTime;
  });
  const latestContentTime = pickLatestTime(...contents.map(item => item.timestamp));
  const title = incident.title ?? incident.name;
  const status = incident.status ?? incident.state;
  const createTime = incident.createTime ?? incident.startTime ?? incident.gmtCreate ?? incident.gmtUpdate ?? latestContentTime;
  const updateTime = incident.updateTime ?? latestContentTime ?? incident.endTime ?? incident.gmtUpdate ?? incident.startTime ?? incident.gmtCreate;

  return {
    ...incident,
    contents,
    ...(title ? { title } : {}),
    ...(status != null ? { status } : {}),
    ...(createTime != null ? { createTime } : {}),
    ...(updateTime != null ? { updateTime } : {})
  };
}

function normalizePublicIncidents(incidents: StatusPageIncident[] | undefined) {
  return (incidents || []).map(normalizePublicIncident);
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

  if (query.startTime != null) {
    params.set('startTime', String(Math.trunc(query.startTime)));
  }

  if (query.endTime != null && query.endTime >= 0) {
    params.set('endTime', String(Math.trunc(query.endTime)));
  }

  return `/status/page/public/incident?${params.toString()}`;
}

export function buildStatusIncidentYearQuery(year: number, now: Date = new Date()) {
  const normalizedYear = Number.isFinite(year) ? Math.trunc(year) : now.getFullYear();
  const currentYear = now.getFullYear();
  const startTime = new Date(normalizedYear, 0, 1).getTime();
  const endTime = normalizedYear < currentYear ? new Date(normalizedYear, 11, 31, 23, 59, 59, 999).getTime() : undefined;

  return {
    startTime,
    ...(endTime != null ? { endTime } : {})
  };
}

export async function loadStatusPageIncidents(apiGet: ApiGetter, query: StatusIncidentListQuery = {}) {
  return apiGet<PublicStatusPageIncidents>(buildStatusIncidentListUrl(query));
}

export async function loadStatusPageIncidentFeed(
  apiGet: ApiGetter,
  options: StatusIncidentFeedOptions
) {
  const currentYear = options.currentYear ?? new Date().getFullYear();
  const reloadToken = options.reloadToken ?? 0;
  const referenceNow = options.currentYear != null ? new Date(options.currentYear, 6, 1) : new Date();

  if (options.selectedYear === currentYear && reloadToken === 0) {
    return options.initialIncidents || [];
  }

  const incidents = await loadStatusPageIncidents(apiGet, {
    ...buildStatusIncidentYearQuery(options.selectedYear, referenceNow),
    pageIndex: 0,
    pageSize: 9999
  });

  return normalizePublicIncidents(incidents.content);
}

export async function loadStatusPageData(apiGet: ApiGetter, query: StatusIncidentListQuery = {}) {
  const defaultYear = new Date().getFullYear();
  const incidentQuery = {
    ...buildStatusIncidentYearQuery(defaultYear),
    pageIndex: 0,
    pageSize: 9999,
    ...query
  };

  const [org, components] = await Promise.all([
    apiGet<StatusPageOrg>('/status/page/public/org').catch(resolveStatusPageOrg),
    apiGet<PublicStatusPageComponent[]>('/status/page/public/component')
  ]);

  let incidents: PublicStatusPageIncidents = { content: [] };
  let incidentsError: string | null = null;

  try {
    incidents = await loadStatusPageIncidents(apiGet, incidentQuery);
  } catch (error) {
    incidentsError = describeStatusIncidentLoadFailure(error);
  }

  return {
    org,
    components: (components || []).map(normalizePublicComponent),
    incidents: normalizePublicIncidents(incidents.content),
    incidentsError
  };
}
