import type { Entity, EntityDetailDto, EntityLinkRef } from '@/lib/types';
import { buildCollectorHealthEvidence } from '../collector-health-evidence';
import { interpolate, type TranslationParams } from '../i18n';
import { SUPPLEMENTAL_MESSAGES } from '../i18n-runtime-messages';
import { buildSignalEntityContextRows, type SignalEntityContextRow, type SignalRouteContext } from '../signal-route-context';

export type EntityDetailViewModelTranslator = (key: string, params?: TranslationParams) => string;
export type EntityDetailRowTone = 'success' | 'warning' | 'danger' | 'neutral';

export function translateEntityDetailViewModel(key: string, params?: TranslationParams) {
  const template = SUPPLEMENTAL_MESSAGES['en-US']?.[key] ?? SUPPLEMENTAL_MESSAGES['zh-CN']?.[key] ?? key;
  return interpolate(template, params);
}

function getSignalLogSummary(detail: Pick<EntityDetailDto, 'signalEvidence' | 'logSummary'>) {
  return detail.signalEvidence?.logSummary || detail.logSummary;
}

function getSignalTraceSummary(detail: Pick<EntityDetailDto, 'signalEvidence' | 'traceSummary'>) {
  return detail.signalEvidence?.traceSummary || detail.traceSummary;
}

function getSignalUnifiedEvidenceSummary(detail: Pick<EntityDetailDto, 'signalEvidence' | 'unifiedEvidenceSummary'>) {
  return detail.signalEvidence?.unifiedEvidenceSummary || detail.unifiedEvidenceSummary;
}

type DetailRow = {
  title: string;
  copy: string;
  freshness?: string;
  href?: string;
  meta: string;
  tone?: EntityDetailRowTone;
};

type HandoffRow = DetailRow & {
  key: string;
};

type EvidenceHandoffRow = DetailRow & {
  key: 'alerts' | 'topology' | 'runbook';
  evidence: 'active-alerts' | 'topology-relation' | 'runbook';
  count: number;
};

export type EntityIncomingContextRow = SignalEntityContextRow;

type AttributionState = 'ready' | 'review' | 'missing';

type AttributionRow = DetailRow & {
  key: 'traditional-monitor' | 'otlp-attribution' | 'candidate-confirmation' | 'missing-diagnostics';
  state: AttributionState;
};

function localizeStatus(status?: string | null, t: EntityDetailViewModelTranslator = translateEntityDetailViewModel) {
  const normalized = status?.trim();
  if (!normalized) {
    return '-';
  }

  switch (normalized.toLowerCase()) {
    case 'healthy':
    case 'normal':
    case 'up':
    case 'active':
      return t('entities.detail.status.healthy');
    case 'unknown':
      return t('entities.detail.status.unknown');
    case 'down':
    case 'critical':
    case 'error':
      return t('entities.detail.status.abnormal');
    case 'warning':
      return t('entities.detail.status.warning');
    default:
      return normalized;
  }
}

function entityDetailStatusTone(status?: string | null): EntityDetailRowTone {
  const normalized = String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (['healthy', 'normal', 'up', 'active'].includes(normalized)) {
    return 'success';
  }
  if (normalized === 'warning') {
    return 'warning';
  }
  if (['abnormal', 'critical', 'down', 'error', 'offline', 'unhealthy'].includes(normalized)) {
    return 'danger';
  }
  return 'neutral';
}

function scoreTone(score: number): EntityDetailRowTone {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'danger';
}

function countEvidenceTone(count: number, healthyWhenZero = true): EntityDetailRowTone {
  if (count <= 0) return healthyWhenZero ? 'success' : 'neutral';
  return 'danger';
}

export function buildDetailFacts(
  entity: { id?: number | string | null; type?: string | null; status?: string | null; owner?: string | null },
  t: EntityDetailViewModelTranslator = translateEntityDetailViewModel
) {
  return [
    { label: t('entities.detail.fact.id'), value: String(entity.id || '-') },
    { label: t('entities.detail.fact.type'), value: entity.type || '-' },
    { label: t('entities.detail.fact.status'), value: localizeStatus(entity.status, t) },
    { label: t('entities.detail.fact.owner'), value: entity.owner || '-' }
  ];
}

export function buildOverviewRows(
  entity: {
    description?: string | null;
    environment?: string | null;
    namespace?: string | null;
    owner?: string | null;
    source?: string | null;
    status?: string | null;
    system?: string | null;
    type?: string | null;
  },
  _detail: Pick<EntityDetailDto, 'activeAlerts' | 'boundMonitors' | 'nextActions'>,
  t: EntityDetailViewModelTranslator = translateEntityDetailViewModel
) {
  return [
    { title: t('entities.detail.overview.status'), copy: localizeStatus(entity.status, t), meta: entity.type || '-', tone: entityDetailStatusTone(entity.status) },
    { title: t('entities.detail.overview.owner'), copy: entity.owner || '-', meta: entity.system || '-' },
    { title: t('entities.detail.overview.environment'), copy: entity.environment || '-', meta: entity.namespace || '-' },
    { title: t('entities.detail.overview.description'), copy: entity.description || '-', meta: entity.source || '-' }
  ];
}

