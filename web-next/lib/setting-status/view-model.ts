import type { PageResult, StatusPageComponent, StatusPageIncident, StatusPageOrg } from '@/lib/types';
import {
  componentStateLabel,
  incidentStateLabel,
  latestIncidentMessage,
  normalizeComponentState,
  orgStateLabel,
  readStatusCopy,
  statusComponentsCountLabel,
  statusComponentsLabel,
  statusFieldLabel,
  statusIncidentsCountLabel,
  statusIncidentsLabel,
  statusOrganizationCopy,
  statusOrganizationFallback,
  statusOrganizationLabel,
  statusOrganizationStateLabel,
  statusSettingLabel
} from '../status-center/display';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
export type StatusOrgDraft = {
  id?: number;
  name: string;
  state: string;
  description: string;
  home: string;
  feedback: string;
  logo: string;
  color: string;
};

export type StatusComponentDraft = {
  id?: number;
  orgId?: number;
  name: string;
  description: string;
  labelsText: string;
  method: string;
  configState: string;
  state: string;
};

export type StatusIncidentDraft = {
  id?: number;
  orgId?: number;
  name: string;
  state: string;
  componentIdsText: string;
  message: string;
  existingContents?: Array<{
    id?: number;
    message?: string;
    state?: number;
    timestamp?: number | null;
  }>;
  startTime?: number | null;
  endTime?: number | null;
};

export function stateLabel(state?: number | string | null, t?: Translator): string {
  if (t) {
    return componentStateLabel(state, t);
  }
  const normalizedState = normalizeComponentState(state);
  if (normalizedState === 0) return 'Normal';
  if (normalizedState === 1) return 'Abnormal';
  if (normalizedState === 2) return 'Unknown';
  return '-';
}

export function buildStatusFacts(org: StatusPageOrg, components: StatusPageComponent[], incidents: PageResult<StatusPageIncident>, t: Translator) {
  return [
    { label: readStatusCopy(t, 'common.workspace', 'Workspace'), value: statusSettingLabel(t) },
    { label: statusOrganizationLabel(t), value: org.name || statusOrganizationFallback(t) },
    { label: statusComponentsCountLabel(t), value: String(components.length) },
    { label: statusIncidentsCountLabel(t), value: String(incidents.totalElements || 0) }
  ];
}

export function buildStatusMetrics(components: StatusPageComponent[], incidents: PageResult<StatusPageIncident>, org: StatusPageOrg, t: Translator) {
  return [
    { label: statusComponentsLabel(t), value: String(components.length), tone: components.length > 0 ? 'success' : undefined },
    { label: statusIncidentsLabel(t), value: String(incidents.totalElements || 0), tone: (incidents.totalElements || 0) > 0 ? 'warning' : undefined },
    { label: statusOrganizationStateLabel(t), value: orgStateLabel(org.state, t) }
  ];
}

export function buildStatusRows(
  mode: 'component' | 'incident',
  components: StatusPageComponent[],
  incidents: PageResult<StatusPageIncident>,
  t: Translator,
  formatTime: (value?: number | string | null) => string
) {
  if (mode === 'component') {
    return components.length > 0
      ? components.map(item => ({
          title: item.name || t('setting.status.components.item.fallback'),
          copy: item.description || '-',
          meta: `${stateLabel(item.state, t)} · ${formatTime(item.gmtUpdate || item.gmtCreate || null)}`
        }))
      : [{ title: t('setting.status.components.empty.title'), copy: t('setting.status.components.empty.copy'), meta: '-' }];
  }

  return incidents.content.length > 0
    ? incidents.content.map(item => ({
        title: item.name || `${t('setting.status.incidents.item.fallback')} ${item.id || '-'}`,
        copy: latestIncidentMessage(item) || `${statusFieldLabel(t)} ${incidentStateLabel(item.state ?? item.status ?? null, t)}`,
        meta: `${incidentStateLabel(item.state ?? item.status ?? null, t)} · ${statusComponentsLabel(t)} ${(item.components || []).length} · ${formatTime(item.gmtUpdate || item.gmtCreate || null)}`
      }))
    : [{ title: t('setting.status.incidents.empty.title'), copy: t('setting.status.incidents.empty.copy'), meta: '-' }];
}

export function buildStatusIncidentEvidenceRows(
  incidents: PageResult<StatusPageIncident>,
  t: Translator,
  formatTime: (value?: number | string | null) => string
) {
  return incidents.content.map(item => ({
    key: String(item.id || item.name || 'incident'),
    title: item.name || `${t('setting.status.incidents.item.fallback')} ${item.id || '-'}`,
    copy: latestIncidentMessage(item) || `${statusFieldLabel(t)} ${incidentStateLabel(item.state ?? item.status ?? null, t)}`,
    meta: `${incidentStateLabel(item.state ?? item.status ?? null, t)} · ${statusComponentsLabel(t)} ${(item.components || []).length} · ${formatTime(item.gmtUpdate || item.gmtCreate || null)}`
  }));
}

