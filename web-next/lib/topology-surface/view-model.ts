import {
  appendSignalRouteContext,
  buildSignalAlertRulesHref,
  buildSignalEntityContextRows,
  buildSignalEntityHref,
  type SignalEntityContextRow,
  type SignalRouteContext
} from '../signal-route-context';
import { buildLightweightEntityHealthAffordance, type LightweightEntityHealthAffordance } from '../entity-health-affordance';
import type { TranslationParams } from '../i18n';

export type TopologySourceKind =
  | 'otlp-trace-call'
  | 'monitor-ownership'
  | 'template-dependency'
  | 'k8s-workload'
  | 'database-middleware-connection'
  | 'cmdb-manual-label'
  | 'alert-impact';

export type TopologyViewModeKey = 'application' | 'service-call' | 'resource-dependency' | 'alert-impact';

export type TopologySignalKey = 'metrics' | 'logs' | 'traces' | 'alerts';

export type TopologyHealth = 'healthy' | 'warning' | 'critical';

const TOPOLOGY_PRODUCT_IDENTITY = 'HertzBeat 企业运维拓扑';
const TOPOLOGY_TIME_RANGE = 'last-1h';
const TOPOLOGY_DEFAULT_ENVIRONMENT = 'prod';
const TOPOLOGY_VIEW_MODES: TopologyViewModeKey[] = ['application', 'service-call', 'resource-dependency', 'alert-impact'];
const TOPOLOGY_SOURCE_KINDS: TopologySourceKind[] = [
  'otlp-trace-call',
  'monitor-ownership',
  'template-dependency',
  'k8s-workload',
  'database-middleware-connection',
  'cmdb-manual-label',
  'alert-impact'
];

type Translator = (key: string, params?: TranslationParams) => string;

function translateTopology(t: Translator | undefined, key: string, fallback: string, params?: TranslationParams) {
  if (!t) return fallback;
  const value = t(key, params);
  return value && value !== key ? value : fallback;
}

export type TopologySource = {
  kind: TopologySourceKind;
  label: string;
  copy: string;
  active: boolean;
  href: string;
};

export type TopologyViewMode = {
  key: TopologyViewModeKey;
  label: string;
  copy: string;
  active: boolean;
  href: string;
};

export type TopologyNodeLinks = {
  entityHref: string;
  metricsHref: string;
  logsHref: string;
  tracesHref: string;
  alertRulesHref: string;
};

export type TopologyEdgeEvidenceRow = {
  label: string;
  value: string;
  meta: string;
};

export type TopologyEdgeEvidence = {
  title: string;
  sourceLabel: string;
  confidence: 'medium' | 'high';
  collectedBy: string;
  lastSeen: string;
  boundary: string;
  alertImpactCopy: string;
  rows: TopologyEdgeEvidenceRow[];
};

export type TopologyEdgeLinks = {
  fromEntityHref: string;
  toEntityHref: string;
  metricsHref: string;
  logsHref: string;
  tracesHref: string;
  alertImpactHref: string;
};

type TopologyServiceNodeBase = {
  id: string;
  entityId: string;
  entityType: 'application' | 'service' | 'monitor' | 'database' | 'middleware' | 'k8s-workload';
  label: string;
  namespace: string;
  environment: string;
  source: TopologySourceKind;
  signals: TopologySignalKey[];
  health: TopologyHealth;
  activeAlertCount?: number;
  downMonitorCount?: number;
  healthyMonitorCount?: number;
  logHintCount?: number;
  monitorCount?: number;
  recentErrorTraceCount?: number;
  recentTraceCount?: number;
  x: number;
  y: number;
  size: number;
  tone: 'success' | 'warning' | 'danger';
};

export type TopologyNodeFocus = 'normal' | 'active' | 'related' | 'dimmed';
export type TopologyEdgeFocus = 'normal' | 'active-path' | 'context-muted';

type TopologyServiceEdgeSeed = Omit<TopologyServiceEdge, 'focus' | 'selected' | 'drilldownHref' | 'evidence' | 'links'>;

export type TopologyServiceNode = TopologyServiceNodeBase & {
  routeContext: SignalRouteContext;
  links: TopologyNodeLinks;
  healthAffordance: LightweightEntityHealthAffordance;
  focus: TopologyNodeFocus;
};

export type TopologyServiceEdge = {
  id: string;
  from: string;
  to: string;
  relationshipType:
    | 'trace-call'
    | 'monitors'
    | 'template-dependency'
    | 'k8s-ownership'
    | 'database-connection'
    | 'middleware-connection'
    | 'manual-ownership';
  source: TopologySourceKind;
  label: string;
  alertImpact: 'none' | 'warning' | 'critical';
  tone: 'green' | 'blue' | 'orange' | 'purple' | 'red';
  focus: TopologyEdgeFocus;
  selected: boolean;
  drilldownHref: string;
  evidence: TopologyEdgeEvidence;
  links: TopologyEdgeLinks;
};

