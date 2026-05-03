type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export function statusLabel(status: number, t?: Translator): string {
  if (status === 1) return t ? t('monitors.status.up') : 'UP';
  if (status === 2) return t ? t('monitors.status.down') : 'DOWN';
  return t ? t('monitors.status.paused') : 'PAUSED';
}

export function buildLabelRows(labels: Record<string, string> | undefined, t: Translator) {
  if (!labels || Object.keys(labels).length === 0) return [];
  return Object.entries(labels).map(([key, value]) => ({
    title: key,
    copy: value,
    meta: t('common.label')
  }));
}
