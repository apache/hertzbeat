import { buildAlertInhibitFormDraft, type AlertInhibitFormDraft } from '../alert-inhibit/controller';
import { buildAlertSilenceFormDraft, type AlertSilenceFormDraft } from '../alert-silence/controller';
import { appendSignalRouteContext, buildSignalEntityHref, stripReturnLabelFromHref, type SignalRouteContext } from '../signal-route-context';
import { buildEventWindowTimeContext } from '../time-context';
import type { AlertClosureOperationAction } from './controller';
import type { AlertQueryState } from './query-state';
import type { AlertSummary, EntityNoiseControlRule, EntityNoiseControlSummary, GroupAlert, PageResult, SingleAlert } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type AlertRow = {
  key: string;
  title: string;
  copy: string;
  meta: string;
};

type SummaryRow = {
  title: string;
  copy: string;
  meta: string;
};

type NoiseControlCard = {
  title: string;
  copy: string;
  silenceActionLabel: string;
  inhibitActionLabel: string;
};

type AlertGroupCardAlert = {
  key: string;
  title: string;
  status: string;
  statusTone: 'critical' | 'warning' | 'success' | 'neutral';
  timeLabel: string;
  timeValue: string;
  triggerSummary?: string;
  labels: string[];
  annotations: Array<{ key: string; value: string }>;
  timeRows: Array<{ key: 'first' | 'last' | 'end'; label: string; value: string }>;
};

export type AlertRuleDialogMode = 'silence' | 'inhibit';

type AlertGroupAction = {
  key: 'delete' | 'acknowledge' | 'resolve' | 'unacknowledge' | 'reopen' | 'silence' | 'inhibit';
  label: string;
  dialogMode?: AlertRuleDialogMode;
};

type AlertGroupCard = {
  key: string;
  labels: string[];
  updatedAt: string;
  triageReason: string | null;
  responseStage: string;
  evidenceSummary: string;
  closureSummary: string;
  actions: AlertGroupAction[];
  actionLabels: string[];
  alerts: AlertGroupCardAlert[];
};

export type AlertEvidenceClosureRow = {
  key: 'entity' | 'metrics' | 'logs' | 'traces' | 'topology';
  title: string;
  copy: string;
  meta: string;
  href: string;
};

export type AlertClosureOperationRow = {
  key: 'acknowledge' | 'recover' | 'threshold' | 'notice' | 'group' | 'silence' | 'inhibit' | 'automation' | 'close';
  label: string;
  copy: string;
  href?: string;
};

export type AlertEvidenceContextRow = {
  key: 'time' | 'monitor' | 'source' | 'trace';
  title: string;
  copy: string;
  meta: string;
};

export type AlertRuleWorkspaceMode = AlertRuleDialogMode | 'setting' | 'notice' | 'group';

type AlertRulePreviewLabel = {
  key: string;
  value: string;
};

export type AlertRuleQuickDialogModel = {
  mode: AlertRuleDialogMode;
  title: string;
  entityTitle: string;
  summary: string;
  authoringTitle: string;
  authoringCopy: string;
  warning: string | null;
  previewLabels: AlertRulePreviewLabel[];
  targetPreviewLabels: AlertRulePreviewLabel[];
  silenceDraft?: AlertSilenceFormDraft;
  inhibitDraft?: AlertInhibitFormDraft;
};

export type AlertEventClosureReview = {
  milestone: 6;
  status: 'ready-for-topology-fault-analysis';
  evidenceKeys: AlertEvidenceClosureRow['key'][];
  operationKeys: AlertClosureOperationRow['key'][];
  directMutationKeys: Extract<AlertClosureOperationRow['key'], 'acknowledge' | 'recover' | 'close'>[];
  ruleWorkspaceModes: AlertRuleWorkspaceMode[];
  implementedCapabilities: string[];
  futureRoadmapOnly: string[];
  nextMilestone: 'topology-dependency-change-fault-analysis';
};

export function buildAlertEventClosureReview(): AlertEventClosureReview {
  return {
    milestone: 6,
    status: 'ready-for-topology-fault-analysis',
    evidenceKeys: ['entity', 'metrics', 'logs', 'traces', 'topology'],
    operationKeys: ['acknowledge', 'recover', 'threshold', 'notice', 'group', 'silence', 'inhibit', 'automation', 'close'],
    directMutationKeys: ['acknowledge', 'recover', 'close'],
    ruleWorkspaceModes: ['setting', 'notice', 'group', 'silence', 'inhibit'],
    implementedCapabilities: [
      'alert-evidence-entity',
      'alert-evidence-metrics',
      'alert-evidence-logs',
      'alert-evidence-traces',
      'alert-evidence-topology',
      'alert-acknowledge',
      'alert-recover',
      'alert-close',
      'threshold-rules',
      'notification-policies',
      'grouping-rules',
      'silence-rules',
      'inhibit-rules'
    ],
    futureRoadmapOnly: [
      'incident-management',
      'on-call',
      'status-pages',
      'case-management',
      'slo',
      'event-management'
    ],
    nextMilestone: 'topology-dependency-change-fault-analysis'
  };
}

export function buildAlertMetrics(summary: AlertSummary, t: Translator) {
  return [
    { label: t('alert.center.metrics.warning'), value: String(summary.priorityWarningNum || 0), tone: 'warning' as const },
    { label: t('alert.center.metrics.critical'), value: String(summary.priorityCriticalNum || 0), tone: 'danger' as const },
    { label: t('alert.center.metrics.emergency'), value: String(summary.priorityEmergencyNum || 0), tone: 'danger' as const }
  ];
}

function formatAlertFact(value: string | number | null | undefined, emptyValue: string) {
  return String(value ?? '').trim() || emptyValue;
}