export function buildStatusComponentEvidenceRows(
  components: StatusPageComponent[],
  t: Translator,
  formatTime: (value?: number | string | null) => string
) {
  return components.map(component => ({
    key: String(component.id || component.name || 'component'),
    title: component.name || t('setting.status.components.item.fallback'),
    copy: component.description || '-',
    meta: `${stateLabel(component.state, t)} · ${formatTime(component.gmtUpdate || component.gmtCreate || null)}`
  }));
}

export function buildStatusOrgOverviewRows(
  org: StatusPageOrg,
  t: Translator,
  formatTime: (value?: number | string | null) => string
) {
  return [
    {
      title: org.name || statusOrganizationFallback(t),
      copy: org.description || statusOrganizationCopy(t),
      meta: orgStateLabel(org.state, t)
    },
    {
      title: readStatusCopy(t, 'setting.status.org.feedback', 'Feedback'),
      copy: `${org.home || '-'} · ${org.feedback || '-'}`,
      meta: formatTime(org.gmtUpdate || org.gmtCreate || null)
    }
  ];
}

export function buildStatusOrgDraft(org?: StatusPageOrg | null): StatusOrgDraft {
  return {
    id: org?.id,
    name: org?.name || '',
    state: String(org?.state ?? 0),
    description: org?.description || '',
    home: org?.home || '',
    feedback: org?.feedback || '',
    logo: org?.logo || '',
    color: org?.color || ''
  };
}

export function buildStatusOrgPayload(draft: StatusOrgDraft): StatusPageOrg {
  const state = Number.parseInt(draft.state, 10);
  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    state: Number.isFinite(state) ? state : 0,
    description: draft.description.trim(),
    home: draft.home.trim(),
    feedback: draft.feedback.trim(),
    logo: draft.logo.trim(),
    color: draft.color.trim()
  };
}

export function validateStatusOrgDraft(draft: StatusOrgDraft, t: Translator) {
  if (!draft.name.trim()) return t('setting.status.validation.name');
  if (!draft.description.trim()) return t('setting.status.validation.description');
  return null;
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

function parseNumberString(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function buildStatusComponentDraft(component?: StatusPageComponent | null): StatusComponentDraft {
  return {
    id: component?.id,
    orgId: component?.orgId,
    name: component?.name || '',
    description: component?.description || '',
    labelsText: Object.entries(component?.labels || {}).map(([key, value]) => `${key}:${value}`).join(', '),
    method: String(component?.method ?? 0),
    configState: String(component?.configState ?? 0),
    state: String(component?.state ?? 0),
  };
}

export function buildStatusComponentPayload(draft: StatusComponentDraft): StatusPageComponent {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    ...(draft.orgId ? { orgId: draft.orgId } : {}),
    name: draft.name.trim(),
    description: draft.description.trim(),
    labels: parseLabelRecord(draft.labelsText),
    method: parseNumberString(draft.method, 0),
    configState: parseNumberString(draft.configState, 0),
    state: parseNumberString(draft.state, 0),
  };
}

export function validateStatusComponentDraft(draft: StatusComponentDraft, t: Translator) {
  if (!draft.name.trim()) return t('setting.status.validation.component-name');
  if (!draft.description.trim()) return t('setting.status.validation.component-description');
  return null;
}

function parseIdList(text: string) {
  return text
    .split(',')
    .map(item => Number.parseInt(item.trim(), 10))
    .filter(value => Number.isFinite(value));
}

export function buildStatusIncidentDraft(incident?: StatusPageIncident | null): StatusIncidentDraft {
  const latestMessage = incident?.contents?.slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0]?.message || '';
  return {
    id: incident?.id,
    orgId: incident?.orgId,
    name: incident?.name || '',
    state: String(incident?.state ?? 0),
    componentIdsText: (incident?.components || []).map(component => component.id).filter(Boolean).join(', '),
    message: latestMessage,
    existingContents: incident?.contents || [],
    startTime: incident?.startTime ?? null,
    endTime: incident?.endTime ?? null,
  };
}

export function buildStatusIncidentPayload(draft: StatusIncidentDraft, components: StatusPageComponent[]): StatusPageIncident {
  const state = parseNumberString(draft.state, 0);
  const componentIds = new Set(parseIdList(draft.componentIdsText));
  const matchedComponents = components.filter(component => component.id != null && componentIds.has(component.id));
  const now = Date.now();
  const nextContents = [...(draft.existingContents || [])];
  if (draft.message.trim()) {
    nextContents.push({
      message: draft.message.trim(),
      state,
      timestamp: now
    });
  }

  return {
    ...(draft.id ? { id: draft.id } : {}),
    ...(draft.orgId ? { orgId: draft.orgId } : {}),
    name: draft.name.trim(),
    state,
    startTime: draft.startTime ?? now,
    endTime: state === 3 ? now : draft.endTime ?? null,
    components: matchedComponents,
    contents: nextContents
  };
}

export function validateStatusIncidentDraft(draft: StatusIncidentDraft, t: Translator) {
  if (!draft.name.trim()) return t('setting.status.validation.incident-name');
  if (!draft.componentIdsText.trim()) return t('setting.status.validation.incident-components');
  if (!draft.message.trim()) return t('setting.status.validation.incident-message');
  return null;
}
