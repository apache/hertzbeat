export const MONITOR_SMOKE_APP = 'website';
export const MONITOR_SMOKE_HOST = 'example.com';
export const MONITOR_SMOKE_PORT = 443;
export const MONITOR_SMOKE_URI = '/';
export const MONITOR_SMOKE_INTERVALS = 10;
export const MONITOR_HISTORY_SMOKE_METRICS = 'summary';
export const MONITOR_HISTORY_SMOKE_FIELD = 'responseTime';

export function buildWebsiteMonitorSmokeName(seed) {
  return `codex-monitor-smoke-${String(seed)}`;
}

export function buildWebsiteMonitorSmokePayload(name, overrides = {}) {
  const host = overrides.host ?? MONITOR_SMOKE_HOST;
  const port = overrides.port ?? MONITOR_SMOKE_PORT;
  const uri = overrides.uri ?? MONITOR_SMOKE_URI;
  const ssl = overrides.ssl ?? true;
  const intervals = overrides.intervals ?? MONITOR_SMOKE_INTERVALS;

  return {
    collector: overrides.collector ?? '',
    monitor: {
      app: overrides.app ?? MONITOR_SMOKE_APP,
      name,
      instance: host,
      scrape: overrides.scrape ?? 'static',
      intervals,
      scheduleType: overrides.scheduleType ?? 'interval',
      status: overrides.status ?? 0,
      labels: overrides.labels ?? {},
      annotations: overrides.annotations ?? {}
    },
    params: [
      { field: 'host', type: 1, paramValue: host },
      { field: 'port', type: 0, paramValue: port },
      { field: 'uri', type: 1, paramValue: uri },
      { field: 'ssl', type: 1, paramValue: ssl }
    ],
    grafanaDashboard: {
      enabled: false
    }
  };
}

export function extractMonitorFromPage(pageData, name) {
  if (!Array.isArray(pageData?.content)) {
    return null;
  }
  return pageData.content.find(item => item?.name === name) ?? null;
}

export function buildMonitorHistorySmokePath(
  instance,
  {
    history = '30m',
    interval = false,
    app = MONITOR_SMOKE_APP,
    metrics = MONITOR_HISTORY_SMOKE_METRICS,
    field = MONITOR_HISTORY_SMOKE_FIELD
  } = {}
) {
  const params = new URLSearchParams({
    history,
    interval: String(interval)
  });
  return `/api/monitor/${encodeURIComponent(instance)}/metric/${app}.${metrics}.${field}?${params.toString()}`;
}

function unwrapMessageData(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

export function hasRealtimeSummarySamples(payload) {
  const data = unwrapMessageData(payload);
  return Boolean(
    data?.valueRows?.some(row =>
      Array.isArray(row?.values) &&
      row.values.some(value => value?.origin !== undefined && value?.origin !== null && String(value.origin).trim() !== '')
    )
  );
}

export function countHistorySamples(payload) {
  const data = unwrapMessageData(payload);
  if (!data?.values || typeof data.values !== 'object') {
    return 0;
  }

  return Object.values(data.values).reduce((total, series) => {
    return total + (Array.isArray(series) ? series.length : 0);
  }, 0);
}

export function hasHistorySamples(payload) {
  return countHistorySamples(payload) > 0;
}
