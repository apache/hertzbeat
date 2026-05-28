import { SUPPLEMENTAL_MESSAGES } from '../i18n-runtime-messages';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type MonitorStatusBadgeVariant = 'default' | 'success' | 'danger';
export type MonitorStatusTone = 'neutral' | 'success' | 'critical';

const MONITOR_STATUS_UP_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['monitors.status.up'] ?? 'monitors.status.up';
const MONITOR_STATUS_DOWN_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['monitors.status.down'] ?? 'monitors.status.down';
const MONITOR_STATUS_PAUSED_FALLBACK_LABEL = SUPPLEMENTAL_MESSAGES['en-US']?.['monitors.status.paused'] ?? 'monitors.status.paused';

export function statusLabel(status: number, t?: Translator): string {
  if (status === 1) return t ? t('monitors.status.up') : MONITOR_STATUS_UP_FALLBACK_LABEL;
  if (status === 2) return t ? t('monitors.status.down') : MONITOR_STATUS_DOWN_FALLBACK_LABEL;
  return t ? t('monitors.status.paused') : MONITOR_STATUS_PAUSED_FALLBACK_LABEL;
}

export function statusBadgeVariant(status?: number | null): MonitorStatusBadgeVariant {
  if (status === 1) return 'success';
  if (status === 2) return 'danger';
  return 'default';
}

export function monitorStatusTone(status?: number | null): MonitorStatusTone {
  if (status === 1) return 'success';
  if (status === 2) return 'critical';
  return 'neutral';
}

export function buildLabelRows(labels: Record<string, string> | undefined, t: Translator) {
  if (!labels || Object.keys(labels).length === 0) return [];
  return Object.entries(labels).map(([key, value]) => ({
    title: key,
    copy: value,
    meta: t('common.label')
  }));
}