function formatCount(value: number, unit: string) {
  return `${value} ${unit}`;
}

function localizeActionText(
  value?: string | null,
  fallback = '-',
  t: EntityDetailViewModelTranslator = translateEntityDetailViewModel
) {
  const normalized = value?.trim();
  if (!normalized) {
    return fallback;
  }

  switch (normalized) {
    case 'Open monitors':
      return t('entities.detail.action-text.open-monitors');
    case 'Open discovery':
      return t('entities.detail.action-text.open-discovery');
    case 'Open definition':
    case 'Open definition workspace':
      return t('entities.detail.action-text.open-definition');
    case 'Inspect abnormal monitors first.':
    case 'Inspect the abnormal monitors first.':
      return t('entities.detail.action-text.inspect-abnormal');
    case 'Add more evidence before triage.':
      return t('entities.detail.action-text.add-evidence');
    case 'Review the definition shell before adding ownership or evidence.':
      return t('entities.detail.action-text.review-definition');
    case 'Next action':
      return t('entities.detail.action-text.next-action');
    case 'server guidance':
      return t('entities.detail.action-text.server-guidance');
    default:
      return normalized;
  }
}

export function buildSummaryRows(
  detail: Pick<EntityDetailDto, 'evidenceSummary' | 'monitorSummary' | 'logSummary' | 'traceSummary' | 'signalEvidence' | 'boundMonitors'>,
  t: EntityDetailViewModelTranslator = translateEntityDetailViewModel
) {
  const boundMonitorCount = detail.monitorSummary?.totalBoundMonitors ?? detail.boundMonitors?.length ?? 0;
  const downMonitorCount = detail.evidenceSummary?.downMonitorCount ?? 0;
  const logSummary = getSignalLogSummary(detail);
  const traceSummary = getSignalTraceSummary(detail);
  const logHintCount = logSummary?.hintCount ?? 0;
  const traceCount = traceSummary?.recentTraceCount ?? 0;
  const errorTraceCount = traceSummary?.recentErrorTraceCount ?? 0;

  return [
    {
      title: t('entities.detail.summary.metrics.title'),
      copy: formatCount(boundMonitorCount, t('entities.detail.summary.metrics.bound')),
      meta:
        downMonitorCount > 0
          ? formatCount(downMonitorCount, t('entities.detail.summary.metrics.down'))
          : t('entities.detail.summary.metrics.no-down'),
      tone: downMonitorCount > 0 ? 'danger' : boundMonitorCount > 0 ? 'success' : 'neutral'
    },
    {
      title: t('entities.detail.summary.logs.title'),
      copy:
        logHintCount > 0
          ? t('entities.detail.summary.logs.available', { count: formatCount(logHintCount, t('entities.detail.summary.logs.hints')) })
          : t('entities.detail.summary.logs.no-hints'),
      meta: logSummary?.preferredQueryTitle || logSummary?.fallbackSearchTerm || '-',
      tone: logHintCount > 0 ? 'warning' : 'neutral'
    },
    {
      title: t('entities.detail.summary.traces.title'),
      copy: formatCount(traceCount, t('entities.detail.summary.traces.recent')),
      meta:
        errorTraceCount > 0
          ? formatCount(errorTraceCount, t('entities.detail.summary.traces.errors'))
          : t('entities.detail.summary.traces.no-errors'),
      tone: errorTraceCount > 0 ? 'danger' : traceCount > 0 ? 'success' : 'neutral'
    }
  ];
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatEvidenceCount(count: number, key: string, t: EntityDetailViewModelTranslator) {
  return t(key, { count });
}

function activeSignalNames(summary: EntityDetailDto['unifiedEvidenceSummary']) {
  const explicit = summary?.activeSignals?.filter(Boolean) || [];
  if (explicit.length > 0) {
    return explicit;
  }

  const signals = [];
  if (summary?.metricsActive) signals.push('metrics');
  if (summary?.logsActive) signals.push('logs');
  if (summary?.tracesActive) signals.push('traces');
  return signals;
}

function readNumericField(source: unknown, keys: string[]) {
  if (!source || typeof source !== 'object') {
    return null;
  }

  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function formatLatency(
  traceSummary: EntityDetailDto['traceSummary'],
  t: EntityDetailViewModelTranslator = translateEntityDetailViewModel
) {
  const latencyMs = readNumericField(traceSummary, [
    'latencyP95Ms',
    'p95LatencyMs',
    'p95DurationMs',
    'averageLatencyMs',
    'avgDurationMs'
  ]);
  const durationNanos = latencyMs == null ? readNumericField(traceSummary, ['durationNanos', 'p95DurationNanos']) : null;
  const normalizedMs = latencyMs ?? (durationNanos == null ? null : durationNanos / 1_000_000);

  if (normalizedMs == null) {
    return { copy: t('entities.detail.health.latency.no-data'), meta: t('entities.detail.health.latency.waiting'), tone: 'neutral' as EntityDetailRowTone };
  }

  if (normalizedMs >= 1000) {
    return { copy: `${(normalizedMs / 1000).toFixed(1)} s`, meta: t('entities.detail.health.latency.meta'), tone: 'warning' as EntityDetailRowTone };
  }

  return { copy: `${Math.round(normalizedMs)} ms`, meta: t('entities.detail.health.latency.meta'), tone: 'success' as EntityDetailRowTone };
}

export function buildEntityHealthModel(
  detail: EntityDetailDto,
  t: EntityDetailViewModelTranslator = translateEntityDetailViewModel
): DetailRow[] {
  const logSummary = getSignalLogSummary(detail);
  const traceSummary = getSignalTraceSummary(detail);
  const totalBoundMonitors = finiteNumber(
    detail.monitorSummary?.totalBoundMonitors ?? detail.boundMonitors?.length ?? detail.entity?.monitorBinds?.length,
    0
  );
  const downMonitorCount = finiteNumber(detail.evidenceSummary?.downMonitorCount, 0);
  const healthyMonitorCount = Math.max(
    0,
    Math.min(totalBoundMonitors, finiteNumber(detail.evidenceSummary?.healthyMonitorCount, totalBoundMonitors - downMonitorCount))
  );
  const recentTraceCount = finiteNumber(traceSummary?.recentTraceCount, 0);
  const recentErrorTraceCount = finiteNumber(traceSummary?.recentErrorTraceCount, 0);
  const activeAlertCount = finiteNumber(
    detail.alertSummary?.totalActiveAlerts ?? detail.activeAlerts?.length ?? detail.evidenceSummary?.activeAlertCount,
    0
  );
  const logHintCount = finiteNumber(logSummary?.hintCount ?? detail.evidenceSummary?.logHintCount, 0);
  const availabilityRatio = totalBoundMonitors > 0 ? healthyMonitorCount / totalBoundMonitors : 0;
  const errorRate = recentTraceCount > 0 ? recentErrorTraceCount / recentTraceCount : 0;
  const recentAnomalyCount = downMonitorCount + recentErrorTraceCount + logHintCount;
  const latency = formatLatency(traceSummary, t);
  const collectorEvidence = buildCollectorHealthEvidence({
    healthyMonitorCount,
    lastEvidenceLabel: detail.evidenceSummary?.lastEvidenceAt == null ? null : String(detail.evidenceSummary.lastEvidenceAt),
    lastSeenLabel: detail.evidenceSummary?.collectorLastSeenAt == null ? null : String(detail.evidenceSummary.collectorLastSeenAt),
    offlineCollectorCount: detail.evidenceSummary?.collectorOfflineCount,
    onlineCollectorCount: detail.evidenceSummary?.collectorOnlineCount,
    taskCount: detail.evidenceSummary?.collectorTaskCount,
    totalBoundMonitors,
    totalCollectorCount: detail.evidenceSummary?.collectorTotalCount
  }, t);
  const collectorHandoff = withQuery('/setting/collector', buildContextParams(detail, 'last-1h'));
  const score = clampScore(
    100 -
      (totalBoundMonitors > 0 ? (downMonitorCount / totalBoundMonitors) * 30 : 10) -
      errorRate * 20 -
      Math.min(activeAlertCount * 8, 24) -
      Math.min(logHintCount * 2, 10)
  );

  return [
    { title: t('entities.detail.health.score.title'), copy: `${score} / 100`, meta: t('entities.detail.health.score.meta'), tone: scoreTone(score) },
    {
      title: t('entities.detail.health.availability.title'),
      copy: totalBoundMonitors > 0 ? formatPercent(availabilityRatio) : t('entities.detail.health.availability.waiting'),
      meta:
        totalBoundMonitors > 0
          ? t('entities.detail.health.availability.meta', { healthy: healthyMonitorCount, total: totalBoundMonitors })
          : t('entities.detail.health.availability.no-monitors'),
      tone: totalBoundMonitors > 0 ? countEvidenceTone(downMonitorCount) : 'neutral'
    },
    {
      title: t('entities.detail.health.error-rate.title'),
      copy: recentTraceCount > 0 ? formatPercent(errorRate) : t('entities.detail.health.error-rate.no-samples'),
      meta:
        recentTraceCount > 0
          ? t('entities.detail.health.error-rate.meta', { errors: recentErrorTraceCount, total: recentTraceCount })
          : t('entities.detail.health.error-rate.waiting'),
      tone: recentTraceCount > 0 ? countEvidenceTone(recentErrorTraceCount) : 'neutral'
    },
    { title: t('entities.detail.health.latency.title'), copy: latency.copy, meta: latency.meta, tone: latency.tone },
    {
      title: t('entities.detail.health.alerts.title'),
      copy: t('entities.detail.health.alerts.copy', { count: activeAlertCount }),
      meta: t('entities.detail.health.alerts.meta'),
      tone: countEvidenceTone(activeAlertCount)
    },
    {
      title: t('entities.detail.health.anomalies.title'),
      copy: t('entities.detail.health.anomalies.copy', { count: recentAnomalyCount }),
      meta: t('entities.detail.health.anomalies.meta', {
        logs: logHintCount,
        monitors: downMonitorCount,
        traces: recentErrorTraceCount
      }),
      tone: recentAnomalyCount > 0 ? 'warning' : 'success'
    },
    {
      title: t('entities.detail.health.collector.title'),
      copy: collectorEvidence.copy,
      freshness: collectorEvidence.freshness,
      meta: collectorEvidence.meta,
      tone: collectorEvidence.tone,
      ...(collectorHandoff ? { href: collectorHandoff } : {})
    }
  ];
}

export function buildUnifiedEvidenceRows(
  detail: Pick<EntityDetailDto, 'unifiedEvidenceSummary' | 'traceSummary' | 'signalEvidence'>,
  t: EntityDetailViewModelTranslator = translateEntityDetailViewModel
): DetailRow[] {
  const summary = getSignalUnifiedEvidenceSummary(detail);
  if (!summary) {
    return [
      {
        title: t('entities.detail.evidence.coverage.title'),
        copy: t('entities.detail.evidence.coverage.waiting'),
        meta: t('entities.detail.evidence.coverage.no-model'),
        tone: 'neutral'
      }
    ];
  }

  const signals = activeSignalNames(summary);
  const activeSignalCount = finiteNumber(summary.activeSignalCount, signals.length);
  const metricEvidenceCount = finiteNumber(summary.metricEvidenceCount, 0);
  const logEvidenceCount = finiteNumber(summary.logEvidenceCount, 0);
  const traceEvidenceCount = finiteNumber(summary.traceEvidenceCount, 0);
  const traceErrorCount = finiteNumber(getSignalTraceSummary(detail)?.recentErrorTraceCount, 0);

  return [
    {
      title: t('entities.detail.evidence.coverage.title'),
      copy: t('entities.detail.evidence.coverage.copy', { count: activeSignalCount }),
      meta: signals.length > 0 ? signals.join(' · ') : t('entities.detail.evidence.coverage.no-signals'),
      tone: activeSignalCount > 0 ? 'success' : 'neutral'
    },
    {
      title: t('entities.detail.evidence.metrics.title'),
      copy: formatEvidenceCount(metricEvidenceCount, 'entities.detail.evidence.metrics.copy', t),
      meta: t('entities.detail.evidence.metrics.meta'),
      tone: summary.metricsActive || metricEvidenceCount > 0 ? 'success' : 'neutral'
    },
    {
      title: t('entities.detail.evidence.logs.title'),
      copy: formatEvidenceCount(logEvidenceCount, 'entities.detail.evidence.logs.copy', t),
      meta: t('entities.detail.evidence.logs.meta'),
      tone: summary.logsActive || logEvidenceCount > 0 ? 'warning' : 'neutral'
    },
    {
      title: t('entities.detail.evidence.traces.title'),
      copy: formatEvidenceCount(traceEvidenceCount, 'entities.detail.evidence.traces.copy', t),
      meta:
        traceErrorCount > 0
          ? t('entities.detail.evidence.traces.errors', { count: traceErrorCount })
          : t('entities.detail.evidence.traces.meta'),
      tone: traceErrorCount > 0 ? 'danger' : summary.tracesActive || traceEvidenceCount > 0 ? 'success' : 'neutral'
    },
    {
      title: t('entities.detail.evidence.latest.title'),
      copy:
        summary.latestObservedAt == null
          ? t('entities.detail.evidence.latest.waiting')
          : String(summary.latestObservedAt),
      meta: t('entities.detail.evidence.latest.meta'),
      tone: 'neutral'
    }
  ];
}

export function buildNextActionRows(
  detail: Pick<EntityDetailDto, 'nextActions'>,
  entityId: string | number | null | undefined,
  t: EntityDetailViewModelTranslator = translateEntityDetailViewModel
) {
  const actions = (detail.nextActions || [])
    .filter(action => action?.title || action?.summary || action?.actionLabel)
    .map(action => ({
      title: localizeActionText(action.title || action.actionLabel, t('entities.detail.action-text.next-action'), t),
      copy: localizeActionText(action.summary, '-', t),
      meta: localizeActionText(action.actionLabel || action.actionType, t('entities.detail.action-text.server-guidance'), t)
    }));

  return actions.length > 0 ? actions : buildDrilldownRows(entityId, t);
}

export function buildDrilldownRows(
  entityId: string | number | null | undefined,
  t: EntityDetailViewModelTranslator = translateEntityDetailViewModel
) {
  const id = entityId ? String(entityId) : null;
  return [
    {
      title: t('entities.detail.drilldown.definition.title'),
      copy: id ? `/entities/${id}/definition` : '-',
      meta: t('entities.detail.drilldown.next-route')
    },
    {
      title: t('entities.detail.drilldown.edit.title'),
      copy: id ? `/entities/${id}/edit` : '-',
      meta: t('entities.detail.drilldown.next-route')
    },
    {
      title: t('entities.detail.drilldown.discovery.title'),
      copy: '/entities/discovery',
      meta: t('entities.detail.drilldown.shared-route')
    }
  ];
}

function getEntityRecord(detail: EntityDetailDto) {
  return detail.entity?.entity || {};
}

function addContextParam(params: URLSearchParams, key: string, value: unknown) {
  if (value == null || value === '') return;
  params.set(key, String(value));
}

type EntityDetailTimeContext = string | SignalRouteContext;

const ENTITY_HANDOFF_PRESERVED_CONTEXT_KEYS = [
  'start',
  'end',
  'refresh',
  'live',
  'tz',
  'source',
  'collector',
  'template',
  'monitorId',
  'monitorName',
  'monitorApp',
  'monitorInstance',
  'serviceNamespace'
] as const;

function normalizeContextText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeUnknownText(value: unknown) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function resolveEntityTimeContext(context: EntityDetailTimeContext | undefined): SignalRouteContext {
  if (!context) return { timeRange: 'last-1h' };
  return typeof context === 'string' ? { timeRange: context } : context;
}

function hasExplicitRouteContext(context: SignalRouteContext | undefined) {
  return Boolean(context && Object.values(context).some(value => normalizeContextText(value)));
}

export function buildEntityIncomingContextRows(
  routeContext?: SignalRouteContext,
  t: EntityDetailViewModelTranslator = translateEntityDetailViewModel
): EntityIncomingContextRow[] {
  if (!hasExplicitRouteContext(routeContext)) return [];
  const hasTimeContext = Boolean(routeContext?.timeRange || routeContext?.start || routeContext?.end || routeContext?.refresh || routeContext?.live || routeContext?.tz);
  const hasSourceContext = Boolean(routeContext?.source || routeContext?.collector || routeContext?.template);
  const entityLabel = t('signal.context.entity.label');
  const serviceLabel = t('signal.context.service.label');
  const environmentLabel = t('signal.context.environment.label');
  const timeLabel = t('signal.context.time.label');
  const sourceLabel = t('signal.context.source.label');

  return buildSignalEntityContextRows(routeContext || {}, {}, t).filter(row => {
    if (row.label === entityLabel) return false;
    if (row.label === serviceLabel || row.label === environmentLabel) return row.value !== '-';
    if (row.label === timeLabel) return hasTimeContext;
    if (row.label === sourceLabel) return hasSourceContext;
    return row.value !== '-';
  });
}

function appendPreservedEntityContext(params: URLSearchParams, routeContext: SignalRouteContext) {
  ENTITY_HANDOFF_PRESERVED_CONTEXT_KEYS.forEach(key => {
    addContextParam(params, key, normalizeContextText(routeContext[key]));
  });
}

function buildContextParams(
  detail: EntityDetailDto,
  timeContext: EntityDetailTimeContext,
  options: { includeTrace?: boolean; includeEntityName?: boolean; includeReturnTo?: boolean } = {}
) {
  const entity = getEntityRecord(detail);
  const routeContext = resolveEntityTimeContext(timeContext);
  const entityId = entity.id != null ? String(entity.id) : '';
  const entityName = entity.displayName || entity.name || '';
  const serviceName = normalizeContextText(routeContext.serviceName) || entity.name || entity.displayName || '';
  const traceSummary = getSignalTraceSummary(detail);
  const timeRange = normalizeContextText(routeContext.timeRange) || 'last-1h';
  const params = new URLSearchParams();

  addContextParam(params, 'entityId', entityId);
  if (options.includeEntityName) addContextParam(params, 'entityName', entityName);
  addContextParam(params, 'serviceName', serviceName);
  addContextParam(params, 'environment', normalizeContextText(routeContext.environment) || entity.environment);
  addContextParam(params, 'timeRange', timeRange);
  appendPreservedEntityContext(params, routeContext);
  if (options.includeTrace) {
    addContextParam(params, 'traceId', normalizeContextText(routeContext.traceId) || traceSummary?.latestTraceId);
    addContextParam(params, 'spanId', normalizeContextText(routeContext.spanId) || traceSummary?.latestSpanId);
  }
  if (options.includeReturnTo && entityId) {
    params.set('returnTo', `/entities/${entityId}`);
  }

  return params.toString();
}

function withQuery(path: string, query: string) {
  return query ? `${path}?${query}` : path;
}

export function buildEntityContextHandoffLinks(
  detail: EntityDetailDto,
  timeContext: EntityDetailTimeContext = 'last-1h',
  t: EntityDetailViewModelTranslator = translateEntityDetailViewModel
): HandoffRow[] {
  const entity = getEntityRecord(detail);
  const entityId = entity.id != null ? String(entity.id) : '';
  const shared = buildContextParams(detail, timeContext);
  const sharedWithTrace = buildContextParams(detail, timeContext, { includeTrace: true });
  const monitorQuery = buildContextParams(detail, timeContext, { includeEntityName: true, includeReturnTo: true });

  return [
    {
      key: 'metrics',
      title: t('entities.detail.handoff.metrics.title'),
      copy: withQuery('/ingestion/otlp/metrics', shared),
      meta: t('entities.detail.handoff.metrics.meta')
    },
    {
      key: 'logs',
      title: t('entities.detail.handoff.logs.title'),
      copy: withQuery('/log/manage', sharedWithTrace),
      meta: t('entities.detail.handoff.logs.meta')
    },
    {
      key: 'traces',
      title: t('entities.detail.handoff.traces.title'),
      copy: withQuery('/trace/manage', sharedWithTrace),
      meta: t('entities.detail.handoff.traces.meta')
    },
    {
      key: 'alerts',
      title: t('entities.detail.handoff.alerts.title'),
      copy: withQuery('/alert/setting', shared),
      meta: t('entities.detail.handoff.alerts.meta')
    },
    {
      key: 'monitors',
      title: t('entities.detail.handoff.monitors.title'),
      copy: withQuery('/monitors', monitorQuery),
      meta: t('entities.detail.handoff.monitors.meta')
    },
    {
      key: 'topology',
      title: t('entities.detail.handoff.topology.title'),
      copy: withQuery('/topology', shared),
      meta: t('entities.detail.handoff.topology.meta')
    },
    {
      key: 'template',
      title: t('entities.detail.handoff.template.title'),
      copy: withQuery(entityId ? `/entities/${entityId}/definition` : '/entities', shared),
      meta: t('entities.detail.handoff.template.meta')
    }
  ];
}

function buildPrefixedQuery(prefix: [string, string][], baseQuery: string) {
  const params = new URLSearchParams();
  prefix.forEach(([key, value]) => params.set(key, value));
  const baseParams = new URLSearchParams(baseQuery);
  baseParams.forEach((value, key) => params.set(key, value));
  return params.toString();
}

function findRunbookLink(entity: Entity): EntityLinkRef | null {
  const links = entity.links || [];
  return (
    links.find(link => {
      const type = normalizeUnknownText(link.type)?.toLowerCase();
      const name = normalizeUnknownText(link.name)?.toLowerCase();
      const provider = normalizeUnknownText(link.provider)?.toLowerCase();
      return Boolean(link.url && [type, name, provider].some(value => value?.includes('runbook')));
    }) || null
  );
}

export function buildEntityEvidenceHandoffRows(
  detail: EntityDetailDto,
  timeContext: EntityDetailTimeContext = 'last-1h',
  t: EntityDetailViewModelTranslator = translateEntityDetailViewModel
): EvidenceHandoffRow[] {
  const entity = getEntityRecord(detail);
  const entityId = entity.id != null ? String(entity.id) : '';
  const entityName = normalizeUnknownText(entity.displayName) || normalizeUnknownText(entity.name) || entityId;
  const contextQuery = buildContextParams(detail, timeContext, { includeEntityName: true, includeReturnTo: true });
  const sharedQuery = buildContextParams(detail, timeContext);
  const activeAlertCount = Math.max(
    finiteNumber(detail.alertSummary?.totalActiveAlerts, 0),
    finiteNumber(detail.evidenceSummary?.activeAlertCount, 0),
    finiteNumber(detail.activeAlerts?.length, 0)
  );
  const relations = ((detail.entity?.relations || []) as Array<Record<string, unknown>>).filter(Boolean);
  const firstRelation = relations[0];
  const relationType = normalizeUnknownText(firstRelation?.type) || normalizeUnknownText(firstRelation?.relationType);
  const relationTargetId = normalizeUnknownText(firstRelation?.targetEntityId) || normalizeUnknownText(firstRelation?.targetId);
  const relationTargetName =
    normalizeUnknownText(firstRelation?.targetEntityName) ||
    normalizeUnknownText(firstRelation?.targetName) ||
    relationTargetId ||
    t('entities.detail.evidence-handoff.topology.unknown-target');
  const runbookUrl = normalizeUnknownText(entity.runbook);
  const runbookLink = runbookUrl ? null : findRunbookLink(entity);
  const resolvedRunbookUrl = runbookUrl || normalizeUnknownText(runbookLink?.url);
  const rows: EvidenceHandoffRow[] = [];

  if (activeAlertCount > 0) {
    rows.push({
      key: 'alerts',
      evidence: 'active-alerts',
      count: activeAlertCount,
      title: t('entities.detail.evidence-handoff.alerts.title'),
      copy: t('entities.detail.evidence-handoff.alerts.copy', { count: activeAlertCount }),
      meta: t('entities.detail.evidence-handoff.alerts.meta'),
      href: withQuery('/alert', buildPrefixedQuery([['status', 'firing']], contextQuery)),
      tone: 'danger'
    });
  }

  if (firstRelation) {
    const topologyParams = new URLSearchParams(sharedQuery);
    addContextParam(topologyParams, 'topologyTargetId', relationTargetId);
    addContextParam(topologyParams, 'topologyTargetName', relationTargetName);
    rows.push({
      key: 'topology',
      evidence: 'topology-relation',
      count: relations.length,
      title: t('entities.detail.evidence-handoff.topology.title'),
      copy: relationTargetName,
      meta: relationTargetId
        ? `${relationType || t('entities.detail.evidence-handoff.topology.default-relation')} · ${relationTargetId}`
        : relationType || t('entities.detail.evidence-handoff.topology.default-relation'),
      href: withQuery('/topology', topologyParams.toString()),
      tone: 'warning'
    });
  }

  if (resolvedRunbookUrl) {
    rows.push({
      key: 'runbook',
      evidence: 'runbook',
      count: 1,
      title: t('entities.detail.evidence-handoff.runbook.title'),
      copy: normalizeUnknownText(runbookLink?.name) || resolvedRunbookUrl,
      meta: t('entities.detail.evidence-handoff.runbook.meta'),
      href: resolvedRunbookUrl,
      tone: 'success'
    });
  }

  return rows;
}

function recordLabelSummary(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '-';
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return '-';
  return entries.slice(0, 2).map(([key, entryValue]) => `${key}=${String(entryValue)}`).join(', ');
}

export function buildCurrentAlertRows(
  detail: EntityDetailDto,
  t: EntityDetailViewModelTranslator = translateEntityDetailViewModel
): DetailRow[] {
  const alerts = (detail.activeAlerts || []) as Array<Record<string, unknown>>;

  if (alerts.length === 0) {
    return [
      {
        title: t('entities.detail.alert-row.empty.title'),
        copy: t('entities.detail.alert-row.empty.copy'),
        meta: t('entities.detail.alert-row.empty.meta', { count: detail.alertSummary?.totalActiveAlerts ?? 0 }),
        tone: 'success'
      }
    ];
  }

  return alerts.map((alert, index) => {
    const alertId = alert.id ?? index + 1;
    const status = String(alert.status || alert.state || 'firing');
    const labelSummary = recordLabelSummary(alert.labels);
    return {
      title: t('entities.detail.alert-row.active.title', { id: String(alertId) }),
      copy: String(alert.content || alert.summary || alert.name || alert.annotations || t('entities.detail.alert-row.pending.copy')),
      meta: labelSummary === '-' ? status : `${status} · ${labelSummary}`,
      tone: 'danger'
    };
  });
}

export function buildRelationshipRows(
  detail: EntityDetailDto,
  t: EntityDetailViewModelTranslator = translateEntityDetailViewModel
): DetailRow[] {
  const relations = (detail.entity?.relations || []) as Array<Record<string, unknown>>;

  if (relations.length === 0) {
    return [
      {
        title: t('entities.detail.relationship-row.empty.title'),
        copy: t('entities.detail.relationship-row.empty.copy'),
        meta: t('entities.detail.relationship-row.empty.meta')
      }
    ];
  }

  return relations.map(relation => ({
    title: String(relation.type || relation.relationType || 'related'),
    copy: String(
      relation.targetEntityName ||
      relation.targetName ||
      relation.targetEntityId ||
      t('entities.detail.relationship-row.unknown-target')
    ),
    meta:
      relation.targetEntityId != null
        ? String(relation.targetEntityId)
        : t('entities.detail.relationship-row.default-meta')
  }));
}

function identitySummary(identities: unknown[]) {
  const first = identities.find(identity => identity && typeof identity === 'object') as Record<string, unknown> | undefined;
  if (!first) return '-';
  if (first.key || first.value) return `${String(first.key || 'identity')}=${String(first.value || '-')}`;
  return String(first.name || first.id || '-');
}

function templateSummary(monitorBinds: unknown[]) {
  const first = monitorBinds.find(bind => bind && typeof bind === 'object') as Record<string, unknown> | undefined;
  if (!first) return '-';
  return String(first.templateName || first.template || first.app || first.monitorId || first.id || '-');
}

function entityDisplayName(detail: EntityDetailDto, t: EntityDetailViewModelTranslator = translateEntityDetailViewModel) {
  const entity = getEntityRecord(detail);
  return String(entity.displayName || entity.name || entity.id || t('entities.detail.title.fallback'));
}

export function buildEntityAttributionRows(
  detail: EntityDetailDto,
  t: EntityDetailViewModelTranslator = translateEntityDetailViewModel
): AttributionRow[] {
  const identities = detail.entity?.identities || [];
  const monitorBinds = detail.entity?.monitorBinds || [];
  const hasIdentities = identities.length > 0;
  const hasMonitorBinds = monitorBinds.length > 0;
  const hasAnyAttribution = hasIdentities || hasMonitorBinds;
  const missingParts = [
    ...(hasIdentities ? [] : [t('entities.detail.attribution.diagnostic.missing-part.identity')]),
    ...(hasMonitorBinds ? [] : [t('entities.detail.attribution.diagnostic.missing-part.monitor-bind')])
  ];
  const diagnosticState: AttributionState = missingParts.length === 0 ? 'ready' : hasAnyAttribution ? 'review' : 'missing';

  return [
    {
      key: 'traditional-monitor',
      state: hasMonitorBinds ? 'ready' : 'missing',
      title: t('entities.detail.attribution.traditional-monitor.title'),
      copy: t('entities.detail.attribution.monitor-bind.count', { count: monitorBinds.length }),
      meta: hasMonitorBinds ? templateSummary(monitorBinds) : t('entities.detail.attribution.traditional-monitor.waiting-meta')
    },
    {
      key: 'otlp-attribution',
      state: hasIdentities ? 'ready' : 'missing',
      title: t('entities.detail.attribution.otlp.title'),
      copy: hasIdentities
        ? t('entities.detail.attribution.identity.count', { count: identities.length })
        : t('entities.detail.attribution.identity.missing'),
      meta: hasIdentities ? identitySummary(identities) : t('entities.detail.attribution.otlp.waiting-meta')
    },
    {
      key: 'candidate-confirmation',
      state: hasAnyAttribution ? 'ready' : 'review',
      title: t('entities.detail.attribution.candidate.title'),
      copy: hasAnyAttribution
        ? t('entities.detail.attribution.candidate.assigned')
        : t('entities.detail.attribution.candidate.pending'),
      meta: hasAnyAttribution ? entityDisplayName(detail, t) : t('entities.detail.attribution.candidate.discover-meta')
    },
    {
      key: 'missing-diagnostics',
      state: diagnosticState,
      title: t('entities.detail.attribution.diagnostic.title'),
      copy:
        missingParts.length === 0
          ? t('entities.detail.attribution.diagnostic.complete')
          : hasAnyAttribution
            ? t('entities.detail.attribution.diagnostic.incomplete')
            : t('entities.detail.attribution.diagnostic.missing'),
      meta:
        missingParts.length === 0
          ? t('entities.detail.attribution.diagnostic.complete-meta')
          : t('entities.detail.attribution.diagnostic.missing-meta', { parts: missingParts.join('、') })
    }
  ];
}

export function buildCollectionSourceRows(
  detail: EntityDetailDto,
  t: EntityDetailViewModelTranslator = translateEntityDetailViewModel
): DetailRow[] {
  const entity = getEntityRecord(detail);
  const identities = detail.entity?.identities || [];
  const monitorBinds = detail.entity?.monitorBinds || [];
  const labels = entity.labels || {};

  return [
    {
      title: t('entities.detail.collection.source.title'),
      copy: entity.source || 'manual',
      meta: t('entities.detail.collection.source.meta')
    },
    {
      title: t('entities.detail.collection.identity.title'),
      copy: t('entities.detail.collection.identity.count', { count: identities.length }),
      meta: identitySummary(identities)
    },
    {
      title: t('entities.detail.collection.template.title'),
      copy: t('entities.detail.collection.template.count', { count: monitorBinds.length }),
      meta: templateSummary(monitorBinds)
    },
    {
      title: t('entities.detail.collection.labels.title'),
      copy: t('entities.detail.collection.labels.count', { count: Object.keys(labels).length }),
      meta: recordLabelSummary(labels)
    }
  ];
}
