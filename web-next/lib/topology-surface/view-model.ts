import {
  appendSignalRouteContext,
  buildSignalAlertRulesHref,
  buildSignalEntityContextRows,
  buildSignalEntityHref,
  type SignalEntityContextRow,
  type SignalRouteContext
} from '../signal-route-context';
import { buildLightweightEntityHealthAffordance, type LightweightEntityHealthAffordance } from '../entity-health-affordance';
import { interpolate, type TranslationParams } from '../i18n';
import { SUPPLEMENTAL_MESSAGES } from '../i18n-runtime-messages';

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
export type TopologyDataSource = 'api' | 'static-fallback';

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

function translateTopology(
  t: Translator | undefined,
  key: string,
  fallbackOrParams?: string | TranslationParams,
  params?: TranslationParams
) {
  const fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined;
  const interpolationParams = typeof fallbackOrParams === 'string' ? params : fallbackOrParams;
  const fallbackTemplate = fallback ?? SUPPLEMENTAL_MESSAGES['en-US']?.[key] ?? SUPPLEMENTAL_MESSAGES['zh-CN']?.[key] ?? key;

  if (!t) return interpolate(fallbackTemplate, interpolationParams);
  const value = t(key, interpolationParams);
  return value && value !== key ? value : interpolate(fallbackTemplate, interpolationParams);
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
  firstSeen: string;
  lastSeen: string;
  sampleTraceId?: string;
  sampleSpanId?: string;
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

export type TopologyImpactTimelineEvent = {
  id: string;
  edgeId?: string;
  entityId?: string;
  sourceKind: TopologySourceKind;
  sourceLabel: string;
  eventType: string;
  title: string;
  detail: string;
  actor: string;
  occurredAt: string;
};

export type TopologyRedMetrics = {
  requestRatePerSecond?: number;
  requestCount?: number;
  errorRate?: number;
  errorCount?: number;
  latencyP95Ms?: number;
  latencyAvgMs?: number;
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
  evidenceBadges: string[];
  redMetrics: TopologyRedMetrics;
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
type TopologyServiceNodeInput = Omit<TopologyServiceNodeBase, 'evidenceBadges' | 'redMetrics'> & {
  evidenceBadges?: string[];
  redMetrics?: TopologyRedMetrics;
};

export type TopologyNodeFocus = 'normal' | 'active' | 'related' | 'dimmed';
export type TopologyEdgeFocus = 'normal' | 'active-path' | 'context-muted';

type TopologyServiceEdgeSeed = Omit<
  TopologyServiceEdge,
  'evidenceBadges' | 'redMetrics' | 'focus' | 'selected' | 'drilldownHref' | 'evidence' | 'links'
> & {
  evidenceBadges?: string[];
  redMetrics?: TopologyRedMetrics;
};

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
    | 'resource-ownership'
    | 'manual-ownership';
  source: TopologySourceKind;
  label: string;
  alertImpact: 'none' | 'warning' | 'critical';
  tone: 'green' | 'blue' | 'orange' | 'purple' | 'red';
  evidenceBadges: string[];
  redMetrics: TopologyRedMetrics;
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
  groupBy: TopologyGroupByKey;
  sourceKind?: TopologySourceKind;
  hasIncomingContext: boolean;
  hasNarrowing: boolean;
};

export type TopologyServiceMapModel = {
  dataSource: TopologyDataSource;
  apiDepth?: number;
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
  impactTimeline: TopologyImpactTimelineEvent[];
  nodes: TopologyServiceNode[];
  edges: TopologyServiceEdge[];
};

export type TopologyRouteContext = SignalRouteContext & {
  viewMode?: string;
  sourceKind?: string;
  groupBy?: string;
  edgeId?: string;
  depth?: string;
  relationType?: string;
  hideInternal?: string;
  pageIndex?: string;
  pageSize?: string;
  scaleProof?: string;
  search?: string;
  topologyTargetId?: string;
  topologyTargetName?: string;
};

type EntityTopologyApiRedMetrics = Partial<Record<keyof TopologyRedMetrics, number | string | null | undefined>>;

export type EntityTopologyApiNode = {
  id?: string;
  entityId?: number | string | null;
  entityName?: string | null;
  entityType?: string | null;
  namespace?: string | null;
  environment?: string | null;
  health?: string | null;
  focus?: boolean;
  evidenceBadges?: string[];
  redMetrics?: EntityTopologyApiRedMetrics;
};

export type EntityTopologyApiEdge = {
  id?: string;
  relationId?: number | string | null;
  sourceNodeId?: string | null;
  targetNodeId?: string | null;
  sourceEntityId?: number | string | null;
  targetEntityId?: number | string | null;
  targetRef?: string | null;
  sampleTraceId?: string | null;
  sampleSpanId?: string | null;
  firstSeen?: string | null;
  lastSeen?: string | null;
  relationType?: string | null;
  relationSource?: string | null;
  status?: string | null;
  score?: number | null;
  evidenceBadges?: string[];
  redMetrics?: EntityTopologyApiRedMetrics;
};

export type EntityTopologyApiTimelineEvent = {
  id?: string | null;
  edgeId?: string | null;
  entityId?: number | string | null;
  sourceKind?: string | null;
  eventType?: string | null;
  title?: string | null;
  detail?: string | null;
  actor?: string | null;
  occurredAt?: string | null;
};

export type EntityTopologyApiGraph = {
  apiBacked?: boolean;
  focusEntityId?: number | string | null;
  depth?: number;
  sourceKinds?: string[];
  nodes?: EntityTopologyApiNode[];
  edges?: EntityTopologyApiEdge[];
  impactTimeline?: EntityTopologyApiTimelineEvent[];
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
      'impact-timeline',
      'stale-edge-sanitization',
      'three-signal-drilldowns'
    ],
    relationshipSources: [...TOPOLOGY_SOURCE_KINDS],
    futureRoadmapOnly: [
      'dependency-auto-discovery',
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

export type TopologyGroupByKey = 'none' | 'environment' | 'source-kind' | 'entity-type';

function normalizeTopologyGroupBy(value: string | undefined): TopologyGroupByKey {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'environment' || normalized === 'source-kind' || normalized === 'entity-type') return normalized;
  return 'none';
}

function normalizeTopologySourceKind(value: string | undefined): TopologySourceKind | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (isTopologySourceKind(normalized)) return normalized;
  if (normalized === 'entity-relation' || normalized === 'entity_relation' || normalized === 'relation' || normalized === 'manual') {
    return 'cmdb-manual-label';
  }
  if (normalized === 'monitor-bind' || normalized === 'monitor_bind') {
    return 'monitor-ownership';
  }
  return undefined;
}

