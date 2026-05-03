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
  timeLabel: string;
  timeValue: string;
  triggerSummary?: string;
  labels: string[];
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

export function buildAlertRows(
  alerts: PageResult<SingleAlert>,
  t: Translator,
  severityLabel: (alert: SingleAlert) => string,
  statusLabel: (status: string | null | undefined) => string,
  formatTime: (value?: number | string | null) => string,
  defaultAlertTitle: string
): AlertRow[] {
  return (alerts.content || []).map(alert => ({
    key: String(alert.id),
    title: alert.content || alert.annotations?.summary || defaultAlertTitle,
    copy: `${alert.labels?.service || alert.labels?.job || alert.labels?.instance || '-'} · ${statusLabel(alert.status)}`,
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
  if (!selectedAlert) {
    return [
      {
        title: t('alert.center.selected.empty.title'),
        copy: t('alert.center.selected.empty.copy'),
        meta: '-'
      }
    ];
  }

  return [
    {
      title: selectedAlert.content || selectedAlert.annotations?.summary || defaultAlertTitle,
      copy: `${selectedAlert.labels?.service || selectedAlert.labels?.job || selectedAlert.labels?.instance || '-'} · ${statusLabel(selectedAlert.status)}`,
      meta: severityLabel(selectedAlert)
    },
    {
      title: t('alert.center.selected.fingerprint'),
      copy: `${selectedAlert.fingerprint || '-'} · ${selectedAlert.creator || '-'}`,
      meta: `${t('common.updated')} ${formatTime(selectedAlert.gmtUpdate || selectedAlert.gmtCreate || null)}`
    },
    {
      title: t('alert.center.selected.trigger-window'),
      copy: `${selectedAlert.triggerTimes || 0} ${t('alert.center.selected.triggers')} · ${formatTime(selectedAlert.startAt || selectedAlert.activeAt || null)}`,
      meta: `${t('common.end')} ${formatTime(selectedAlert.endAt || selectedAlert.startAt || selectedAlert.activeAt || null)}`
    }
  ];
}

function isChineseTranslator(t: Translator): boolean {
  return t('common.refresh') === '刷新' || t('alert.workbench.kicker') === '告警中心';
}

function buildEntityContextStatusLabel(status: string, t: Translator): string {
  const normalizedStatus = status.trim().toLowerCase();
  if (normalizedStatus === 'firing') return t('alert.status.firing');
  if (normalizedStatus === 'acknowledged') return t('alert.status.acknowledged');
  if (normalizedStatus === 'resolved') return t('alert.status.resolved');
  return status;
}

function buildEntityContextSeverityLabel(severity: string, t: Translator): string {
  const normalizedSeverity = severity.trim().toLowerCase();
  const chinese = isChineseTranslator(t);

  if (normalizedSeverity === 'critical') return t('alert.center.metrics.critical');
  if (normalizedSeverity === 'warning' || normalizedSeverity === 'warn') return t('alert.center.metrics.warning');
  if (normalizedSeverity === 'emergency' || normalizedSeverity === 'fatal') return t('alert.center.metrics.emergency');
  if (normalizedSeverity === 'error') return chinese ? '错误' : 'Error';
  if (normalizedSeverity === 'info') return chinese ? '信息' : 'Info';
  if (normalizedSeverity === 'unknown') return chinese ? '未知' : 'Unknown';

  return severity;
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

function formatAlertRefresh(value: string): string {
  const normalized = normalizeAlertContextValue(value);
  if (!normalized) {
    return '';
  }
  if (/^\d+$/.test(normalized)) {
    return `${normalized}s`;
  }
  return normalized;
}

function buildAlertSourceCopy(source: string, chinese: boolean): { copy: string; meta: string } {
  const normalized = source.trim().toLowerCase();
  if (normalized === 'monitor') {
    return {
      copy: chinese ? '传统监控' : 'Traditional monitor',
      meta: chinese ? '监控中心上下文' : 'Monitor center context'
    };
  }
  if (normalized === 'topology') {
    return {
      copy: chinese ? '拓扑' : 'Topology',
      meta: chinese ? '拓扑影响面上下文' : 'Topology impact context'
    };
  }
  if (normalized === 'otlp') {
    return {
      copy: chinese ? 'OTLP 三信号' : 'OTLP signals',
      meta: chinese ? '指标、日志和链路上下文' : 'Metric, log, and trace context'
    };
  }
  if (normalized === 'alert' || normalized.startsWith('alert:')) {
    return {
      copy: chinese ? '告警事件' : 'Alert event',
      meta: chinese ? '告警证据上下文' : 'Alert evidence context'
    };
  }
  return {
    copy: source,
    meta: chinese ? '继承的证据来源' : 'Inherited evidence source'
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
      refresh ? `${chinese ? '刷新' : 'Refresh'} ${formatAlertRefresh(refresh)}` : '',
      live ? (live.toLowerCase() === 'false' ? (chinese ? '已暂停' : 'paused') : (chinese ? '实时' : 'live')) : '',
      timezone
    ].filter(Boolean);

    rows.push({
      key: 'time',
      title: chinese ? '时间范围' : 'Time range',
      copy: timeRange || bounds || (chinese ? '继承时间窗口' : 'Inherited time window'),
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
      title: chinese ? '监控实例' : 'Monitor',
      copy: monitorName || monitorInstance || monitorId,
      meta: [monitorApp, monitorInstance, monitorId ? `monitorId ${monitorId}` : ''].filter(Boolean).join(' · ')
    });
  }

  const source = normalizeAlertContextValue(query.source);
  if (source) {
    const sourceCopy = buildAlertSourceCopy(source, chinese);
    rows.push({
      key: 'source',
      title: chinese ? '采集来源' : 'Source',
      copy: sourceCopy.copy,
      meta: sourceCopy.meta
    });
  }

  const traceId = normalizeAlertContextValue(query.traceId);
  const spanId = normalizeAlertContextValue(query.spanId);
  if (traceId || spanId) {
    rows.push({
      key: 'trace',
      title: chinese ? '链路上下文' : 'Trace context',
      copy: traceId || spanId,
      meta: spanId ? `spanId ${spanId}` : (chinese ? 'traceId 继承' : 'traceId inherited')
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
      suppressed && summary.activeSilenceCount === 0
        ? t('entity.detail.noise-controls.manage-silence-create')
        : t('entity.detail.noise-controls.manage-silence'),
    inhibitActionLabel:
      suppressed && summary.matchingInhibitCount === 0
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

function resolveGroupLabel(group: GroupAlert | null | undefined, key: string) {
  return firstNonEmpty(
    group?.commonLabels?.[key],
    group?.groupLabels?.[key],
    group?.alerts?.find(alert => alert.labels?.[key])?.labels?.[key]
  );
}

function resolveAlertClosureService(query: AlertQueryState, group: GroupAlert | null | undefined) {
  return firstNonEmpty(
    query.serviceName,
    resolveGroupLabel(group, 'service'),
    resolveGroupLabel(group, 'job'),
    query.search,
    query.entityName,
    query.entityId
  );
}

function buildAlertClosureSignalContext(query: AlertQueryState, serviceName?: string, group?: GroupAlert | null): SignalRouteContext {
  const evidenceTimeContext = buildAlertEvidenceTimeContext(query, group);
  return {
    entityId: query.entityId || undefined,
    entityName: query.entityName || undefined,
    serviceName: serviceName || query.serviceName || undefined,
    serviceNamespace: query.serviceNamespace || undefined,
    environment: query.environment || undefined,
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
    source: query.source || 'otlp',
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
  const returnsToTopology = returnTo?.startsWith('/topology');
  const topologyUrl = new URL(returnsToTopology ? returnTo : '/topology', 'http://localhost');
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
  const chinese = isChineseTranslator(t);
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
      title: chinese ? '实体详情' : 'Entity detail',
      copy: query.entityName || query.entityId || serviceName || (chinese ? '按服务名查找实体' : 'Search entity by service'),
      meta: chinese ? '确认告警影响的 HertzBeat 实体' : 'Open the HertzBeat entity affected by this alert',
      href: buildSignalEntityHref(signalContext, serviceName)
    },
    {
      key: 'metrics',
      title: chinese ? '指标证据' : 'Metric evidence',
      copy: serviceName || (chinese ? '按告警上下文查看指标' : 'Inspect metrics by alert context'),
      meta: chinese ? '查看同一服务、实体和时间范围的指标' : 'Inspect metrics in the same service, entity, and time range',
      href: withOptionalQuery('/ingestion/otlp/metrics', metricsParams)
    },
    {
      key: 'logs',
      title: chinese ? '日志证据' : 'Log evidence',
      copy: serviceName ? `service.name = "${serviceName}"` : (chinese ? '按告警上下文查看日志' : 'Inspect logs by alert context'),
      meta: hasTraceContext
        ? chinese
          ? '按 traceId/spanId 查看相关日志'
          : 'Inspect logs by traceId/spanId'
        : chinese
          ? '查看同一服务的日志和链路字段'
          : 'Inspect logs and trace fields for the same service',
      href: withOptionalQuery('/log/manage', logsParams)
    },
    {
      key: 'traces',
      title: chinese ? '链路证据' : 'Trace evidence',
      copy: serviceName || (chinese ? '按告警上下文查看链路' : 'Inspect traces by alert context'),
      meta: hasTraceContext
        ? chinese
          ? '打开同一 traceId/spanId 的链路证据'
          : 'Open trace evidence by traceId/spanId'
        : chinese
          ? '查看同一服务的调用耗时和错误跨度'
          : 'Inspect latency and error spans for the same service',
      href: withOptionalQuery('/trace/manage', tracesParams)
    },
    {
      key: 'topology',
      title: chinese ? '拓扑影响面' : 'Topology impact',
      copy: query.edgeId || serviceName || (chinese ? '查看依赖影响' : 'Inspect dependency impact'),
      meta: chinese ? '返回依赖关系，确认上下游影响范围' : 'Return to dependencies and confirm blast radius',
      href: buildTopologyEvidenceHref(query, serviceName, group)
    }
  ];
}

export function buildAlertClosureOperationRows(
  query: AlertQueryState,
  group: GroupAlert | null | undefined,
  t: Translator
): AlertClosureOperationRow[] {
  const chinese = isChineseTranslator(t);
  const activeCount = Math.max(group?.alerts?.length || 0, 1);
  const target = query.entityName || query.entityId || resolveAlertClosureService(query, group) || (chinese ? '当前告警' : 'current alert');

  return [
    {
      key: 'acknowledge',
      label: chinese ? '确认告警' : 'Acknowledge',
      copy: chinese ? `先确认 ${target} 的 ${activeCount} 条告警已被接手。` : `Mark ${activeCount} alert(s) for ${target} as owned.`
    },
    {
      key: 'recover',
      label: chinese ? '标记已恢复' : 'Mark recovered',
      copy: chinese ? '恢复后继续保留证据，便于复盘。' : 'Keep the evidence bundle after recovery for review.'
    },
    {
      key: 'threshold',
      label: chinese ? '创建阈值规则' : 'Create threshold rule',
      copy: chinese ? '把当前实体和信号上下文带入阈值规则。' : 'Carry this entity and signal context into threshold rules.',
      href: buildAlertRuleWorkspaceHref('setting', query, group)
    },
    {
      key: 'notice',
      label: chinese ? '配置通知策略' : 'Configure notification policy',
      copy: chinese ? '按当前实体和标签收敛通知路由。' : 'Route notifications from the current entity and labels.',
      href: buildAlertRuleWorkspaceHref('notice', query, group)
    },
    {
      key: 'group',
      label: chinese ? '配置分组收敛' : 'Configure grouping',
      copy: chinese ? '按稳定实体、服务和环境标签收敛告警组。' : 'Group alerts by stable entity, service, and environment labels.',
      href: buildAlertRuleWorkspaceHref('group', query, group)
    },
    {
      key: 'silence',
      label: chinese ? '创建静默' : 'Create silence',
      copy: chinese ? '为当前标签创建临时静默。' : 'Create a temporary silence from current labels.',
      href: buildAlertRuleWorkspaceHref('silence', query, group)
    },
    {
      key: 'inhibit',
      label: chinese ? '创建抑制' : 'Create inhibit',
      copy: chinese ? '用当前标签创建主从告警抑制。' : 'Create inhibit rules from the current labels.',
      href: buildAlertRuleWorkspaceHref('inhibit', query, group)
    },
    {
      key: 'automation',
      label: chinese ? '建议自动化动作' : 'Suggest automation',
      copy: chinese ? '带当前证据进入动作建议，人工确认后执行。' : 'Carry this evidence into suggested actions with human confirmation.',
      href: buildAlertAutomationSuggestionHref(query, group)
    },
    {
      key: 'close',
      label: chinese ? '关闭告警' : 'Close alert',
      copy: chinese ? '确认问题已处理后关闭本轮告警。' : 'Close this alert cycle after handling the issue.'
    }
  ];
}

export function buildAlertClosureOperationFeedback(action: AlertClosureOperationAction, t: Translator): string {
  if (action === 'acknowledge') return t('alert.center.operation.success.acknowledge');
  if (action === 'recover' || action === 'resolve') return t('alert.center.operation.success.recover');
  if (action === 'unacknowledge' || action === 'reopen') return t('alert.center.operation.success.reopen');
  if (action === 'close' || action === 'delete') return t('alert.center.operation.success.close');
  return t('alert.center.operation.success');
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

function formatResponseCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildAlertGroupResponseStage(group: GroupAlert, t: Translator): string {
  const chinese = isChineseTranslator(t);
  const normalizedStatus = (group.status || '').trim().toLowerCase();
  if (!normalizedStatus || normalizedStatus === 'firing') {
    return chinese ? '处置状态: 待确认' : 'Response state: Needs acknowledgement';
  }
  if (normalizedStatus === 'acknowledged') {
    return chinese ? '处置状态: 已接手' : 'Response state: Acknowledged';
  }
  if (normalizedStatus === 'resolved') {
    return chinese ? '处置状态: 已恢复' : 'Response state: Recovered';
  }
  return chinese ? `处置状态: ${buildAlertStatusCopy(group.status, t)}` : `Response state: ${buildAlertStatusCopy(group.status, t)}`;
}

function buildAlertGroupEvidenceSummary(group: GroupAlert, labelCount: number, t: Translator): string {
  const chinese = isChineseTranslator(t);
  const alertCount = Math.max(group.alerts?.length || 0, 1);
  if (chinese) {
    return `证据: ${alertCount} 条告警 · ${labelCount} 个标签`;
  }
  return `Evidence: ${formatResponseCount(alertCount, 'alert', 'alerts')} · ${formatResponseCount(labelCount, 'label', 'labels')}`;
}

function buildAlertGroupClosureSummary(actionLabels: string[], t: Translator): string {
  return `${isChineseTranslator(t) ? '下一步' : 'Next'}: ${actionLabels.join(' / ')}`;
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

function buildPreviewEqualLabels(labels: AlertRulePreviewLabel[]): string {
  return labels.map(label => label.key).join(', ');
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
  const selectionCount = Math.max(group.alerts?.length || 0, 1);
  const hasEntityId = typeof query.entityId === 'string' && query.entityId.trim().length > 0;

  if (mode === 'silence') {
    const silenceDraft = {
      ...buildAlertSilenceFormDraft(),
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

  const inhibitDraft = {
    ...buildAlertInhibitFormDraft(),
    sourceLabelsText: previewLabelText,
    targetLabelsText: previewLabelText,
    equalLabelsText: buildPreviewEqualLabels(previewLabels)
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
      : previewLabels.length === 0
        ? t('entity.alert.workbench.inhibit.warning.empty-labels')
        : null,
    previewLabels,
    targetPreviewLabels: previewLabels,
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
      return {
        key: String(alert.id),
        title: alert.content || alert.annotations?.summary || t('alert.center.default-title'),
        status: buildAlertStatusCopy(alert.status, t),
        timeLabel: isResolved ? t('alert.center.end-time') : t('alert.center.last-time'),
        timeValue: formatTime(isResolved ? alert.endAt || alert.startAt || null : alert.activeAt || alert.startAt || null),
        triggerSummary:
          typeof alert.triggerTimes === 'number' && alert.triggerTimes > 0
            ? t('alert.center.time.tip', { times: alert.triggerTimes })
            : undefined,
        labels: Object.entries(alert.labels || {}).map(([key, value]) => `${key}:${String(value)}`)
      };
    })
    };
  });
}
