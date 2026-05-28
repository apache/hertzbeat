import type { StatusPageIncident } from '@/lib/types';
import type { StatusPageHistory } from '@/lib/types';
import { SUPPLEMENTAL_MESSAGES } from '@/lib/i18n-runtime-messages';

export type StatusCopyTranslator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

const STATUS_PUBLIC_HOME_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.home'] ?? 'status.public.home';
const STATUS_PUBLIC_FEEDBACK_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.feedback'] ?? 'status.public.feedback';
const STATUS_PUBLIC_YEAR_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.year'] ?? 'status.public.year';
const STATUS_PUBLIC_HISTORY_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.history'] ?? 'status.public.history';
const STATUS_PUBLIC_UPTIME_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.uptime'] ?? 'status.public.uptime';
const STATUS_PUBLIC_UPDATED_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.updated'] ?? 'status.public.updated';
const STATUS_PUBLIC_COMPONENT_HISTORY_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.component-history'] ?? 'status.public.component-history';
const STATUS_PUBLIC_INCIDENT_RANGE_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.incident-range'] ?? 'status.public.incident-range';
const STATUS_PUBLIC_TODAY_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.today'] ?? 'status.public.today';
const STATUS_PUBLIC_THIRTY_DAY_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.30-day'] ?? 'status.public.30-day';
const STATUS_PUBLIC_POWERED_BY_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.power-by'] ?? 'status.public.power-by';
const STATUS_PUBLIC_TO_INCIDENT_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.to-incident'] ?? 'status.public.to-incident';
const STATUS_PUBLIC_TO_COMPONENT_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.to-component'] ?? 'status.public.to-component';
const STATUS_INCIDENT_PUBLIC_START_AT_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.incident.public.start-at'] ?? 'status.incident.public.start-at';
const STATUS_INCIDENT_PUBLIC_UPDATE_AT_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.incident.public.update-at'] ?? 'status.incident.public.update-at';
const STATUS_PAGE_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.page'] ?? 'status.page';
const STATUS_SETTING_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['setting.status.title'] ?? 'setting.status.title';
const STATUS_SETTING_COMPONENTS_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['setting.status.components.title'] ?? 'setting.status.components.title';
const STATUS_COMPONENTS_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.components.title'] ?? 'status.components.title';
const STATUS_SETTING_INCIDENTS_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['setting.status.incidents.title'] ?? 'setting.status.incidents.title';
const STATUS_INCIDENTS_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.incidents.title'] ?? 'status.incidents.title';
const STATUS_SETTING_ORGANIZATION_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['setting.status.org.title'] ?? 'setting.status.org.title';
const STATUS_ORGANIZATION_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.org.title'] ?? 'status.org.title';
const STATUS_SETTING_ORGANIZATION_STATE_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['setting.status.org.state'] ?? 'setting.status.org.state';
const COMMON_CURRENT_VIEW_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['common.current-view'] ?? 'common.current-view';
const COMMON_STATUS_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['common.status'] ?? 'common.status';
const STATUS_FACT_COMPONENTS_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.fact.components'] ?? 'status.fact.components';
const STATUS_FACT_INCIDENTS_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.fact.incidents'] ?? 'status.fact.incidents';
const STATUS_SETTING_ORGANIZATION_COPY_FALLBACK = SUPPLEMENTAL_MESSAGES['en-US']?.['setting.status.org.copy'] ?? 'setting.status.org.copy';
const STATUS_ORGANIZATION_COPY_FALLBACK = SUPPLEMENTAL_MESSAGES['en-US']?.['status.org.copy'] ?? 'status.org.copy';
const STATUS_SETTING_ORGANIZATION_NAME_FALLBACK = SUPPLEMENTAL_MESSAGES['en-US']?.['setting.status.org.fallback'] ?? 'setting.status.org.fallback';
const STATUS_ORGANIZATION_NAME_FALLBACK = SUPPLEMENTAL_MESSAGES['en-US']?.['status.org.empty'] ?? 'status.org.empty';
const STATUS_COMPONENT_STATE_0_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.component.state.0'] ?? 'status.component.state.0';
const STATUS_COMPONENT_STATE_1_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.component.state.1'] ?? 'status.component.state.1';
const STATUS_COMPONENT_STATE_2_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.component.state.2'] ?? 'status.component.state.2';
const STATUS_INCIDENT_STATE_0_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.incident.state.0'] ?? 'status.incident.state.0';
const STATUS_INCIDENT_STATE_1_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.incident.state.1'] ?? 'status.incident.state.1';
const STATUS_INCIDENT_STATE_2_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.incident.state.2'] ?? 'status.incident.state.2';
const STATUS_INCIDENT_STATE_3_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.incident.state.3'] ?? 'status.incident.state.3';
const STATUS_PUBLIC_ORG_STATE_0_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.org.state.0'] ?? 'status.public.org.state.0';
const STATUS_PUBLIC_ORG_STATE_1_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.org.state.1'] ?? 'status.public.org.state.1';
const STATUS_PUBLIC_ORG_STATE_2_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['status.public.org.state.2'] ?? 'status.public.org.state.2';

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
      return readStatusCopy(t, 'status.component.state.0', STATUS_COMPONENT_STATE_0_FALLBACK_LABEL);
    case 1:
      return readStatusCopy(t, 'status.component.state.1', STATUS_COMPONENT_STATE_1_FALLBACK_LABEL);
    case 2:
      return readStatusCopy(t, 'status.component.state.2', STATUS_COMPONENT_STATE_2_FALLBACK_LABEL);
    default:
      return '-';
  }
}

