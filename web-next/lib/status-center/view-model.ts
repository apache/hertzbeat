import type { StatusPageComponent, StatusPageHistory, StatusPageIncident, StatusPageOrg } from '@/lib/types';
import {
  componentStateLabel,
  currentStatusViewLabel,
  incidentStateLabel,
  latestIncidentMessage,
  normalizeComponentState,
  resolveStatusHref,
  readStatusCopy,
  statusHistoryBlockColor,
  orgStateLabel,
  statusPageLabel,
  statusPublicComponentHistoryLabel,
  statusPublicFeedbackLabel,
  statusPublicHomeLabel,
  statusPublicHistoryLabel,
  statusPublicIncidentRangeLabel,
  statusPublicUptimeLabel,
  statusPublicUpdatedLabel,
  statusPublicYearLabel,
  statusIncidentStateColor,
  statusPublicOrgStateColor,
  statusComponentsCountLabel,
  statusIncidentsCountLabel,
  statusViewLabel
} from './display';

export { statusIncidentStateColor } from './display';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type TranslatorWithValues = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function componentTone(status?: number | string | null): string {
  const normalizedState = normalizeComponentState(status);
  if (normalizedState === 0) return 'normal';
  if (normalizedState === 1) return 'abnormal';
  return 'unknown';
}

export function buildStatusMetrics(components: StatusPageComponent[], incidents: StatusPageIncident[], t: Translator) {
  const normalCount = components.filter(item => componentTone(item.status ?? item.state ?? null) === 'normal').length;
  return [
    { label: statusComponentsCountLabel(t), value: String(components.length), tone: components.length > 0 ? 'success' : undefined },
    { label: componentStateLabel(0, t), value: String(normalCount), tone: normalCount > 0 ? 'success' : undefined },
    { label: statusIncidentsCountLabel(t), value: String(incidents.length), tone: incidents.length > 0 ? 'warning' : 'success' }
  ];
}

export function buildStatusFacts(
  mode: 'component' | 'incident',
  components: StatusPageComponent[],
  incidents: StatusPageIncident[],
  t: TranslatorWithValues
) {
  return [
    { label: readStatusCopy(t, 'common.workspace', 'Workspace'), value: statusPageLabel(t) },
    { label: statusComponentsCountLabel(t), value: String(components.length) },
    { label: statusIncidentsCountLabel(t), value: String(incidents.length) },
    {
      label: statusViewLabel(t),
      value: currentStatusViewLabel(mode, t)
    }
  ];
}

export function buildStatusRows(
  mode: 'component' | 'incident',
  components: StatusPageComponent[],
  incidents: StatusPageIncident[],
  t: Translator,
  formatTime: (value?: number | string | null) => string
) {
  if (mode === 'component') {
    return components.length > 0
      ? components.map(item => ({
          title: item.name || t('status.component.default-title'),
          copy: item.description || item.endpoint || '-',
          meta: `${componentStateLabel(item.status ?? item.state ?? null, t)} · ${formatTime(item.latestTime || item.gmtUpdate || item.gmtCreate || null)}`
        }))
      : [{ title: t('status.components.empty.title'), copy: t('status.components.empty.copy'), meta: '-' }];
  }

  return incidents.length > 0
    ? incidents.map(item => ({
        title: item.title || `${t('status.incident.default-title')} ${item.id || '-'}`,
        copy: latestIncidentMessage(item) || `${readStatusCopy(t, 'common.status', 'Status')} ${incidentStateLabel(item.status ?? item.state ?? null, t)}`,
        meta: `${incidentStateLabel(item.status ?? item.state ?? null, t)} · ${formatTime(item.updateTime || item.createTime || null)}`
      }))
    : [{ title: t('status.incidents.empty.title'), copy: t('status.incidents.empty.copy'), meta: '-' }];
}

export function buildStatusOrgRows(mode: 'component' | 'incident', org: StatusPageOrg, t: Translator) {
  return [
    {
      title: org.name || t('status.org.empty'),
      copy: org.description || t('status.org.copy'),
      meta: orgStateLabel(org.state, t)
    },
    {
      title: statusViewLabel(t),
      copy: currentStatusViewLabel(mode, t),
      meta: statusPageLabel(t)
    }
  ];
}

export function buildStatusPosture(mode: 'component' | 'incident', incidents: StatusPageIncident[], t: Translator) {
  return {
    title: currentStatusViewLabel(mode, t),
    copy:
      mode === 'component'
        ? readStatusCopy(t, 'status.components.posture', 'Keep the public page focused on live component health updates.')
        : readStatusCopy(t, 'status.incidents.copy', 'Review the latest public incidents and recovery updates.'),
    tone: mode === 'incident' && incidents.length > 0 ? 'danger' : 'default'
  } as const;
}

