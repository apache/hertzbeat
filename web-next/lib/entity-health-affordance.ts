import { interpolate, type TranslationParams } from './i18n';
import { SUPPLEMENTAL_MESSAGES } from './i18n-runtime-messages';

export type LightweightEntityHealthTone = 'success' | 'warning' | 'danger' | 'neutral';

export type LightweightEntityHealthAffordance = {
  score: number;
  scoreText: string;
  label: string;
  copy: string;
  meta: string;
  tone: LightweightEntityHealthTone;
};

export type LightweightEntityHealthInput = {
  activeAlertCount?: number | string | null;
  downMonitorCount?: number | string | null;
  healthyMonitorCount?: number | string | null;
  logHintCount?: number | string | null;
  monitorCount?: number | string | null;
  recentErrorTraceCount?: number | string | null;
  recentTraceCount?: number | string | null;
  status?: string | null;
};

type Translator = (key: string, params?: TranslationParams) => string;

function translate(t: Translator | undefined, key: string, params?: TranslationParams) {
  const fallback = SUPPLEMENTAL_MESSAGES['en-US']?.[key] ?? SUPPLEMENTAL_MESSAGES['zh-CN']?.[key] ?? key;

  if (!t) return interpolate(fallback, params);
  const value = t(key, params);
  return value && value !== key ? value : interpolate(fallback, params);
}

function finiteNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const ENTITY_HEALTH_STATUS_PENALTY_BY_STATUS: Record<string, number> = {
  active: 0,
  healthy: 0,
  normal: 0,
  up: 0,
  warning: 10,
  unknown: 12,
  abnormal: 24,
  critical: 24,
  down: 24,
  error: 24,
  offline: 24,
  unhealthy: 24
};

function normalizeStatus(value?: string | null) {
  const normalized = value?.trim().toLowerCase() || '';
  return normalized.replace(/[\s-]+/g, '_');
}

function statusPenalty(status?: string | null) {
  const normalized = normalizeStatus(status);
  if (!normalized) return 0;
  return ENTITY_HEALTH_STATUS_PENALTY_BY_STATUS[normalized] ?? 8;
}

function toneForScore(score: number): LightweightEntityHealthTone {
  if (score >= 88) return 'success';
  if (score >= 60) return 'warning';
  if (score > 0) return 'danger';
  return 'neutral';
}

export function buildLightweightEntityHealthAffordance(input: LightweightEntityHealthInput, t?: Translator): LightweightEntityHealthAffordance {
  const monitorCount = finiteNumber(input.monitorCount);
  const downMonitorCount = finiteNumber(input.downMonitorCount);
  const healthyMonitorCount = Math.max(
    0,
    Math.min(monitorCount, finiteNumber(input.healthyMonitorCount, monitorCount > 0 ? monitorCount - downMonitorCount : 0))
  );
  const activeAlertCount = finiteNumber(input.activeAlertCount);
  const recentTraceCount = finiteNumber(input.recentTraceCount);
  const recentErrorTraceCount = finiteNumber(input.recentErrorTraceCount);
  const logHintCount = finiteNumber(input.logHintCount);
  const errorRate = recentTraceCount > 0 ? recentErrorTraceCount / recentTraceCount : 0;
  const anomalyCount = downMonitorCount + recentErrorTraceCount + logHintCount;
  const score = clampScore(
    100 -
      statusPenalty(input.status) -
      (monitorCount > 0 ? (downMonitorCount / monitorCount) * 30 : 8) -
      Math.min(activeAlertCount * 8, 24) -
      errorRate * 20 -
      Math.min(logHintCount * 2, 10)
  );

  return {
    score,
    scoreText: `${score} / 100`,
    label: translate(t, 'entity.health.label', { score }),
    copy:
      monitorCount > 0
        ? translate(t, 'entity.health.copy.collected', {
            healthy: healthyMonitorCount,
            total: monitorCount
          })
        : translate(t, 'entity.health.copy.waiting'),
    meta: translate(t, 'entity.health.meta', {
      alerts: activeAlertCount,
      anomalies: anomalyCount
    }),
    tone: toneForScore(score)
  };
}