export type TopologyFilterContext = {
  environment: string;
  timeRange: string;
  search: string;
  viewMode: TopologyViewModeKey;
  sourceKind?: TopologySourceKind;
  hasIncomingContext: boolean;
  hasNarrowing: boolean;
};

export type TopologyServiceMapModel = {
  productIdentity: string;
  incomingContext: SignalRouteContext;
  faultContextRows: SignalEntityContextRow[];
  filterContext: TopologyFilterContext;
  activeNodeId?: string;
  selectedEdgeId?: string;
  selectedEdge?: TopologyServiceEdge;
  alertImpactHref: string;
  sources: TopologySource[];
  viewModes: TopologyViewMode[];
  nodes: TopologyServiceNode[];
  edges: TopologyServiceEdge[];
};

export type TopologyRouteContext = SignalRouteContext & {
  viewMode?: string;
  sourceKind?: string;
  edgeId?: string;
};

export type TopologyFaultAnalysisReview = {
  milestone: 7;
  status: 'ready-for-automation-action-catalog';
  implementedCapabilities: string[];
  relationshipSources: TopologySourceKind[];
  futureRoadmapOnly: string[];
  nextMilestone: 'automation-action-catalog';
};

export function buildTopologyFaultAnalysisReview(): TopologyFaultAnalysisReview {
  return {
    milestone: 7,
    status: 'ready-for-automation-action-catalog',
    implementedCapabilities: [
      'entity-topology-surface',
      'fault-context-entry',
      'relationship-source-controls',
      'selected-edge-evidence',
      'edge-evidence-boundary',
      'alert-impact-handoff',
      'stale-edge-sanitization',
      'three-signal-drilldowns'
    ],
    relationshipSources: [...TOPOLOGY_SOURCE_KINDS],
    futureRoadmapOnly: [
      'dependency-auto-discovery',
      'change-timeline',
      'blast-radius-analysis',
      'root-cause-analysis',
      'resource-config-changes'
    ],
    nextMilestone: 'automation-action-catalog'
  };
}

type TopologyControlContext = {
  viewMode?: TopologyViewModeKey;
  sourceKind?: TopologySourceKind;
  edgeId?: string;
};

function hasTopologyControlContext(controls: TopologyControlContext = {}) {
  return Boolean(controls.viewMode || controls.sourceKind || controls.edgeId);
}

