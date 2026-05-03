export type CollectorHealthTone = 'success' | 'warning' | 'danger' | 'neutral';

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

export function buildCollectorHealthEvidence(input: CollectorHealthEvidenceInput): CollectorHealthEvidence {
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
      title: '采集集群健康',
      copy: `采集器 ${onlineCollectorCount} / ${totalCollectorCount} 在线`,
      meta: `任务 ${taskCount} · 离线 ${offlineCollectorCount}`,
      freshness: `最近上报 ${normalizeLabel(input.lastSeenLabel || input.lastEvidenceLabel)}`,
      tone: toneForCollectorHealth(onlineCollectorCount, totalCollectorCount)
    };
  }

  const totalBoundMonitors = finiteNumber(input.totalBoundMonitors, 0);
  const healthyMonitorCount = Math.max(
    0,
    Math.min(totalBoundMonitors, finiteNumber(input.healthyMonitorCount, totalBoundMonitors))
  );

  return {
    title: '采集健康',
    copy: totalBoundMonitors > 0 ? `监控 ${healthyMonitorCount} / ${totalBoundMonitors} 健康` : '暂无绑定监控',
    meta: totalBoundMonitors > 0 ? '采集证据已归并' : '等待模板绑定',
    freshness: `最近证据 ${normalizeLabel(input.lastEvidenceLabel || input.lastSeenLabel)}`,
    tone: toneForMonitorHealth(healthyMonitorCount, totalBoundMonitors)
  };
}
