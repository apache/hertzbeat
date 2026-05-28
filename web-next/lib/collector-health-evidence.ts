import { interpolate, type TranslationParams } from './i18n';
import { SUPPLEMENTAL_MESSAGES } from './i18n-runtime-messages';

export type CollectorHealthTone = 'success' | 'warning' | 'danger' | 'neutral';
type CollectorHealthTranslator = (key: string, params?: TranslationParams) => string;

export type CollectorHealthEvidence = {
  title: string;
  copy: string;
  meta: string;
  freshness: string;
  tone: CollectorHealthTone;
};

export type CollectorHealthEvidenceInput = {
  healthyMonitorCount?: number | string | null;
  lastEvidenceLabel?: string | null;
  lastSeenLabel?: string | null;
  offlineCollectorCount?: number | string | null;
  onlineCollectorCount?: number | string | null;
  taskCount?: number | string | null;
  totalBoundMonitors?: number | string | null;
  totalCollectorCount?: number | string | null;
};

function translateCollectorHealthEvidence(key: string, params?: TranslationParams) {
  const template = SUPPLEMENTAL_MESSAGES['en-US']?.[key] ?? SUPPLEMENTAL_MESSAGES['zh-CN']?.[key] ?? key;
  return interpolate(template, params);
}

function finiteNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toneForCollectorHealth(onlineCount: number, totalCount: number): CollectorHealthTone {
  if (totalCount <= 0) return 'neutral';
  if (onlineCount === totalCount) return 'success';
  if (onlineCount > 0) return 'warning';
  return 'danger';
}

function toneForMonitorHealth(healthyCount: number, totalCount: number): CollectorHealthTone {
  if (totalCount <= 0) return 'neutral';
  if (healthyCount === totalCount) return 'success';
  if (healthyCount > 0) return 'warning';
  return 'danger';
}

function normalizeLabel(value?: string | null) {
  return value?.trim() || '-';
}

export function buildCollectorHealthEvidence(
  input: CollectorHealthEvidenceInput,
  t: CollectorHealthTranslator = translateCollectorHealthEvidence
): CollectorHealthEvidence {
  const totalCollectorCount = finiteNumber(input.totalCollectorCount, 0);

  if (totalCollectorCount > 0) {
    const onlineCollectorCount = Math.max(
      0,
      Math.min(totalCollectorCount, finiteNumber(input.onlineCollectorCount, 0))
    );
    const offlineCollectorCount = Math.max(
      0,
      Math.min(totalCollectorCount, finiteNumber(input.offlineCollectorCount, totalCollectorCount - onlineCollectorCount))
    );
    const taskCount = finiteNumber(input.taskCount, 0);

    return {
      title: t('collector.health.cluster.title'),
      copy: t('collector.health.cluster.copy', { online: onlineCollectorCount, total: totalCollectorCount }),
      meta: t('collector.health.cluster.meta', { tasks: taskCount, offline: offlineCollectorCount }),
      freshness: t('collector.health.cluster.freshness', { time: normalizeLabel(input.lastSeenLabel || input.lastEvidenceLabel) }),
      tone: toneForCollectorHealth(onlineCollectorCount, totalCollectorCount)
    };
  }

  const totalBoundMonitors = finiteNumber(input.totalBoundMonitors, 0);
  const healthyMonitorCount = Math.max(
    0,
    Math.min(totalBoundMonitors, finiteNumber(input.healthyMonitorCount, totalBoundMonitors))
  );

  return {
    title: t('collector.health.monitor.title'),
    copy:
      totalBoundMonitors > 0
        ? t('collector.health.monitor.copy', { healthy: healthyMonitorCount, total: totalBoundMonitors })
        : t('collector.health.monitor.empty-copy'),
    meta: totalBoundMonitors > 0 ? t('collector.health.monitor.meta') : t('collector.health.monitor.empty-meta'),
    freshness: t('collector.health.monitor.freshness', { time: normalizeLabel(input.lastEvidenceLabel || input.lastSeenLabel) }),
    tone: toneForMonitorHealth(healthyMonitorCount, totalBoundMonitors)
  };
}