function buildAlertIdentityLabel(alert: SingleAlert, emptyValue: string) {
  return formatAlertFact(alert.labels?.service || alert.labels?.job || alert.labels?.instance, emptyValue);
}

export function buildAlertRows(
  alerts: PageResult<SingleAlert>,
  t: Translator,
  severityLabel: (alert: SingleAlert) => string,
  statusLabel: (status: string | null | undefined) => string,
  formatTime: (value?: number | string | null) => string,
  defaultAlertTitle: string
): AlertRow[] {
  const emptyValue = t('common.none');
  return (alerts.content || []).map(alert => ({
    key: String(alert.id),
    title: alert.content || alert.annotations?.summary || defaultAlertTitle,
    copy: `${buildAlertIdentityLabel(alert, emptyValue)} · ${statusLabel(alert.status)}`,
    meta: `${severityLabel(alert)} · ${formatTime(alert.gmtUpdate || alert.gmtCreate || null)}`
  }));
}

export function buildSelectedAlertRows(
  selectedAlert: SingleAlert | null,
  t: Translator,
  severityLabel: (alert: SingleAlert) => string,
  statusLabel: (status: string | null | undefined) => string,
  formatTime: (value?: number | string | null) => string,
  defaultAlertTitle: string
): SummaryRow[] {
  const emptyValue = t('common.none');
  if (!selectedAlert) {
    return [
      {
        title: t('alert.center.selected.empty.title'),
        copy: t('alert.center.selected.empty.copy'),
        meta: emptyValue
      }
    ];
  }

  const triggerCount = selectedAlert.triggerTimes || 0;

  return [
    {
      title: selectedAlert.content || selectedAlert.annotations?.summary || defaultAlertTitle,
      copy: `${buildAlertIdentityLabel(selectedAlert, emptyValue)} · ${statusLabel(selectedAlert.status)}`,
      meta: severityLabel(selectedAlert)
    },
    {
      title: t('alert.center.selected.fingerprint'),
      copy: `${formatAlertFact(selectedAlert.fingerprint, emptyValue)} · ${formatAlertFact(selectedAlert.creator, emptyValue)}`,
      meta: `${t('common.updated')} ${formatTime(selectedAlert.gmtUpdate || selectedAlert.gmtCreate || null)}`
    },
    {
      title: t('alert.center.selected.trigger-window'),
      copy: `${t('alert.center.selected.trigger-count', { count: triggerCount })} · ${formatTime(selectedAlert.startAt || selectedAlert.activeAt || null)}`,
      meta: `${t('common.end')} ${formatTime(selectedAlert.endAt || selectedAlert.startAt || selectedAlert.activeAt || null)}`
    }
  ];
}

function isChineseTranslator(t: Translator): boolean {
  return t('common.locale-code') === 'zh-CN';
}

function buildEntityContextStatusLabel(status: string, t: Translator): string {
  const normalizedStatus = status.trim().toLowerCase();
  if (normalizedStatus === 'firing') return t('alert.status.firing');
  if (normalizedStatus === 'acknowledged') return t('alert.status.acknowledged');
  if (normalizedStatus === 'resolved') return t('alert.status.resolved');
  return t('alert.center.context.status.unknown', { status });
}

function buildEntityContextSeverityLabel(severity: string, t: Translator): string {
  const normalizedSeverity = severity.trim().toLowerCase();

  if (normalizedSeverity === 'critical') return t('alert.center.metrics.critical');
  if (normalizedSeverity === 'warning' || normalizedSeverity === 'warn') return t('alert.center.metrics.warning');
  if (normalizedSeverity === 'emergency' || normalizedSeverity === 'fatal') return t('alert.center.metrics.emergency');
  if (normalizedSeverity === 'error') return t('alert.center.metrics.error');
  if (normalizedSeverity === 'info') return t('alert.center.metrics.info');
  if (normalizedSeverity === 'unknown') return t('alert.center.metrics.unknown');

  return t('alert.center.context.severity.unknown', { severity });
}

export function buildAlertEntityContextSummary(query: AlertQueryState, t: Translator): string {
  const segments: string[] = [];

  if (query.status) {
    segments.push(`${t('entity.response.context.status')}: ${buildEntityContextStatusLabel(query.status, t)}`);
  }
  if (query.severity) {
    segments.push(`${t('entity.response.context.severity')}: ${buildEntityContextSeverityLabel(query.severity, t)}`);
  }
  if (query.search) {
    segments.push(`${t('entity.response.context.search')}: ${query.search}`);
  }

  return segments.join(' · ');
}