export function incidentStateLabel(value: unknown, t: StatusCopyTranslator) {
  switch (normalizeIncidentState(value)) {
    case 0:
      return readStatusCopy(t, 'status.incident.state.0', STATUS_INCIDENT_STATE_0_FALLBACK_LABEL);
    case 1:
      return readStatusCopy(t, 'status.incident.state.1', STATUS_INCIDENT_STATE_1_FALLBACK_LABEL);
    case 2:
      return readStatusCopy(t, 'status.incident.state.2', STATUS_INCIDENT_STATE_2_FALLBACK_LABEL);
    case 3:
      return readStatusCopy(t, 'status.incident.state.3', STATUS_INCIDENT_STATE_3_FALLBACK_LABEL);
    default:
      return '-';
  }
}

export function orgStateLabel(value: unknown, t: StatusCopyTranslator) {
  switch (normalizeOrgState(value)) {
    case 0:
      return readStatusCopy(t, 'status.public.org.state.0', STATUS_PUBLIC_ORG_STATE_0_FALLBACK_LABEL);
    case 1:
      return readStatusCopy(t, 'status.public.org.state.1', STATUS_PUBLIC_ORG_STATE_1_FALLBACK_LABEL);
    case 2:
      return readStatusCopy(t, 'status.public.org.state.2', STATUS_PUBLIC_ORG_STATE_2_FALLBACK_LABEL);
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
      readStatusCopy(t, 'status.public.to-component', STATUS_PUBLIC_TO_COMPONENT_FALLBACK_LABEL)
    );
  }

  return readStatusCopy(
    t,
    'status.incidents.view',
    readStatusCopy(t, 'status.public.to-incident', STATUS_PUBLIC_TO_INCIDENT_FALLBACK_LABEL)
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
  return readStatusCopy(t, 'status.public.home', STATUS_PUBLIC_HOME_FALLBACK_LABEL);
}

export function statusPublicFeedbackLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.feedback', STATUS_PUBLIC_FEEDBACK_FALLBACK_LABEL);
}

export function statusPublicYearLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.year', STATUS_PUBLIC_YEAR_FALLBACK_LABEL);
}

export function statusPublicHistoryLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.history', STATUS_PUBLIC_HISTORY_FALLBACK_LABEL);
}

export function statusPublicUptimeLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.uptime', STATUS_PUBLIC_UPTIME_FALLBACK_LABEL);
}

export function statusPublicUpdatedLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.updated', STATUS_PUBLIC_UPDATED_FALLBACK_LABEL);
}

export function statusPublicComponentHistoryLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.component-history', STATUS_PUBLIC_COMPONENT_HISTORY_FALLBACK_LABEL);
}

export function statusPublicIncidentRangeLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.incident-range', STATUS_PUBLIC_INCIDENT_RANGE_FALLBACK_LABEL);
}

export function statusPublicTodayLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.today', STATUS_PUBLIC_TODAY_FALLBACK_LABEL);
}

