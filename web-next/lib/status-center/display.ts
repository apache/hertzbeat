import type { StatusPageIncident } from '@/lib/types';
import type { StatusPageHistory } from '@/lib/types';

export type StatusCopyTranslator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

function readNumericToken(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return null;
}

function normalizeToken(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function toComparableTime(value: unknown) {
  const numericValue = readNumericToken(value);
  if (numericValue != null) {
    return numericValue;
  }
  if (typeof value === 'string') {
    const parsedValue = Date.parse(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }
  return 0;
}

export function readStatusCopy(t: StatusCopyTranslator, key: string, fallback: string) {
  const value = t(key);
  return value && value !== key ? value : fallback;
}

export function resolveStatusHref(value?: string | null) {
  const href = value?.trim();
  if (!href) {
    return null;
  }
  if (href.includes('@') && !href.includes('://') && !href.startsWith('mailto:')) {
    return `mailto:${href}`;
  }
  return href;
}

export function normalizeComponentState(value: unknown) {
  const numericValue = readNumericToken(value);
  if (numericValue != null) {
    return numericValue;
  }

  switch (normalizeToken(value)) {
    case 'normal':
    case 'operational':
    case 'up':
      return 0;
    case 'abnormal':
    case 'degraded':
    case 'down':
      return 1;
    case 'unknown':
    case 'maintenance':
    case 'paused':
      return 2;
    default:
      return null;
  }
}

export function normalizeIncidentState(value: unknown) {
  const numericValue = readNumericToken(value);
  if (numericValue != null) {
    return numericValue;
  }

  switch (normalizeToken(value)) {
    case 'investigating':
      return 0;
    case 'identified':
      return 1;
    case 'monitoring':
      return 2;
    case 'resolved':
      return 3;
    default:
      return null;
  }
}

function normalizeOrgState(value: unknown) {
  const numericValue = readNumericToken(value);
  if (numericValue != null) {
    return numericValue;
  }

  switch (normalizeToken(value)) {
    case 'operational':
    case 'healthy':
    case 'allsystemsoperational':
      return 0;
    case 'degraded':
    case 'partialoutage':
    case 'somesystemsabnormal':
      return 1;
    case 'abnormal':
    case 'outage':
    case 'majoroutage':
    case 'allsystemsabnormal':
      return 2;
    default:
      return null;
  }
}

export function componentStateLabel(value: unknown, t: StatusCopyTranslator) {
  switch (normalizeComponentState(value)) {
    case 0:
      return readStatusCopy(t, 'status.component.state.0', 'Normal');
    case 1:
      return readStatusCopy(t, 'status.component.state.1', 'Abnormal');
    case 2:
      return readStatusCopy(t, 'status.component.state.2', 'Unknown');
    default:
      return '-';
  }
}

export function incidentStateLabel(value: unknown, t: StatusCopyTranslator) {
  switch (normalizeIncidentState(value)) {
    case 0:
      return readStatusCopy(t, 'status.incident.state.0', 'Investigating');
    case 1:
      return readStatusCopy(t, 'status.incident.state.1', 'Identified');
    case 2:
      return readStatusCopy(t, 'status.incident.state.2', 'Monitoring');
    case 3:
      return readStatusCopy(t, 'status.incident.state.3', 'Resolved');
    default:
      return '-';
  }
}

export function orgStateLabel(value: unknown, t: StatusCopyTranslator) {
  switch (normalizeOrgState(value)) {
    case 0:
      return readStatusCopy(t, 'status.public.org.state.0', 'All systems operational');
    case 1:
      return readStatusCopy(t, 'status.public.org.state.1', 'Some systems abnormal');
    case 2:
      return readStatusCopy(t, 'status.public.org.state.2', 'All systems abnormal');
    default:
      return '-';
  }
}

export function statusPublicOrgStateColor(value: unknown) {
  switch (normalizeOrgState(value)) {
    case 0:
      return '#28a745';
    case 1:
      return '#e56c23';
    case 2:
      return '#ff2f2f';
    default:
      return '#6b7280';
  }
}

export function currentStatusViewLabel(mode: 'component' | 'incident', t: StatusCopyTranslator) {
  if (mode === 'component') {
    return readStatusCopy(
      t,
      'status.components.view',
      readStatusCopy(t, 'status.public.to-component', 'Status Page')
    );
  }

  return readStatusCopy(
    t,
    'status.incidents.view',
    readStatusCopy(t, 'status.public.to-incident', 'Incident History')
  );
}

export function latestIncidentMessage(incident: Pick<StatusPageIncident, 'contents'>) {
  const latestContent = [...(incident.contents || [])].sort(
    (left, right) => toComparableTime(right.timestamp) - toComparableTime(left.timestamp)
  )[0];
  const message = latestContent?.message?.trim();
  return message || null;
}

export function statusHistoryBlockColor(history: Pick<StatusPageHistory, 'state' | 'uptime'>) {
  if (history.state === 0) {
    return '#28a745';
  }
  if (history.state === 2) {
    return 'rgb(200 200 200)';
  }
  const uptime = typeof history.uptime === 'number' ? history.uptime : 0;
  return `rgb(255, ${Math.max(0, Math.min(255, Math.round(uptime * 300)))}, 0)`;
}

export function statusIncidentStateColor(value: unknown) {
  switch (normalizeIncidentState(value)) {
    case 0:
      return '#ff2f2f';
    case 1:
      return '#e56c23';
    case 2:
      return '#19a7e7';
    case 3:
      return '#28a745';
    default:
      return '#6b7280';
  }
}

export function statusPublicHomeLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.home', 'Home');
}

export function statusPublicFeedbackLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.feedback', 'Feedback');
}