function withSignalContext(path: string, context: SignalRouteContext) {
  const params = new URLSearchParams();
  appendSignalRouteContext(params, context);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function withQuery(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function appendTopologyControlContext(params: URLSearchParams, controls: TopologyControlContext = {}) {
  if (controls.viewMode) params.set('viewMode', controls.viewMode);
  if (controls.sourceKind) params.set('sourceKind', controls.sourceKind);
  if (controls.edgeId) params.set('edgeId', controls.edgeId);
}

function withTopologyControlContext(href: string, controls: TopologyControlContext = {}) {
  if (!hasTopologyControlContext(controls)) return href;
  const url = new URL(href, 'http://localhost');
  appendTopologyControlContext(url.searchParams, controls);
  return `${url.pathname}${url.search}${url.hash}`;
}

function normalizeContextValue(value: string | null | undefined) {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function normalizeRouteContext(context: TopologyRouteContext = {}): TopologyRouteContext {
  const nextContext: TopologyRouteContext = {};
  Object.entries(context).forEach(([key, value]) => {
    const normalized = normalizeContextValue(value);
    if (normalized) {
      (nextContext as Record<string, string>)[key] = normalized;
    }
  });
  return nextContext;
}

function hasRouteContext(context: SignalRouteContext) {
  return Object.keys(context).length > 0;
}

function sameText(left: string | undefined, right: string | undefined) {
  if (!left || !right) return false;
  return left.toLowerCase() === right.toLowerCase();
}

function firstContextText(...values: Array<string | undefined>) {
  return values.find(value => normalizeContextValue(value) != null) ?? '';
}

function isTopologyViewMode(value: string | undefined): value is TopologyViewModeKey {
  return Boolean(value && TOPOLOGY_VIEW_MODES.includes(value as TopologyViewModeKey));
}

function isTopologySourceKind(value: string | undefined): value is TopologySourceKind {
  return Boolean(value && TOPOLOGY_SOURCE_KINDS.includes(value as TopologySourceKind));
}

function buildTopologyControlHref(
  context: SignalRouteContext,
  overrides: {
    viewMode?: TopologyViewModeKey;
    sourceKind?: TopologySourceKind;
    edgeId?: string;
  } = {}
) {
  const params = new URLSearchParams();
  appendSignalRouteContext(params, context);
  if (overrides.viewMode) params.set('viewMode', overrides.viewMode);
  if (overrides.sourceKind) params.set('sourceKind', overrides.sourceKind);
  if (overrides.edgeId) params.set('edgeId', overrides.edgeId);
  return withQuery('/topology', params);
}

function buildTopologyReturnHref(context: SignalRouteContext, controls: TopologyControlContext = {}) {
  const params = new URLSearchParams();
  appendSignalRouteContext(params, context);
  params.delete('returnTo');
  appendTopologyControlContext(params, controls);
  return withQuery('/topology', params);
}

function buildTopologyNodeRouteContext(
  node: TopologyServiceNodeBase,
  contextDefaults: SignalRouteContext = {},
  controls: TopologyControlContext = {}
): SignalRouteContext {
  const signalContext: SignalRouteContext = {
    entityId: node.entityId,
    entityName: node.label,
    serviceName: node.label,
    serviceNamespace: node.namespace,
    environment: normalizeContextValue(contextDefaults.environment) ?? node.environment,
    timeRange: normalizeContextValue(contextDefaults.timeRange) ?? TOPOLOGY_TIME_RANGE,
    start: normalizeContextValue(contextDefaults.start),
    end: normalizeContextValue(contextDefaults.end),
    refresh: normalizeContextValue(contextDefaults.refresh),
    live: normalizeContextValue(contextDefaults.live),
    tz: normalizeContextValue(contextDefaults.tz),
    traceId: normalizeContextValue(contextDefaults.traceId),
    spanId: normalizeContextValue(contextDefaults.spanId),
    monitorId: normalizeContextValue(contextDefaults.monitorId),
    monitorName: normalizeContextValue(contextDefaults.monitorName),
    monitorApp: normalizeContextValue(contextDefaults.monitorApp),
    monitorInstance: normalizeContextValue(contextDefaults.monitorInstance),
    source: normalizeContextValue(contextDefaults.source) ?? `topology:${node.source}`,
    collector: normalizeContextValue(contextDefaults.collector),
    template: normalizeContextValue(contextDefaults.template)
  };
  return {
    ...signalContext,
    returnTo: hasTopologyControlContext(controls) ? buildTopologyReturnHref(signalContext, controls) : '/topology'
  };
}

function buildTopologyNodeLinks(routeContext: SignalRouteContext, controls: TopologyControlContext = {}): TopologyNodeLinks {
  return {
    entityHref: withTopologyControlContext(buildSignalEntityHref(routeContext), controls),
    metricsHref: withTopologyControlContext(withSignalContext('/ingestion/otlp/metrics', routeContext), controls),
    logsHref: withTopologyControlContext(withSignalContext('/log/manage', routeContext), controls),
    tracesHref: withTopologyControlContext(withSignalContext('/trace/manage', routeContext), controls),
    alertRulesHref: withTopologyControlContext(buildSignalAlertRulesHref('traces', routeContext), controls)
  };
}

function defineTopologyNode(
  node: TopologyServiceNodeBase,
  contextDefaults: SignalRouteContext = {},
  controls: TopologyControlContext = {},
  t?: Translator
): TopologyServiceNode {
  const routeContext = buildTopologyNodeRouteContext(node, contextDefaults, controls);
  return {
    ...node,
    routeContext,
    links: buildTopologyNodeLinks(routeContext, controls),
    healthAffordance: buildLightweightEntityHealthAffordance({
      status: node.health,
      monitorCount: node.monitorCount,
      healthyMonitorCount: node.healthyMonitorCount,
      downMonitorCount: node.downMonitorCount,
      activeAlertCount: node.activeAlertCount,
      recentTraceCount: node.recentTraceCount,
      recentErrorTraceCount: node.recentErrorTraceCount,
      logHintCount: node.logHintCount
    }, t),
    focus: 'normal'
  };
}

function findIncomingNode(nodes: TopologyServiceNode[], context: SignalRouteContext) {
  const entityId = normalizeContextValue(context.entityId);
  if (entityId) {
    const matchedByEntity = nodes.find(node => node.entityId === entityId);
    if (matchedByEntity) return matchedByEntity;
  }

  const serviceName = normalizeContextValue(context.serviceName);
  const entityName = normalizeContextValue(context.entityName);
  const serviceNamespace = normalizeContextValue(context.serviceNamespace);
  return nodes.find(node => {
    const matchesName = sameText(node.label, serviceName) || sameText(node.label, entityName);
    const matchesNamespace = !serviceNamespace || sameText(node.namespace, serviceNamespace);
    return matchesName && matchesNamespace;
  });
}

function chooseViewMode(activeNode: TopologyServiceNode | undefined, context: SignalRouteContext): TopologyViewModeKey {
  if (normalizeContextValue(context.source)?.includes('alert')) return 'alert-impact';
  if (activeNode?.entityType === 'database' || activeNode?.entityType === 'middleware' || activeNode?.entityType === 'k8s-workload') {
    return 'resource-dependency';
  }
  if (activeNode?.entityType === 'service' || normalizeContextValue(context.serviceName)) return 'service-call';
  return 'application';
}

function buildRelatedNodeIds(activeNodeId: string | undefined, edges: TopologyServiceEdgeSeed[]) {
  const relatedNodeIds = new Set<string>();
  if (!activeNodeId) return relatedNodeIds;
  edges.forEach(edge => {
    if (edge.from === activeNodeId) relatedNodeIds.add(edge.to);
    if (edge.to === activeNodeId) relatedNodeIds.add(edge.from);
  });
  return relatedNodeIds;
}

function edgeMatchesViewMode(edge: TopologyServiceEdgeSeed, viewMode: TopologyViewModeKey) {
  if (viewMode === 'application') return true;
  if (viewMode === 'service-call') return edge.relationshipType === 'trace-call';
  if (viewMode === 'alert-impact') return edge.alertImpact !== 'none';
  return (
    edge.relationshipType === 'template-dependency' ||
    edge.relationshipType === 'k8s-ownership' ||
    edge.relationshipType === 'database-connection' ||
    edge.relationshipType === 'middleware-connection'
  );
}

function edgeMatchesSource(edge: TopologyServiceEdgeSeed, sourceKind: TopologySourceKind | undefined) {
  if (!sourceKind) return true;
  if (sourceKind === 'alert-impact') return edge.alertImpact !== 'none';
  return edge.source === sourceKind;
}

function edgeMatchesControls(
  edge: TopologyServiceEdgeSeed | undefined,
  viewMode: TopologyViewModeKey,
  sourceKind: TopologySourceKind | undefined
) {
  if (!edge) return false;
  return edgeMatchesViewMode(edge, viewMode) && edgeMatchesSource(edge, sourceKind);
}

function buildNarrowedNodeIds(edges: TopologyServiceEdge[]) {
  const relatedNodeIds = new Set<string>();
  edges.forEach(edge => {
    if (edge.focus === 'active-path') {
      relatedNodeIds.add(edge.from);
      relatedNodeIds.add(edge.to);
    }
  });
  return relatedNodeIds;
}

function buildTopologyEdgeId(from: string, to: string) {
  return `${from}--${to}`;
}

function pickCompatibleEdgeId(
  edges: TopologyServiceEdgeSeed[],
  edgeId: string | undefined,
  viewMode: TopologyViewModeKey,
  sourceKind: TopologySourceKind | undefined
) {
  const edge = edges.find(candidate => candidate.id === edgeId);
  return edgeMatchesControls(edge, viewMode, sourceKind) ? edge?.id : undefined;
}

function buildSourceEvidenceValue(edge: TopologyServiceEdgeSeed, t?: Translator) {
  if (edge.source === 'otlp-trace-call') {
    return translateTopology(t, 'topology.evidence.source.otlp-trace-call', 'trace span service.name / peer.service 调用样本');
  }
  if (edge.source === 'monitor-ownership') {
    return translateTopology(t, 'topology.evidence.source.monitor-ownership', 'HertzBeat 监控对象与模板绑定关系');
  }
  if (edge.source === 'template-dependency') {
    return translateTopology(t, 'topology.evidence.source.template-dependency', '监控模板依赖声明与资源探测结果');
  }
  if (edge.source === 'k8s-workload') {
    return translateTopology(t, 'topology.evidence.source.k8s-workload', 'K8s service/workload 标签与运行时归属');
  }
  if (edge.source === 'database-middleware-connection') {
    return translateTopology(t, 'topology.evidence.source.database-middleware-connection', '数据库/中间件连接探测与 OTLP resource attributes');
  }
  if (edge.source === 'cmdb-manual-label') {
    return translateTopology(t, 'topology.evidence.source.cmdb-manual-label', 'CMDB 导入与手工标签归属');
  }
  return translateTopology(t, 'topology.evidence.source.alert-impact', '当前告警与服务/资源依赖的影响面投射');
}

function buildTopologyEdgeEvidence(
  edge: TopologyServiceEdgeSeed,
  fromNode: TopologyServiceNode,
  toNode: TopologyServiceNode,
  sourceLabels: Record<TopologySourceKind, string>,
  t?: Translator
): TopologyEdgeEvidence {
  return {
    title: edge.label,
    sourceLabel: sourceLabels[edge.source],
    confidence: edge.alertImpact === 'none' ? 'medium' : 'high',
    collectedBy:
      edge.source === 'otlp-trace-call'
        ? translateTopology(t, 'topology.evidence.collector.otlp', 'OTLP Collector')
        : translateTopology(t, 'topology.evidence.collector.hertzbeat', 'HertzBeat Collector'),
    lastSeen: '2026/04/29 13:20:00',
    boundary: translateTopology(
      t,
      'topology.evidence.boundary',
      '当前边仅基于已采集的关系证据；依赖自动发现、变更时间线和根因分析仍是 roadmap 能力。'
    ),
    alertImpactCopy: translateTopology(t, 'topology.evidence.alert-impact.copy', '带当前边、实体和三信号上下文进入告警影响面。'),
    rows: [
      {
        label: translateTopology(t, 'topology.evidence.row.from', '起点实体'),
        value: fromNode.label,
        meta: fromNode.entityId
      },
      {
        label: translateTopology(t, 'topology.evidence.row.to', '终点实体'),
        value: toNode.label,
        meta: toNode.entityId
      },
      {
        label: translateTopology(t, 'topology.evidence.row.source', '采集证据'),
        value: buildSourceEvidenceValue(edge, t),
        meta: sourceLabels[edge.source]
      },
      {
        label: translateTopology(t, 'topology.evidence.row.alert-impact', '告警影响'),
        value:
          edge.alertImpact === 'none'
            ? translateTopology(t, 'topology.evidence.alert-impact.none', '暂无影响')
            : edge.alertImpact === 'critical'
              ? translateTopology(t, 'topology.evidence.alert-impact.critical', '严重影响')
              : translateTopology(t, 'topology.evidence.alert-impact.warning', '存在影响'),
        meta: translateTopology(t, 'topology.evidence.alert-impact.meta', '告警影响面')
      }
    ]
  };
}

function pickSignalNode(fromNode: TopologyServiceNode, toNode: TopologyServiceNode) {
  if (fromNode.entityType === 'service') return fromNode;
  if (toNode.entityType === 'service') return toNode;
  return fromNode;
}

function findTopologyNode(nodes: TopologyServiceNode[], id: string) {
  const node = nodes.find(candidate => candidate.id === id);
  if (node) return node;
  const fallback = nodes[0];
  if (!fallback) {
    throw new Error(`Topology node not found: ${id}`);
  }
  return fallback;
}

function buildTopologyEdgeLinks(
  edge: TopologyServiceEdgeSeed,
  fromNode: TopologyServiceNode,
  toNode: TopologyServiceNode,
  controls: TopologyControlContext,
  viewMode: TopologyViewModeKey,
  sourceKind: TopologySourceKind | undefined
): TopologyEdgeLinks {
  const signalNode = pickSignalNode(fromNode, toNode);
  return {
    fromEntityHref: fromNode.links.entityHref,
    toEntityHref: toNode.links.entityHref,
    metricsHref: signalNode.links.metricsHref,
    logsHref: signalNode.links.logsHref,
    tracesHref: signalNode.links.tracesHref,
    alertImpactHref: withTopologyControlContext(buildAlertImpactHref(signalNode.routeContext, viewMode, sourceKind, edge.id), controls)
  };
}

function buildAlertImpactHref(
  context: SignalRouteContext,
  viewMode: TopologyViewModeKey,
  sourceKind: TopologySourceKind | undefined,
  edgeId?: string
) {
  const params = new URLSearchParams();
  appendSignalRouteContext(params, context);
  params.set('source', 'topology');
  params.set('viewMode', viewMode === 'alert-impact' ? 'alert-impact' : viewMode);
  if (sourceKind) params.set('sourceKind', sourceKind);
  if (edgeId) params.set('edgeId', edgeId);
  return withQuery('/alert/center', params);
}

export function buildTopologyServiceMap(context: TopologyRouteContext = {}, t?: Translator): TopologyServiceMapModel {
  const incomingContext = normalizeRouteContext(context);
  const contextDefaults: SignalRouteContext = {
    environment: incomingContext.environment,
    timeRange: incomingContext.timeRange,
    start: incomingContext.start,
    end: incomingContext.end,
    refresh: incomingContext.refresh,
    live: incomingContext.live,
    tz: incomingContext.tz,
    traceId: incomingContext.traceId,
    spanId: incomingContext.spanId,
    monitorId: incomingContext.monitorId,
    monitorName: incomingContext.monitorName,
    monitorApp: incomingContext.monitorApp,
    monitorInstance: incomingContext.monitorInstance,
    source: incomingContext.source,
    collector: incomingContext.collector,
    template: incomingContext.template
  };
  const sourceBase: Array<Omit<TopologySource, 'active' | 'href'>> = [
    { kind: 'otlp-trace-call', label: translateTopology(t, 'topology.source.otlp-trace-call.label', 'OTLP 调用关系'), copy: translateTopology(t, 'topology.source.otlp-trace-call.copy', '从 trace span 归并服务调用边') },
    { kind: 'monitor-ownership', label: translateTopology(t, 'topology.source.monitor-ownership.label', '监控对象归属'), copy: translateTopology(t, 'topology.source.monitor-ownership.copy', '从 HertzBeat 监控对象绑定实体') },
    { kind: 'template-dependency', label: translateTopology(t, 'topology.source.template-dependency.label', '模板依赖'), copy: translateTopology(t, 'topology.source.template-dependency.copy', '从监控模板声明资源依赖') },
    { kind: 'k8s-workload', label: translateTopology(t, 'topology.source.k8s-workload.label', 'K8s 工作负载'), copy: translateTopology(t, 'topology.source.k8s-workload.copy', '从 workload/service 标签补齐运行时关系') },
    { kind: 'database-middleware-connection', label: translateTopology(t, 'topology.source.database-middleware-connection.label', '数据库 / 中间件连接'), copy: translateTopology(t, 'topology.source.database-middleware-connection.copy', '从数据库、中间件连接和探测结果生成资源边') },
    { kind: 'cmdb-manual-label', label: translateTopology(t, 'topology.source.cmdb-manual-label.label', 'CMDB / 手工标签'), copy: translateTopology(t, 'topology.source.cmdb-manual-label.copy', '从 CMDB 导入和手工标签补齐归属') },
    { kind: 'alert-impact', label: translateTopology(t, 'topology.source.alert-impact.label', '告警影响面'), copy: translateTopology(t, 'topology.source.alert-impact.copy', '把当前告警投射到服务和资源依赖边') }
  ];
  const sourceLabels = Object.fromEntries(sourceBase.map(source => [source.kind, source.label])) as Record<TopologySourceKind, string>;

  const viewModeBase: Array<Omit<TopologyViewMode, 'active'>> = [
    { key: 'application', label: translateTopology(t, 'topology.view.application.label', '应用拓扑'), copy: translateTopology(t, 'topology.view.application.copy', '按应用、服务和资源层级查看影响面') },
    { key: 'service-call', label: translateTopology(t, 'topology.view.service-call.label', '服务调用'), copy: translateTopology(t, 'topology.view.service-call.copy', '聚焦 OTLP trace 调用关系') },
    { key: 'resource-dependency', label: translateTopology(t, 'topology.view.resource-dependency.label', '资源依赖'), copy: translateTopology(t, 'topology.view.resource-dependency.copy', '展示数据库、中间件、K8s 与模板依赖') },
    { key: 'alert-impact', label: translateTopology(t, 'topology.view.alert-impact.label', '告警影响面'), copy: translateTopology(t, 'topology.view.alert-impact.copy', '按当前告警高亮受影响路径') }
  ];

  const nodes: TopologyServiceNode[] = [
    defineTopologyNode({
      id: 'app-commerce',
      entityId: 'application:commerce',
      entityType: 'application',
      label: 'commerce',
      namespace: 'commerce',
      environment: 'prod',
      source: 'cmdb-manual-label',
      signals: ['metrics', 'alerts'],
      health: 'warning',
      x: 50,
      y: 18,
      size: 56,
      tone: 'warning'
    }, contextDefaults, {}, t),
    defineTopologyNode({
      id: 'svc-frontend',
      entityId: 'service:commerce/frontend',
      entityType: 'service',
      label: 'frontend',
      namespace: 'commerce',
      environment: 'prod',
      source: 'otlp-trace-call',
      signals: ['metrics', 'logs', 'traces'],
      health: 'healthy',
      x: 34,
      y: 40,
      size: 42,
      tone: 'success'
    }, contextDefaults, {}, t),
    defineTopologyNode({
      id: 'svc-checkout',
      entityId: 'service:commerce/checkout',
      entityType: 'service',
      label: 'checkout-api',
      namespace: 'commerce',
      environment: 'prod',
      source: 'otlp-trace-call',
      signals: ['metrics', 'logs', 'traces', 'alerts'],
      health: 'warning',
      monitorCount: 2,
      healthyMonitorCount: 1,
      downMonitorCount: 1,
      activeAlertCount: 1,
      recentTraceCount: 40,
      recentErrorTraceCount: 2,
      logHintCount: 2,
      x: 50,
      y: 50,
      size: 50,
      tone: 'warning'
    }, contextDefaults, {}, t),
    defineTopologyNode({
      id: 'monitor-checkout',
      entityId: 'monitor:commerce/checkout-http',
      entityType: 'monitor',
      label: translateTopology(t, 'topology.node.http-template', 'HTTP 模板'),
      namespace: 'commerce',
      environment: 'prod',
      source: 'monitor-ownership',
      signals: ['metrics', 'alerts'],
      health: 'healthy',
      x: 24,
      y: 62,
      size: 38,
      tone: 'success'
    }, contextDefaults, {}, t),
    defineTopologyNode({
      id: 'k8s-checkout-workload',
      entityId: 'k8s:commerce/deployment/checkout',
      entityType: 'k8s-workload',
      label: 'checkout deploy',
      namespace: 'commerce',
      environment: 'prod',
      source: 'k8s-workload',
      signals: ['metrics', 'logs'],
      health: 'healthy',
      x: 67,
      y: 42,
      size: 40,
      tone: 'success'
    }, contextDefaults, {}, t),
    defineTopologyNode({
      id: 'res-orders-db',
      entityId: 'database:commerce/orders',
      entityType: 'database',
      label: 'orders-db',
      namespace: 'commerce',
      environment: 'prod',
      source: 'database-middleware-connection',
      signals: ['metrics', 'logs', 'alerts'],
      health: 'critical',
      x: 72,
      y: 64,
      size: 48,
      tone: 'danger'
    }, contextDefaults, {}, t),
    defineTopologyNode({
      id: 'res-redis',
      entityId: 'middleware:commerce/redis-cart',
      entityType: 'middleware',
      label: 'redis',
      namespace: 'commerce',
      environment: 'prod',
      source: 'template-dependency',
      signals: ['metrics', 'alerts'],
      health: 'warning',
      x: 46,
      y: 74,
      size: 44,
      tone: 'warning'
    }, contextDefaults, {}, t)
  ];

  const edgeBase: TopologyServiceEdgeSeed[] = [
    {
      id: buildTopologyEdgeId('app-commerce', 'svc-frontend'),
      from: 'app-commerce',
      to: 'svc-frontend',
      relationshipType: 'manual-ownership',
      source: 'cmdb-manual-label',
      label: translateTopology(t, 'topology.edge.application-ownership', '应用归属'),
      alertImpact: 'none',
      tone: 'green'
    },
    {
      id: buildTopologyEdgeId('app-commerce', 'svc-checkout'),
      from: 'app-commerce',
      to: 'svc-checkout',
      relationshipType: 'manual-ownership',
      source: 'cmdb-manual-label',
      label: translateTopology(t, 'topology.edge.application-ownership', '应用归属'),
      alertImpact: 'warning',
      tone: 'orange'
    },
    {
      id: buildTopologyEdgeId('svc-frontend', 'svc-checkout'),
      from: 'svc-frontend',
      to: 'svc-checkout',
      relationshipType: 'trace-call',
      source: 'otlp-trace-call',
      label: translateTopology(t, 'topology.edge.http-call', 'HTTP 调用'),
      alertImpact: 'warning',
      tone: 'blue'
    },
    {
      id: buildTopologyEdgeId('monitor-checkout', 'svc-checkout'),
      from: 'monitor-checkout',
      to: 'svc-checkout',
      relationshipType: 'monitors',
      source: 'monitor-ownership',
      label: translateTopology(t, 'topology.edge.monitor-ownership', '监控对象归属'),
      alertImpact: 'warning',
      tone: 'green'
    },
    {
      id: buildTopologyEdgeId('k8s-checkout-workload', 'svc-checkout'),
      from: 'k8s-checkout-workload',
      to: 'svc-checkout',
      relationshipType: 'k8s-ownership',
      source: 'k8s-workload',
      label: translateTopology(t, 'topology.edge.runtime-ownership', '运行时归属'),
      alertImpact: 'none',
      tone: 'purple'
    },
    {
      id: buildTopologyEdgeId('svc-checkout', 'res-orders-db'),
      from: 'svc-checkout',
      to: 'res-orders-db',
      relationshipType: 'database-connection',
      source: 'database-middleware-connection',
      label: translateTopology(t, 'topology.edge.orders-db-connection', '订单库连接'),
      alertImpact: 'critical',
      tone: 'red'
    },
    {
      id: buildTopologyEdgeId('svc-checkout', 'res-redis'),
      from: 'svc-checkout',
      to: 'res-redis',
      relationshipType: 'middleware-connection',
      source: 'template-dependency',
      label: translateTopology(t, 'topology.edge.cache-template-dependency', '缓存模板依赖'),
      alertImpact: 'warning',
      tone: 'orange'
    }
  ];
  const activeNode = findIncomingNode(nodes, incomingContext);
  const activeNodeId = activeNode?.id;
  const requestedViewMode = isTopologyViewMode(incomingContext.viewMode) ? incomingContext.viewMode : undefined;
  const sourceKind = isTopologySourceKind(incomingContext.sourceKind) ? incomingContext.sourceKind : undefined;
  const viewMode = requestedViewMode ?? chooseViewMode(activeNode, incomingContext);
  const requestedEdgeId = normalizeContextValue(incomingContext.edgeId);
  const selectedEdgeId = pickCompatibleEdgeId(edgeBase, requestedEdgeId, viewMode, sourceKind);
  const explicitNarrowing = Boolean(requestedViewMode || sourceKind || selectedEdgeId);
  const linkControlContext: TopologyControlContext = explicitNarrowing ? { viewMode, sourceKind, edgeId: selectedEdgeId } : {};
  const linkedNodes = explicitNarrowing ? nodes.map(node => defineTopologyNode(node, contextDefaults, linkControlContext, t)) : nodes;
  const hasNarrowing = Boolean(activeNodeId || explicitNarrowing || viewMode !== 'application');
  const activeNodeRelatedIds = buildRelatedNodeIds(activeNodeId, edgeBase);
  const edges: TopologyServiceEdge[] = edgeBase.map(edge => {
    const matchesControl = edgeMatchesViewMode(edge, viewMode) && edgeMatchesSource(edge, sourceKind);
    const matchesActiveNode = Boolean(activeNodeId && (edge.from === activeNodeId || edge.to === activeNodeId));
    const activeByNode = activeNodeId && !explicitNarrowing ? matchesActiveNode : matchesActiveNode && matchesControl;
    const activeByControl = !activeNodeId && Boolean(requestedViewMode || sourceKind) && matchesControl;
    const selected = edge.id === selectedEdgeId;
    const fromNode = findTopologyNode(linkedNodes, edge.from);
    const toNode = findTopologyNode(linkedNodes, edge.to);
    return {
      ...edge,
      focus: selected || activeByNode || activeByControl ? 'active-path' : hasNarrowing ? 'context-muted' : 'normal',
      selected,
      drilldownHref: buildTopologyControlHref(incomingContext, {
        viewMode,
        sourceKind,
        edgeId: edge.id
      }),
      evidence: buildTopologyEdgeEvidence(edge, fromNode, toNode, sourceLabels, t),
      links: buildTopologyEdgeLinks(edge, fromNode, toNode, { ...linkControlContext, edgeId: edge.id }, viewMode, sourceKind)
    };
  });
  const narrowedNodeIds = buildNarrowedNodeIds(edges);
  const focusedNodes: TopologyServiceNode[] = linkedNodes.map(node => {
    if (!hasNarrowing) return node;
    if (node.id === activeNodeId) return { ...node, focus: 'active' };
    if (narrowedNodeIds.has(node.id) || activeNodeRelatedIds.has(node.id)) return { ...node, focus: 'related' };
    return { ...node, focus: 'dimmed' };
  });
  const viewModes = viewModeBase.map(mode => ({
    ...mode,
    active: mode.key === viewMode,
    href: buildTopologyControlHref(incomingContext, {
      viewMode: mode.key,
      sourceKind,
      edgeId: pickCompatibleEdgeId(edgeBase, selectedEdgeId, mode.key, sourceKind)
    })
  }));
  const sources = sourceBase.map(source => ({
    ...source,
    active: source.kind === sourceKind,
    href: buildTopologyControlHref(incomingContext, {
      viewMode: source.kind === 'alert-impact' ? 'alert-impact' : viewMode,
      sourceKind: source.kind,
      edgeId: pickCompatibleEdgeId(
        edgeBase,
        selectedEdgeId,
        source.kind === 'alert-impact' ? 'alert-impact' : viewMode,
        source.kind
      )
    })
  }));
  const filterContext: TopologyFilterContext = {
    environment: normalizeContextValue(incomingContext.environment) ?? TOPOLOGY_DEFAULT_ENVIRONMENT,
    timeRange: normalizeContextValue(incomingContext.timeRange) ?? TOPOLOGY_TIME_RANGE,
    search: firstContextText(incomingContext.serviceName, incomingContext.entityName, activeNode?.label),
    viewMode,
    sourceKind,
    hasIncomingContext: hasRouteContext(incomingContext),
    hasNarrowing
  };
  const faultContextRows = filterContext.hasIncomingContext
    ? buildSignalEntityContextRows(incomingContext, {
        entityId: activeNode?.entityId,
        entityName: activeNode?.label,
        serviceName: activeNode?.label,
        serviceNamespace: activeNode?.namespace,
        environment: filterContext.environment,
        timeRange: filterContext.timeRange
      }, t)
    : [];
  const alertImpactHref = buildAlertImpactHref(incomingContext, viewMode, sourceKind, selectedEdgeId);
  const selectedEdge = edges.find(edge => edge.id === selectedEdgeId);

  return {
    productIdentity: translateTopology(t, 'topology.identity', TOPOLOGY_PRODUCT_IDENTITY),
    incomingContext,
    faultContextRows,
    filterContext,
    activeNodeId,
    selectedEdgeId,
    selectedEdge,
    alertImpactHref,
    sources,
    viewModes,
    nodes: focusedNodes,
    edges
  };
}