export function buildStatusBrand(org: StatusPageOrg, t: Translator, formatTime: (value?: number | string | null) => string) {
  return {
    title: org.name || statusPageLabel(t),
    subtitle: org.description || readStatusCopy(t, 'status.org.copy', 'Public status information and service health at a glance.'),
    logo: org.logo?.trim() || '',
    color: org.color?.trim() || '',
    stateLabel: orgStateLabel(org.state, t),
    stateColor: statusPublicOrgStateColor(org.state),
    homeHref: resolveStatusHref(org.home),
    feedbackHref: resolveStatusHref(org.feedback),
    homeLabel: statusPublicHomeLabel(t),
    feedbackLabel: statusPublicFeedbackLabel(t),
    historyLabel: statusPublicHistoryLabel(t),
    uptimeLabel: statusPublicUptimeLabel(t),
    updatedLabel: statusPublicUpdatedLabel(t),
    updatedAt: formatTime(org.gmtUpdate || org.gmtCreate || null)
  };
}

export function buildStatusIncidentYears(selectedYear: number, t: Translator, span = 6) {
  const normalizedYear = Number.isFinite(selectedYear) ? Math.trunc(selectedYear) : new Date().getFullYear();
  const count = Math.max(1, Math.trunc(span));
  return Array.from({ length: count }, (_, index) => normalizedYear - index).map(year => ({
    value: year,
    label: `${statusPublicYearLabel(t)} ${year}`
  }));
}

export function clampStatusIncidentYear(value: number, currentYear = new Date().getFullYear(), minimumYear = 1970) {
  const normalizedYear = Number.isFinite(value) ? Math.trunc(value) : currentYear;
  return Math.min(currentYear, Math.max(minimumYear, normalizedYear));
}

export function buildStatusComponentHistoryRows(
  components: StatusPageComponent[],
  t: Translator,
  formatTime: (value?: number | string | null) => string
) {
  return components.map(component => {
    const history = [...(component.history || [])].sort(
      (left, right) => Number(right.timestamp ?? 0) - Number(left.timestamp ?? 0)
    ) as StatusPageHistory[];
    const latestHistory = history[0];
    const latestTime = component.latestTime || component.gmtUpdate || component.gmtCreate || latestHistory?.timestamp || null;
    const latestUptime = latestHistory?.uptime != null ? `${(latestHistory.uptime * 100).toFixed(2)}%` : '-';

    return {
      key: String(component.id || component.name || 'component'),
      title: component.name || t('status.component.default-title'),
      copy: component.description || component.endpoint || '-',
      state: component.status ?? component.state ?? null,
      statusLabel: componentStateLabel(component.status ?? component.state ?? null, t),
      latestTimeLabel: formatTime(latestTime),
      latestUptimeLabel: latestUptime,
      historyLabel: statusPublicComponentHistoryLabel(t),
      uptimeLabel: statusPublicUptimeLabel(t),
      history,
      blocks: history.map(item => ({
        timestampLabel: formatTime(item.timestamp || null),
        uptimeLabel: item.uptime != null ? `${(item.uptime * 100).toFixed(2)}%` : '-',
        title: `${formatTime(item.timestamp || null)} · ${statusPublicUptimeLabel(t)} ${item.uptime != null ? `${(item.uptime * 100).toFixed(2)}%` : '-'}`,
        color: statusHistoryBlockColor(item)
      }))
    };
  });
}

export function buildStatusIncidentCards(
  incidents: StatusPageIncident[],
  t: Translator,
  formatTime: (value?: number | string | null) => string
) {
  return incidents.map(incident => {
    const contents = [...(incident.contents || [])];
    const latestMessage = latestIncidentMessage(incident);
    const stateLabel = incidentStateLabel(incident.status ?? incident.state ?? null, t);
    const stateColor = statusIncidentStateColor(incident.status ?? incident.state ?? null);

    return {
      key: String(incident.id || incident.title || incident.name || 'incident'),
      title: incident.title || incident.name || `${t('status.incident.default-title')} ${incident.id || '-'}`,
      copy: latestMessage || `${readStatusCopy(t, 'status.incident.status', 'Status')} ${stateLabel}`,
      state: incident.status ?? incident.state ?? null,
      stateLabel,
      stateColor,
      meta: `${stateLabel} · ${formatTime(incident.updateTime || incident.createTime || incident.endTime || incident.startTime || null)}`,
      rangeLabel: `${statusPublicIncidentRangeLabel(t)} · ${formatTime(incident.startTime || incident.createTime || null)} → ${formatTime(incident.endTime || incident.updateTime || null)}`,
      startAtLabel: formatTime(incident.startTime || incident.createTime || null),
      updateAtLabel: formatTime(incident.endTime || incident.updateTime || incident.startTime || incident.createTime || null),
      contents: contents.map(content => ({
        timestampLabel: formatTime(content.timestamp || null),
        stateLabel: content.state != null ? incidentStateLabel(content.state, t) : '-',
        state: content.state ?? null,
        stateColor: statusIncidentStateColor(content.state ?? null),
        message: content.message || ''
      }))
    };
  });
}
