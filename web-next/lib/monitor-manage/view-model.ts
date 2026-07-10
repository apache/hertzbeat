import type { Monitor } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type MonitorWorkbenchNarrativeArgs = {
  entityContextActive: boolean;
  total: number;
  downCount: number;
  status: string;
  fellBackToAll: boolean;
};

type MonitorFallbackArgs = {
  entityContextActive: boolean;
  statusWasImplicit: boolean;
  status: string;
  totalElements: number;
  fellBackToAll: boolean;
};

export function buildMonitorMetrics(items: Array<{ status: number }>, t: Translator) {
  const upCount = items.filter(item => item.status === 1).length;
  const downCount = items.filter(item => item.status === 2).length;
  const pausedCount = items.filter(item => item.status !== 1 && item.status !== 2).length;

  return [
    { label: t('monitors.metric.up'), value: String(upCount), tone: upCount > 0 ? 'success' : undefined },
    { label: t('monitors.metric.down'), value: String(downCount), tone: downCount > 0 ? 'danger' : undefined },
    { label: t('monitors.metric.paused'), value: String(pausedCount), tone: pausedCount > 0 ? 'warning' : undefined }
  ];
}

export function buildSelectedMonitorRows(
  selected: Monitor | null,
  t: Translator,
  formatTime: (value?: number | string | null) => string,
  statusLabel: (status: number, t?: (key: string, params?: Record<string, string | number | null | undefined>) => string) => string
) {
  const emptyValue = t('common.none');

  if (!selected) {
    return [{ title: t('monitors.empty-selected.title'), copy: t('monitors.empty-selected.copy'), meta: emptyValue }];
  }

  return [
    { title: selected.name, copy: `${selected.app || emptyValue} · ${selected.instance || emptyValue}`, meta: statusLabel(selected.status, t) },
    {
      title: t('common.labels'),
      copy: String(Object.keys(selected.labels || {}).length),
      meta: t('monitors.updated-at', { time: formatTime(selected.gmtUpdate || selected.gmtCreate || null) })
    }
  ];
}

export function buildMonitorWorkbenchNarrative(
  { entityContextActive, total, downCount, status, fellBackToAll }: MonitorWorkbenchNarrativeArgs,
  t: Translator
) {
  if (!entityContextActive) {
    return t('monitors.subtitle');
  }

  if (total === 0) {
    return t('entity.monitor.workbench.copy.empty');
  }

  if (fellBackToAll) {
    return t('entity.monitor.workbench.copy.fallback', { total });
  }

  if (status === '2') {
    return t('entity.monitor.workbench.copy.down', { total });
  }

  if (downCount > 0) {
    return t('entity.monitor.workbench.copy.mixed', { down: downCount, total });
  }

  return t('entity.monitor.workbench.copy.healthy', { total });
}

export function shouldFallbackMonitorEntityWorkbench({
  entityContextActive,
  statusWasImplicit,
  status,
  totalElements,
  fellBackToAll
}: MonitorFallbackArgs) {
  return entityContextActive && statusWasImplicit && status === '2' && totalElements === 0 && !fellBackToAll;
}
