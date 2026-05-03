import type { SingleAlert } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function alertSeverityLabel(alert: SingleAlert, t: Translator): string {
  const severity = alert.labels?.severity || alert.labels?.level || alert.labels?.priority || '';
  return severity ? severity.toUpperCase() : t('alert.center.default-title');
}

export function alertStatusLabel(status: string | null | undefined, t: Translator): string {
  const normalizedStatus = status?.trim().toLowerCase();
  if (!normalizedStatus || normalizedStatus === 'firing') return t('alert.center.status.firing');
  if (normalizedStatus === 'resolved') return t('alert.center.status.resolved');
  if (normalizedStatus === 'suppressed') return t('alert.center.status.suppressed');
  return status ?? t('alert.center.status.firing');
}