function buildTopologyControlHref(
  context: TopologyRouteContext,
  overrides: {
    viewMode?: TopologyViewModeKey;
    sourceKind?: TopologySourceKind;
    edgeId?: string;
    groupBy?: TopologyGroupByKey;
  } = {}
) {
  const params = new URLSearchParams();
  appendSignalRouteContext(params, context);
  const groupBy = normalizeTopologyGroupBy(overrides.groupBy ?? context.groupBy);
  if (groupBy !== 'none') params.set('groupBy', groupBy);
  if (overrides.viewMode) params.set('viewMode', overrides.viewMode);
  if (overrides.sourceKind) params.set('sourceKind', overrides.sourceKind);
  if (overrides.edgeId) params.set('edgeId', overrides.edgeId);
  return withQuery('/topology', params);
}

function buildTopologySourceBase(t?: Translator): Array<Omit<TopologySource, 'active' | 'href'>> {
  return [
    { kind: 'otlp-trace-call', label: translateTopology(t, 'topology.source.otlp-trace-call.label'), copy: translateTopology(t, 'topology.source.otlp-trace-call.copy') },
    { kind: 'monitor-ownership', label: translateTopology(t, 'topology.source.monitor-ownership.label'), copy: translateTopology(t, 'topology.source.monitor-ownership.copy') },
    { kind: 'template-dependency', label: translateTopology(t, 'topology.source.template-dependency.label'), copy: translateTopology(t, 'topology.source.template-dependency.copy') },
    { kind: 'k8s-workload', label: translateTopology(t, 'topology.source.k8s-workload.label'), copy: translateTopology(t, 'topology.source.k8s-workload.copy') },
    { kind: 'database-middleware-connection', label: translateTopology(t, 'topology.source.database-middleware-connection.label'), copy: translateTopology(t, 'topology.source.database-middleware-connection.copy') },
    { kind: 'cmdb-manual-label', label: translateTopology(t, 'topology.source.cmdb-manual-label.label'), copy: translateTopology(t, 'topology.source.cmdb-manual-label.copy') },
    { kind: 'alert-impact', label: translateTopology(t, 'topology.source.alert-impact.label'), copy: translateTopology(t, 'topology.source.alert-impact.copy') }
  ];
}

function buildTopologyViewModeBase(t?: Translator): Array<Omit<TopologyViewMode, 'active' | 'href'>> {
  return [
    { key: 'application', label: translateTopology(t, 'topology.view.application.label'), copy: translateTopology(t, 'topology.view.application.copy') },
    { key: 'service-call', label: translateTopology(t, 'topology.view.service-call.label'), copy: translateTopology(t, 'topology.view.service-call.copy') },
    { key: 'resource-dependency', label: translateTopology(t, 'topology.view.resource-dependency.label'), copy: translateTopology(t, 'topology.view.resource-dependency.copy') },
    { key: 'alert-impact', label: translateTopology(t, 'topology.view.alert-impact.label'), copy: translateTopology(t, 'topology.view.alert-impact.copy') }
  ];
}

function buildTopologyReturnHref(context: SignalRouteContext, controls: TopologyControlContext = {}) {
  const params = new URLSearchParams();
  appendSignalRouteContext(params, context);
  params.delete('returnTo');
  appendTopologyControlContext(params, controls);
  return withQuery('/topology', params);
}

