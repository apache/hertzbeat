import type { PageResult, StatusPageIncident } from '@/lib/types';
import { buildStatusIncidentListUrl, type StatusIncidentListQuery } from '@/lib/setting-status/controller';
import {
  incidentStateLabel,
  latestIncidentMessage,
  normalizeIncidentState,
  readStatusCopy,
  statusComponentsLabel
} from '@/lib/status-center/display';
import { buildIncidentsSurfaceViewModel } from './view-model';

type ApiGetter = <T>(url: string) => Promise<T>;
type ApiPut = <T>(url: string, payload: unknown) => Promise<T>;
type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type FormatTime = (value?: number | string | null) => string;
type IncidentWorkbenchTone = 'critical' | 'warning' | 'success' | 'info' | 'neutral';
export type IncidentTransitionState = 1 | 2 | 3;

export const INCIDENT_WORKBENCH_DEFAULT_QUERY = {
  search: '',
  pageIndex: 0,
  pageSize: 8
} satisfies StatusIncidentListQuery;

export type IncidentWorkbenchSearchParams = Record<string, string | string[] | undefined>;

export type IncidentWorkbenchData = {
  apiState: 'ready' | 'empty';
  apiSource: 'status-page-incident-list';
  detailState: 'ready' | 'not-requested';
  detailSource: 'status-page-incident-detail' | 'none';
  detailId?: string;
  queryLabel: string;
  title: string;
  subtitle: string;
  kicker: string;
  metrics: Array<{ label: string; value: string; tone?: IncidentWorkbenchTone }>;
  incidents: Array<{
    id: string;
    title: string;
    severity: IncidentWorkbenchTone;
    stage: string;
    service: string;
    owner: string;
    openedAt: string;
    blastRadius: string;
  }>;
  timelineRows: Array<{
    id: string;
    title: string;
    copy: string;
    meta: string;
    tone?: IncidentWorkbenchTone;
  }>;
  ownershipRows: Array<{
    id: string;
    owner: string;
    queue: string;
    copy: string;
    meta: string;
    tone?: IncidentWorkbenchTone;
  }>;
  nextHops: Array<{ label: string; href: string; variant: 'subtle' | 'default' | 'primary' }>;
  selectedIncidentId?: string;
  selectedIncident?: StatusPageIncident | null;
  transitionState: 'ready' | 'disabled';
  totalElements: number;
};

