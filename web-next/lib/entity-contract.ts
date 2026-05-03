import type { EntityDetailDto, EntitySummaryInfo, Monitor, OtlpBoundEntity } from './types';

export const HERTZBEAT_ENTITY_CONTRACT_FIELDS = [
  'entityId',
  'entityType',
  'entityName',
  'source',
  'labels',
  'attributes',
  'relationships',
  'signals',
  'health',
  'lastSeen'
] as const;

export const HERTZBEAT_ENTITY_SOURCE_KINDS = [
  'hertzbeat-monitor',
  'collector',
  'otlp-resource-attributes',
  'k8s-labels',
  'cmdb-import',
  'manual-labels'
] as const;

export const HERTZBEAT_ENTITY_SIGNAL_KINDS = ['metrics', 'logs', 'traces', 'events', 'alerts'] as const;

export type HertzBeatEntityContractField = (typeof HERTZBEAT_ENTITY_CONTRACT_FIELDS)[number];
export type HertzBeatEntitySourceKind = (typeof HERTZBEAT_ENTITY_SOURCE_KINDS)[number];
export type HertzBeatEntitySignalKind = (typeof HERTZBEAT_ENTITY_SIGNAL_KINDS)[number];

export type HertzBeatEntitySignalState = {
  present: boolean;
  count?: number;
  errorCount?: number;
  source?: string;
};

export type HertzBeatEntityRelationship = {
  type: string;
  targetEntityId?: string;
  targetEntityName?: string;
  source?: string;
  attributes?: Record<string, unknown>;
};

export type HertzBeatEntityHealth = {
  status: string;
  activeAlertCount?: number;
  downMonitorCount?: number;
  healthyMonitorCount?: number;
};

export type HertzBeatEntityContract = {
  entityId: string;
  entityType: string;
  entityName: string;
  source: HertzBeatEntitySourceKind;
  labels: Record<string, string>;
  attributes: Record<string, unknown>;
  relationships: HertzBeatEntityRelationship[];
  signals: Partial<Record<HertzBeatEntitySignalKind, HertzBeatEntitySignalState>>;
  health: HertzBeatEntityHealth;
  lastSeen: number | string | null;
};