function normalizeAlertContextValue(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function formatAlertContextInstant(value: string, locale: string, timeZone?: string): string {
  const trimmed = normalizeAlertContextValue(value);
  const numericValue = Number(trimmed);
  if (!trimmed || !Number.isFinite(numericValue) || !/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  const date = new Date(numericValue);
  if (!Number.isFinite(date.getTime())) {
    return trimmed;
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

  try {
    return new Intl.DateTimeFormat(locale, timeZone ? { ...options, timeZone } : options).format(date);
  } catch {
    return new Intl.DateTimeFormat(locale, options).format(date);
  }
}

function formatAlertRefresh(value: string, t: Translator): string {
  const normalized = normalizeAlertContextValue(value);
  if (!normalized) {
    return '';
  }
  if (/^\d+$/.test(normalized)) {
    return t('common.duration.seconds', { value: normalized });
  }
  return normalized;
}

function buildAlertSourceCopy(source: string, t: Translator): { copy: string; meta: string } {
  const normalized = source.trim().toLowerCase();
  if (normalized === 'monitor') {
    return {
      copy: t('alert.center.context.source.monitor.copy'),
      meta: t('alert.center.context.source.monitor.meta')
    };
  }
  if (normalized === 'topology') {
    return {
      copy: t('alert.center.context.source.topology.copy'),
      meta: t('alert.center.context.source.topology.meta')
    };
  }
  if (normalized === 'otlp') {
    return {
      copy: t('alert.center.context.source.otlp.copy'),
      meta: t('alert.center.context.source.otlp.meta')
    };
  }
  if (normalized === 'alert' || normalized.startsWith('alert:')) {
    return {
      copy: t('alert.center.context.source.alert.copy'),
      meta: t('alert.center.context.source.alert.meta')
    };
  }
  return {
    copy: t('alert.center.context.source.unknown.copy', { source }),
    meta: t('alert.center.context.source.default.meta')
  };
}

function pickAlertEventWindow(group: GroupAlert | null | undefined) {
  const primaryAlert = group?.alerts?.find(alert => alert?.startAt || alert?.activeAt || alert?.gmtUpdate || alert?.gmtCreate || alert?.endAt);
  return {
    eventStart: primaryAlert?.startAt ?? primaryAlert?.activeAt ?? primaryAlert?.gmtUpdate ?? primaryAlert?.gmtCreate ?? group?.gmtUpdate ?? group?.gmtCreate,
    eventEnd: primaryAlert?.endAt ?? primaryAlert?.activeAt ?? primaryAlert?.gmtUpdate ?? group?.gmtUpdate
  };
}

function buildAlertEvidenceTimeContext(query: AlertQueryState, group?: GroupAlert | null) {
  return buildEventWindowTimeContext(
    {
      timeRange: query.timeRange,
      start: query.start,
      end: query.end,
      refresh: query.refresh,
      live: query.live,
      tz: query.tz
    },
    pickAlertEventWindow(group)
  );
}

export function buildAlertEvidenceContextRows(query: AlertQueryState, t: Translator, group?: GroupAlert | null): AlertEvidenceContextRow[] {
  const chinese = isChineseTranslator(t);
  const locale = chinese ? 'zh-CN' : 'en-US';
  const rows: AlertEvidenceContextRow[] = [];
  const evidenceTimeContext = buildAlertEvidenceTimeContext(query, group);
  const timeRange = normalizeAlertContextValue(evidenceTimeContext.timeRange);
  const start = normalizeAlertContextValue(evidenceTimeContext.start);
  const end = normalizeAlertContextValue(evidenceTimeContext.end);
  const refresh = normalizeAlertContextValue(evidenceTimeContext.refresh);
  const live = normalizeAlertContextValue(evidenceTimeContext.live);
  const timezone = normalizeAlertContextValue(evidenceTimeContext.tz);

  if (timeRange || start || end || refresh || live || timezone) {
    const bounds = start || end
      ? [start, end]
          .filter(Boolean)
          .map(value => formatAlertContextInstant(value, locale, timezone))
          .join(' → ')
      : '';
    const metaParts = [
      timeRange && bounds ? bounds : '',
      refresh ? t('alert.center.context.time.refresh', { refresh: formatAlertRefresh(refresh, t) }) : '',
      live ? (live.toLowerCase() === 'false' ? t('alert.center.context.time.paused') : t('alert.center.context.time.live')) : '',
      timezone
    ].filter(Boolean);

    rows.push({
      key: 'time',
      title: t('alert.center.context.time.title'),
      copy: timeRange || bounds || t('alert.center.context.time.inherited'),
      meta: metaParts.join(' · ')
    });
  }

  const monitorName = normalizeAlertContextValue(query.monitorName);
  const monitorId = normalizeAlertContextValue(query.monitorId);
  const monitorApp = normalizeAlertContextValue(query.monitorApp);
  const monitorInstance = normalizeAlertContextValue(query.monitorInstance);
  if (monitorName || monitorId || monitorApp || monitorInstance) {
    rows.push({
      key: 'monitor',
      title: t('alert.center.context.monitor.title'),
      copy: monitorName || monitorInstance || monitorId,
      meta: [monitorApp, monitorInstance, monitorId ? t('alert.center.context.monitor.id-meta', { monitorId }) : ''].filter(Boolean).join(' · ')
    });
  }

  const source = normalizeAlertContextValue(query.source);
  if (source) {
    const sourceCopy = buildAlertSourceCopy(source, t);
    rows.push({
      key: 'source',
      title: t('alert.center.context.source.title'),
      copy: sourceCopy.copy,
      meta: sourceCopy.meta
    });
  }

  const traceId = normalizeAlertContextValue(query.traceId);
  const spanId = normalizeAlertContextValue(query.spanId);
  if (traceId || spanId) {
    rows.push({
      key: 'trace',
      title: t('alert.center.context.trace.title'),
      copy: traceId || spanId,
      meta: spanId ? t('alert.center.context.trace.span-meta', { spanId }) : t('alert.center.context.trace.inherited')
    });
  }

  return rows;
}

export function buildAlertNoiseControlSummary(
  summary: EntityNoiseControlSummary | undefined,
  total: number,
  t: Translator
): NoiseControlCard | null {
  if (!summary) {
    return null;
  }

  const visible = summary.activeSilenceCount > 0 || summary.matchingInhibitCount > 0 || summary.possibleAlertSuppression;

  if (!visible) {
    return null;
  }

  const suppressed = summary.possibleAlertSuppression && total === 0;

  return {
    title: suppressed ? t('entity.detail.noise-controls.title.suppressed') : t('entity.detail.noise-controls.title.active'),
    copy: suppressed
      ? t('entity.detail.noise-controls.copy.suppressed', {
          silenceCount: summary.activeSilenceCount,
          inhibitCount: summary.matchingInhibitCount
        })
      : t('entity.detail.noise-controls.copy.active', {
          silenceCount: summary.activeSilenceCount,
          inhibitCount: summary.matchingInhibitCount
        }),
    silenceActionLabel:
      summary.possibleAlertSuppression && summary.activeSilenceCount === 0
        ? t('entity.detail.noise-controls.manage-silence-create')
        : t('entity.detail.noise-controls.manage-silence'),
    inhibitActionLabel:
      summary.possibleAlertSuppression && summary.matchingInhibitCount === 0
        ? t('entity.detail.noise-controls.manage-inhibit-create')
        : t('entity.detail.noise-controls.manage-inhibit')
  };
}

function appendAlertClosureRouteContext(params: URLSearchParams, query: AlertQueryState) {
  (
    [
      'serviceName',
      'serviceNamespace',
      'environment',
      'timeRange',
      'start',
      'end',
      'refresh',
      'live',
      'tz',
      'source',
      'monitorId',
      'monitorName',
      'monitorApp',
      'monitorInstance',
      'viewMode',
      'sourceKind',
      'edgeId'
    ] as const
  ).forEach(key => {
    const value = query[key]?.trim();
    if (value) {
      params.set(key, value);
    }
  });
}

function firstNonEmpty(...values: Array<string | undefined | null>) {
  return values.find(value => typeof value === 'string' && value.trim().length > 0)?.trim();
}

function resolveGroupLabel(group: GroupAlert | null | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = firstNonEmpty(
      group?.commonLabels?.[key],
      group?.groupLabels?.[key],
      group?.alerts?.find(alert => alert.labels?.[key])?.labels?.[key]
    );
    if (value) {
      return value;
    }
  }
  return undefined;
}

function resolveAlertClosureService(query: AlertQueryState, group: GroupAlert | null | undefined) {
  return firstNonEmpty(
    query.serviceName,
    resolveGroupLabel(group, 'service.name', 'service_name', 'serviceName'),
    resolveGroupLabel(group, 'service'),
    resolveGroupLabel(group, 'job'),
    query.search,
    query.entityName,
    query.entityId
  );
}

function resolveAlertClosureEntityId(query: AlertQueryState, group: GroupAlert | null | undefined) {
  return firstNonEmpty(
    query.entityId,
    resolveGroupLabel(group, 'hertzbeat.entity_id', 'hertzbeat_entity_id', 'entity.id', 'entity_id', 'entityId')
  );
}

function resolveAlertClosureEntityName(query: AlertQueryState, group: GroupAlert | null | undefined) {
  return firstNonEmpty(
    query.entityName,
    resolveGroupLabel(group, 'hertzbeat.entity_name', 'hertzbeat_entity_name', 'entity.name', 'entity_name', 'entityName')
  );
}

function resolveAlertClosureServiceNamespace(query: AlertQueryState, group: GroupAlert | null | undefined) {
  return firstNonEmpty(
    query.serviceNamespace,
    resolveGroupLabel(group, 'service.namespace', 'service_namespace', 'serviceNamespace')
  );
}

function resolveAlertClosureEnvironment(query: AlertQueryState, group: GroupAlert | null | undefined) {
  return firstNonEmpty(
    query.environment,
    resolveGroupLabel(group, 'deployment.environment.name', 'deployment_environment_name', 'environment', 'env')
  );
}

function resolveAlertClosureSource(query: AlertQueryState, group: GroupAlert | null | undefined) {
  return firstNonEmpty(query.source, resolveGroupLabel(group, 'hertzbeat.source', 'source')) || 'otlp';
}

function buildAlertClosureSignalContext(query: AlertQueryState, serviceName?: string, group?: GroupAlert | null): SignalRouteContext {
  const evidenceTimeContext = buildAlertEvidenceTimeContext(query, group);
  return {
    entityId: resolveAlertClosureEntityId(query, group) || undefined,
    entityName: resolveAlertClosureEntityName(query, group) || undefined,
    serviceName: serviceName || query.serviceName || undefined,
    serviceNamespace: resolveAlertClosureServiceNamespace(query, group) || undefined,
    environment: resolveAlertClosureEnvironment(query, group) || undefined,
    timeRange: evidenceTimeContext.timeRange || undefined,
    start: evidenceTimeContext.start || undefined,
    end: evidenceTimeContext.end || undefined,
    refresh: evidenceTimeContext.refresh || undefined,
    live: evidenceTimeContext.live || undefined,
    tz: evidenceTimeContext.tz || undefined,
    traceId: query.traceId || undefined,
    spanId: query.spanId || undefined,
    monitorId: query.monitorId || undefined,
    monitorName: query.monitorName || undefined,
    monitorApp: query.monitorApp || undefined,
    monitorInstance: query.monitorInstance || undefined,
    source: resolveAlertClosureSource(query, group),
    collector: query.collector || undefined,
    template: query.template || undefined,
    returnTo: stripReturnLabelFromHref(query.returnTo)
  };
}

function appendAlertEvidenceSignalContext(params: URLSearchParams, query: AlertQueryState, serviceName?: string, group?: GroupAlert | null) {
  const signalContext = buildAlertClosureSignalContext(query, serviceName, group);
  appendSignalRouteContext(params, signalContext);
}

function withOptionalQuery(pathname: string, params: URLSearchParams) {
  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function buildTopologyEvidenceHref(query: AlertQueryState, serviceName?: string, group?: GroupAlert | null) {
  const returnTo = stripReturnLabelFromHref(query.returnTo);
  const returnsToTopology = Boolean(returnTo?.startsWith('/topology'));
  const topologyHref = returnsToTopology && returnTo ? returnTo : '/topology';
  const topologyUrl = new URL(topologyHref, 'http://localhost');
  const params = topologyUrl.searchParams;

  appendAlertEvidenceSignalContext(params, query, serviceName, group);
  if (query.signal) params.set('signal', query.signal);
  if (returnsToTopology) {
    params.delete('returnTo');
  } else if (returnTo) {
    params.set('returnTo', returnTo);
  }

  params.set('viewMode', query.viewMode || params.get('viewMode') || 'resource-dependency');
  if (query.sourceKind) params.set('sourceKind', query.sourceKind);
  if (query.edgeId) params.set('edgeId', query.edgeId);

  return `${topologyUrl.pathname}${topologyUrl.search}${topologyUrl.hash}`;
}

export function buildAlertEvidenceClosureRows(
  query: AlertQueryState,
  group: GroupAlert | null | undefined,
  t: Translator
): AlertEvidenceClosureRow[] {
  const serviceName = resolveAlertClosureService(query, group);
  const signalContext = buildAlertClosureSignalContext(query, serviceName, group);
  const metricsParams = new URLSearchParams();
  const logsParams = new URLSearchParams();
  const tracesParams = new URLSearchParams();
  appendAlertEvidenceSignalContext(metricsParams, query, serviceName, group);
  appendAlertEvidenceSignalContext(logsParams, query, serviceName, group);
  appendAlertEvidenceSignalContext(tracesParams, query, serviceName, group);
  if (serviceName) {
    logsParams.set('search', `service.name = "${serviceName}"`);
  }
  const hasTraceContext = Boolean(query.traceId || query.spanId);
  if (hasTraceContext) {
    logsParams.set('view', 'list');
  }

  return [
    {
      key: 'entity',
      title: t('alert.center.evidence.entity.title'),
      copy: signalContext.entityName || signalContext.entityId || serviceName || t('alert.center.evidence.entity.fallback'),
      meta: t('alert.center.evidence.entity.meta'),
      href: buildSignalEntityHref(signalContext, serviceName)
    },
    {
      key: 'metrics',
      title: t('alert.center.evidence.metrics.title'),
      copy: serviceName || t('alert.center.evidence.metrics.fallback'),
      meta: t('alert.center.evidence.metrics.meta'),
      href: withOptionalQuery('/ingestion/otlp/metrics', metricsParams)
    },
    {
      key: 'logs',
      title: t('alert.center.evidence.logs.title'),
      copy: serviceName ? `service.name = "${serviceName}"` : t('alert.center.evidence.logs.fallback'),
      meta: hasTraceContext ? t('alert.center.evidence.logs.meta.trace') : t('alert.center.evidence.logs.meta.service'),
      href: withOptionalQuery('/log/manage', logsParams)
    },
    {
      key: 'traces',
      title: t('alert.center.evidence.traces.title'),
      copy: serviceName || t('alert.center.evidence.traces.fallback'),
      meta: hasTraceContext ? t('alert.center.evidence.traces.meta.trace') : t('alert.center.evidence.traces.meta.service'),
      href: withOptionalQuery('/trace/manage', tracesParams)
    },
    {
      key: 'topology',
      title: t('alert.center.evidence.topology.title'),
      copy: query.edgeId || serviceName || t('alert.center.evidence.topology.fallback'),
      meta: t('alert.center.evidence.topology.meta'),
      href: buildTopologyEvidenceHref(query, serviceName, group)
    }
  ];
}

export function buildAlertClosureOperationRows(
  query: AlertQueryState,
  group: GroupAlert | null | undefined,
  t: Translator
): AlertClosureOperationRow[] {
  const activeCount = Math.max(group?.alerts?.length || 0, 1);
  const target = query.entityName || query.entityId || resolveAlertClosureService(query, group) || t('alert.center.operation.target.current-alert');

  return [
    {
      key: 'acknowledge',
      label: t('alert.center.operation.acknowledge.label'),
      copy: t('alert.center.operation.acknowledge.copy', { target, count: activeCount })
    },
    {
      key: 'recover',
      label: t('alert.center.operation.recover.label'),
      copy: t('alert.center.operation.recover.copy')
    },
    {
      key: 'threshold',
      label: t('alert.center.operation.threshold.label'),
      copy: t('alert.center.operation.threshold.copy'),
      href: buildAlertRuleWorkspaceHref('setting', query, group)
    },
    {
      key: 'notice',
      label: t('alert.center.operation.notice.label'),
      copy: t('alert.center.operation.notice.copy'),
      href: buildAlertRuleWorkspaceHref('notice', query, group)
    },
    {
      key: 'group',
      label: t('alert.center.operation.group.label'),
      copy: t('alert.center.operation.group.copy'),
      href: buildAlertRuleWorkspaceHref('group', query, group)
    },
    {
      key: 'silence',
      label: t('alert.center.operation.silence.label'),
      copy: t('alert.center.operation.silence.copy'),
      href: buildAlertRuleWorkspaceHref('silence', query, group)
    },
    {
      key: 'inhibit',
      label: t('alert.center.operation.inhibit.label'),
      copy: t('alert.center.operation.inhibit.copy'),
      href: buildAlertRuleWorkspaceHref('inhibit', query, group)
    },
    {
      key: 'automation',
      label: t('alert.center.operation.automation.label'),
      copy: t('alert.center.operation.automation.copy'),
      href: buildAlertAutomationSuggestionHref(query, group)
    },
    {
      key: 'close',
      label: t('alert.center.operation.close.label'),
      copy: t('alert.center.operation.close.copy')
    }
  ];
}

export function buildAlertClosureOperationFeedback(action: AlertClosureOperationAction, t: Translator): string {
  if (action === 'acknowledge' || action === 'recover' || action === 'resolve' || action === 'unacknowledge' || action === 'reopen') {
    return t('common.notify.mark-success');
  }
  if (action === 'close' || action === 'delete') return t('common.notify.delete-success');
  return t('alert.center.operation.success');
}

export function buildAlertClosureOperationFailureFeedback(action: AlertClosureOperationAction, t: Translator): string {
  if (action === 'acknowledge' || action === 'recover' || action === 'resolve' || action === 'unacknowledge' || action === 'reopen') {
    return t('common.notify.mark-fail');
  }
  if (action === 'close' || action === 'delete') return t('common.notify.delete-fail');
  return t('common.failed');
}

export function buildAlertNoiseControlManageHref(
  ruleType: 'silence' | 'inhibit',
  query: AlertQueryState,
  summary: EntityNoiseControlSummary | undefined
): string {
  const params = new URLSearchParams();

  if (query.entityId) {
    params.set('entityId', query.entityId);
  }

  const entityName = query.entityName;
  if (entityName) {
    params.set('entityName', entityName);
  }
  const returnTo = stripReturnLabelFromHref(query.returnTo);
  if (returnTo) {
    params.set('returnTo', returnTo);
  }
  appendAlertClosureRouteContext(params, query);

  params.set('matchMode', 'entity-noise-controls');
  params.set('matchingRuleType', ruleType);

  const rules: EntityNoiseControlRule[] =
    ruleType === 'silence' ? summary?.activeSilences || [] : summary?.matchingInhibits || [];
  const matchingRuleIds = rules
    .map(rule => rule.id)
    .filter((ruleId): ruleId is number => typeof ruleId === 'number' && Number.isFinite(ruleId) && ruleId > 0);

  if (matchingRuleIds.length > 0) {
    params.set('matchingRuleIds', matchingRuleIds.join(','));
  }

  return `/alert/${ruleType}?${params.toString()}`;
}

export function buildAlertRuleWorkspaceHref(
  mode: AlertRuleWorkspaceMode,
  query: AlertQueryState,
  group?: GroupAlert | null
): string {
  const params = new URLSearchParams();
  const serviceName = resolveAlertClosureService(query, group);
  appendAlertEvidenceSignalContext(params, query, serviceName, group);
  if (query.signal) params.set('signal', query.signal);
  const returnTo = stripReturnLabelFromHref(query.returnTo);
  if (returnTo) params.set('returnTo', returnTo);
  appendAlertClosureRouteContext(params, query);
  const suffix = params.toString();
  return `/alert/${mode}${suffix ? `?${suffix}` : ''}`;
}

function buildAlertAutomationSuggestionHref(query: AlertQueryState, group?: GroupAlert | null): string {
  const params = new URLSearchParams();
  const serviceName = resolveAlertClosureService(query, group);
  appendAlertEvidenceSignalContext(params, query, serviceName, group);
  appendAlertClosureRouteContext(params, query);
  if (query.signal) params.set('signal', query.signal);
  if (query.status) params.set('status', query.status);
  if (query.severity) params.set('severity', query.severity);
  if (query.search) params.set('search', query.search);
  if (group?.id != null) params.set('alertGroupId', String(group.id));
  params.set('source', 'alert');
  return withOptionalQuery('/actions', params);
}

function severityPriority(severity?: string): number {
  switch ((severity || '').toLowerCase()) {
    case 'critical':
    case 'fatal':
    case 'emergency':
    case 'severe':
      return 5;
    case 'error':
    case 'high':
      return 4;
    case 'warning':
    case 'warn':
    case 'medium':
      return 3;
    case 'info':
    case 'low':
      return 2;
    case 'debug':
    case 'trace':
      return 1;
    default:
      return 0;
  }
}

function buildAlertStatusCopy(status: string | null | undefined, t: Translator): string {
  const normalizedStatus = status?.trim().toLowerCase();
  if (!normalizedStatus || normalizedStatus === 'firing') return t('alert.status.firing');
  if (normalizedStatus === 'acknowledged') return t('alert.status.acknowledged');
  if (normalizedStatus === 'resolved') return t('alert.status.resolved');
  return status || t('alert.status.firing');
}

function buildAlertStatusTone(status: string | null | undefined): AlertGroupCardAlert['statusTone'] {
  const normalizedStatus = status?.trim().toLowerCase();
  if (normalizedStatus === 'acknowledged') return 'warning';
  if (normalizedStatus === 'resolved') return 'success';
  if (!normalizedStatus || normalizedStatus === 'firing') return 'critical';
  return 'neutral';
}

function buildAlertGroupResponseStage(group: GroupAlert, t: Translator): string {
  const normalizedStatus = (group.status || '').trim().toLowerCase();
  if (!normalizedStatus || normalizedStatus === 'firing') {
    return t('alert.center.group.response.stage.firing');
  }
  if (normalizedStatus === 'acknowledged') {
    return t('alert.center.group.response.stage.acknowledged');
  }
  if (normalizedStatus === 'resolved') {
    return t('alert.center.group.response.stage.resolved');
  }
  return t('alert.center.group.response.stage.custom', { status: buildAlertStatusCopy(group.status, t) });
}

function buildAlertGroupEvidenceSummary(group: GroupAlert, labelCount: number, t: Translator): string {
  const alertCount = Math.max(group.alerts?.length || 0, 1);
  return t('alert.center.group.evidence.summary', {
    alertCount,
    alertUnit: t(alertCount === 1 ? 'alert.center.group.evidence.alert.singular' : 'alert.center.group.evidence.alert.plural'),
    labelCount,
    labelUnit: t(labelCount === 1 ? 'alert.center.group.evidence.label.singular' : 'alert.center.group.evidence.label.plural')
  });
}

function buildAlertGroupClosureSummary(actionLabels: string[], t: Translator): string {
  return t('alert.center.group.closure.next', { actions: actionLabels.join(' / ') });
}

function buildGroupPrimarySeverity(group: GroupAlert): string | undefined {
  return (group.alerts || [])
    .map(alert => alert.labels?.severity || alert.labels?.level || alert.labels?.priority || '')
    .filter(Boolean)
    .sort((left, right) => severityPriority(right) - severityPriority(left))[0];
}

function buildAlertGroupTriageReason(group: GroupAlert, total: number, t: Translator): string | null {
  const normalizedStatus = (group.status || '').toLowerCase();
  if (normalizedStatus === 'acknowledged') {
    return t('entity.alert.workbench.reason.acknowledged');
  }
  if (normalizedStatus === 'resolved') {
    return t('entity.alert.workbench.reason.resolved');
  }
  if (total === 1) {
    return t('entity.alert.workbench.reason.single');
  }
  const highestSeverity = buildGroupPrimarySeverity(group);
  if (highestSeverity && severityPriority(highestSeverity) >= 4) {
    return t('entity.alert.workbench.reason.high-severity', { severity: highestSeverity.toUpperCase() });
  }
  return t('entity.alert.workbench.reason.default');
}

export function buildAlertGroupActions(group: Pick<GroupAlert, 'status'>, entityContextActive: boolean, t: Translator): AlertGroupAction[] {
  if (!entityContextActive) {
    return [{ key: 'delete', label: t('alert.center.delete') }];
  }
  const normalizedStatus = (group.status || '').toLowerCase();
  if (normalizedStatus === 'acknowledged') {
    return [
      { key: 'unacknowledge', label: t('entity.alert.workbench.action.unacknowledge') },
      { key: 'resolve', label: t('entity.alert.workbench.action.resolve') },
      { key: 'silence', label: t('entity.alert.workbench.action.silence'), dialogMode: 'silence' },
      { key: 'inhibit', label: t('entity.alert.workbench.action.inhibit'), dialogMode: 'inhibit' }
    ];
  }
  if (normalizedStatus === 'resolved') {
    return [
      { key: 'reopen', label: t('entity.alert.workbench.action.reopen') },
      { key: 'silence', label: t('entity.alert.workbench.action.silence'), dialogMode: 'silence' },
      { key: 'inhibit', label: t('entity.alert.workbench.action.inhibit'), dialogMode: 'inhibit' }
    ];
  }
  return [
    { key: 'acknowledge', label: t('entity.alert.workbench.action.acknowledge') },
    { key: 'resolve', label: t('entity.alert.workbench.action.resolve') },
    { key: 'silence', label: t('entity.alert.workbench.action.silence'), dialogMode: 'silence' },
    { key: 'inhibit', label: t('entity.alert.workbench.action.inhibit'), dialogMode: 'inhibit' }
  ];
}

export function buildAlertGroupActionLabels(group: Pick<GroupAlert, 'status'>, entityContextActive: boolean, t: Translator): string[] {
  return buildAlertGroupActions(group, entityContextActive, t).map(action => action.label);
}

function buildAlertRulePreviewLabels(group: GroupAlert): AlertRulePreviewLabel[] {
  return Object.entries(group.commonLabels || group.groupLabels || {})
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .map(([key, value]) => ({ key, value }));
}

export function buildAlertRulePreviewLabelsFromText(text: string): AlertRulePreviewLabel[] {
  return text
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .flatMap(item => {
      const [key, ...rest] = item.split(':');
      const normalizedKey = key?.trim();
      if (!normalizedKey) return [];
      const value = rest.join(':').trim();
      return [{ key: normalizedKey, value: value || normalizedKey }];
    });
}

function buildPreviewLabelText(labels: AlertRulePreviewLabel[]): string {
  return labels.map(label => `${label.key}:${label.value}`).join(', ');
}

const INHIBIT_EQUAL_LABEL_ALLOW_LIST = ['alertname', 'instance', 'job', 'service', 'host', 'env'];

function buildInhibitTargetLabels(labels: AlertRulePreviewLabel[]): AlertRulePreviewLabel[] {
  return labels.filter(label => label.key.toLowerCase() !== 'severity');
}

function buildInhibitEqualLabels(labels: AlertRulePreviewLabel[]): string {
  return labels
    .map(label => label.key)
    .filter(key => INHIBIT_EQUAL_LABEL_ALLOW_LIST.includes(key))
    .join(', ');
}

function resolveAlertRuleQuickDialogSelectionCount(group: GroupAlert): number {
  if (group.groupKey === '__selected_batch__') {
    return Math.max(group.alerts?.length || 0, 1);
  }
  return 1;
}

export function buildAlertRuleQuickDialogModel(
  group: GroupAlert,
  mode: AlertRuleDialogMode,
  query: AlertQueryState,
  t: Translator
): AlertRuleQuickDialogModel {
  const previewLabels = buildAlertRulePreviewLabels(group);
  const previewLabelText = buildPreviewLabelText(previewLabels);
  const entityTitle = query.entityName || query.entityId || t('common.none');
  const ruleNameBase = query.entityName || query.serviceName || query.monitorName || query.entityId || 'entity';
  const selectionCount = resolveAlertRuleQuickDialogSelectionCount(group);
  const hasEntityId = typeof query.entityId === 'string' && query.entityId.trim().length > 0;

  if (mode === 'silence') {
    const silenceDraft = {
      ...buildAlertSilenceFormDraft(),
      name: `${ruleNameBase} silence`,
      matchAll: false,
      labelsText: previewLabelText
    };
    return {
      mode,
      title: t('entity.alert.workbench.silence.title'),
      entityTitle,
      summary: t('entity.alert.workbench.silence.selection', { count: selectionCount }),
      authoringTitle: t('entity.noise-controls.authoring.silence.title'),
      authoringCopy: previewLabels.length > 0
        ? t('entity.noise-controls.authoring.silence.prefill-success')
        : t('entity.noise-controls.authoring.silence.prefill-warning'),
      warning: !hasEntityId
        ? t('entity.noise-controls.authoring.prefill-warning.no-entity-id')
        : previewLabels.length === 0
          ? t('entity.alert.workbench.silence.warning.empty-labels')
          : null,
      previewLabels,
      targetPreviewLabels: [],
      silenceDraft
    };
  }

  const inhibitTargetPreviewLabels = buildInhibitTargetLabels(previewLabels);
  const inhibitEqualLabelText = buildInhibitEqualLabels(previewLabels);
  const hasInhibitPrefillWarning = previewLabels.length === 0 || inhibitEqualLabelText.length === 0;
  const inhibitDraft = {
    ...buildAlertInhibitFormDraft(),
    name: `${ruleNameBase} inhibit`,
    sourceLabelsText: previewLabelText,
    targetLabelsText: buildPreviewLabelText(inhibitTargetPreviewLabels),
    equalLabelsText: inhibitEqualLabelText
  };

  return {
    mode,
    title: t('entity.alert.workbench.inhibit.title'),
    entityTitle,
    summary: t('entity.alert.workbench.inhibit.selection', { count: selectionCount }),
    authoringTitle: t('entity.noise-controls.authoring.inhibit.title'),
    authoringCopy: previewLabels.length > 0
      ? t('entity.noise-controls.authoring.inhibit.prefill-success')
      : t('entity.noise-controls.authoring.inhibit.prefill-warning'),
    warning: !hasEntityId
      ? t('entity.noise-controls.authoring.prefill-warning.no-entity-id')
      : hasInhibitPrefillWarning
        ? t('entity.alert.workbench.inhibit.warning.empty-labels')
        : null,
    previewLabels,
    targetPreviewLabels: inhibitTargetPreviewLabels,
    inhibitDraft
  };
}

export function copyAlertInhibitSourceToTarget(draft: AlertInhibitFormDraft): AlertInhibitFormDraft {
  return {
    ...draft,
    targetLabelsText: draft.sourceLabelsText
  };
}

export function dropSeverityFromAlertInhibitTarget(draft: AlertInhibitFormDraft): AlertInhibitFormDraft {
  const targetLabels = buildAlertRulePreviewLabelsFromText(draft.targetLabelsText).filter(label => label.key.toLowerCase() !== 'severity');
  return {
    ...draft,
    targetLabelsText: buildPreviewLabelText(targetLabels)
  };
}

export function clearAlertInhibitTarget(draft: AlertInhibitFormDraft): AlertInhibitFormDraft {
  return {
    ...draft,
    targetLabelsText: ''
  };
}

export function clearAlertInhibitEqualLabels(draft: AlertInhibitFormDraft): AlertInhibitFormDraft {
  return {
    ...draft,
    equalLabelsText: ''
  };
}

export function buildAlertGroupCards(
  groupAlerts: PageResult<GroupAlert>,
  entityContextActive: boolean,
  t: Translator,
  formatTime: (value?: number | string | null) => string
): AlertGroupCard[] {
  return (groupAlerts.content || []).map(group => {
    const labels = Object.entries(group.groupLabels || {}).map(([key, value]) => `${key}:${value}`);
    const actions = buildAlertGroupActions(group, entityContextActive, t);
    const actionLabels = actions.map(action => action.label);
    return {
      key: String(group.id),
      labels,
      updatedAt: formatTime(group.gmtUpdate || group.gmtCreate || null),
      triageReason: entityContextActive ? buildAlertGroupTriageReason(group, groupAlerts.totalElements || groupAlerts.content.length || 0, t) : null,
      responseStage: buildAlertGroupResponseStage(group, t),
      evidenceSummary: buildAlertGroupEvidenceSummary(group, labels.length, t),
      closureSummary: buildAlertGroupClosureSummary(actionLabels, t),
      actions,
      actionLabels,
      alerts: (group.alerts || []).map(alert => {
        const normalizedStatus = (alert.status || '').toLowerCase();
        const isResolved = normalizedStatus === 'resolved';
        const timeRows = [
          alert.startAt
            ? { key: 'first' as const, label: t('alert.center.first-time'), value: formatTime(alert.startAt) }
            : null,
          (normalizedStatus === 'firing' || normalizedStatus === 'acknowledged') && alert.activeAt
            ? { key: 'last' as const, label: t('alert.center.last-time'), value: formatTime(alert.activeAt) }
            : null,
          isResolved && alert.endAt
            ? { key: 'end' as const, label: t('alert.center.end-time'), value: formatTime(alert.endAt) }
            : null
        ].filter((row): row is { key: 'first' | 'last' | 'end'; label: string; value: string } => row != null);

        return {
          key: String(alert.id),
          title: alert.content || alert.annotations?.summary || t('alert.center.default-title'),
          status: buildAlertStatusCopy(alert.status, t),
          statusTone: buildAlertStatusTone(alert.status),
          timeLabel: isResolved ? t('alert.center.end-time') : t('alert.center.last-time'),
          timeValue: formatTime(isResolved ? alert.endAt || alert.startAt || null : alert.activeAt || alert.startAt || null),
          triggerSummary:
            typeof alert.triggerTimes === 'number' && alert.triggerTimes > 0
              ? t('alert.center.time.tip', { times: alert.triggerTimes })
              : undefined,
          labels: Object.entries(alert.labels || {}).map(([key, value]) => `${key}:${String(value)}`),
          annotations: Object.entries(alert.annotations || {})
            .filter(([, value]) => value != null && String(value).trim().length > 0)
            .map(([key, value]) => ({ key, value: String(value) })),
          timeRows
        };
      })
    };
  });
}