function incidentComparableTime(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function incidentTitle(incident: StatusPageIncident, t: Translator) {
  const incidentId = incident.id ?? readStatusCopy(t, 'common.none', '-');
  return incident.name || incident.title || `${readStatusCopy(t, 'status.incident.default-title', 'Incident')} ${incidentId}`;
}

function incidentTimestamp(incident: StatusPageIncident) {
  return incident.updateTime || incident.createTime || incident.endTime || incident.startTime || incident.gmtUpdate || incident.gmtCreate || null;
}

function incidentService(incident: StatusPageIncident, t: Translator) {
  const firstComponent = (incident.components || [])[0];
  return firstComponent?.name || firstComponent?.endpoint || statusComponentsLabel(t);
}

function incidentOwner(incident: StatusPageIncident) {
  return incident.modifier || incident.creator || 'status-page';
}

function incidentTone(value: unknown): IncidentWorkbenchTone {
  switch (normalizeIncidentState(value)) {
    case 0:
      return 'critical';
    case 1:
      return 'warning';
    case 2:
      return 'info';
    case 3:
      return 'success';
    default:
      return 'neutral';
  }
}

function incidentKey(incident: StatusPageIncident, index = 0) {
  return String(incident.id || incident.name || `status-page-incident-${index + 1}`);
}

function selectedIncidentDetailUrl(incident: StatusPageIncident | undefined) {
  return typeof incident?.id === 'number' && Number.isFinite(incident.id) ? `/status/page/incident/${incident.id}` : null;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numericParam(value: string | string[] | undefined) {
  const first = firstParam(value);
  if (first == null || first.trim() === '') return undefined;
  const parsed = Number(first);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function readIncidentWorkbenchQuery(searchParams: IncidentWorkbenchSearchParams | undefined): StatusIncidentListQuery {
  if (!searchParams) return INCIDENT_WORKBENCH_DEFAULT_QUERY;
  return {
    search: firstParam(searchParams.search) || '',
    pageIndex: numericParam(searchParams.pageIndex) ?? INCIDENT_WORKBENCH_DEFAULT_QUERY.pageIndex,
    pageSize: numericParam(searchParams.pageSize) ?? INCIDENT_WORKBENCH_DEFAULT_QUERY.pageSize
  };
}

function mergeSelectedIncidentDetail(incidents: StatusPageIncident[], detail?: StatusPageIncident | null) {
  if (!detail) {
    return incidents;
  }

  const detailId = detail.id != null ? String(detail.id) : null;
  const detailName = detail.name?.trim();
  let replaced = false;
  const merged = incidents.map(incident => {
    const isMatch = (detailId && String(incident.id) === detailId) || (detailName && incident.name === detailName);
    if (!isMatch) {
      return incident;
    }
    replaced = true;
    return {
      ...incident,
      ...detail,
      components: detail.components ?? incident.components,
      contents: detail.contents ?? incident.contents
    };
  });

  return replaced ? merged : [detail, ...merged];
}

export function buildIncidentWorkbenchData(
  page: PageResult<StatusPageIncident>,
  t: Translator,
  formatTime: FormatTime,
  query: StatusIncidentListQuery = INCIDENT_WORKBENCH_DEFAULT_QUERY,
  selectedDetail?: StatusPageIncident | null
): IncidentWorkbenchData {
  const surface = buildIncidentsSurfaceViewModel(t);
  const listIncidents = page.content || [];
  const incidents = mergeSelectedIncidentDetail(listIncidents, selectedDetail);
  const statusComponentLabel = statusComponentsLabel(t);
  const totalElements = page.totalElements || listIncidents.length;

  const mappedIncidents = incidents.map((incident, index) => {
    const state = incident.state ?? incident.status ?? null;
    const components = incident.components || [];
    return {
      id: incidentKey(incident, index),
      title: incidentTitle(incident, t),
      severity: incidentTone(state),
      stage: incidentStateLabel(state, t),
      service: incidentService(incident, t),
      owner: incidentOwner(incident),
      openedAt: formatTime(incident.startTime || incident.createTime || incident.gmtCreate || null),
      blastRadius: `${components.length} ${statusComponentLabel}`
    };
  });

  const criticalCount = mappedIncidents.filter(incident => incident.severity === 'critical').length;
  const activeCount = incidents.filter(incident => normalizeIncidentState(incident.state ?? incident.status ?? null) !== 3).length;
  const ownerCount = new Set(mappedIncidents.map(incident => incident.owner)).size;

  const timelineRows = incidents
    .flatMap(incident =>
      (incident.contents || []).map((content, contentIndex) => ({
        id: `incident-timeline-${incident.id || incident.name || 'item'}-${content.id || contentIndex + 1}`,
        title: `${formatTime(content.timestamp || incidentTimestamp(incident))} · ${incidentStateLabel(content.state ?? incident.state ?? incident.status ?? null, t)}`,
        copy: content.message?.trim() || latestIncidentMessage(incident) || incidentTitle(incident, t),
        meta: incidentTitle(incident, t),
        tone: incidentTone(content.state ?? incident.state ?? incident.status ?? null),
        sortTime: incidentComparableTime(content.timestamp || incidentTimestamp(incident))
      }))
    )
    .sort((left, right) => right.sortTime - left.sortTime)
    .slice(0, 4)
    .map(({ sortTime: _sortTime, ...item }) => item);

  const fallbackTimelineRows = mappedIncidents.slice(0, 4).map(incident => ({
    id: `incident-timeline-${incident.id}`,
    title: `${incident.openedAt} · ${incident.stage}`,
    copy: latestIncidentMessage(incidents.find(item => String(item.id || item.name) === incident.id) || {}) || String(incident.title),
    meta: `${incident.service} · ${incident.owner}`,
    tone: incident.severity
  }));

  const ownershipRows = mappedIncidents.slice(0, 4).map(incident => ({
    id: `incident-owner-${incident.id}`,
    owner: incident.owner,
    queue: incident.stage,
    copy: String(incident.title),
    meta: `${incident.blastRadius} · ${incident.openedAt}`,
    tone: incident.severity === 'critical' ? 'critical' : incident.severity === 'success' ? 'success' : 'info'
  }));

  return {
    apiState: listIncidents.length > 0 ? 'ready' : 'empty',
    apiSource: 'status-page-incident-list',
    detailState: selectedDetail ? 'ready' : 'not-requested',
    detailSource: selectedDetail ? 'status-page-incident-detail' : 'none',
    detailId: selectedDetail ? incidentKey(selectedDetail) : undefined,
    queryLabel: buildStatusIncidentListUrl(query),
    title: surface.title,
    subtitle: surface.subtitle,
    kicker: surface.kicker,
    metrics: [
      { label: t('incidents.metric.open'), value: String(totalElements), tone: totalElements > 0 ? 'warning' : 'success' },
      { label: t('incidents.metric.critical'), value: String(criticalCount), tone: criticalCount > 0 ? 'critical' : 'success' },
      { label: t('incidents.metric.mitigating'), value: String(activeCount), tone: activeCount > 0 ? 'info' : 'success' },
      { label: t('incidents.metric.ownership-queues'), value: String(ownerCount), tone: ownerCount > 0 ? 'info' : 'neutral' }
    ],
    incidents: mappedIncidents,
    timelineRows: timelineRows.length > 0 ? timelineRows : fallbackTimelineRows,
    ownershipRows,
    nextHops: surface.nextHops,
    selectedIncidentId: mappedIncidents[0]?.id,
    selectedIncident: selectedDetail || incidents[0] || null,
    transitionState: selectedDetail || incidents[0] ? 'ready' : 'disabled',
    totalElements
  };
}

export async function loadIncidentWorkbenchData(
  apiGet: ApiGetter,
  t: Translator,
  formatTime: FormatTime,
  query: StatusIncidentListQuery = INCIDENT_WORKBENCH_DEFAULT_QUERY
) {
  const incidents = await apiGet<PageResult<StatusPageIncident>>(buildStatusIncidentListUrl(query));
  const detailUrl = selectedIncidentDetailUrl((incidents.content || [])[0]);
  const selectedDetail = detailUrl ? await apiGet<StatusPageIncident>(detailUrl) : null;
  return buildIncidentWorkbenchData(incidents, t, formatTime, query, selectedDetail);
}

export function buildIncidentStatusTransitionPayload(
  incident: StatusPageIncident,
  nextState: IncidentTransitionState,
  message: string,
  timestamp = Date.now()
): StatusPageIncident {
  if (incident.id == null) {
    throw new Error('Incident id is required for status transition');
  }

  return {
    ...incident,
    state: nextState,
    contents: [
      ...(incident.contents || []),
      {
        incidentId: incident.id,
        message,
        state: nextState,
        timestamp
      }
    ]
  };
}

export async function transitionIncidentStatus(
  apiPut: ApiPut,
  incident: StatusPageIncident,
  nextState: IncidentTransitionState,
  message: string,
  timestamp = Date.now()
) {
  const payload = buildIncidentStatusTransitionPayload(incident, nextState, message, timestamp);
  return apiPut<void>('/status/page/incident', payload);
}