function buildTopologyNodeRouteContext(
  node: TopologyServiceNodeInput,
  contextDefaults: SignalRouteContext = {},
  controls: TopologyControlContext = {}
): SignalRouteContext {
  const matchesIncomingEntity = Boolean(
    (contextDefaults.entityId && contextDefaults.entityId === node.entityId) ||
    sameText(contextDefaults.entityName, node.label)
  );
  const signalContext: SignalRouteContext = {
    entityId: node.entityId,
    entityName: node.label,
    serviceName: matchesIncomingEntity ? normalizeContextValue(contextDefaults.serviceName) ?? node.label : node.label,
    serviceNamespace: matchesIncomingEntity
      ? normalizeContextValue(contextDefaults.serviceNamespace) ?? node.namespace
      : node.namespace,
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

function normalizeTopologyEvidenceBadges(values: Array<string | number | null | undefined> | undefined, fallback: string[] = []) {
  const badges = [...(values ?? []), ...fallback]
    .map(value => normalizeApiText(value))
    .filter((value): value is string => Boolean(value));
  return [...new Set(badges)];
}

function normalizeApiNumber(value: number | string | null | undefined) {
  if (value == null) return undefined;
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function normalizeTopologyRedMetrics(metrics: EntityTopologyApiRedMetrics | TopologyRedMetrics | undefined): TopologyRedMetrics {
  return {
    requestRatePerSecond: normalizeApiNumber(metrics?.requestRatePerSecond),
    requestCount: normalizeApiNumber(metrics?.requestCount),
    errorRate: normalizeApiNumber(metrics?.errorRate),
    errorCount: normalizeApiNumber(metrics?.errorCount),
    latencyP95Ms: normalizeApiNumber(metrics?.latencyP95Ms),
    latencyAvgMs: normalizeApiNumber(metrics?.latencyAvgMs)
  };
}

function defineTopologyNode(
  node: TopologyServiceNodeInput,
  contextDefaults: SignalRouteContext = {},
  controls: TopologyControlContext = {},
  t?: Translator
): TopologyServiceNode {
  const routeContext = buildTopologyNodeRouteContext(node, contextDefaults, controls);
  return {
    ...node,
    evidenceBadges: normalizeTopologyEvidenceBadges(node.evidenceBadges, [node.source]),
    redMetrics: normalizeTopologyRedMetrics(node.redMetrics),
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
    edge.relationshipType === 'middleware-connection' ||
    edge.relationshipType === 'resource-ownership'
  );
}

function edgeMatchesSource(edge: TopologyServiceEdgeSeed, sourceKind: TopologySourceKind | undefined) {
  if (!sourceKind) return true;
  if (sourceKind === 'alert-impact') return edge.source === 'alert-impact' || (edge.source !== 'otlp-trace-call' && edge.alertImpact !== 'none');
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

function topologyNodeMatchesTarget(
  node: TopologyServiceNode | undefined,
  targetId: string | undefined,
  targetName: string | undefined
) {
  if (!node) return false;
  return (
    (targetId && (node.entityId === targetId || node.id === targetId || node.id === `entity-${targetId}`)) ||
    (targetName && sameText(node.label, targetName))
  );
}

function findTopologyTargetEdgeId(
  edges: TopologyServiceEdgeSeed[],
  nodes: TopologyServiceNode[],
  activeNodeId: string | undefined,
  context: TopologyRouteContext
) {
  const targetId = normalizeContextValue(context.topologyTargetId);
  const targetName = normalizeContextValue(context.topologyTargetName);
  if (!targetId && !targetName) return undefined;
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const targetEdge = edges.find(edge => {
    if (activeNodeId && edge.from !== activeNodeId && edge.to !== activeNodeId) return false;
    const fromNode = nodeById.get(edge.from);
    const toNode = nodeById.get(edge.to);
    if (activeNodeId === edge.from) return topologyNodeMatchesTarget(toNode, targetId, targetName);
    if (activeNodeId === edge.to) return topologyNodeMatchesTarget(fromNode, targetId, targetName);
    return topologyNodeMatchesTarget(fromNode, targetId, targetName) || topologyNodeMatchesTarget(toNode, targetId, targetName);
  });
  return targetEdge?.id;
}

function buildSourceEvidenceValue(edge: TopologyServiceEdgeSeed, t?: Translator) {
  if (edge.source === 'otlp-trace-call') {
    return translateTopology(t, 'topology.evidence.source.otlp-trace-call');
  }
  if (edge.source === 'monitor-ownership') {
    return translateTopology(t, 'topology.evidence.source.monitor-ownership');
  }
  if (edge.source === 'template-dependency') {
    return translateTopology(t, 'topology.evidence.source.template-dependency');
  }
  if (edge.source === 'k8s-workload') {
    return translateTopology(t, 'topology.evidence.source.k8s-workload');
  }
  if (edge.source === 'database-middleware-connection') {
    return translateTopology(t, 'topology.evidence.source.database-middleware-connection');
  }
  if (edge.source === 'cmdb-manual-label') {
    return translateTopology(t, 'topology.evidence.source.cmdb-manual-label');
  }
  return translateTopology(t, 'topology.evidence.source.alert-impact');
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
        ? translateTopology(t, 'topology.evidence.collector.otlp')
        : translateTopology(t, 'topology.evidence.collector.hertzbeat'),
    firstSeen: '',
    lastSeen: '2026/04/29 13:20:00',
    boundary: translateTopology(t, 'topology.evidence.boundary'),
    alertImpactCopy: translateTopology(t, 'topology.evidence.alert-impact.copy'),
    rows: [
      {
        label: translateTopology(t, 'topology.evidence.row.from'),
        value: fromNode.label,
        meta: fromNode.entityId
      },
      {
        label: translateTopology(t, 'topology.evidence.row.to'),
        value: toNode.label,
        meta: toNode.entityId
      },
      {
        label: translateTopology(t, 'topology.evidence.row.source'),
        value: buildSourceEvidenceValue(edge, t),
        meta: sourceLabels[edge.source]
      },
      {
        label: translateTopology(t, 'topology.evidence.row.alert-impact'),
        value:
          edge.alertImpact === 'none'
            ? translateTopology(t, 'topology.evidence.alert-impact.none')
            : edge.alertImpact === 'critical'
              ? translateTopology(t, 'topology.evidence.alert-impact.critical')
              : translateTopology(t, 'topology.evidence.alert-impact.warning'),
        meta: translateTopology(t, 'topology.evidence.alert-impact.meta')
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
  sourceKind: TopologySourceKind | undefined,
  evidence?: Pick<TopologyEdgeEvidence, 'sampleTraceId' | 'sampleSpanId'>
): TopologyEdgeLinks {
  const signalNode = pickSignalNode(fromNode, toNode);
  const signalRouteContext = withTopologyEdgeEvidenceContext(signalNode.routeContext, evidence, controls);
  return {
    fromEntityHref: fromNode.links.entityHref,
    toEntityHref: toNode.links.entityHref,
    metricsHref: withTopologyControlContext(withSignalContext('/ingestion/otlp/metrics', signalRouteContext), controls),
    logsHref: withTopologyControlContext(withSignalContext('/log/manage', signalRouteContext), controls),
    tracesHref: withTopologyControlContext(withSignalContext('/trace/manage', signalRouteContext), controls),
    alertImpactHref: withTopologyControlContext(buildAlertImpactHref(signalNode.routeContext, viewMode, sourceKind, edge.id), controls)
  };
}

function withTopologyEdgeEvidenceContext(
  context: SignalRouteContext,
  evidence: Pick<TopologyEdgeEvidence, 'sampleTraceId' | 'sampleSpanId'> | undefined,
  controls: TopologyControlContext
): SignalRouteContext {
  const sampleTraceId = normalizeContextValue(evidence?.sampleTraceId);
  const sampleSpanId = normalizeContextValue(evidence?.sampleSpanId);
  if (!sampleTraceId && !sampleSpanId) return context;
  const nextContext: SignalRouteContext = {
    ...context,
    traceId: sampleTraceId ?? normalizeContextValue(context.traceId),
    spanId: sampleSpanId ?? normalizeContextValue(context.spanId)
  };
  return {
    ...nextContext,
    returnTo: buildTopologyReturnHref(nextContext, controls)
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

function normalizeApiText(value: string | number | null | undefined) {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  return trimmed === '' ? undefined : trimmed;
}

function normalizeApiNodeId(apiId: string | undefined, entityId: string | number | null | undefined) {
  const rawApiId = normalizeApiText(apiId);
  if (rawApiId && !/^\d+$/.test(rawApiId)) return rawApiId;
  const stableId = normalizeApiText(entityId) ?? rawApiId;
  return stableId ? `entity-${stableId}` : undefined;
}

function normalizeApiSourceKind(value: string | null | undefined): TopologySourceKind {
  const normalized = value?.toLowerCase() ?? '';
  if (normalized.includes('trace') || normalized.includes('otlp')) return 'otlp-trace-call';
  if (normalized.includes('monitor')) return 'monitor-ownership';
  if (normalized.includes('template')) return 'template-dependency';
  if (normalized.includes('k8s') || normalized.includes('workload')) return 'k8s-workload';
  if (normalized.includes('cmdb') || normalized.includes('manual')) return 'cmdb-manual-label';
  if (normalized.includes('database') || normalized.includes('middleware') || normalized.includes('db')) {
    return 'database-middleware-connection';
  }
  if (normalized.includes('alert')) return 'alert-impact';
  return 'cmdb-manual-label';
}

function normalizeApiEntityType(value: string | null | undefined): TopologyServiceNodeBase['entityType'] {
  const normalized = value?.toLowerCase() ?? '';
  if (normalized.includes('application') || normalized === 'app') return 'application';
  if (normalized.includes('monitor')) return 'monitor';
  if (normalized.includes('database') || normalized.includes('db')) return 'database';
  if (normalized.includes('middleware') || normalized.includes('redis') || normalized.includes('cache')) return 'middleware';
  if (normalized.includes('k8s') || normalized.includes('workload')) return 'k8s-workload';
  return 'service';
}

function normalizeApiHealth(value: string | null | undefined): TopologyHealth {
  const normalized = value?.toLowerCase() ?? '';
  if (normalized.includes('critical') || normalized.includes('down') || normalized.includes('unhealthy')) return 'critical';
  if (normalized.includes('warning') || normalized.includes('warn') || normalized.includes('unknown')) return 'warning';
  return 'healthy';
}

function toneFromHealth(health: TopologyHealth): TopologyServiceNodeBase['tone'] {
  if (health === 'critical') return 'danger';
  if (health === 'warning') return 'warning';
  return 'success';
}

function normalizeApiRelationshipType(
  relationType: string | null | undefined,
  sourceKind: TopologySourceKind
): TopologyServiceEdge['relationshipType'] {
  const normalized = relationType?.toLowerCase() ?? '';
  if (normalized.includes('trace') || normalized.includes('call') || normalized.includes('http')) return 'trace-call';
  if (normalized.includes('monitor')) return 'monitors';
  if (normalized.includes('template')) return 'template-dependency';
  if (
    normalized.includes('runs_on') ||
    normalized.includes('deployed_on') ||
    normalized.includes('resource') ||
    normalized.includes('host') ||
    normalized.includes('container') ||
    normalized.includes('pod') ||
    normalized.includes('node')
  ) {
    return 'resource-ownership';
  }
  if (normalized.includes('k8s') || normalized.includes('workload')) return 'k8s-ownership';
  if (normalized.includes('database') || normalized.includes('db') || normalized.includes('sql')) return 'database-connection';
  if (normalized.includes('middleware') || normalized.includes('redis') || normalized.includes('cache')) return 'middleware-connection';
  if (sourceKind === 'otlp-trace-call') return 'trace-call';
  if (sourceKind === 'monitor-ownership') return 'monitors';
  if (sourceKind === 'template-dependency') return 'template-dependency';
  if (sourceKind === 'k8s-workload') return 'k8s-ownership';
  if (sourceKind === 'database-middleware-connection') return 'database-connection';
  return 'manual-ownership';
}

function apiEdgeAlertImpact(edge: EntityTopologyApiEdge): TopologyServiceEdge['alertImpact'] {
  const status = edge.status?.toLowerCase() ?? '';
  if (status.includes('critical') || status.includes('down') || (edge.score != null && edge.score < 50)) {
    return 'critical';
  }
  if (status.includes('warning') || status.includes('warn') || (edge.score != null && edge.score < 80)) {
    return 'warning';
  }
  return 'none';
}

function apiEdgeTone(sourceKind: TopologySourceKind, alertImpact: TopologyServiceEdge['alertImpact']): TopologyServiceEdge['tone'] {
  if (alertImpact === 'critical') return 'red';
  if (alertImpact === 'warning') return 'orange';
  if (sourceKind === 'otlp-trace-call') return 'blue';
  if (sourceKind === 'k8s-workload') return 'purple';
  return 'green';
}

function apiNodeLayout(index: number, total: number, focus: boolean) {
  if (focus) return { x: 50, y: 50, size: 50 };
  const radius = 30;
  const visibleCount = Math.max(total - 1, 1);
  const angle = (index / visibleCount) * Math.PI * 2 - Math.PI / 2;
  return {
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * 22,
    size: 42
  };
}

function unresolvedTargetRefNodeId(targetRef: string) {
  return `entity-ref-${encodeURIComponent(targetRef).replace(/%/g, '_')}`;
}

function entityTypeFromTargetRef(targetRef: string): TopologyServiceNodeBase['entityType'] {
  const kind = targetRef.split(':')[0]?.toLowerCase();
  if (kind?.includes('database') || kind === 'db') return 'database';
  if (kind?.includes('middleware') || kind?.includes('redis') || kind?.includes('cache')) return 'middleware';
  if (kind?.includes('k8s') || kind?.includes('workload')) return 'k8s-workload';
  if (kind?.includes('monitor')) return 'monitor';
  if (kind?.includes('application') || kind === 'app') return 'application';
  return 'service';
}

function namespaceFromTargetRef(targetRef: string, fallback: string) {
  const [, remainder = ''] = targetRef.split(':');
  const separator = remainder.indexOf('/');
  if (separator > 0) return remainder.slice(0, separator);
  return fallback;
}

function buildApiTopologyEdgeId(edge: EntityTopologyApiEdge, from: string, to: string) {
  const relationId = normalizeApiText(edge.relationId);
  if (relationId) return `relation-${relationId}`;
  const edgeId = normalizeApiText(edge.id);
  return edgeId ? `relation-${edgeId}` : buildTopologyEdgeId(from, to);
}

function normalizeApiSampleTraceId(apiEdge: EntityTopologyApiEdge) {
  const directTraceId = normalizeApiText(apiEdge.sampleTraceId);
  if (directTraceId) return directTraceId;
  const targetRef = normalizeApiText(apiEdge.targetRef);
  if (targetRef?.startsWith('trace:')) {
    const [, traceId] = targetRef.split(':');
    return normalizeApiText(traceId);
  }
  return undefined;
}

function buildApiTopologyEdgeEvidence(
  edge: TopologyServiceEdgeSeed,
  apiEdge: EntityTopologyApiEdge,
  fromNode: TopologyServiceNode,
  toNode: TopologyServiceNode,
  sourceLabels: Record<TopologySourceKind, string>,
  t?: Translator
): TopologyEdgeEvidence {
  const relationSource = normalizeApiText(apiEdge.relationSource) ?? edge.source;
  const sampleTraceId = normalizeApiSampleTraceId(apiEdge);
  const sampleSpanId = normalizeApiText(apiEdge.sampleSpanId);
  const firstSeen = normalizeApiText(apiEdge.firstSeen) ?? '';
  const lastSeen = normalizeApiText(apiEdge.lastSeen) ?? '';
  const rows: TopologyEdgeEvidenceRow[] = [
    {
      label: translateTopology(t, 'topology.evidence.row.from'),
      value: fromNode.label,
      meta: fromNode.entityId
    },
    {
      label: translateTopology(t, 'topology.evidence.row.to'),
      value: toNode.label,
      meta: toNode.entityId
    },
    {
      label: translateTopology(t, 'topology.evidence.row.source'),
      value: relationSource,
      meta: normalizeApiText(apiEdge.status) ?? sourceLabels[edge.source]
    },
    {
      label: translateTopology(t, 'topology.evidence.row.alert-impact'),
      value:
        edge.alertImpact === 'none'
          ? translateTopology(t, 'topology.evidence.alert-impact.none')
          : edge.alertImpact === 'critical'
            ? translateTopology(t, 'topology.evidence.alert-impact.critical')
            : translateTopology(t, 'topology.evidence.alert-impact.warning'),
      meta: apiEdge.score == null ? translateTopology(t, 'topology.evidence.alert-impact.meta') : String(apiEdge.score)
    }
  ];
  if (sampleTraceId) {
    rows.push({
      label: translateTopology(t, 'topology.hover.fact.sample-trace'),
      value: sampleTraceId,
      meta: sampleSpanId ?? sourceLabels[edge.source]
    });
  }
  if (firstSeen) {
    rows.push({
      label: translateTopology(t, 'topology.hover.fact.first-seen'),
      value: firstSeen,
      meta: sourceLabels[edge.source]
    });
  }
  if (lastSeen) {
    rows.push({
      label: translateTopology(t, 'topology.hover.fact.last-seen'),
      value: lastSeen,
      meta: sourceLabels[edge.source]
    });
  }
  return {
    title: edge.label,
    sourceLabel: sourceLabels[edge.source],
    confidence: edge.alertImpact === 'none' ? 'medium' : 'high',
    collectedBy: translateTopology(t, 'topology.evidence.collector.hertzbeat'),
    firstSeen,
    lastSeen,
    sampleTraceId,
    sampleSpanId,
    boundary: translateTopology(t, 'topology.evidence.boundary'),
    alertImpactCopy: translateTopology(t, 'topology.evidence.alert-impact.copy'),
    rows
  };
}

function resolveApiTimelineEdgeId(
  rawEdgeId: string | undefined,
  edgePairs: Array<{ edge: TopologyServiceEdgeSeed; apiEdge: EntityTopologyApiEdge }>
) {
  if (!rawEdgeId) return undefined;
  const match = edgePairs.find(({ edge, apiEdge }) => {
    const apiEdgeId = normalizeApiText(apiEdge.id);
    const relationId = normalizeApiText(apiEdge.relationId);
    return edge.id === rawEdgeId || apiEdgeId === rawEdgeId || relationId === rawEdgeId;
  });
  return match?.edge.id ?? rawEdgeId;
}

function buildApiImpactTimeline(
  apiTimeline: EntityTopologyApiTimelineEvent[] | undefined,
  edgePairs: Array<{ edge: TopologyServiceEdgeSeed; apiEdge: EntityTopologyApiEdge }>,
  sourceLabels: Record<TopologySourceKind, string>,
  t?: Translator
): TopologyImpactTimelineEvent[] {
  return (apiTimeline ?? [])
    .map((event): TopologyImpactTimelineEvent | undefined => {
      const id = normalizeApiText(event.id);
      const title = normalizeApiText(event.title);
      const occurredAt = normalizeApiText(event.occurredAt);
      if (!id || !title || !occurredAt) return undefined;
      const sourceKind = normalizeApiSourceKind(event.sourceKind);
      const edgeId = resolveApiTimelineEdgeId(normalizeApiText(event.edgeId), edgePairs);
      return {
        id,
        edgeId,
        entityId: normalizeApiText(event.entityId),
        sourceKind,
        sourceLabel: sourceLabels[sourceKind],
        eventType: normalizeApiText(event.eventType) ?? 'topology-impact',
        title,
        detail: normalizeApiText(event.detail) ?? translateTopology(t, 'topology.timeline.detail.fallback'),
        actor: normalizeApiText(event.actor) ?? translateTopology(t, 'topology.timeline.actor.system'),
        occurredAt
      };
    })
    .filter((event): event is TopologyImpactTimelineEvent => Boolean(event));
}

export function buildTopologyServiceMapFromApiGraph(
  graph: EntityTopologyApiGraph | null | undefined,
  context: TopologyRouteContext = {},
  t?: Translator
): TopologyServiceMapModel {
  if (!graph?.apiBacked) {
    return buildTopologyServiceMap(context, t);
  }

  const incomingContext = normalizeRouteContext(context);
  const contextDefaults: SignalRouteContext = {
    entityId: incomingContext.entityId,
    entityName: incomingContext.entityName,
    serviceName: incomingContext.serviceName,
    serviceNamespace: incomingContext.serviceNamespace,
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
  const sourceBase = buildTopologySourceBase(t);
  const sourceLabels = Object.fromEntries(sourceBase.map(source => [source.kind, source.label])) as Record<TopologySourceKind, string>;
  const viewModeBase = buildTopologyViewModeBase(t);
  const graphNodes = graph.nodes ?? [];
  const focusEntityId = normalizeApiText(graph.focusEntityId);
  const nodeIdByEntityId = new Map<string, string>();
  const nodeIdByApiNodeId = new Map<string, string>();
  const nodes = graphNodes
    .map((node, index) => {
      const nodeId = normalizeApiNodeId(node.id, node.entityId);
      if (!nodeId) return undefined;
      const entityId = normalizeApiText(node.entityId) ?? nodeId;
      const entityName = normalizeApiText(node.entityName) ?? entityId;
      const focus = Boolean(node.focus || (focusEntityId && entityId === focusEntityId));
      const layout = apiNodeLayout(index, graphNodes.length || 1, focus);
      const health = normalizeApiHealth(node.health);
      const source = normalizeApiSourceKind(node.evidenceBadges?.find(badge => badge !== 'entity-relation') ?? graph.sourceKinds?.[0]);
      nodeIdByEntityId.set(entityId, nodeId);
      const apiNodeId = normalizeApiText(node.id);
      if (apiNodeId) nodeIdByApiNodeId.set(apiNodeId, nodeId);
      return defineTopologyNode({
        id: nodeId,
        entityId,
        entityType: normalizeApiEntityType(node.entityType),
        label: entityName,
        namespace: normalizeApiText(node.namespace) ?? 'default',
        environment: normalizeApiText(node.environment) ?? TOPOLOGY_DEFAULT_ENVIRONMENT,
        source,
        signals: ['metrics', 'logs', 'traces', 'alerts'],
        health,
        evidenceBadges: node.evidenceBadges,
        redMetrics: normalizeTopologyRedMetrics(node.redMetrics),
        activeAlertCount: health === 'critical' || health === 'warning' ? 1 : 0,
        monitorCount: 1,
        healthyMonitorCount: health === 'healthy' ? 1 : 0,
        downMonitorCount: health === 'critical' ? 1 : 0,
        x: layout.x,
        y: layout.y,
        size: layout.size,
        tone: toneFromHealth(health)
      }, contextDefaults, {}, t);
    })
    .filter((node): node is TopologyServiceNode => Boolean(node));
  const ensureTargetRefNode = (targetRef: string, sourceNode: TopologyServiceNode | undefined, edgeSource: TopologySourceKind) => {
    const existing = nodes.find(node => topologyNodeMatchesTarget(node, undefined, targetRef));
    if (existing) return existing.id;
    const nodeId = unresolvedTargetRefNodeId(targetRef);
    if (nodes.some(node => node.id === nodeId)) return nodeId;
    const layout = apiNodeLayout(nodes.length, nodes.length + 1, false);
    nodes.push(defineTopologyNode({
      id: nodeId,
      entityId: targetRef,
      entityType: entityTypeFromTargetRef(targetRef),
      label: targetRef,
      namespace: namespaceFromTargetRef(targetRef, sourceNode?.namespace ?? 'default'),
      environment: sourceNode?.environment ?? normalizeContextValue(incomingContext.environment) ?? TOPOLOGY_DEFAULT_ENVIRONMENT,
      source: edgeSource,
      signals: [],
      health: 'warning',
      evidenceBadges: ['entity-relation', 'unresolved-target-ref'],
      redMetrics: {},
      x: layout.x,
      y: layout.y,
      size: 38,
      tone: 'warning'
    }, contextDefaults, {}, t));
    return nodeId;
  };
  const activeNode =
    findIncomingNode(nodes, incomingContext)
    ?? nodes.find(node => focusEntityId && node.entityId === focusEntityId)
    ?? nodes[0];
  const activeNodeId = activeNode?.id;
  const requestedViewMode = isTopologyViewMode(incomingContext.viewMode) ? incomingContext.viewMode : undefined;
  const requestedSourceKind = normalizeTopologySourceKind(incomingContext.sourceKind);
  const sourceKind = requestedSourceKind;
  const viewMode = requestedViewMode ?? (requestedSourceKind ? 'application' : chooseViewMode(activeNode, incomingContext));
  const groupBy = normalizeTopologyGroupBy(incomingContext.groupBy);
  const edgePairs = (graph.edges ?? [])
    .map(apiEdge => {
      const sourceKey = normalizeApiText(apiEdge.sourceNodeId) ?? normalizeApiText(apiEdge.sourceEntityId);
      const targetKey = normalizeApiText(apiEdge.targetNodeId) ?? normalizeApiText(apiEdge.targetEntityId);
      const from = nodeIdByApiNodeId.get(sourceKey ?? '') ?? nodeIdByEntityId.get(sourceKey ?? '');
      const edgeSource = normalizeApiSourceKind(normalizeApiText(apiEdge.relationSource) ?? graph.sourceKinds?.[0]);
      let to = nodeIdByApiNodeId.get(targetKey ?? '') ?? nodeIdByEntityId.get(targetKey ?? '');
      if (!to) {
        const targetRef = normalizeApiText(apiEdge.targetRef);
        to = targetRef ? ensureTargetRefNode(targetRef, from ? findTopologyNode(nodes, from) : undefined, edgeSource) : undefined;
      }
      if (!from || !to) return undefined;
      const relationshipType = normalizeApiRelationshipType(apiEdge.relationType, edgeSource);
      const alertImpact = apiEdgeAlertImpact(apiEdge);
      const edge: TopologyServiceEdgeSeed = {
        id: buildApiTopologyEdgeId(apiEdge, from, to),
        from,
        to,
        relationshipType,
        source: edgeSource,
        label: normalizeApiText(apiEdge.relationType) ?? sourceLabels[edgeSource],
        alertImpact,
        tone: apiEdgeTone(edgeSource, alertImpact),
        evidenceBadges: normalizeTopologyEvidenceBadges(apiEdge.evidenceBadges, [edgeSource]),
        redMetrics: normalizeTopologyRedMetrics(apiEdge.redMetrics)
      };
      return { edge, apiEdge };
    })
    .filter((pair): pair is { edge: TopologyServiceEdgeSeed; apiEdge: EntityTopologyApiEdge } => Boolean(pair));
  const impactTimeline = buildApiImpactTimeline(graph.impactTimeline, edgePairs, sourceLabels, t);
  const edgeBase = edgePairs.map(pair => pair.edge);
  const targetEdgeId = findTopologyTargetEdgeId(edgeBase, nodes, activeNodeId, incomingContext);
  const targetEdge = edgeBase.find(edge => edge.id === targetEdgeId);
  const requestedEdgeId = normalizeContextValue(incomingContext.edgeId);
  const targetViewMode = targetEdge
    ? edgeMatchesViewMode(targetEdge, 'resource-dependency') ? 'resource-dependency' : 'application'
    : undefined;
  const resolvedViewMode = requestedViewMode ?? targetViewMode ?? viewMode;
  const selectedEdgeId =
    pickCompatibleEdgeId(edgeBase, requestedEdgeId, resolvedViewMode, sourceKind)
    ?? pickCompatibleEdgeId(edgeBase, targetEdgeId, resolvedViewMode, sourceKind);
  const explicitNarrowing = Boolean(requestedViewMode || requestedSourceKind || selectedEdgeId);
  const linkControlContext: TopologyControlContext = explicitNarrowing ? { viewMode: resolvedViewMode, sourceKind, edgeId: selectedEdgeId } : {};
  const linkedNodes = explicitNarrowing
    ? nodes.map(node => defineTopologyNode(node, contextDefaults, linkControlContext, t))
    : nodes;
  const hasNarrowing = Boolean(activeNodeId || explicitNarrowing || resolvedViewMode !== 'application');
  const activeNodeRelatedIds = buildRelatedNodeIds(activeNodeId, edgeBase);
  const edges: TopologyServiceEdge[] = edgePairs.map(({ edge, apiEdge }) => {
    const matchesControl = edgeMatchesViewMode(edge, resolvedViewMode) && edgeMatchesSource(edge, sourceKind);
    const matchesActiveNode = Boolean(activeNodeId && (edge.from === activeNodeId || edge.to === activeNodeId));
    const activeByNode = activeNodeId && !explicitNarrowing ? matchesActiveNode : matchesActiveNode && matchesControl;
    const activeByControl = !activeNodeId && Boolean(requestedViewMode || sourceKind) && matchesControl;
    const selected = edge.id === selectedEdgeId;
    const fromNode = findTopologyNode(linkedNodes, edge.from);
    const toNode = findTopologyNode(linkedNodes, edge.to);
    const evidence = buildApiTopologyEdgeEvidence(edge, apiEdge, fromNode, toNode, sourceLabels, t);
    return {
      ...edge,
      evidenceBadges: normalizeTopologyEvidenceBadges(edge.evidenceBadges, [edge.source]),
      redMetrics: normalizeTopologyRedMetrics(edge.redMetrics),
      focus: selected || activeByNode || activeByControl ? 'active-path' : hasNarrowing ? 'context-muted' : 'normal',
      selected,
      drilldownHref: buildTopologyControlHref(incomingContext, {
        viewMode: resolvedViewMode,
        sourceKind,
        edgeId: edge.id
      }),
      evidence,
      links: buildTopologyEdgeLinks(edge, fromNode, toNode, { ...linkControlContext, edgeId: edge.id }, resolvedViewMode, sourceKind, evidence)
    };
  });
  const narrowedNodeIds = buildNarrowedNodeIds(edges);
  const focusedNodes = linkedNodes.map(node => {
    if (!hasNarrowing) return node;
    if (node.id === activeNodeId) return { ...node, focus: 'active' as const };
    if (narrowedNodeIds.has(node.id) || activeNodeRelatedIds.has(node.id)) return { ...node, focus: 'related' as const };
    return { ...node, focus: 'dimmed' as const };
  });
  const viewModes = viewModeBase.map(mode => ({
    ...mode,
    active: mode.key === resolvedViewMode,
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
      viewMode: source.kind === 'alert-impact' ? 'alert-impact' : resolvedViewMode,
      sourceKind: source.kind,
      edgeId: pickCompatibleEdgeId(
        edgeBase,
        selectedEdgeId,
        source.kind === 'alert-impact' ? 'alert-impact' : resolvedViewMode,
        source.kind
      )
    })
  }));
  const filterContext: TopologyFilterContext = {
    environment: normalizeContextValue(incomingContext.environment) ?? activeNode?.environment ?? TOPOLOGY_DEFAULT_ENVIRONMENT,
    timeRange: normalizeContextValue(incomingContext.timeRange) ?? TOPOLOGY_TIME_RANGE,
    search: firstContextText(incomingContext.serviceName, incomingContext.entityName, activeNode?.label),
    viewMode: resolvedViewMode,
    groupBy,
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
  const alertImpactHref = buildAlertImpactHref(incomingContext, resolvedViewMode, sourceKind, selectedEdgeId);

  return {
    dataSource: 'api',
    apiDepth: typeof graph.depth === 'number' && Number.isFinite(graph.depth) ? Math.max(0, Math.floor(graph.depth)) : undefined,
    productIdentity: translateTopology(t, 'topology.identity'),
    incomingContext,
    faultContextRows,
    filterContext,
    activeNodeId,
    selectedEdgeId,
    selectedEdge: edges.find(edge => edge.id === selectedEdgeId),
    alertImpactHref,
    sources,
    viewModes,
    impactTimeline,
    nodes: focusedNodes,
    edges
  };
}

export function buildTopologyServiceMap(context: TopologyRouteContext = {}, t?: Translator): TopologyServiceMapModel {
  const incomingContext = normalizeRouteContext(context);
  const contextDefaults: SignalRouteContext = {
    entityId: incomingContext.entityId,
    entityName: incomingContext.entityName,
    serviceName: incomingContext.serviceName,
    serviceNamespace: incomingContext.serviceNamespace,
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
  const sourceBase = buildTopologySourceBase(t);
  const sourceLabels = Object.fromEntries(sourceBase.map(source => [source.kind, source.label])) as Record<TopologySourceKind, string>;
  const viewModeBase = buildTopologyViewModeBase(t);

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
      label: translateTopology(t, 'topology.node.http-template'),
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
      label: translateTopology(t, 'topology.edge.application-ownership'),
      alertImpact: 'none',
      tone: 'green'
    },
    {
      id: buildTopologyEdgeId('app-commerce', 'svc-checkout'),
      from: 'app-commerce',
      to: 'svc-checkout',
      relationshipType: 'manual-ownership',
      source: 'cmdb-manual-label',
      label: translateTopology(t, 'topology.edge.application-ownership'),
      alertImpact: 'warning',
      tone: 'orange'
    },
    {
      id: buildTopologyEdgeId('svc-frontend', 'svc-checkout'),
      from: 'svc-frontend',
      to: 'svc-checkout',
      relationshipType: 'trace-call',
      source: 'otlp-trace-call',
      label: translateTopology(t, 'topology.edge.http-call'),
      alertImpact: 'warning',
      tone: 'blue'
    },
    {
      id: buildTopologyEdgeId('monitor-checkout', 'svc-checkout'),
      from: 'monitor-checkout',
      to: 'svc-checkout',
      relationshipType: 'monitors',
      source: 'monitor-ownership',
      label: translateTopology(t, 'topology.edge.monitor-ownership'),
      alertImpact: 'warning',
      tone: 'green'
    },
    {
      id: buildTopologyEdgeId('k8s-checkout-workload', 'svc-checkout'),
      from: 'k8s-checkout-workload',
      to: 'svc-checkout',
      relationshipType: 'k8s-ownership',
      source: 'k8s-workload',
      label: translateTopology(t, 'topology.edge.runtime-ownership'),
      alertImpact: 'none',
      tone: 'purple'
    },
    {
      id: buildTopologyEdgeId('svc-checkout', 'res-orders-db'),
      from: 'svc-checkout',
      to: 'res-orders-db',
      relationshipType: 'database-connection',
      source: 'database-middleware-connection',
      label: translateTopology(t, 'topology.edge.orders-db-connection'),
      alertImpact: 'critical',
      tone: 'red'
    },
    {
      id: buildTopologyEdgeId('svc-checkout', 'res-redis'),
      from: 'svc-checkout',
      to: 'res-redis',
      relationshipType: 'middleware-connection',
      source: 'template-dependency',
      label: translateTopology(t, 'topology.edge.cache-template-dependency'),
      alertImpact: 'warning',
      tone: 'orange'
    }
  ];
  const activeNode = findIncomingNode(nodes, incomingContext);
  const activeNodeId = activeNode?.id;
  const requestedViewMode = isTopologyViewMode(incomingContext.viewMode) ? incomingContext.viewMode : undefined;
  const sourceKind = normalizeTopologySourceKind(incomingContext.sourceKind);
  const viewMode = requestedViewMode ?? (sourceKind ? 'application' : chooseViewMode(activeNode, incomingContext));
  const groupBy = normalizeTopologyGroupBy(incomingContext.groupBy);
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
    const evidence = buildTopologyEdgeEvidence(edge, fromNode, toNode, sourceLabels, t);
    return {
      ...edge,
      evidenceBadges: normalizeTopologyEvidenceBadges(edge.evidenceBadges, [edge.source]),
      redMetrics: normalizeTopologyRedMetrics(edge.redMetrics),
      focus: selected || activeByNode || activeByControl ? 'active-path' : hasNarrowing ? 'context-muted' : 'normal',
      selected,
      drilldownHref: buildTopologyControlHref(incomingContext, {
        viewMode,
        sourceKind,
        edgeId: edge.id
      }),
      evidence,
      links: buildTopologyEdgeLinks(edge, fromNode, toNode, { ...linkControlContext, edgeId: edge.id }, viewMode, sourceKind, evidence)
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
    groupBy,
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
    dataSource: 'static-fallback',
    productIdentity: translateTopology(t, 'topology.identity'),
    incomingContext,
    faultContextRows,
    filterContext,
    activeNodeId,
    selectedEdgeId,
    selectedEdge,
    alertImpactHref,
    sources,
    viewModes,
    impactTimeline: [],
    nodes: focusedNodes,
    edges
  };
}