export function statusPublicThirtyDayLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.30-day', STATUS_PUBLIC_THIRTY_DAY_FALLBACK_LABEL);
}

export function statusPublicPoweredByLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.power-by', STATUS_PUBLIC_POWERED_BY_FALLBACK_LABEL);
}

export function statusPublicToIncidentLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.to-incident', STATUS_PUBLIC_TO_INCIDENT_FALLBACK_LABEL);
}

export function statusPublicToComponentLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.public.to-component', STATUS_PUBLIC_TO_COMPONENT_FALLBACK_LABEL);
}

export function statusIncidentPublicStartAtLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.incident.public.start-at', STATUS_INCIDENT_PUBLIC_START_AT_FALLBACK_LABEL);
}

export function statusIncidentPublicUpdateAtLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.incident.public.update-at', STATUS_INCIDENT_PUBLIC_UPDATE_AT_FALLBACK_LABEL);
}

export function statusPageLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.page', STATUS_PAGE_FALLBACK_LABEL);
}

export function statusSettingLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'setting.status.title', STATUS_SETTING_FALLBACK_LABEL);
}

export function statusComponentsLabel(t: StatusCopyTranslator) {
  const sharedLabel = readStatusCopy(t, 'status.components.title', STATUS_COMPONENTS_FALLBACK_LABEL);
  return readStatusCopy(
    t,
    'setting.status.components.title',
    sharedLabel === STATUS_COMPONENTS_FALLBACK_LABEL ? STATUS_SETTING_COMPONENTS_FALLBACK_LABEL : sharedLabel
  );
}

export function statusIncidentsLabel(t: StatusCopyTranslator) {
  const sharedLabel = readStatusCopy(t, 'status.incidents.title', STATUS_INCIDENTS_FALLBACK_LABEL);
  return readStatusCopy(
    t,
    'setting.status.incidents.title',
    sharedLabel === STATUS_INCIDENTS_FALLBACK_LABEL ? STATUS_SETTING_INCIDENTS_FALLBACK_LABEL : sharedLabel
  );
}

export function statusOrganizationLabel(t: StatusCopyTranslator) {
  const sharedLabel = readStatusCopy(t, 'status.org.title', STATUS_ORGANIZATION_FALLBACK_LABEL);
  return readStatusCopy(
    t,
    'setting.status.org.title',
    sharedLabel === STATUS_ORGANIZATION_FALLBACK_LABEL ? STATUS_SETTING_ORGANIZATION_FALLBACK_LABEL : sharedLabel
  );
}

export function statusOrganizationStateLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'setting.status.org.state', STATUS_SETTING_ORGANIZATION_STATE_FALLBACK_LABEL);
}

export function statusViewLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.fact.view', readStatusCopy(t, 'common.current-view', COMMON_CURRENT_VIEW_FALLBACK_LABEL));
}

export function statusFieldLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'common.status', COMMON_STATUS_FALLBACK_LABEL);
}

export function statusComponentsCountLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.fact.components', STATUS_FACT_COMPONENTS_FALLBACK_LABEL);
}

export function statusIncidentsCountLabel(t: StatusCopyTranslator) {
  return readStatusCopy(t, 'status.fact.incidents', STATUS_FACT_INCIDENTS_FALLBACK_LABEL);
}

export function statusOrganizationCopy(t: StatusCopyTranslator) {
  const sharedCopy = readStatusCopy(t, 'status.org.copy', STATUS_ORGANIZATION_COPY_FALLBACK);
  return readStatusCopy(
    t,
    'setting.status.org.copy',
    sharedCopy === STATUS_ORGANIZATION_COPY_FALLBACK ? STATUS_SETTING_ORGANIZATION_COPY_FALLBACK : sharedCopy
  );
}

export function statusOrganizationFallback(t: StatusCopyTranslator) {
  const sharedName = readStatusCopy(t, 'status.org.empty', STATUS_ORGANIZATION_NAME_FALLBACK);
  return readStatusCopy(
    t,
    'setting.status.org.fallback',
    sharedName === STATUS_ORGANIZATION_NAME_FALLBACK ? STATUS_SETTING_ORGANIZATION_NAME_FALLBACK : sharedName
  );
}
