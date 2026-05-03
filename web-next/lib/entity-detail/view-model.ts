import type { EntityDetailDto } from '@/lib/types';
import { buildCollectorHealthEvidence } from '../collector-health-evidence';
import { buildSignalEntityContextRows, type SignalEntityContextRow, type SignalRouteContext } from '../signal-route-context';

type DetailRow = {
  title: string;
  copy: string;
  freshness?: string;
  href?: string;
  meta: string;
};

type HandoffRow = DetailRow & {
  key: string;
};

export type EntityIncomingContextRow = SignalEntityContextRow;

type AttributionState = 'ready' | 'review' | 'missing';

type AttributionRow = DetailRow & {
  key: 'traditional-monitor' | 'otlp-attribution' | 'candidate-confirmation' | 'missing-diagnostics';
  state: AttributionState;
};

function localizeStatus(status?: string | null) {
  const normalized = status?.trim();
  if (!normalized) {
    return '-';
  }

  switch (normalized.toLowerCase()) {
    case 'healthy':
    case 'normal':
    case 'up':
    case 'active':
      return '健康';
    case 'unknown':
      return '未知';
    case 'down':
    case 'critical':
    case 'error':
      return '异常';
    case 'warning':
      return '告警';
    default:
      return normalized;
  }
}

export function buildDetailFacts(entity: { id?: number | string | null; type?: string | null; status?: string | null; owner?: string | null }) {
  return [
    { label: '实体 ID', value: String(entity.id || '-') },
    { label: '类型', value: entity.type || '-' },
    { label: '状态', value: localizeStatus(entity.status) },
    { label: '负责人', value: entity.owner || '-' }
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
  _detail: Pick<EntityDetailDto, 'activeAlerts' | 'boundMonitors' | 'nextActions'>
) {
  return [
    { title: '状态', copy: localizeStatus(entity.status), meta: entity.type || '-' },
    { title: '负责人', copy: entity.owner || '-', meta: entity.system || '-' },
    { title: '环境', copy: entity.environment || '-', meta: entity.namespace || '-' },
    { title: '描述', copy: entity.description || '-', meta: entity.source || '-' }
  ];
}

function formatCount(value: number, unit: string) {
  return `${value} ${unit}`;
}

function localizeActionText(value?: string | null, fallback = '-') {
  const normalized = value?.trim();
  if (!normalized) {
    return fallback;
  }

  switch (normalized) {
    case 'Open monitors':
      return '打开监控';
    case 'Open discovery':
      return '打开发现';
    case 'Open definition':
    case 'Open definition workspace':
      return '打开定义';
    case 'Inspect abnormal monitors first.':
    case 'Inspect the abnormal monitors first.':
      return '先检查异常监控。';
    case 'Add more evidence before triage.':
      return '先补充更多证据。';
    case 'Review the definition shell before adding ownership or evidence.':
      return '先检查定义工作台，再补齐归属和证据。';
    case 'Next action':
      return '下一步动作';
    case 'server guidance':
      return '服务端建议';
    default:
      return normalized;
  }
}

export function buildSummaryRows(
  detail: Pick<EntityDetailDto, 'evidenceSummary' | 'monitorSummary' | 'logSummary' | 'traceSummary' | 'boundMonitors'>
) {
  const boundMonitorCount = detail.monitorSummary?.totalBoundMonitors ?? detail.boundMonitors?.length ?? 0;
  const downMonitorCount = detail.evidenceSummary?.downMonitorCount ?? 0;
  const logHintCount = detail.logSummary?.hintCount ?? 0;
  const traceCount = detail.traceSummary?.recentTraceCount ?? 0;
  const errorTraceCount = detail.traceSummary?.recentErrorTraceCount ?? 0;

  return [
    {
      title: '关联指标',
      copy: formatCount(boundMonitorCount, '个绑定监控'),
      meta: downMonitorCount > 0 ? formatCount(downMonitorCount, '个异常监控') : '暂无异常监控'
    },
    {
      title: '关联日志',
      copy: logHintCount > 0 ? `${formatCount(logHintCount, '条查询线索')}可用` : '暂无查询线索',
      meta: detail.logSummary?.preferredQueryTitle || detail.logSummary?.fallbackSearchTerm || '-'
    },
    {
      title: '关联链路',
      copy: formatCount(traceCount, '条近期链路'),
      meta: errorTraceCount > 0 ? formatCount(errorTraceCount, '条错误链路') : '暂无错误链路'
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

function formatLatency(traceSummary: EntityDetailDto['traceSummary']) {
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
    return { copy: '暂无链路延迟', meta: '等待 OTLP Span' };
  }

  if (normalizedMs >= 1000) {
    return { copy: `${(normalizedMs / 1000).toFixed(1)} s`, meta: '链路延迟' };
  }

  return { copy: `${Math.round(normalizedMs)} ms`, meta: '链路延迟' };
}

export function buildEntityHealthModel(detail: EntityDetailDto): DetailRow[] {
  const totalBoundMonitors = finiteNumber(
    detail.monitorSummary?.totalBoundMonitors ?? detail.boundMonitors?.length ?? detail.entity?.monitorBinds?.length,
    0
  );
  const downMonitorCount = finiteNumber(detail.evidenceSummary?.downMonitorCount, 0);
  const healthyMonitorCount = Math.max(
    0,
    Math.min(totalBoundMonitors, finiteNumber(detail.evidenceSummary?.healthyMonitorCount, totalBoundMonitors - downMonitorCount))
  );
  const recentTraceCount = finiteNumber(detail.traceSummary?.recentTraceCount, 0);
  const recentErrorTraceCount = finiteNumber(detail.traceSummary?.recentErrorTraceCount, 0);
  const activeAlertCount = finiteNumber(
    detail.alertSummary?.totalActiveAlerts ?? detail.activeAlerts?.length ?? detail.evidenceSummary?.activeAlertCount,
    0
  );
  const logHintCount = finiteNumber(detail.logSummary?.hintCount ?? detail.evidenceSummary?.logHintCount, 0);
  const availabilityRatio = totalBoundMonitors > 0 ? healthyMonitorCount / totalBoundMonitors : 0;
  const errorRate = recentTraceCount > 0 ? recentErrorTraceCount / recentTraceCount : 0;
  const recentAnomalyCount = downMonitorCount + recentErrorTraceCount + logHintCount;
  const latency = formatLatency(detail.traceSummary);
  const collectorEvidence = buildCollectorHealthEvidence({
    healthyMonitorCount,
    lastEvidenceLabel: detail.evidenceSummary?.lastEvidenceAt == null ? null : String(detail.evidenceSummary.lastEvidenceAt),
    lastSeenLabel: detail.evidenceSummary?.collectorLastSeenAt == null ? null : String(detail.evidenceSummary.collectorLastSeenAt),
    offlineCollectorCount: detail.evidenceSummary?.collectorOfflineCount,
    onlineCollectorCount: detail.evidenceSummary?.collectorOnlineCount,
    taskCount: detail.evidenceSummary?.collectorTaskCount,
    totalBoundMonitors,
    totalCollectorCount: detail.evidenceSummary?.collectorTotalCount
  });
  const collectorHandoff = withQuery('/setting/collector', buildContextParams(detail, 'last-1h'));
  const score = clampScore(
    100 -
      (totalBoundMonitors > 0 ? (downMonitorCount / totalBoundMonitors) * 30 : 10) -
      errorRate * 20 -
      Math.min(activeAlertCount * 8, 24) -
      Math.min(logHintCount * 2, 10)
  );

  return [
    { title: '健康评分', copy: `${score} / 100`, meta: '轻量健康模型' },
    {
      title: '可用性',
      copy: totalBoundMonitors > 0 ? formatPercent(availabilityRatio) : '等待监控模板',
      meta: totalBoundMonitors > 0 ? `${healthyMonitorCount} / ${totalBoundMonitors} 监控健康` : '暂无绑定监控'
    },
    {
      title: '错误率',
      copy: recentTraceCount > 0 ? formatPercent(errorRate) : '暂无链路样本',
      meta: recentTraceCount > 0 ? `${recentErrorTraceCount} / ${recentTraceCount} 错误链路` : '等待链路上报'
    },
    { title: '延迟', copy: latency.copy, meta: latency.meta },
    { title: '当前告警', copy: `${activeAlertCount} 个活跃告警`, meta: '告警闭环' },
    {
      title: '最近异常',
      copy: `${recentAnomalyCount} 个异常线索`,
      meta: `监控 ${downMonitorCount} · 链路 ${recentErrorTraceCount} · 日志 ${logHintCount}`
    },
    {
      title: '采集健康',
      copy: collectorEvidence.copy,
      freshness: collectorEvidence.freshness,
      meta: collectorEvidence.meta,
      ...(collectorHandoff ? { href: collectorHandoff } : {})
    }
  ];
}

export function buildNextActionRows(
  detail: Pick<EntityDetailDto, 'nextActions'>,
  entityId: string | number | null | undefined
) {
  const actions = (detail.nextActions || [])
    .filter(action => action?.title || action?.summary || action?.actionLabel)
    .map(action => ({
      title: localizeActionText(action.title || action.actionLabel, '下一步动作'),
      copy: localizeActionText(action.summary, '-'),
      meta: localizeActionText(action.actionLabel || action.actionType, '服务端建议')
    }));

  return actions.length > 0 ? actions : buildDrilldownRows(entityId);
}

export function buildDrilldownRows(entityId: string | number | null | undefined) {
  const id = entityId ? String(entityId) : null;
  return [
    { title: '定义工作台', copy: id ? `/entities/${id}/definition` : '-', meta: '下一步路由' },
    { title: '编辑实体', copy: id ? `/entities/${id}/edit` : '-', meta: '下一步路由' },
    { title: '遥测发现', copy: '/entities/discovery', meta: '共享路由' }
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

function resolveEntityTimeContext(context: EntityDetailTimeContext | undefined): SignalRouteContext {
  if (!context) return { timeRange: 'last-1h' };
  return typeof context === 'string' ? { timeRange: context } : context;
}

function hasExplicitRouteContext(context: SignalRouteContext | undefined) {
  return Boolean(context && Object.values(context).some(value => normalizeContextText(value)));
}

export function buildEntityIncomingContextRows(routeContext?: SignalRouteContext): EntityIncomingContextRow[] {
  if (!hasExplicitRouteContext(routeContext)) return [];
  const hasTimeContext = Boolean(routeContext?.timeRange || routeContext?.start || routeContext?.end || routeContext?.refresh || routeContext?.live || routeContext?.tz);
  const hasSourceContext = Boolean(routeContext?.source || routeContext?.collector || routeContext?.template);

  return buildSignalEntityContextRows(routeContext || {}).filter(row => {
    if (row.label === '当前实体') return false;
    if (row.label === '当前服务' || row.label === '当前环境') return row.value !== '-';
    if (row.label === '时间范围') return hasTimeContext;
    if (row.label === '采集来源') return hasSourceContext;
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
  const traceSummary = detail.traceSummary as (EntityDetailDto['traceSummary'] & { latestSpanId?: string | null }) | undefined;
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

export function buildEntityContextHandoffLinks(detail: EntityDetailDto, timeContext: EntityDetailTimeContext = 'last-1h'): HandoffRow[] {
  const entity = getEntityRecord(detail);
  const entityId = entity.id != null ? String(entity.id) : '';
  const shared = buildContextParams(detail, timeContext);
  const sharedWithTrace = buildContextParams(detail, timeContext, { includeTrace: true });
  const monitorQuery = buildContextParams(detail, timeContext, { includeEntityName: true, includeReturnTo: true });

  return [
    {
      key: 'metrics',
      title: '关联指标',
      copy: withQuery('/ingestion/otlp/metrics', shared),
      meta: '指标工作台'
    },
    {
      key: 'logs',
      title: '关联日志',
      copy: withQuery('/log/manage', sharedWithTrace),
      meta: '日志工作台'
    },
    {
      key: 'traces',
      title: '关联链路',
      copy: withQuery('/trace/manage', sharedWithTrace),
      meta: '链路工作台'
    },
    {
      key: 'alerts',
      title: '告警规则',
      copy: withQuery('/alert/setting', shared),
      meta: '阈值规则'
    },
    {
      key: 'monitors',
      title: '绑定监控',
      copy: withQuery('/monitors', monitorQuery),
      meta: '监控对象'
    },
    {
      key: 'topology',
      title: '上下游拓扑',
      copy: withQuery('/topology', shared),
      meta: '关系图'
    },
    {
      key: 'template',
      title: '模板绑定',
      copy: withQuery(entityId ? `/entities/${entityId}/definition` : '/entities', shared),
      meta: '监控模板'
    }
  ];
}

function recordLabelSummary(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '-';
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return '-';
  return entries.slice(0, 2).map(([key, entryValue]) => `${key}=${String(entryValue)}`).join(', ');
}

export function buildCurrentAlertRows(detail: EntityDetailDto): DetailRow[] {
  const alerts = (detail.activeAlerts || []) as Array<Record<string, unknown>>;

  if (alerts.length === 0) {
    return [
      {
        title: '当前告警',
        copy: '暂无活跃告警',
        meta: `${detail.alertSummary?.totalActiveAlerts ?? 0} 个活跃`
      }
    ];
  }

  return alerts.map((alert, index) => {
    const alertId = alert.id ?? index + 1;
    const status = String(alert.status || alert.state || 'firing');
    const labelSummary = recordLabelSummary(alert.labels);
    return {
      title: `当前告警 #${alertId}`,
      copy: String(alert.content || alert.summary || alert.name || alert.annotations || '告警待处理'),
      meta: labelSummary === '-' ? status : `${status} · ${labelSummary}`
    };
  });
}

export function buildRelationshipRows(detail: EntityDetailDto): DetailRow[] {
  const relations = (detail.entity?.relations || []) as Array<Record<string, unknown>>;

  if (relations.length === 0) {
    return [{ title: '上下游关系', copy: '暂无关系数据', meta: '等待拓扑归并' }];
  }

  return relations.map(relation => ({
    title: String(relation.type || relation.relationType || 'related'),
    copy: String(relation.targetEntityName || relation.targetName || relation.targetEntityId || '未知目标'),
    meta: relation.targetEntityId != null ? String(relation.targetEntityId) : '上下游关系'
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

function entityDisplayName(detail: EntityDetailDto) {
  const entity = getEntityRecord(detail);
  return String(entity.displayName || entity.name || entity.id || '实体详情');
}

export function buildEntityAttributionRows(detail: EntityDetailDto): AttributionRow[] {
  const identities = detail.entity?.identities || [];
  const monitorBinds = detail.entity?.monitorBinds || [];
  const hasIdentities = identities.length > 0;
  const hasMonitorBinds = monitorBinds.length > 0;
  const hasAnyAttribution = hasIdentities || hasMonitorBinds;
  const missingParts = [
    ...(hasIdentities ? [] : ['身份标识']),
    ...(hasMonitorBinds ? [] : ['监控绑定'])
  ];
  const diagnosticState: AttributionState = missingParts.length === 0 ? 'ready' : hasAnyAttribution ? 'review' : 'missing';

  return [
    {
      key: 'traditional-monitor',
      state: hasMonitorBinds ? 'ready' : 'missing',
      title: '传统监控绑定',
      copy: `${monitorBinds.length} 个绑定`,
      meta: hasMonitorBinds ? templateSummary(monitorBinds) : '等待监控模板'
    },
    {
      key: 'otlp-attribution',
      state: hasIdentities ? 'ready' : 'missing',
      title: 'OTLP 归因',
      copy: hasIdentities ? `${identities.length} 个身份` : '缺少身份',
      meta: hasIdentities ? identitySummary(identities) : '等待 hertzbeat.entity_id 或 service.name'
    },
    {
      key: 'candidate-confirmation',
      state: hasAnyAttribution ? 'ready' : 'review',
      title: '候选确认',
      copy: hasAnyAttribution ? '已归入实体' : '待确认',
      meta: hasAnyAttribution ? entityDisplayName(detail) : '进入遥测发现确认候选'
    },
    {
      key: 'missing-diagnostics',
      state: diagnosticState,
      title: '归因诊断',
      copy: missingParts.length === 0 ? '归因证据完整' : hasAnyAttribution ? '归因证据不完整' : '需要补齐归因',
      meta: missingParts.length === 0 ? '可进入对象详情' : `缺少${missingParts.join('、')}`
    }
  ];
}

export function buildCollectionSourceRows(detail: EntityDetailDto): DetailRow[] {
  const entity = getEntityRecord(detail);
  const identities = detail.entity?.identities || [];
  const monitorBinds = detail.entity?.monitorBinds || [];
  const labels = entity.labels || {};

  return [
    { title: '采集来源', copy: entity.source || 'manual', meta: '实体来源' },
    { title: '身份标识', copy: `${identities.length} 个身份`, meta: identitySummary(identities) },
    { title: '模板绑定', copy: `${monitorBinds.length} 个绑定`, meta: templateSummary(monitorBinds) },
    { title: '标签', copy: `${Object.keys(labels).length} 个标签`, meta: recordLabelSummary(labels) }
  ];
}
