import type { CollectorSummary, PageResult } from '@/lib/types';
import { buildCollectorHealthEvidence } from '../collector-health-evidence';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type CollectorStatusTone = 'success' | 'danger';

function formatCollectorFact(value: string | number | null | undefined, emptyValue: string) {
  const text = value == null ? '' : String(value).trim();
  return text || emptyValue;
}

function isCollectorOnline(summary: CollectorSummary) {
  const status = summary.collector?.status;
  if (typeof status === 'number') {
    return status === 0;
  }

  if (typeof status === 'string') {
    const normalized = status.toLowerCase();
    if (normalized === '0' || normalized === 'online') return true;
    if (normalized === '1' || normalized === 'offline') return false;
  }

  return Boolean(summary.collector?.online);
}

function collectorStatusTone(summary: CollectorSummary): CollectorStatusTone {
  return isCollectorOnline(summary) ? 'success' : 'danger';
}

function toEpoch(value?: number | string | null) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function resolveLatestCollectorUpdate(items: CollectorSummary[]) {
  let latestValue: number | string | null = null;
  let latestEpoch = Number.NEGATIVE_INFINITY;

  for (const item of items) {
    const value = item.collector?.gmtUpdate;
    const epoch = toEpoch(value);
    if (epoch != null && epoch > latestEpoch) {
      latestEpoch = epoch;
      latestValue = value ?? null;
    }
  }

  return latestValue;
}

function formatCollectorLastSeen(value: number | string | null | undefined, formatTime?: (value?: number | string | null) => string) {
  if (value == null || value === '') {
    return null;
  }

  return formatTime ? formatTime(value) : String(value);
}

export function buildCollectorFacts(list: PageResult<CollectorSummary>, t: Translator) {
  const pinCount = list.content.reduce((sum, item) => sum + (item.pinMonitorNum || 0), 0);
  const dispatchCount = list.content.reduce((sum, item) => sum + (item.dispatchMonitorNum || 0), 0);
  const healthEvidence = buildCollectorClusterHealthEvidence(list.content, undefined, t);

  return [
    { label: t('common.workspace'), value: 'setting/collector' },
    { label: t('common.total'), value: String(list.totalElements || 0) },
    { label: t('common.current-page-count'), value: String(list.content?.length || 0) },
    {
      label: healthEvidence.title,
      value: healthEvidence.copy,
      meta: healthEvidence.meta,
      freshness: healthEvidence.freshness,
      tone: healthEvidence.tone
    },
    { label: t('collector.pinned'), value: String(pinCount) },
    { label: t('collector.dispatched'), value: String(dispatchCount) }
  ];
}

export function buildCollectorClusterHealthEvidence(
  items: CollectorSummary[],
  formatTime?: (value?: number | string | null) => string,
  t?: Translator
) {
  const onlineCollectorCount = items.filter(item => isCollectorOnline(item)).length;
  const taskCount = items.reduce((sum, item) => sum + (item.pinMonitorNum || 0) + (item.dispatchMonitorNum || 0), 0);
  const latestUpdate = resolveLatestCollectorUpdate(items);

  return buildCollectorHealthEvidence({
    lastSeenLabel: formatCollectorLastSeen(latestUpdate, formatTime),
    offlineCollectorCount: items.length - onlineCollectorCount,
    onlineCollectorCount,
    taskCount,
    totalCollectorCount: items.length
  }, t);
}

export function buildCollectorTableRows(
  items: CollectorSummary[],
  t: Translator,
  formatTime: (value?: number | string | null) => string
) {
  const emptyValue = t('common.none');

  return items.map(item => {
    const online = isCollectorOnline(item);
    const pinCount = item.pinMonitorNum || 0;
    const dispatchCount = item.dispatchMonitorNum || 0;
    const mode = String(item.collector?.mode || '').toLowerCase();
    const taskCount = pinCount + dispatchCount;

    return {
      key: item.collector?.name || t('setting.collector.item.fallback'),
      name: item.collector?.name || t('setting.collector.item.fallback'),
      statusLabel: online ? t('monitor.collector.status.online') : t('monitor.collector.status.offline'),
      statusTone: collectorStatusTone(item),
      modeLabel: mode === 'private' ? t('collector.mode.private') : t('collector.mode.public'),
      taskCount: String(taskCount),
      pinCount: String(pinCount),
      dispatchCount: String(dispatchCount),
      ip: formatCollectorFact(item.collector?.ip, emptyValue),
      version: formatCollectorFact(item.collector?.version, emptyValue),
      updatedAt: formatTime(item.collector?.gmtUpdate || null),
      healthEvidence: buildCollectorHealthEvidence({
        lastSeenLabel: formatCollectorLastSeen(item.collector?.gmtUpdate, formatTime),
        offlineCollectorCount: online ? 0 : 1,
        onlineCollectorCount: online ? 1 : 0,
        taskCount,
        totalCollectorCount: 1
      }, t),
      canMutate: item.collector?.name !== 'main-default-collector',
      nextAction: online ? 'offline' : 'online'
    };
  });
}

export function buildCollectorRows(items: CollectorSummary[], t: Translator) {
  return buildCollectorTableRows(items, t, value => String(value || '-')).map(row => ({
    title: row.name,
    copy: `${row.ip} · ${row.statusLabel}`,
    meta: `pin ${row.pinCount} · dispatch ${row.dispatchCount}`
  }));
}