function compactAttributes(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function normalizeSource(source: unknown): HertzBeatEntitySourceKind {
  const value = String(source || '').toLowerCase();

  if (value.includes('monitor') || value.includes('hertzbeat')) return 'hertzbeat-monitor';
  if (value.includes('collector')) return 'collector';
  if (value.includes('otlp') || value.includes('telemetry')) return 'otlp-resource-attributes';
  if (value.includes('k8s') || value.includes('kubernetes')) return 'k8s-labels';
  if (value.includes('cmdb') || value.includes('import')) return 'cmdb-import';
  return 'manual-labels';
}

function normalizeStatus(status: unknown) {
  if (status === 0 || status === '0' || status === 'healthy' || status === 'up') return 'healthy';
  if (status === 1 || status === '1' || status === 'unhealthy' || status === 'down') return 'unhealthy';
  return status ? String(status) : 'unknown';
}

function normalizeLabels(labels: unknown): Record<string, string> {
  if (!labels || typeof labels !== 'object' || Array.isArray(labels)) {
    return {};
  }

  return Object.fromEntries(Object.entries(labels).map(([key, value]) => [key, String(value)]));
}

function normalizeEntityId(value: unknown, fallback: string) {
  if (value == null || value === '') return fallback;
  return String(value);
}

function monitorTypeFromApp(app: string | undefined) {
  const normalized = (app || '').toLowerCase();
  if (['mysql', 'postgresql', 'postgres', 'oracle', 'sqlserver', 'redis', 'mongodb'].some(database => normalized.includes(database))) {
    return 'database';
  }
  if (['kafka', 'rocketmq', 'rabbitmq', 'zookeeper', 'nginx'].some(middleware => normalized.includes(middleware))) {
    return 'middleware';
  }
  if (['switch', 'router', 'snmp'].some(network => normalized.includes(network))) {
    return 'network-device';
  }
  if (['linux', 'windows', 'host'].some(host => normalized.includes(host))) {
    return 'host';
  }
  return app || 'resource';
}

function normalizeRelationships(relations: unknown[]): HertzBeatEntityRelationship[] {
  return relations.map((relation, index) => {
    if (!relation || typeof relation !== 'object') {
      return { type: 'related', targetEntityId: String(index), source: 'entity-detail' };
    }

    const record = relation as Record<string, unknown>;
    return {
      type: String(record.type || record.relationType || 'related'),
      targetEntityId: record.targetEntityId != null ? String(record.targetEntityId) : undefined,
      targetEntityName: record.targetEntityName != null ? String(record.targetEntityName) : undefined,
      source: 'entity-detail',
      attributes: record
    };
  });
}

export function buildEntityContractFromSummary(summary: EntitySummaryInfo): HertzBeatEntityContract {
  const entity = summary.entity ?? {};
  const entityRecord = entity as typeof entity & { labels?: Record<string, string>; source?: string };
  const activeAlertCount = summary.activeAlertCount ?? 0;

  return {
    entityId: normalizeEntityId(entity.id, entity.name || entity.displayName || 'entity-summary'),
    entityType: entity.type || 'unknown',
    entityName: entity.displayName || entity.name || 'unnamed-entity',
    source: normalizeSource(entityRecord.source),
    labels: normalizeLabels(entityRecord.labels),
    attributes: compactAttributes({
      owner: entity.owner,
      environment: entity.environment,
      system: entity.system,
      identityCount: summary.identityCount,
      monitorCount: summary.monitorCount,
      relationCount: summary.relationCount
    }),
    relationships: [],
    signals: {
      metrics: { present: Boolean(summary.monitorCount), count: summary.monitorCount ?? 0 },
      alerts: { present: activeAlertCount > 0, count: activeAlertCount }
    },
    health: {
      status: normalizeStatus(entity.status),
      activeAlertCount
    },
    lastSeen: summary.lastEvidenceAt ?? null
  };
}

export function buildEntityContractFromDetail(detail: EntityDetailDto): HertzBeatEntityContract {
  const entityDto = detail.entity ?? {};
  const entity = entityDto.entity ?? {};
  const identities = entityDto.identities ?? [];
  const monitorBinds = entityDto.monitorBinds ?? [];
  const relations = entityDto.relations ?? [];
  const activeAlertCount = detail.evidenceSummary?.activeAlertCount ?? detail.activeAlerts?.length ?? 0;
  const traceCount = detail.traceSummary?.recentTraceCount ?? 0;
  const logCount = detail.logSummary?.hintCount ?? detail.evidenceSummary?.logHintCount ?? 0;
  const monitorCount = detail.monitorSummary?.totalBoundMonitors ?? monitorBinds.length;

  return {
    entityId: normalizeEntityId(entity.id, entity.name || 'entity-detail'),
    entityType: entity.type || 'unknown',
    entityName: entity.displayName || entity.name || 'unnamed-entity',
    source: normalizeSource(entity.source),
    labels: normalizeLabels(entity.labels),
    attributes: compactAttributes({
      environment: entity.environment,
      namespace: entity.namespace,
      owner: entity.owner,
      system: entity.system,
      identityCount: detail.evidenceSummary?.identityCount ?? identities.length,
      monitorBindCount: monitorBinds.length
    }),
    relationships: normalizeRelationships(relations),
    signals: {
      metrics: { present: monitorCount > 0, count: monitorCount },
      logs: { present: logCount > 0, count: logCount },
      traces: {
        present: Boolean(detail.traceSummary?.active || traceCount > 0),
        count: traceCount,
        errorCount: detail.traceSummary?.recentErrorTraceCount ?? 0
      },
      alerts: { present: activeAlertCount > 0, count: activeAlertCount }
    },
    health: {
      status: normalizeStatus(entity.status),
      activeAlertCount,
      downMonitorCount: detail.evidenceSummary?.downMonitorCount,
      healthyMonitorCount: detail.evidenceSummary?.healthyMonitorCount
    },
    lastSeen: detail.traceSummary?.latestObservedAt ?? detail.evidenceSummary?.lastEvidenceAt ?? null
  };
}

export function buildEntityContractFromOtlpBinding(binding: OtlpBoundEntity): HertzBeatEntityContract {
  return {
    entityId: normalizeEntityId(binding.entityId, binding.name || binding.displayName || 'otlp-bound-entity'),
    entityType: binding.type || 'service',
    entityName: binding.displayName || binding.name || binding.primaryIdentityValue || 'otlp-entity',
    source: 'otlp-resource-attributes',
    labels: {},
    attributes: compactAttributes({
      namespace: binding.namespace,
      primaryIdentityKey: binding.primaryIdentityKey,
      primaryIdentityValue: binding.primaryIdentityValue,
      monitorBindCount: binding.monitorBindCount
    }),
    relationships: [],
    signals: {
      metrics: { present: binding.monitorBindCount > 0, count: binding.monitorBindCount },
      logs: { present: true },
      traces: { present: true }
    },
    health: { status: 'unknown' },
    lastSeen: null
  };
}

export function buildEntityContractFromMonitor(monitor: Monitor): HertzBeatEntityContract {
  return {
    entityId: `monitor-${monitor.id}`,
    entityType: monitorTypeFromApp(monitor.app),
    entityName: monitor.name || monitor.instance || `monitor-${monitor.id}`,
    source: 'hertzbeat-monitor',
    labels: normalizeLabels(monitor.labels),
    attributes: compactAttributes({
      monitorId: monitor.id,
      app: monitor.app,
      instance: monitor.instance,
      scrape: monitor.scrape,
      scheduleType: monitor.scheduleType
    }),
    relationships: [],
    signals: {
      metrics: { present: true, source: 'monitor' }
    },
    health: { status: normalizeStatus(monitor.status) },
    lastSeen: monitor.gmtUpdate ?? monitor.gmtCreate ?? null
  };
}