export function statusPublicYearLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.year', 'Year');
}

export function statusPublicHistoryLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.history', 'History');
}

export function statusPublicUptimeLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.uptime', 'Uptime');
}

export function statusPublicUpdatedLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.updated', 'Updated');
}

export function statusPublicComponentHistoryLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.component-history', 'Component history');
}

export function statusPublicIncidentRangeLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.incident-range', 'Incident history');
}

export function statusPublicTodayLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.today', 'Today');
}

export function statusPublicThirtyDayLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.30-day', '30 days');
}

export function statusPublicPoweredByLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.power-by', 'Powered by HertzBeat');
}

export function statusPublicToIncidentLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.to-incident', 'Incident History');
}

export function statusPublicToComponentLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.to-component', 'Status Page');
}

export function statusIncidentPublicStartAtLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.incident.public.start-at', 'Start At');
}

export function statusIncidentPublicUpdateAtLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.incident.public.update-at', 'Update At');
}

export function statusPageLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.page', 'Status Page');
}

export function statusSettingLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'setting.status.title', 'Status page settings');
}

export function statusComponentsLabel(t: StatusCopyTranslator) {
  return readStatusCopy(
    t,
    'setting.status.components.title',
    readStatusCopy(t, 'status.components.title', 'Components')
  );
}

export function statusIncidentsLabel(t: StatusCopyTranslator) {
  return readStatusCopy(
    t,
    'setting.status.incidents.title',
    readStatusCopy(t, 'status.incidents.title', 'Incidents')
  );
}

export function statusOrganizationLabel(t: StatusCopyTranslator) {
  return readStatusCopy(
    t,
    'setting.status.org.title',
    readStatusCopy(t, 'status.org.title', 'Organization')
  );
}

export function statusOrganizationStateLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'setting.status.org.state', 'Org state');
}

export function statusViewLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.fact.view', readStatusCopy(t, 'common.current-view', 'Current view'));
}

export function statusFieldLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'common.status', 'Status');
}

export function statusComponentsCountLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.fact.components', 'Components');
}

export function statusIncidentsCountLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.fact.incidents', 'Incidents');
}

export function statusOrganizationCopy(t: StatusCopyTranslator) {
  return readStatusCopy(
    t,
    'setting.status.org.copy',
    readStatusCopy(t, 'status.org.copy', 'Publish your public org profile to explain who owns this status page.')
  );
}

export function statusOrganizationFallback(t: StatusCopyTranslator) {
  return readStatusCopy(
    t,
    'setting.status.org.fallback',
    readStatusCopy(t, 'status.org.empty', 'Status organization')
  );
}
