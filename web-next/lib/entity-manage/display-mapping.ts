type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

const TYPE_LABELS: Record<string, { key: string; fallback: string }> = {
  api: { key: 'entities.list.type.api', fallback: 'API' },
  database: { key: 'entities.list.type.database', fallback: '数据库' },
  device: { key: 'entities.list.type.device', fallback: '设备' },
  endpoint: { key: 'entities.list.type.endpoint', fallback: '端点' },
  host: { key: 'entities.list.type.host', fallback: '主机' },
  k8s_workload: { key: 'entities.list.type.k8s-workload', fallback: 'K8s 工作负载' },
  middleware: { key: 'entities.list.type.middleware', fallback: '中间件' },
  queue: { key: 'entities.list.type.queue', fallback: '队列' },
  service: { key: 'entities.list.type.service', fallback: '服务' },
  system: { key: 'entities.list.type.system', fallback: '系统' }
};

const STATUS_LABELS: Record<string, { key: string; fallback: string }> = {
  critical: { key: 'entities.list.status.critical', fallback: '严重' },
  down: { key: 'entities.list.status.down', fallback: '离线' },
  healthy: { key: 'entities.list.status.healthy', fallback: '健康' },
  offline: { key: 'entities.list.status.down', fallback: '离线' },
  unhealthy: { key: 'entities.list.status.unhealthy', fallback: '异常' },
  unknown: { key: 'entities.list.status.unknown', fallback: '未知' },
  warning: { key: 'entities.list.status.warning', fallback: '警告' }
};

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[\s-]+/g, '_');
}

function translateWithFallback(t: Translator, key: string, fallback: string): string {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

export function entityTypeLabel(type: string | null | undefined, t: Translator): string {
  if (!type) return '-';
  const label = TYPE_LABELS[normalizeToken(type)];
  if (label) return translateWithFallback(t, label.key, label.fallback);
  return type;
}

export function entityEnvironmentLabel(environment: string | null | undefined, t: Translator): string {
  if (!environment) return '-';
  if (environment.toLowerCase() === 'local') return t('entities.list.environment.local');
  return environment;
}

export function entityStatusLabel(status: string | null | undefined, t: Translator): string {
  if (!status) return '-';
  const label = STATUS_LABELS[normalizeToken(status)];
  if (label) return translateWithFallback(t, label.key, label.fallback);
  return status;
}
