import { interpolate, type TranslationParams } from './i18n';

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

function translate(t: Translator | undefined, key: string, fallback: string, params?: TranslationParams) {
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

function normalizeStatus(value?: string | null) {
  return value?.trim().toLowerCase() || '';
}

function statusPenalty(status?: string | null) {
  const normalized = normalizeStatus(status);
  if (!normalized || normalized === 'healthy' || normalized === 'normal' || normalized === 'up' || normalized === 'active' || normalized === '健康') {
    return 0;
  }
  if (normalized === 'warning' || normalized === '告警') {
    return 10;
  }
  if (normalized === 'unknown' || normalized === '未知') {
    return 12;
  }
  if (
    normalized === 'critical' ||
    normalized === 'down' ||
    normalized === 'error' ||
    normalized === 'offline' ||
    normalized === 'unhealthy' ||
    normalized === '异常' ||
    normalized === '离线' ||
    normalized === '严重'
  ) {
    return 24;
  }
  return 8;
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
    label: translate(t, 'entity.health.label', '健康评分 {{score}}', { score }),
    copy:
      monitorCount > 0
        ? translate(t, 'entity.health.copy.collected', '采集 {{healthy}} / {{total}} 健康', {
            healthy: healthyMonitorCount,
            total: monitorCount
          })
        : translate(t, 'entity.health.copy.waiting', '等待采集绑定'),
    meta: translate(t, 'entity.health.meta', '告警 {{alerts}} · 异常 {{anomalies}}', {
      alerts: activeAlertCount,
      anomalies: anomalyCount
    }),
    tone: toneForScore(score)
  };
}
