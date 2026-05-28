type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

const TYPE_LABELS: Record<string, { key: string; fallback: string }> = {
  api: { key: 'entities.list.type.api', fallback: 'API' },
  database: { key: 'entities.list.type.database', fallback: 'Database' },
  device: { key: 'entities.list.type.device', fallback: 'Device' },
  endpoint: { key: 'entities.list.type.endpoint', fallback: 'Endpoint' },
  host: { key: 'entities.list.type.host', fallback: 'Host' },
  k8s_workload: { key: 'entities.list.type.k8s-workload', fallback: 'K8s workload' },
  middleware: { key: 'entities.list.type.middleware', fallback: 'Middleware' },
  queue: { key: 'entities.list.type.queue', fallback: 'Queue' },
  service: { key: 'entities.list.type.service', fallback: 'Service' },
  system: { key: 'entities.list.type.system', fallback: 'System' }
};

const STATUS_LABELS: Record<string, { key: string; fallback: string }> = {
  critical: { key: 'entities.list.status.critical', fallback: 'Critical' },
  down: { key: 'entities.list.status.down', fallback: 'Offline' },
  healthy: { key: 'entities.list.status.healthy', fallback: 'Healthy' },
  offline: { key: 'entities.list.status.down', fallback: 'Offline' },
  unhealthy: { key: 'entities.list.status.unhealthy', fallback: 'Unhealthy' },
  unknown: { key: 'entities.list.status.unknown', fallback: 'Unknown' },
  warning: { key: 'entities.list.status.warning', fallback: 'Warning' }
};

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[\s-]+/g, '_');
}

function translateWithFallback(t: Translator, key: string, fallback: string): string {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function emptyDisplayValue(t: Translator): string {
  return translateWithFallback(t, 'common.none', 'None');
}

export function entityTypeLabel(type: string | null | undefined, t: Translator): string {
  if (!type) return emptyDisplayValue(t);
  const label = TYPE_LABELS[normalizeToken(type)];
  if (label) return translateWithFallback(t, label.key, label.fallback);
  return type;
}

export function entityEnvironmentLabel(environment: string | null | undefined, t: Translator): string {
  if (!environment) return emptyDisplayValue(t);
  if (environment.toLowerCase() === 'local') return t('entities.list.environment.local');
  return environment;
}

export function entityStatusLabel(status: string | null | undefined, t: Translator): string {
  if (!status) return emptyDisplayValue(t);
  const label = STATUS_LABELS[normalizeToken(status)];
  if (label) return translateWithFallback(t, label.key, label.fallback);
  return status;
}
