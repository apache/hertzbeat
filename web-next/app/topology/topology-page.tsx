'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  HzTopologyActionLink,
  HzTopologyWorkbenchFrame,
  HzTopologyWorkbenchHeader,
  HzTopologyWorkbenchGrid,
  HzTopologyWorkbenchSlot,
  HzTopologyCanvas,
  HzTopologyCanvasAnnotation,
  HzTopologyCompanionRail,
  HzTopologyCompanionSection,
  HzTopologyCompanionJumpList,
  HzTopologyDetailDrawer,
  HzTopologyEmptyState,
  HzTopologyLoadingState,
  HzTopologyEvidenceList,
  HzTopologyFilterStrip,
  HzTopologyFocusTrail,
  HzTopologyGroupPanel,
  HzTopologyPathSummary,
  HzTopologyHoverTooltip,
  HzTopologyLegend,
  HzTopologyMetricTable,
  HzTopologyScopeBar,
  HzTopologySectionLabel,
  HzTopologyToolbar,
  type HzStatusTone,
  type HzTopologyCanvasDrawerMode,
  type HzTopologyCanvasFocusDepth,
  type HzTopologyDetailDrawerAction,
  type HzTopologyDetailDrawerFact,
  type HzTopologyGroupPanelItem,
  type HzTopologyPathSummaryMetric,
  type HzTopologyHoverTooltipFact,
  type HzTopologyHoverTooltipMetric,
  type HzTopologyMetricRow,
  type HzTopologyMetricTableRenderWindowFilter,
  type HzTopologyToolbarStateItem
} from '@hertzbeat/ui';
import {
  HzTopologyG6Canvas,
  buildHzTopologyG6LargeGraphStrategy,
  buildHzTopologyG6RenderWindow,
  type HzTopologyG6GraphInput,
  type HzTopologyG6HoverAnchor
} from '@hertzbeat/ui/topology-g6';
import { useI18n } from '../../components/providers/i18n-provider';
import { api } from '../../lib/api-facade';
import { buildTopologyApiUrl, loadTopologyGraph, resolveTopologyRelationType } from '../../lib/topology-surface/controller';
import {
  buildTopologyServiceMapFromApiGraph,
  type EntityTopologyApiGraph,
  type TopologyFilterContext,
  type TopologyRedMetrics,
  type TopologyRouteContext,
  type TopologyServiceEdge,
  type TopologyServiceNode
} from '../../lib/topology-surface/view-model';

type TopologyLocalSelectionSource = 'none' | 'node-click' | 'edge-click' | 'table-row-click';
type TopologyLayoutMode = 'layered-service' | 'force' | 'grid-table';

function findNode(nodes: TopologyServiceNode[], id: string) {
  return nodes.find(node => node.id === id);
}

function findEdge(edges: TopologyServiceEdge[], id: string) {
  return edges.find(edge => edge.id === id);
}

function formatTimeRange(timeRange: string, t: (key: string) => string) {
  if (timeRange === 'last-1h') return t('topology.time.last-1h');
  return timeRange;
}

function formatTopologyDepth(depth: number | undefined, t: (key: string, params?: Record<string, string | number>) => string) {
  if (depth === 1) return t('topology.state.depth.one-hop');
  if (depth === 2) return t('topology.state.depth.two-hop');
  if (typeof depth === 'number' && Number.isFinite(depth)) {
    return t('topology.state.depth.n-hop', { depth });
  }
  return t('topology.state.depth.auto');
}

function formatTopologyCanvasFocusDepth(depth: number | undefined): HzTopologyCanvasFocusDepth {
  if (depth === 1) return '1-hop';
  if (depth === 2) return '2-hop';
  if (typeof depth === 'number' && Number.isFinite(depth)) return 'auto';
  return 'auto';
}

function formatCompactMetricNumber(value: number, maximumFractionDigits = 2) {
  return value.toLocaleString('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0
  });
}

function formatRequestRateMetric(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? `${formatCompactMetricNumber(value)}/s` : undefined;
}

function formatErrorRateMetric(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const percentValue = Math.abs(value) <= 1 ? value * 100 : value;
  return `${formatCompactMetricNumber(percentValue)}%`;
}

function formatLatencyMetric(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? `${formatCompactMetricNumber(value)} ms` : undefined;
}

function buildRedMetricRows(metrics: TopologyRedMetrics, t: (key: string) => string) {
  return [
    {
      key: 'request-rate',
      label: t('topology.red.request-rate'),
      value: formatRequestRateMetric(metrics.requestRatePerSecond)
    },
    {
      key: 'error-rate',
      label: t('topology.red.error-rate'),
      value: formatErrorRateMetric(metrics.errorRate)
    },
    {
      key: 'latency-p95',
      label: t('topology.red.latency-p95'),
      value: formatLatencyMetric(metrics.latencyP95Ms)
    }
  ].filter((row): row is { key: string; label: string; value: string } => Boolean(row.value));
}

function buildTopologyHoverTooltipFacts(
  edge: TopologyServiceEdge,
  fromNode: TopologyServiceNode,
  toNode: TopologyServiceNode,
  routeContext: TopologyRouteContext | undefined,
  t: (key: string) => string
): HzTopologyHoverTooltipFact[] {
  const facts: HzTopologyHoverTooltipFact[] = [
    {
      id: 'source',
      label: t('topology.evidence.row.from'),
      value: fromNode.label,
      meta: fromNode.entityId
    },
    {
      id: 'target',
      label: t('topology.evidence.row.to'),
      value: toNode.label,
      meta: toNode.entityId
    },
    {
      id: 'relation-type',
      label: t('topology.hover.fact.relation-type'),
      value: edge.relationshipType
    }
  ];
  if (edge.evidence.firstSeen) {
    facts.push({
      id: 'first-seen',
      label: t('topology.hover.fact.first-seen'),
      value: edge.evidence.firstSeen,
      meta: edge.evidence.sourceLabel
    });
  }
  facts.push({
    id: 'last-seen',
    label: t('topology.hover.fact.last-seen'),
    value: edge.evidence.lastSeen || routeContext?.timeRange || t('topology.state.depth.auto'),
    meta: edge.evidence.sourceLabel
  });
  const sampleTraceId = edge.evidence.sampleTraceId || routeContext?.traceId;
  const sampleSpanId = edge.evidence.sampleSpanId || routeContext?.spanId;
  if (sampleTraceId) {
    facts.push({
      id: 'sample-trace',
      label: t('topology.hover.fact.sample-trace'),
      value: sampleTraceId,
      meta: sampleSpanId
    });
  }
  return facts;
}

function buildTopologyHoverTooltipMetrics(edge: TopologyServiceEdge, t: (key: string) => string): HzTopologyHoverTooltipMetric[] {
  return buildRedMetricRows(edge.redMetrics, t).map(row => ({
    id: row.key,
    label: row.label,
    value: row.value,
    tone: row.key === 'error-rate' ? 'warning' : 'info'
  }));
}

function buildTopologyPathSummaryMetrics(edge: TopologyServiceEdge, t: (key: string) => string): HzTopologyPathSummaryMetric[] {
  return buildRedMetricRows(edge.redMetrics, t).map(row => ({
    id: row.key,
    label: row.label,
    value: row.value,
    tone: row.key === 'error-rate' || row.key === 'latency-p95' ? 'warning' : 'info'
  }));
}

function topologyMetricTone(edge: TopologyServiceEdge): HzStatusTone {
  if (edge.alertImpact === 'critical' || edge.tone === 'red') return 'critical';
  if (edge.alertImpact === 'warning' || edge.tone === 'orange') return 'warning';
  if (edge.tone === 'green') return 'success';
  return 'info';
}

function topologyNodeHealthTone(node: TopologyServiceNode): HzStatusTone {
  if (node.health === 'critical' || node.tone === 'red') return 'critical';
  if (node.health === 'warning' || node.tone === 'orange') return 'warning';
  if (node.health === 'healthy' || node.tone === 'green') return 'success';
  return 'neutral';
}

function buildTopologyNodeNeighborEvidence(
  node: TopologyServiceNode,
  nodes: TopologyServiceNode[],
  edges: TopologyServiceEdge[]
) {
  const nodeById = new Map(nodes.map(item => [item.id, item]));
  const upstreamNodeIds = edges.filter(edge => edge.to === node.id).map(edge => edge.from);
  const downstreamNodeIds = edges.filter(edge => edge.from === node.id).map(edge => edge.to);
  const formatLabels = (ids: string[]) => ids.map(id => nodeById.get(id)?.label ?? id).join(', ');

  return {
    upstreamNodeIds,
    downstreamNodeIds,
    upstreamLabels: formatLabels(upstreamNodeIds),
    downstreamLabels: formatLabels(downstreamNodeIds)
  };
}

function countUniqueTopologyValues(values: Array<string | undefined>) {
  return new Set(values.filter((value): value is string => Boolean(value))).size;
}

function topologyWorstGroupTone(nodes: TopologyServiceNode[]): HzTopologyGroupPanelItem['worstTone'] {
  if (nodes.some(node => node.health === 'critical' || node.tone === 'danger')) return 'danger';
  if (nodes.some(node => node.health === 'warning' || node.tone === 'warning')) return 'warning';
  if (nodes.some(node => node.health === 'healthy' || node.tone === 'success')) return 'success';
  return 'neutral';
}

function buildTopologyGroupPanelItems({
  nodes,
  edges,
  activeSourceLabel,
  primaryNode,
  hiddenCount,
  t
}: {
  nodes: TopologyServiceNode[];
  edges: TopologyServiceEdge[];
  activeSourceLabel?: string;
  primaryNode?: TopologyServiceNode;
  hiddenCount: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}): HzTopologyGroupPanelItem[] {
  const sourceKinds = countUniqueTopologyValues(edges.map(edge => edge.source));
  return [
    {
      id: 'entity-type',
      label: t('topology.group-panel.entity-type'),
      value: primaryNode?.entityType ?? t('topology.all-entities'),
      count: countUniqueTopologyValues(nodes.map(node => node.entityType)),
      collapsedCount: hiddenCount,
      collapsedLabel: t('topology.group-panel.collapsed-count', { count: hiddenCount }),
      worstTone: topologyWorstGroupTone(nodes),
      active: true,
      meta: t('topology.group-panel.node-count', { count: nodes.length })
    },
    {
      id: 'environment',
      label: t('topology.group-panel.environment'),
      value: nodes[0]?.environment ?? t('topology.environment.all'),
      count: countUniqueTopologyValues(nodes.map(node => node.environment)),
      collapsedCount: 0,
      collapsedLabel: t('topology.group-panel.collapsed-count', { count: 0 }),
      worstTone: topologyWorstGroupTone(nodes),
      active: false,
      meta: t('topology.group-panel.active-scope')
    },
    {
      id: 'source-kind',
      label: t('topology.group-panel.source-kind'),
      value: activeSourceLabel ?? t('topology.focus-trail.source.all'),
      count: sourceKinds,
      collapsedCount: Math.max(0, sourceKinds - 1),
      collapsedLabel: t('topology.group-panel.collapsed-count', { count: Math.max(0, sourceKinds - 1) }),
      worstTone: edges.some(edge => edge.alertImpact === 'critical') ? 'danger' : edges.some(edge => edge.alertImpact === 'warning') ? 'warning' : 'success',
      active: Boolean(activeSourceLabel),
      meta: t('topology.group-panel.edge-count', { count: edges.length })
    }
  ];
}

function buildTopologyMetricRows(edges: TopologyServiceEdge[], nodes: TopologyServiceNode[]): HzTopologyMetricRow[] {
  return edges.map(edge => {
    const fromNode = findNode(nodes, edge.from);
    const toNode = findNode(nodes, edge.to);
    return {
      id: edge.id,
      sourceNodeId: edge.from,
      targetNodeId: edge.to,
      source: fromNode?.label ?? edge.from,
      target: toNode?.label ?? edge.to,
      relationType: edge.label,
      sourceKind: edge.evidence.sourceLabel,
      requestRatePerSecond: edge.redMetrics.requestRatePerSecond,
      requestCount: edge.redMetrics.requestCount,
      errorRate: edge.redMetrics.errorRate,
      errorCount: edge.redMetrics.errorCount,
      latencyP95Ms: edge.redMetrics.latencyP95Ms,
      latencyAvgMs: edge.redMetrics.latencyAvgMs,
      evidenceBadges: edge.evidenceBadges,
      tone: topologyMetricTone(edge)
    };
  });
}

function hasTraceRedMetrics(edge: TopologyServiceEdge) {
  return [
    edge.redMetrics.requestRatePerSecond,
    edge.redMetrics.requestCount,
    edge.redMetrics.errorRate,
    edge.redMetrics.errorCount,
    edge.redMetrics.latencyP95Ms,
    edge.redMetrics.latencyAvgMs
  ].some(value => typeof value === 'number' && Number.isFinite(value));
}

function pickTopologyDetailEdge(map: ReturnType<typeof buildTopologyServiceMapFromApiGraph>) {
  return map.selectedEdge ?? map.edges.find(hasTraceRedMetrics) ?? map.edges[0];
}

function appendTopologySelectionParam(params: URLSearchParams, key: string, value: string | undefined) {
  const trimmed = value?.trim();
  if (trimmed) params.set(key, trimmed);
}

function withTopologyGroupByHref(href: string, groupBy: string) {
  const [pathname, search = ''] = href.split('?');
  const params = new URLSearchParams(search);
  params.set('groupBy', groupBy);
  return `${pathname}?${params.toString()}`;
}

function buildTopologyNodeSelectionHref(
  node: TopologyServiceNode,
  map: ReturnType<typeof buildTopologyServiceMapFromApiGraph>,
  routeContext?: TopologyRouteContext,
  options: { depth?: number } = {}
) {
  const params = new URLSearchParams();
  params.set('entityId', node.entityId);
  params.set('entityName', node.label);
  params.set('serviceName', node.label);
  params.set('serviceNamespace', node.namespace);
  params.set('environment', node.environment || map.filterContext.environment);
  params.set('timeRange', map.filterContext.timeRange);
  params.set('viewMode', map.filterContext.viewMode);
  if (map.filterContext.sourceKind) params.set('sourceKind', map.filterContext.sourceKind);
  if (map.filterContext.groupBy !== 'none') params.set('groupBy', map.filterContext.groupBy);
  const nextDepth = options.depth ?? map.apiDepth;
  if (typeof nextDepth === 'number') params.set('depth', String(nextDepth));
  appendTopologySelectionParam(params, 'start', routeContext?.start);
  appendTopologySelectionParam(params, 'end', routeContext?.end);
  appendTopologySelectionParam(params, 'refresh', routeContext?.refresh);
  appendTopologySelectionParam(params, 'live', routeContext?.live);
  appendTopologySelectionParam(params, 'tz', routeContext?.tz);
  appendTopologySelectionParam(params, 'relationType', routeContext?.relationType);
  appendTopologySelectionParam(params, 'hideInternal', routeContext?.hideInternal);
  return `/topology?${params.toString()}`;
}

function navigateTopologyFocus(href: string | undefined, navigate: (href: string) => void) {
  if (!href) return;
  navigate(href);
}

function buildTopologyScopeHref(baseParams: URLSearchParams, updates: Record<string, string | undefined>) {
  const params = new URLSearchParams(baseParams);
  Object.entries(updates).forEach(([key, value]) => {
    if (!value || (key === 'groupBy' && value === 'none')) {
      params.delete(key);
      return;
    }
    params.set(key, value);
  });
  const query = params.toString();
  return query ? `/topology?${query}` : '/topology';
}

const TOPOLOGY_EDGE_FACT_IDS = [
  'source-entity',
  'target-entity',
  'collection-evidence',
  'alert-impact',
  'sample-trace',
  'first-seen',
  'last-seen'
];

function buildTopologyEdgeDetailFacts(
  edge: TopologyServiceEdge,
  t: (key: string) => string
): HzTopologyDetailDrawerFact[] {
  return [
    ...edge.evidence.rows.map((row, index) => ({
      id: TOPOLOGY_EDGE_FACT_IDS[index] ?? `evidence-${index + 1}`,
      label: row.label,
      value: row.value,
      meta: row.meta
    })),
    ...buildRedMetricRows(edge.redMetrics, t).map(row => ({
      id: row.key,
      label: row.label,
      value: row.value,
      meta: t('topology.red.source.trace-service-graph'),
      tone: row.key === 'error-rate' ? 'warning' as const : 'info' as const,
      factProps: { 'data-topology-edge-red-metric': row.key } as React.HTMLAttributes<HTMLDivElement>
    }))
  ];
}

function buildTopologyEdgeDetailActions(edge: TopologyServiceEdge, t: (key: string) => string): HzTopologyDetailDrawerAction[] {
  return [
    {
      id: 'from-entity',
      'data-topology-edge-link': 'from-entity',
      href: edge.links.fromEntityHref,
      label: t('topology.edge.link.from-entity')
    },
    {
      id: 'to-entity',
      'data-topology-edge-link': 'to-entity',
      href: edge.links.toEntityHref,
      label: t('topology.edge.link.to-entity')
    },
    {
      id: 'alert-impact',
      'data-topology-edge-link': 'alert-impact',
      href: edge.links.alertImpactHref,
      label: t('topology.edge.link.alert-impact'),
      emphasis: 'primary',
      copy: edge.evidence.alertImpactCopy,
      copyProps: { 'data-topology-edge-link-copy': 'alert-impact' } as React.HTMLAttributes<HTMLSpanElement>
    }
  ];
}

function buildTopologyEdgeSignalActions(edge: TopologyServiceEdge, t: (key: string) => string): HzTopologyDetailDrawerAction[] {
  return [
    {
      id: 'metrics',
      'data-topology-edge-link': 'metrics',
      href: edge.links.metricsHref,
      label: t('topology.edge.link.metrics'),
      emphasis: 'primary'
    },
    {
      id: 'logs',
      'data-topology-edge-link': 'logs',
      href: edge.links.logsHref,
      label: t('topology.edge.link.logs')
    },
    {
      id: 'traces',
      'data-topology-edge-link': 'traces',
      href: edge.links.tracesHref,
      label: t('topology.edge.link.traces')
    }
  ];
}

function buildTopologyNodeDetailFacts(
  node: TopologyServiceNode,
  neighborEvidence: ReturnType<typeof buildTopologyNodeNeighborEvidence>,
  t: (key: string, params?: Record<string, string | number>) => string
): HzTopologyDetailDrawerFact[] {
  return [
    {
      id: 'entity-id',
      label: t('topology.current-entity.fact.entity-id'),
      value: node.entityId,
      meta: node.entityType
    },
    {
      id: 'namespace',
      label: t('topology.current-entity.fact.namespace'),
      value: `${node.namespace} / ${node.environment}`
    },
    {
      id: 'signals',
      label: t('topology.current-entity.fact.signals'),
      value: node.signals.join(', ')
    },
    {
      id: 'health',
      label: t('topology.current-entity.fact.health'),
      value: node.healthAffordance.label,
      meta: node.healthAffordance.copy,
      tone: topologyNodeHealthTone(node),
      factProps: { 'data-topology-current-entity-health': 'lightweight-service-health' } as React.HTMLAttributes<HTMLDivElement>
    },
    {
      id: 'upstream-dependencies',
      label: t('topology.current-entity.fact.upstream'),
      value: neighborEvidence.upstreamLabels || t('topology.current-entity.fact.neighbor.none'),
      meta: t('topology.current-entity.fact.neighbor-count', { count: neighborEvidence.upstreamNodeIds.length }),
      factProps: {
        'data-topology-current-entity-neighbor-evidence': 'upstream',
        'data-topology-current-entity-neighbor-count': String(neighborEvidence.upstreamNodeIds.length),
        'data-topology-current-entity-neighbor-node-ids': neighborEvidence.upstreamNodeIds.join(' ') || 'none'
      } as React.HTMLAttributes<HTMLDivElement>
    },
    {
      id: 'downstream-dependencies',
      label: t('topology.current-entity.fact.downstream'),
      value: neighborEvidence.downstreamLabels || t('topology.current-entity.fact.neighbor.none'),
      meta: t('topology.current-entity.fact.neighbor-count', { count: neighborEvidence.downstreamNodeIds.length }),
      factProps: {
        'data-topology-current-entity-neighbor-evidence': 'downstream',
        'data-topology-current-entity-neighbor-count': String(neighborEvidence.downstreamNodeIds.length),
        'data-topology-current-entity-neighbor-node-ids': neighborEvidence.downstreamNodeIds.join(' ') || 'none'
      } as React.HTMLAttributes<HTMLDivElement>
    },
    ...buildRedMetricRows(node.redMetrics, t).map(row => ({
      id: row.key,
      label: row.label,
      value: row.value,
      meta: t('topology.red.source.trace-service-graph'),
      tone: row.key === 'error-rate' ? 'warning' as const : 'info' as const,
      factProps: { 'data-topology-current-entity-red-metric': row.key } as React.HTMLAttributes<HTMLDivElement>
    }))
  ];
}

function buildTopologyCurrentNodeHandoffProps(
  node: TopologyServiceNode,
  filterContext: TopologyFilterContext,
  target: string,
  depth?: number
) {
  return {
    'data-topology-current-entity-handoff-owner': 'hertzbeat-ui-current-node-handoff',
    'data-topology-current-entity-handoff-target': target,
    'data-topology-current-entity-handoff-node-id': node.id,
    'data-topology-current-entity-handoff-entity-id': node.entityId,
    'data-topology-current-entity-handoff-source-kind': filterContext.sourceKind ?? 'all',
    'data-topology-current-entity-handoff-group-by': filterContext.groupBy,
    'data-topology-current-entity-handoff-view-mode': filterContext.viewMode,
    'data-topology-current-entity-handoff-environment': filterContext.environment,
    'data-topology-current-entity-handoff-time-range': filterContext.timeRange,
    'data-topology-current-entity-handoff-depth': depth ?? 'unknown'
  } as React.AnchorHTMLAttributes<HTMLAnchorElement>;
}

function buildTopologyNodeDetailActions(
  node: TopologyServiceNode,
  filterContext: TopologyFilterContext,
  depth: number | undefined,
  t: (key: string) => string
): HzTopologyDetailDrawerAction[] {
  return [
    {
      id: 'entity',
      'data-topology-context-link': 'entity',
      ...buildTopologyCurrentNodeHandoffProps(node, filterContext, 'entity', depth),
      href: node.links.entityHref,
      label: t('topology.context-link.entity'),
      emphasis: 'primary'
    }
  ];
}

function buildTopologyNodeSignalActions(
  node: TopologyServiceNode,
  filterContext: TopologyFilterContext,
  depth: number | undefined,
  t: (key: string) => string
): HzTopologyDetailDrawerAction[] {
  return [
    {
      id: 'metrics',
      'data-topology-context-link': 'metrics',
      ...buildTopologyCurrentNodeHandoffProps(node, filterContext, 'metrics', depth),
      href: node.links.metricsHref,
      label: t('topology.context-link.metrics'),
      emphasis: 'primary'
    },
    {
      id: 'logs',
      'data-topology-context-link': 'logs',
      ...buildTopologyCurrentNodeHandoffProps(node, filterContext, 'logs', depth),
      href: node.links.logsHref,
      label: t('topology.context-link.logs')
    },
    {
      id: 'traces',
      'data-topology-context-link': 'traces',
      ...buildTopologyCurrentNodeHandoffProps(node, filterContext, 'traces', depth),
      href: node.links.tracesHref,
      label: t('topology.context-link.traces')
    }
  ];
}

function buildApiOwnedEmptyGraph(routeContext?: TopologyRouteContext): EntityTopologyApiGraph {
  const focusEntityId = routeContext?.entityId?.trim();
  const routeDepth = Number(routeContext?.depth);
  return {
    apiBacked: true,
    focusEntityId: focusEntityId && /^\d+$/.test(focusEntityId) ? focusEntityId : null,
    depth: Number.isFinite(routeDepth) ? Math.max(0, Math.floor(routeDepth)) : 2,
    sourceKinds: routeContext?.sourceKind ? [routeContext.sourceKind] : [],
    nodes: [],
    edges: [],
    impactTimeline: []
  };
}

const TRACE_CALL_TOPOLOGY_API_TIMEOUT_MS = 60000;
const DEFAULT_TOPOLOGY_API_TIMEOUT_MS = 30000;

function resolveTopologyApiTimeoutMs(routeContext?: TopologyRouteContext) {
  if (routeContext?.sourceKind === 'otlp-trace-call' || routeContext?.viewMode === 'service-call') {
    return TRACE_CALL_TOPOLOGY_API_TIMEOUT_MS;
  }
  return DEFAULT_TOPOLOGY_API_TIMEOUT_MS;
}

export default function TopologyPage({
  routeContext,
  apiGraph
}: {
  routeContext?: TopologyRouteContext;
  apiGraph?: EntityTopologyApiGraph | null;
} = {}) {
  const topologyRouter = useRouter();
  const { t } = useI18n();
  const routeContextKey = React.useMemo(() => JSON.stringify(routeContext ?? {}), [routeContext]);
  const [loadedApiGraph, setLoadedApiGraph] = React.useState<EntityTopologyApiGraph | null | undefined>(apiGraph);
  const [topologyLayout] = React.useState<TopologyLayoutMode>('layered-service');
  const [topologySearchQuery, setTopologySearchQuery] = React.useState<string | undefined>(undefined);
  const apiOwnedEmptyGraph = React.useMemo(() => buildApiOwnedEmptyGraph(routeContext), [routeContext]);

  React.useEffect(() => {
    if (apiGraph !== undefined) {
      setLoadedApiGraph(apiGraph);
      return undefined;
    }
    let mounted = true;
    void loadTopologyGraph(api.topology.request, routeContext ?? {}, { timeoutMs: resolveTopologyApiTimeoutMs(routeContext) })
      .then(graph => {
        if (mounted) setLoadedApiGraph(graph);
      })
      .catch(() => {
        if (mounted) setLoadedApiGraph(null);
      });
    return () => {
      mounted = false;
    };
  }, [apiGraph, apiOwnedEmptyGraph, routeContext, routeContextKey]);

  const map = React.useMemo(
    () => buildTopologyServiceMapFromApiGraph(loadedApiGraph ?? apiOwnedEmptyGraph, routeContext, t),
    [apiOwnedEmptyGraph, loadedApiGraph, routeContext, t]
  );
  const topologyEffectiveSearchQuery = topologySearchQuery ?? map.filterContext.search;
  const topologyIsPending = loadedApiGraph === undefined;
  const topologyTraceCallScope = map.filterContext.sourceKind === 'otlp-trace-call' || map.filterContext.viewMode === 'service-call';
  const topologyTraceCallMissingEdges =
    map.dataSource === 'api' &&
    !topologyIsPending &&
    loadedApiGraph !== null &&
    map.filterContext.sourceKind === 'otlp-trace-call' &&
    map.edges.length === 0;
  const topologyCanvasNodes = React.useMemo(
    () => (topologyTraceCallMissingEdges ? [] : map.nodes),
    [map.nodes, topologyTraceCallMissingEdges]
  );
  const topologyCanvasEdges = React.useMemo(
    () => (topologyTraceCallMissingEdges ? [] : map.edges),
    [map.edges, topologyTraceCallMissingEdges]
  );
  const topologyTraceCallEdges = map.edges.filter(edge => edge.source === 'otlp-trace-call' || edge.relationshipType === 'trace-call');
  const topologyTraceCallRedEdgeCount = topologyTraceCallEdges.filter(edge =>
    edge.redMetrics.requestRatePerSecond != null &&
    edge.redMetrics.errorRate != null &&
    edge.redMetrics.latencyP95Ms != null
  ).length;
  const topologyTraceCallWindowEdgeCount = topologyTraceCallEdges.filter(edge =>
    Boolean(edge.evidence.firstSeen && edge.evidence.lastSeen)
  ).length;
  const topologyTraceCallSampleEdgeCount = topologyTraceCallEdges.filter(edge =>
    Boolean(edge.evidence.sampleTraceId || edge.evidence.sampleSpanId)
  ).length;
  const topologyTraceCallState =
    topologyIsPending && topologyTraceCallScope
      ? 'pending'
      : loadedApiGraph === null && topologyTraceCallScope
        ? 'degraded'
        : topologyTraceCallMissingEdges
          ? 'missing-edges'
          : topologyTraceCallEdges.length > 0
            ? 'ready'
            : 'none';
  const topologyTraceCallRedState =
    topologyTraceCallState === 'pending' || topologyTraceCallState === 'degraded' || topologyTraceCallState === 'missing-edges'
      ? topologyTraceCallState
      : topologyTraceCallEdges.length === 0
      ? topologyTraceCallMissingEdges
        ? 'missing-edges'
        : 'none'
      : topologyTraceCallRedEdgeCount === topologyTraceCallEdges.length
        ? 'ready'
        : 'partial';
  const topologyApiRequestPath = buildTopologyApiUrl(routeContext ?? {});
  const topologyApiRequestTimeoutMs = resolveTopologyApiTimeoutMs(routeContext);
  const topologyApiScopeRelationType = resolveTopologyRelationType(routeContext ?? {}) ?? 'all';
  const topologyG6Layout = topologyLayout === 'force' ? 'force' : 'layered-service';
  const topologyLayoutLabel =
    topologyLayout === 'force'
      ? t('topology.state.layout.force')
      : topologyLayout === 'grid-table'
        ? t('topology.state.layout.grid-table')
        : t('topology.state.layout.layered-service');
  const [topologyLocalSelection, setTopologyLocalSelection] = React.useState<{ nodeId?: string; edgeId?: string; source: TopologyLocalSelectionSource }>({ source: 'none' });
  const topologyG6Graph = React.useMemo<HzTopologyG6GraphInput>(() => ({
    nodes: topologyCanvasNodes.map(node => ({
      id: node.id,
      label: node.label,
      entityType: node.entityType,
      health: node.health,
      tone: node.tone,
      focus: node.focus,
      source: node.source,
      evidenceBadges: node.evidenceBadges,
      redMetrics: node.redMetrics,
      href: buildTopologyNodeSelectionHref(node, map, routeContext),
      focusHref: buildTopologyNodeSelectionHref(node, map, routeContext, { depth: 1 }),
      entityHref: node.links.entityHref
    })),
    edges: topologyCanvasEdges.map(edge => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      label: edge.label,
      relationshipType: edge.relationshipType,
      source: edge.source,
      tone: edge.tone,
      focus: edge.focus,
      selected: edge.selected,
      evidenceBadges: edge.evidenceBadges,
      redMetrics: edge.redMetrics,
      href: edge.drilldownHref
    }))
  }), [map, routeContext, topologyCanvasEdges, topologyCanvasNodes]);
  React.useEffect(() => {
    setTopologyLocalSelection({ source: 'none' });
  }, [routeContextKey]);
  React.useEffect(() => {
    setTopologySearchQuery(undefined);
  }, [routeContextKey]);
  const topologyRoutePrimaryNode = map.nodes.find(node => node.id === map.activeNodeId) ?? map.nodes.find(node => node.id === 'svc-checkout') ?? map.nodes[0];
  const topologyLocalSelectedNode = topologyLocalSelection.nodeId ? findNode(map.nodes, topologyLocalSelection.nodeId) : undefined;
  const primaryNode = topologyLocalSelectedNode ?? topologyRoutePrimaryNode;
  const activeViewModeLabel = map.viewModes.find(mode => mode.active)?.label;
  const activeSourceLabel = map.filterContext.sourceKind
    ? map.sources.find(source => source.kind === map.filterContext.sourceKind)?.label
    : undefined;
  const activeSourceHref = map.filterContext.sourceKind
    ? map.sources.find(source => source.kind === map.filterContext.sourceKind)?.href
    : undefined;
  const topologyG6GroupItemHrefs =
    map.filterContext.groupBy === 'source-kind'
      ? Object.fromEntries(map.sources.map(source => [source.kind, withTopologyGroupByHref(source.href, 'source-kind')]))
      : {};
  const topologyG6ResetParams = React.useMemo(() => {
    const params = new URLSearchParams();
    params.set('environment', map.filterContext.environment);
    params.set('timeRange', map.filterContext.timeRange);
    params.set('viewMode', map.filterContext.viewMode);
    if (typeof map.apiDepth === 'number') params.set('depth', String(map.apiDepth));
    appendTopologySelectionParam(params, 'start', routeContext?.start);
    appendTopologySelectionParam(params, 'end', routeContext?.end);
    appendTopologySelectionParam(params, 'refresh', routeContext?.refresh);
    appendTopologySelectionParam(params, 'live', routeContext?.live);
    appendTopologySelectionParam(params, 'tz', routeContext?.tz);
    appendTopologySelectionParam(params, 'relationType', routeContext?.relationType);
    appendTopologySelectionParam(params, 'hideInternal', routeContext?.hideInternal);
    if (map.filterContext.sourceKind) params.set('sourceKind', map.filterContext.sourceKind);
    if (map.filterContext.groupBy !== 'none') params.set('groupBy', map.filterContext.groupBy);
    return params;
  }, [
    map.apiDepth,
    map.filterContext.environment,
    map.filterContext.groupBy,
    map.filterContext.sourceKind,
    map.filterContext.timeRange,
    map.filterContext.viewMode,
    routeContext?.end,
    routeContext?.hideInternal,
    routeContext?.live,
    routeContext?.refresh,
    routeContext?.relationType,
    routeContext?.start,
    routeContext?.tz
  ]);
  const topologyG6FilterResetParams = new URLSearchParams(topologyG6ResetParams);
  topologyG6FilterResetParams.delete('groupBy');
  const topologyG6ResetHref = `/topology?${topologyG6FilterResetParams.toString()}`;
  const topologyFocusExitParams = new URLSearchParams();
  topologyFocusExitParams.set('environment', map.filterContext.environment);
  topologyFocusExitParams.set('timeRange', map.filterContext.timeRange);
  topologyFocusExitParams.set('viewMode', map.filterContext.viewMode);
  topologyFocusExitParams.set('depth', '2');
  appendTopologySelectionParam(topologyFocusExitParams, 'start', routeContext?.start);
  appendTopologySelectionParam(topologyFocusExitParams, 'end', routeContext?.end);
  appendTopologySelectionParam(topologyFocusExitParams, 'refresh', routeContext?.refresh);
  appendTopologySelectionParam(topologyFocusExitParams, 'live', routeContext?.live);
  appendTopologySelectionParam(topologyFocusExitParams, 'tz', routeContext?.tz);
  appendTopologySelectionParam(topologyFocusExitParams, 'relationType', routeContext?.relationType);
  appendTopologySelectionParam(topologyFocusExitParams, 'hideInternal', routeContext?.hideInternal);
  appendTopologySelectionParam(topologyFocusExitParams, 'edgeId', map.selectedEdgeId ?? routeContext?.edgeId);
  if (map.filterContext.sourceKind) topologyFocusExitParams.set('sourceKind', map.filterContext.sourceKind);
  if (map.filterContext.groupBy !== 'none') topologyFocusExitParams.set('groupBy', map.filterContext.groupBy);
  const topologyFocusExitHref = `/topology?${topologyFocusExitParams.toString()}`;
  const topologyG6GroupParams = new URLSearchParams(topologyG6ResetParams);
  topologyG6GroupParams.set('groupBy', 'source-kind');
  const topologyG6SearchParams = new URLSearchParams(topologyG6ResetParams);
  if (topologyEffectiveSearchQuery) topologyG6SearchParams.set('search', topologyEffectiveSearchQuery);
  if (map.filterContext.groupBy !== 'none') topologyG6SearchParams.set('groupBy', map.filterContext.groupBy);
  const handleTopologyEnvironmentChange = React.useCallback(
    (value: string) => {
      navigateTopologyFocus(buildTopologyScopeHref(topologyG6ResetParams, { environment: value }), topologyRouter.push);
    },
    [topologyG6ResetParams, topologyRouter.push]
  );
  const handleTopologyDepthChange = React.useCallback(
    (value: string) => {
      navigateTopologyFocus(buildTopologyScopeHref(topologyG6ResetParams, { depth: value }), topologyRouter.push);
    },
    [topologyG6ResetParams, topologyRouter.push]
  );
  const handleTopologySourceKindChange = React.useCallback(
    (value: string) => {
      navigateTopologyFocus(buildTopologyScopeHref(topologyG6ResetParams, { sourceKind: value === 'all' ? undefined : value }), topologyRouter.push);
    },
    [topologyG6ResetParams, topologyRouter.push]
  );
  const handleTopologySearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setTopologySearchQuery(event.currentTarget.value);
  }, []);
  const handleTopologyGroupByChange = React.useCallback(
    (value: string) => {
      navigateTopologyFocus(buildTopologyScopeHref(topologyG6ResetParams, { groupBy: value }), topologyRouter.push);
    },
    [topologyG6ResetParams, topologyRouter.push]
  );
  const handleTopologyResetScope = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      event.preventDefault();
      navigateTopologyFocus('/topology', topologyRouter.push);
    },
    [topologyRouter.push]
  );
  const topologyToolbarSummaryItems = [
    topologyEffectiveSearchQuery || t('topology.all-entities'),
    map.filterContext.environment,
    map.filterContext.timeRange,
    activeViewModeLabel,
    activeSourceLabel
  ].filter((item): item is string => Boolean(item));
  const topologyFocusState = map.activeNodeId ?? (topologyEffectiveSearchQuery ? 'incoming-context' : 'all');
  const routeFocusDepth = Number(routeContext?.depth);
  const topologyFocusTrailDepth = Number.isFinite(routeFocusDepth) ? Math.max(0, Math.floor(routeFocusDepth)) : map.apiDepth ?? 2;
  const topologyFocusTrailMode = primaryNode || topologyEffectiveSearchQuery || map.apiDepth === 1 ? 'focused' : 'overview';
  const topologyFocusTrailEntityId = primaryNode?.id ?? topologyFocusState;
  const topologyToolbarStateItems: HzTopologyToolbarStateItem[] = [
    {
      id: 'focus',
      label: t('topology.state.focus'),
      value: (primaryNode?.label ?? topologyEffectiveSearchQuery) || t('topology.all-entities'),
      tone: primaryNode ? topologyNodeHealthTone(primaryNode) : 'neutral',
      'data-topology-focus-state': topologyFocusState
    },
    {
      id: 'depth',
      label: t('topology.state.depth'),
      value: formatTopologyDepth(map.apiDepth, t),
      'data-topology-depth-state': map.apiDepth ?? 'none'
    },
    {
      id: 'group',
      label: t('topology.state.group'),
      value: t(`topology.state.group.${map.filterContext.groupBy}`),
      'data-topology-group-state': map.filterContext.groupBy
    }
  ];
  const topologyApiNodeCount = loadedApiGraph?.nodes?.length ?? map.nodes.length;
  const topologyHiddenCount = Math.max(0, topologyApiNodeCount - map.nodes.length);
  const topologyGroupPanelItems = buildTopologyGroupPanelItems({
    nodes: map.nodes,
    edges: map.edges,
    activeSourceLabel,
    primaryNode,
    hiddenCount: topologyHiddenCount,
    t
  });
  const topologyFocusTrailCrumbs = [
    {
      id: 'all',
      href: '/topology',
      label: t('topology.all-entities'),
      'data-topology-focus-crumb': 'all'
    },
    primaryNode
      ? {
          id: 'active-entity',
          href: primaryNode.links.entityHref,
          label: primaryNode.label,
          value: formatTopologyDepth(map.apiDepth, t),
          active: true,
          'data-topology-focus-crumb': primaryNode.id
        }
      : {
          id: 'active-entity',
          href: '/topology',
          label: topologyEffectiveSearchQuery || t('topology.all-entities'),
          value: formatTopologyDepth(map.apiDepth, t),
          active: true,
          'data-topology-focus-crumb': topologyFocusState
        }
  ];
  const topologyFocusTrailFilters = [
    {
      id: 'environment',
      label: t('topology.focus-trail.filter.environment'),
      value: map.filterContext.environment,
      'data-topology-focus-filter-environment': map.filterContext.environment
    },
    {
      id: 'time-range',
      label: t('topology.focus-trail.filter.time-range'),
      value: formatTimeRange(map.filterContext.timeRange, t),
      'data-topology-focus-filter-time-range': map.filterContext.timeRange
    },
    {
      id: 'source',
      label: t('topology.focus-trail.filter.source'),
      value: activeSourceLabel ?? t('topology.focus-trail.source.all'),
      'data-topology-focus-filter-source': map.filterContext.sourceKind ?? 'all'
    },
    {
      id: 'view',
      label: t('topology.focus-trail.filter.view'),
      value: activeViewModeLabel ?? map.filterContext.viewMode,
      'data-topology-focus-filter-view': map.filterContext.viewMode
    }
  ];
  const topologyMetricRows = React.useMemo(() => buildTopologyMetricRows(map.edges, map.nodes), [map.edges, map.nodes]);
  const [topologyMetricWindowFilter, setTopologyMetricWindowFilter] = React.useState<HzTopologyMetricTableRenderWindowFilter>('all');
  React.useEffect(() => {
    setTopologyMetricWindowFilter('all');
  }, [routeContextKey]);
  const currentNodeNeighborEvidence = React.useMemo(
    () => (primaryNode ? buildTopologyNodeNeighborEvidence(primaryNode, map.nodes, map.edges) : undefined),
    [map.edges, map.nodes, primaryNode]
  );
  const [topologyG6HoveredNodeId, setTopologyG6HoveredNodeId] = React.useState<string | undefined>();
  const [topologyG6HoveredEdgeId, setTopologyG6HoveredEdgeId] = React.useState<string | undefined>();
  const [topologyG6HoverAnchor, setTopologyG6HoverAnchor] = React.useState<HzTopologyG6HoverAnchor | undefined>();
  const [topologyCompanionCollapsedSections, setTopologyCompanionCollapsedSections] = React.useState<Record<string, boolean>>({
    timeline: true
  });
  const handleTopologyCompanionCollapsedChange = React.useCallback((sectionId: string, collapsed: boolean) => {
    setTopologyCompanionCollapsedSections(current => ({ ...current, [sectionId]: collapsed }));
  }, []);
  const topologyLocalSelectedEdge = topologyLocalSelection.edgeId ? findEdge(map.edges, topologyLocalSelection.edgeId) : undefined;
  const topologyDetailEdge = topologyLocalSelection.nodeId ? undefined : topologyLocalSelectedEdge ?? pickTopologyDetailEdge(map);
  const topologyCanvasSelectedEdgeId = topologyLocalSelection.nodeId
    ? undefined
    : topologyLocalSelectedEdge?.id ?? map.selectedEdgeId ?? topologyDetailEdge?.id;
  const topologyMetricSelectedRowId = topologyLocalSelection.nodeId
    ? undefined
    : map.selectedEdgeId ?? topologyDetailEdge?.id ?? topologyMetricRows[0]?.id;
  const topologySearchPriorityNodeId = React.useMemo(() => {
    const query = map.filterContext.search.trim().toLowerCase();
    if (!query) return undefined;
    return topologyG6Graph.nodes.find(node => node.label.toLowerCase().includes(query) || node.id.toLowerCase().includes(query))?.id;
  }, [map.filterContext.search, topologyG6Graph.nodes]);
  const topologyRenderWindowPriorityNodeIds = React.useMemo(
    () =>
      [
        topologySearchPriorityNodeId,
        topologyTraceCallMissingEdges ? undefined : primaryNode?.id,
        topologyDetailEdge?.from,
        topologyDetailEdge?.to
      ].filter((nodeId): nodeId is string => Boolean(nodeId)),
    [primaryNode?.id, topologyDetailEdge?.from, topologyDetailEdge?.to, topologySearchPriorityNodeId, topologyTraceCallMissingEdges]
  );
  const topologyRenderWindowCompanion = React.useMemo(() => {
    const strategy = buildHzTopologyG6LargeGraphStrategy(topologyG6Graph);
    return buildHzTopologyG6RenderWindow(topologyG6Graph, strategy, { priorityNodeIds: topologyRenderWindowPriorityNodeIds });
  }, [topologyG6Graph, topologyRenderWindowPriorityNodeIds]);
  const topologyHoveredDetailEdge = topologyG6HoveredEdgeId ? findEdge(map.edges, topologyG6HoveredEdgeId) : undefined;
  const topologyLiveHoverEdge = topologyHoveredDetailEdge;
  const topologyInvestigationEdge = topologyHoveredDetailEdge ?? topologyDetailEdge;
  const topologyHoverFromNode = topologyInvestigationEdge ? findNode(map.nodes, topologyInvestigationEdge.from) : undefined;
  const topologyHoverToNode = topologyInvestigationEdge ? findNode(map.nodes, topologyInvestigationEdge.to) : undefined;
  const topologyLiveHoverFromNode = topologyLiveHoverEdge ? findNode(map.nodes, topologyLiveHoverEdge.from) : undefined;
  const topologyLiveHoverToNode = topologyLiveHoverEdge ? findNode(map.nodes, topologyLiveHoverEdge.to) : undefined;
  const topologyCanvasDrawerMode: HzTopologyCanvasDrawerMode = topologyDetailEdge && primaryNode
    ? 'node-edge'
    : topologyDetailEdge
      ? 'edge'
      : primaryNode
        ? 'node'
        : 'none';
  const topologyCompanionJumpActiveId = topologyDetailEdge ? 'edge-detail' : primaryNode ? 'current-node' : 'view-mode';
  const topologyCompanionJumpItems = [
    {
      id: 'view-mode',
      href: '#topology-companion-view-mode',
      label: t('topology.companion.jump.view'),
      active: topologyCompanionJumpActiveId === 'view-mode'
    },
    {
      id: 'legend',
      href: '#topology-companion-legend',
      label: t('topology.companion.jump.legend'),
      active: topologyCompanionJumpActiveId === 'legend'
    },
    {
      id: 'edge-red',
      href: '#topology-companion-edge-red',
      label: t('topology.companion.jump.red'),
      active: topologyCompanionJumpActiveId === 'edge-red'
    },
    ...(map.impactTimeline.length > 0
      ? [
          {
            id: 'timeline',
            href: '#topology-companion-timeline',
            label: t('topology.companion.jump.timeline'),
            active: topologyCompanionJumpActiveId === 'timeline'
          }
        ]
      : []),
    ...(topologyDetailEdge
      ? [
          {
            id: 'edge-detail',
            href: '#topology-companion-edge-detail',
            label: t('topology.companion.jump.edge'),
            active: topologyCompanionJumpActiveId === 'edge-detail'
          }
        ]
      : []),
    ...(primaryNode
      ? [
          {
            id: 'current-node',
            href: '#topology-companion-current-node',
            label: t('topology.companion.jump.node'),
            active: topologyCompanionJumpActiveId === 'current-node'
          }
        ]
      : [])
  ];
  const topologyCanvasFocusDepth = formatTopologyCanvasFocusDepth(map.apiDepth);
  const topologyEvidenceSources =
    loadedApiGraph?.sourceKinds && loadedApiGraph.sourceKinds.length > 0
      ? loadedApiGraph.sourceKinds
      : map.filterContext.sourceKind
        ? [map.filterContext.sourceKind]
        : [];
  const topologyLoadingEvidenceSources = ['api', 'greptime', 'trace', 'relation'];
  const topologyTraceCallUnavailable = loadedApiGraph === null && topologyTraceCallScope;
  const topologyShouldShowEmptyState =
    map.dataSource === 'api' && !topologyIsPending && (map.nodes.length === 0 || topologyTraceCallMissingEdges);
  const topologyEmptyStateKind = loadedApiGraph === null ? 'degraded' : topologyTraceCallMissingEdges ? 'filtered-empty' : 'api-empty';
  const topologyEmptyStateDataKind = topologyTraceCallUnavailable
    ? 'trace-call-degraded'
    : topologyTraceCallMissingEdges
      ? 'trace-call-missing'
      : topologyEmptyStateKind;
  const topologyEmptyStateEvidenceSources =
    topologyTraceCallUnavailable
      ? ['otlp-trace-call', 'greptime', 'trace', 'unavailable']
      : topologyEmptyStateKind === 'degraded'
      ? ['api', 'unavailable']
      : topologyTraceCallMissingEdges
        ? ['otlp-trace-call', 'greptime', 'trace']
        : topologyEvidenceSources;
  const topologyEmptyStateTitle = topologyTraceCallMissingEdges
    ? t('topology.empty.trace-call.title')
    : topologyTraceCallUnavailable
      ? t('topology.degraded.trace-call.title')
    : topologyEmptyStateKind === 'degraded'
      ? t('topology.degraded.api.title')
      : t('topology.empty.api.title');
  const topologyEmptyStateCopy = topologyTraceCallMissingEdges
    ? t('topology.empty.trace-call.copy')
    : topologyTraceCallUnavailable
      ? t('topology.degraded.trace-call.copy')
    : topologyEmptyStateKind === 'degraded'
      ? t('topology.degraded.api.copy')
      : t('topology.empty.api.copy');
  const topologyEmptyStateSourceLabel = topologyTraceCallMissingEdges
    ? t('topology.empty.trace-call.source')
    : topologyTraceCallUnavailable
      ? t('topology.degraded.trace-call.source')
    : topologyEmptyStateKind === 'degraded'
      ? t('topology.degraded.api.source')
      : 'API';
  const topologyLegendSections = React.useMemo(
    () => [
      {
        id: 'status',
        label: t('topology.legend.status'),
        items: [
          {
            id: 'healthy-node',
            label: t('topology.legend.status.healthy'),
            color: '#22c55e',
            visualSource: 'hertzbeat-status-token' as const,
            value: t('topology.legend.status.healthy-value')
          },
          {
            id: 'warning-node',
            label: t('topology.legend.status.warning'),
            color: '#f59e0b',
            visualSource: 'hertzbeat-status-token' as const,
            value: t('topology.legend.status.warning-value')
          },
          {
            id: 'critical-node',
            label: t('topology.legend.status.critical'),
            color: '#ef4444',
            visualSource: 'hertzbeat-status-token' as const,
            value: t('topology.legend.status.critical-value')
          }
        ]
      },
      {
        id: 'interaction',
        label: t('topology.legend.interaction'),
        items: [
          {
            id: 'selected-node',
            label: t('topology.legend.interaction.selected-node'),
            color: '#e5edf8',
            visualSource: 'hertzbeat-interaction-token' as const,
            value: t('topology.legend.interaction.selected-node-value')
          },
          {
            id: 'directional-edge',
            label: t('topology.legend.interaction.directional-edge'),
            color: '#94a3b8',
            pattern: 'solid' as const,
            visualSource: 'hertzbeat-edge-token' as const,
            value: t('topology.legend.interaction.directional-edge-value')
          },
          {
            id: 'dimmed-edge',
            label: t('topology.legend.interaction.dimmed-edge'),
            color: '#94a3b8',
            pattern: 'muted' as const,
            visualSource: 'hertzbeat-edge-token' as const,
            value: t('topology.legend.interaction.dimmed-edge-value')
          }
        ]
      }
    ],
    [t]
  );
  const topologyEdgeIds = React.useMemo(
    () => new Set(map.edges.map(edge => edge.id)),
    [map.edges]
  );
  const topologyNodeIds = React.useMemo(
    () => new Set(map.nodes.map(node => node.id)),
    [map.nodes]
  );
  const topologyNodeFocusHrefById = React.useMemo(
    () => new Map(map.nodes.map(node => [node.id, buildTopologyNodeSelectionHref(node, map, routeContext, { depth: 1 })])),
    [map, routeContext]
  );
  const handleTopologyG6NodeSelect = React.useCallback(
    (nodeId: string) => {
      if (!topologyNodeIds.has(nodeId)) return;
      setTopologyG6HoveredNodeId(undefined);
      setTopologyG6HoveredEdgeId(undefined);
      setTopologyG6HoverAnchor(undefined);
      setTopologyLocalSelection({ nodeId, edgeId: undefined, source: 'node-click' });
    },
    [topologyNodeIds]
  );
  const handleTopologyG6NodeFocus = React.useCallback(
    (nodeId: string) => {
      navigateTopologyFocus(topologyNodeFocusHrefById.get(nodeId), topologyRouter.push);
    },
    [topologyNodeFocusHrefById, topologyRouter.push]
  );
  const handleTopologyFocusExit = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      navigateTopologyFocus(topologyFocusExitHref, topologyRouter.push);
    },
    [topologyFocusExitHref, topologyRouter.push]
  );
  const handleTopologyG6EdgeSelect = React.useCallback(
    (edgeId: string) => {
      if (!topologyEdgeIds.has(edgeId)) return;
      setTopologyG6HoveredNodeId(undefined);
      setTopologyG6HoveredEdgeId(undefined);
      setTopologyG6HoverAnchor(undefined);
      setTopologyLocalSelection({ nodeId: undefined, edgeId, source: 'edge-click' });
    },
    [topologyEdgeIds]
  );
  const handleTopologyG6NodeHover = React.useCallback((nodeId: string, anchor?: HzTopologyG6HoverAnchor) => {
    setTopologyG6HoveredNodeId(nodeId);
    setTopologyG6HoveredEdgeId(undefined);
    setTopologyG6HoverAnchor(anchor);
  }, []);
  const handleTopologyG6EdgeHover = React.useCallback((edgeId: string, anchor?: HzTopologyG6HoverAnchor) => {
    setTopologyG6HoveredNodeId(undefined);
    setTopologyG6HoveredEdgeId(edgeId);
    setTopologyG6HoverAnchor(anchor);
  }, []);
  const clearTopologyG6Hover = React.useCallback(() => {
    setTopologyG6HoveredNodeId(undefined);
    setTopologyG6HoveredEdgeId(undefined);
    setTopologyG6HoverAnchor(undefined);
  }, []);
  const handleTopologyG6HoverClear = React.useCallback(() => {
    clearTopologyG6Hover();
  }, [clearTopologyG6Hover]);
  const handleTopologyMetricRowSelect = React.useCallback(
    (row: HzTopologyMetricRow) => {
      if (!topologyEdgeIds.has(row.id)) return;
      clearTopologyG6Hover();
      setTopologyLocalSelection({ nodeId: undefined, edgeId: row.id, source: 'table-row-click' });
    },
    [clearTopologyG6Hover, topologyEdgeIds]
  );

  return (
    <HzTopologyWorkbenchFrame
      as="main"
      data-topology-route="hertzbeat-entity-topology"
      data-topology-data-source={map.dataSource}
      data-topology-incoming-context={map.filterContext.hasIncomingContext ? 'entity-filter' : 'none'}
      data-topology-active-node-id={map.activeNodeId ?? 'none'}
      data-topology-active-edge-id={map.selectedEdgeId ?? 'none'}
      data-topology-selection-behavior="in-page-drawer"
      data-topology-selection-source={topologyLocalSelection.source}
      data-topology-selection-node-id={topologyLocalSelection.nodeId ?? 'none'}
      data-topology-selection-edge-id={topologyLocalSelection.edgeId ?? 'none'}
      data-topology-focus-navigation="explicit-soft-route"
      data-topology-focus-navigation-owner="hertzbeat-ui-g6-focus-entry"
      data-topology-focus-navigation-trigger="double-click-node"
      data-topology-focus-route-preservation="previous-graph-until-api-resolves"
      data-topology-focus-route-preservation-owner="hertzbeat-ui-g6-focus-entry"
      data-topology-focus-route-preservation-source="loaded-api-graph-state"
      data-topology-scope-navigation="explicit-soft-route"
      data-topology-scope-navigation-owner="hertzbeat-ui-toolbar-scope-controls"
      data-topology-scope-navigation-preservation="previous-graph-until-api-resolves"
      data-topology-layout-navigation="in-page-g6-layout"
      data-topology-layout-navigation-owner="hertzbeat-ui-toolbar-layout-control"
      data-topology-layout-navigation-url-policy="preserve-current-url"
      data-topology-search-navigation="in-page-g6-search"
      data-topology-search-navigation-owner="hertzbeat-ui-toolbar-search-control"
      data-topology-search-navigation-url-policy="preserve-current-url"
      data-topology-active-view-mode={map.filterContext.viewMode}
      data-topology-active-source-kind={map.filterContext.sourceKind ?? 'all'}
      data-topology-trace-call-state={topologyTraceCallState}
      data-topology-trace-call-proof-owner="hertzbeat-ui-workbench-frame"
      data-topology-trace-call-edge-count={topologyTraceCallEdges.length}
      data-topology-trace-call-red-edge-count={topologyTraceCallRedEdgeCount}
      data-topology-trace-call-window-edge-count={topologyTraceCallWindowEdgeCount}
      data-topology-trace-call-sample-edge-count={topologyTraceCallSampleEdgeCount}
      data-topology-trace-call-red-state={topologyTraceCallRedState}
      data-topology-api-depth={map.apiDepth ?? 'none'}
      data-topology-api-scope-owner="hertzbeat-ui-workbench-frame"
      data-topology-api-request-path={topologyApiRequestPath}
      data-topology-api-scope-source-kind={map.filterContext.sourceKind ?? 'all'}
      data-topology-api-scope-relation-type={topologyApiScopeRelationType}
      data-topology-api-scope-view-mode={map.filterContext.viewMode}
      data-topology-api-timeout-ms={topologyApiRequestTimeoutMs}
      data-topology-workbench-frame-owner="hertzbeat-ui-workbench-frame"
      data-topology-workbench-frame-boundary-owner="hertzbeat-ui-workbench-frame-boundary"
      density="compact"
      boundary="route"
    >
      <HzTopologyWorkbenchHeader
        data-topology-workbench-header-owner="hertzbeat-ui-workbench-header"
        density="operational-compact"
        copyVisibility="assistive"
        boundary="none"
        eyebrow={t('topology.kicker')}
        title={map.productIdentity}
        scopeSlot={
          <HzTopologyScopeBar
            data-topology-scope-bar-owner="hertzbeat-ui-scope-bar"
            data-topology-scope-bar-boundary-owner="hertzbeat-ui-scope-bar-boundary"
            data-topology-refresh-action="refresh"
            boundary="none"
            items={[
              {
                id: 'environment',
                value: map.filterContext.environment,
                'data-topology-filter-environment': map.filterContext.environment
              },
              {
                id: 'time-range',
                value: formatTimeRange(map.filterContext.timeRange, t),
                'data-topology-filter-time-range': map.filterContext.timeRange
              }
            ]}
            actions={[
              {
                id: 'refresh',
                label: t('topology.refresh'),
                'data-topology-refresh-action': 'refresh'
              }
            ]}
          />
        }
      />

      <HzTopologyFocusTrail
        data-topology-focus-trail="focused-context"
        data-topology-focus-trail-owner="hertzbeat-ui-focus-trail"
        data-topology-focus-trail-boundary-owner="hertzbeat-ui-focus-trail-boundary"
        data-topology-focus-trail-compactness="graph-dock"
        focusMode={topologyFocusTrailMode}
        focusDepth={String(topologyFocusTrailDepth)}
        focusEntityId={topologyFocusTrailEntityId}
        label={t('topology.focus-trail.label')}
        crumbs={topologyFocusTrailCrumbs}
        filters={topologyFocusTrailFilters}
        hiddenCountLabel={t('topology.focus-trail.hidden-count', { count: topologyHiddenCount })}
        hiddenCountProps={{
          'data-topology-focus-trail-hidden-count-owner': 'hertzbeat-ui-focus-trail-hidden-count'
        } as React.HTMLAttributes<HTMLSpanElement>}
        exitAction={{
          href: topologyFocusExitHref,
          label: t('topology.focus-trail.exit'),
          onClick: handleTopologyFocusExit,
          'data-topology-focus-trail-exit-owner': 'hertzbeat-ui-focus-trail-exit'
        } as React.AnchorHTMLAttributes<HTMLAnchorElement> & { label: React.ReactNode }}
        boundary="none"
        density="graph-dock"
      />

      <HzTopologyToolbar
        data-topology-controls="hertzbeat-topology-controls"
        data-topology-controls-owner="hertzbeat-ui-toolbar"
        data-topology-toolbar-boundary-owner="hertzbeat-ui-toolbar-boundary"
        data-topology-toolbar-state-owner="hertzbeat-ui-toolbar-state"
        data-topology-filter-summary="incoming-context"
        density="graph-first"
        boundary="none"
        environmentLabel={t('topology.environment.aria')}
        environmentValue={map.filterContext.environment}
        environmentOptions={[
          { value: 'all', label: t('topology.environment.all') },
          { value: 'dev', label: 'dev' },
          { value: 'prod', label: 'prod' }
        ]}
        searchLabel={t('topology.search.aria')}
        searchPlaceholder={t('topology.search.placeholder')}
        searchValue={topologyEffectiveSearchQuery}
        sourceKindLabel={t('topology.focus-trail.filter.source')}
        sourceKindValue={map.filterContext.sourceKind ?? 'all'}
        sourceKindOptions={[
          { value: 'all', label: t('topology.focus-trail.source.all') },
          ...map.sources.map(source => ({ value: source.kind, label: source.label }))
        ]}
        depthLabel={t('topology.state.depth')}
        depthValue={String(map.apiDepth ?? 2)}
        depthOptions={[
          { value: '1', label: t('topology.state.depth.one-hop') },
          { value: '2', label: t('topology.state.depth.two-hop') },
          { value: '3', label: t('topology.state.depth.n-hop', { depth: 3 }) }
        ]}
        groupByLabel={t('topology.state.group')}
        groupByValue={map.filterContext.groupBy}
        groupByOptions={[
          { value: 'none', label: t('topology.state.group.none') },
          { value: 'environment', label: t('topology.state.group.environment') },
          { value: 'source-kind', label: t('topology.state.group.source-kind') },
          { value: 'entity-type', label: t('topology.state.group.entity-type') }
        ]}
        resetLabel={t('topology.toolbar.reset')}
        resetHref="/topology"
        onEnvironmentChange={handleTopologyEnvironmentChange}
        onSourceKindChange={handleTopologySourceKindChange}
        onDepthChange={handleTopologyDepthChange}
        onGroupByChange={handleTopologyGroupByChange}
        onSearchChange={handleTopologySearchChange}
        onReset={handleTopologyResetScope}
        summaryLabel={t('topology.current-filter')}
        summaryItems={topologyToolbarSummaryItems}
        stateLabel={t('topology.state.label')}
        stateItems={topologyToolbarStateItems}
      />

      <HzTopologyWorkbenchGrid data-topology-workbench-grid-owner="hertzbeat-ui-workbench-grid" layout="canvas-only">
        <HzTopologyWorkbenchSlot
          data-topology-canvas-slot-owner="hertzbeat-ui-workbench-slot"
          kind="canvas"
          surface="content"
        >
          <HzTopologyCanvas
            data-topology-canvas="hertzbeat-topology-canvas"
            data-topology-canvas-owner="hertzbeat-ui-canvas"
            data-topology-canvas-interaction-owner="hertzbeat-ui-canvas-interaction"
            data-topology-canvas-interaction-scope-owner="hertzbeat-ui-canvas-interaction-scope"
            data-topology-canvas-boundary-owner="hertzbeat-ui-canvas-boundary"
            layout={topologyLayout}
            interactionMode="inspect"
            interactionScope="hover-group"
            hoverMode="neighbor-highlight"
            drawerMode={topologyCanvasDrawerMode}
            focusDepth={topologyCanvasFocusDepth}
            minHeight="workbench"
            boundary="none"
          >
          <HzTopologyCanvasAnnotation
            data-topology-canvas-annotation-owner="hertzbeat-ui-canvas-annotation"
            title={topologyLayoutLabel}
            copy={`${formatTopologyDepth(map.apiDepth, t)} · ${formatTimeRange(map.filterContext.timeRange, t)}`}
            visibility="assistive"
          />
          <HzTopologyG6Canvas
            graph={topologyG6Graph}
            selectedNodeId={topologyTraceCallMissingEdges ? undefined : primaryNode?.id}
            selectedEdgeId={topologyCanvasSelectedEdgeId}
            hoveredNodeId={topologyG6HoveredNodeId}
            hoveredEdgeId={topologyG6HoveredEdgeId}
            searchQuery={topologyEffectiveSearchQuery}
            filterScope={{
              environment: map.filterContext.environment,
              sourceKind: map.filterContext.sourceKind ?? 'all',
              groupBy: map.filterContext.groupBy,
              searchQuery: topologyEffectiveSearchQuery
            }}
            filterControls={[
              {
                id: 'source-kind',
                kind: 'source-kind',
                label: t('topology.state.group.source-kind'),
                value: map.filterContext.sourceKind ?? 'all',
                href: activeSourceHref ?? topologyG6ResetHref,
                active: Boolean(map.filterContext.sourceKind)
              },
              {
                id: 'group-by',
                kind: 'group-by',
                label: t('topology.state.group'),
                value: map.filterContext.groupBy,
                href: `/topology?${topologyG6GroupParams.toString()}`,
                active: map.filterContext.groupBy !== 'none'
              },
              {
                id: 'search',
                kind: 'search',
                label: t('topology.state.focus'),
                value: topologyEffectiveSearchQuery || t('topology.all-entities'),
                href: `/topology?${topologyG6SearchParams.toString()}`
              },
              {
                id: 'reset',
                kind: 'reset',
                label: t('topology.toolbar.reset'),
                value: 'all',
                href: topologyG6ResetHref
              }
            ]}
            groupItemHrefs={topologyG6GroupItemHrefs}
            legendSlot={
                <HzTopologyLegend
                  data-topology-g6-legend-owner="hertzbeat-ui-g6-legend-dock"
                  data-topology-legend-owner="hertzbeat-ui-legend"
                  data-topology-legend-boundary-owner="hertzbeat-ui-legend-boundary"
                  title={t('topology.legend.title')}
                  summaryLabel={t('topology.legend.summary')}
                  sections={topologyLegendSections}
                  boundary="flush"
                  density="canvas-dock"
                />
              }
            layout={topologyG6Layout}
            height="workbench"
            overlayMode="non-occluding"
            summaryLabel={`${t('topology.group-panel.node-count', { count: map.nodes.length })} · ${t('topology.group-panel.edge-count', { count: map.edges.length })}`}
            fitViewLabel={t('topology.view.fit')}
            resetViewLabel={t('topology.toolbar.reset')}
            zoomInLabel={t('topology.view.zoom-in')}
            zoomOutLabel={t('topology.view.zoom-out')}
            selectedFocusLabel={t('topology.view.focus-selected')}
            onNodeSelect={handleTopologyG6NodeSelect}
            onNodeFocus={handleTopologyG6NodeFocus}
            onEdgeSelect={handleTopologyG6EdgeSelect}
            onNodeHover={handleTopologyG6NodeHover}
            onEdgeHover={handleTopologyG6EdgeHover}
            onHoverClear={handleTopologyG6HoverClear}
            data-topology-renderer="antv-g6"
            data-topology-g6-canvas-owner="hertzbeat-ui-g6-canvas"
            data-topology-g6-render-window-priority-contract="search-only-no-selection-reorder"
            data-topology-g6-render-window-priority-owner="hertzbeat-ui-g6-render-window-priority"
            data-topology-g6-mount-lifecycle-browser-regression="selection-preserve-viewport"
            data-topology-g6-mount-lifecycle-browser-regression-owner="hertzbeat-ui-g6-mount-lifecycle"
            data-topology-g6-mount-lifecycle-selection-policy="node-edge-table-drawer-only"
            data-topology-g6-mount-lifecycle-url-policy="preserve-current-url-on-selection"
            data-topology-g6-mount-lifecycle-redraw-policy="shared-setData-draw-preserve-viewport"
          />

          {map.dataSource === 'api' && map.nodes.length === 0 && topologyIsPending ? (
            <HzTopologyLoadingState
              data-topology-loading-state="api-pending"
              data-topology-loading-state-owner="hertzbeat-ui-loading-state"
              data-topology-loading-boundary-owner="hertzbeat-ui-loading-boundary"
              title={t('topology.loading.api.title')}
              copy={t('topology.loading.api.copy')}
              sourceLabel="API"
              timeScope={map.filterContext.timeRange}
              environment={map.filterContext.environment}
              sourceKind={map.filterContext.sourceKind ?? 'all'}
              relationType={topologyApiScopeRelationType}
              focusEntityId={routeContext?.entityId ?? 'none'}
              depth={map.apiDepth}
              evidenceSources={topologyLoadingEvidenceSources}
              rows={3}
              placement="canvas-center"
              boundary="canvas"
            />
          ) : null}

          {topologyShouldShowEmptyState ? (
            <HzTopologyEmptyState
              data-topology-empty-state={topologyEmptyStateDataKind}
              data-topology-empty-state-owner="hertzbeat-ui-empty-state"
              data-topology-empty-boundary-owner="hertzbeat-ui-empty-boundary"
              title={topologyEmptyStateTitle}
              copy={topologyEmptyStateCopy}
              sourceLabel={topologyEmptyStateSourceLabel}
              timeScope={map.filterContext.timeRange}
              environment={map.filterContext.environment}
              sourceKind={map.filterContext.sourceKind ?? (topologyEmptyStateEvidenceSources.length === 1 ? topologyEmptyStateEvidenceSources[0] : 'all')}
              relationType={topologyApiScopeRelationType}
              focusEntityId={routeContext?.entityId ?? 'none'}
              depth={map.apiDepth}
              resultCount={topologyTraceCallMissingEdges ? 0 : map.nodes.length}
              evidenceSources={topologyEmptyStateEvidenceSources}
              kind={topologyEmptyStateKind}
              placement="canvas-center"
              boundary="canvas"
            />
          ) : null}
        {topologyLiveHoverEdge && topologyLiveHoverFromNode && topologyLiveHoverToNode ? (
          <HzTopologyHoverTooltip
            data-topology-hover-tooltip-owner="hertzbeat-ui-hover-tooltip"
            data-topology-hover-edge={topologyLiveHoverEdge.id}
            kind="edge"
            title={topologyLiveHoverEdge.evidence.title}
            summary={topologyLiveHoverEdge.evidence.sourceLabel}
            visibility="hover"
            trigger="live-edge-hover"
            placement={topologyG6HoverAnchor ? 'canvas-anchor' : 'canvas-right-under-toolbar'}
            anchor={topologyG6HoverAnchor}
            size={topologyG6HoverAnchor ? 'compact' : 'standard'}
            facts={buildTopologyHoverTooltipFacts(topologyLiveHoverEdge, topologyLiveHoverFromNode, topologyLiveHoverToNode, routeContext, t)}
            metrics={buildTopologyHoverTooltipMetrics(topologyLiveHoverEdge, t)}
            evidenceBadges={topologyLiveHoverEdge.evidenceBadges}
          />
        ) : null}
          </HzTopologyCanvas>
        </HzTopologyWorkbenchSlot>
        <HzTopologyWorkbenchSlot
          data-topology-companion-slot-owner="hertzbeat-ui-workbench-slot"
          data-topology-companion-rail-visibility="hidden-from-layout"
          kind="companion"
          surface="content"
          className="hidden"
          aria-hidden="true"
        >
        <HzTopologyCompanionRail
          data-topology-companion-rail-owner="hertzbeat-ui-companion-rail"
          data-topology-companion-rail-boundary-owner="hertzbeat-ui-companion-rail-boundary"
          data-topology-companion-rail-scope="legend-metrics-timeline-detail"
          data-topology-companion-rail-priority="graph-first"
          density="compact"
          placement="side"
          boundary="side"
          priority="graph-first"
          stickyContext="jump-list"
        >
          <HzTopologyCompanionJumpList
            data-topology-companion-jump-list-owner="hertzbeat-ui-companion-jump-list"
            ariaLabel={t('topology.companion.jump.aria')}
            density="graph-first"
            activeMode="contained-rail-scroll"
            items={topologyCompanionJumpItems}
          />
          <HzTopologyCompanionSection
            data-topology-companion-section="view-mode"
            sectionId="view-mode"
            anchorId="topology-companion-view-mode"
            density="graph-first"
          >
            <HzTopologySectionLabel data-topology-view-mode-label-owner="hertzbeat-ui-section-label">
              {t('topology.aside.view')}
            </HzTopologySectionLabel>
            <HzTopologyFilterStrip
              data-topology-view-mode-strip-owner="hertzbeat-ui-filter-strip"
              data-topology-view-mode-strip-boundary-owner="hertzbeat-ui-filter-strip-boundary"
              variant="view-list"
              boundary="none"
              copyVisibility="assistive"
              items={map.viewModes.map(mode => ({
                id: mode.key,
                href: mode.href,
                label: mode.label,
                copy: mode.copy,
                active: mode.active,
                'aria-current': mode.active ? 'page' : undefined,
                'data-topology-view-mode': mode.key,
                'data-topology-view-mode-active': mode.active ? mode.key : 'false'
              }))}
            />
            <HzTopologyActionLink
              data-topology-alert-impact-link="alert-center"
              data-topology-alert-impact-link-owner="hertzbeat-ui-action-link"
              data-topology-alert-impact-link-spacing-owner="hertzbeat-ui-action-link-spacing"
              id="alert-impact"
              href={map.alertImpactHref}
              label={t('topology.alert-impact.open')}
              copy={t('topology.alert-impact.copy')}
              emphasis="primary"
              spacing="none"
            />
          </HzTopologyCompanionSection>

          <HzTopologyCompanionSection
            data-topology-companion-section="legend"
            sectionId="legend"
            anchorId="topology-companion-legend"
            density="graph-first"
          >
            <HzTopologyLegend
              data-topology-legend-owner="hertzbeat-ui-legend"
              data-topology-legend-boundary-owner="hertzbeat-ui-legend-boundary"
              title={t('topology.legend.title')}
              summaryLabel={t('topology.legend.summary')}
              sections={topologyLegendSections}
              boundary="framed"
            />
          </HzTopologyCompanionSection>

          <HzTopologyCompanionSection
            data-topology-companion-section="edge-red"
            data-topology-companion-section-collapsible="edge-red"
            sectionId="edge-red"
            anchorId="topology-companion-edge-red"
            density="graph-first"
            collapsible
            collapsed={topologyCompanionCollapsedSections['edge-red'] ?? false}
            collapseLabel={t('topology.companion.section.collapse')}
            expandLabel={t('topology.companion.section.expand')}
            onCollapsedChange={collapsed => handleTopologyCompanionCollapsedChange('edge-red', collapsed)}
          >
            <HzTopologyMetricTable
              data-topology-metric-table-owner="hertzbeat-ui"
              data-topology-metric-table-scope="edge-red-companion"
              data-topology-metric-table-boundary-owner="hertzbeat-ui-metric-table-boundary"
              data-topology-metric-table-interaction-owner="hertzbeat-ui-metric-table-interaction"
              data-topology-metric-table-selection-clear-owner="hertzbeat-ui-g6-hover-clear"
              data-topology-metric-table-filter-behavior="in-page-no-route-change"
              title={t('topology.metric-table.title')}
              density="graph-first"
              rows={topologyMetricRows}
              selectedRowId={topologyMetricSelectedRowId}
              renderWindowFilter={topologyMetricWindowFilter}
              onRenderWindowFilterChange={setTopologyMetricWindowFilter}
              renderWindowCompanion={{
                mode: topologyRenderWindowCompanion.mode,
                totalNodeCount: topologyRenderWindowCompanion.totalNodeCount,
                renderedNodeCount: topologyRenderWindowCompanion.renderedNodeCount,
                hiddenNodeCount: topologyRenderWindowCompanion.hiddenNodeCount,
                visibleNodeBudget: topologyRenderWindowCompanion.visibleNodeBudget,
                tableCompanion: topologyRenderWindowCompanion.tableCompanion,
                priorityNodeIds: topologyRenderWindowCompanion.priorityNodeIds,
                renderedNodeIds: topologyRenderWindowCompanion.graph.nodes.map(node => node.id)
              }}
              emptyLabel={t('topology.metric-table.empty')}
              labels={{
                edgeCount: t('topology.metric-table.edge-count', { count: topologyMetricRows.length }),
                requestRate: t('topology.metric-table.request-rate-unit'),
                errorRate: t('topology.metric-table.error-rate-unit'),
                latencyP95: t('topology.metric-table.latency-p95-unit'),
                rowAction: t('topology.metric-table.row-action'),
                renderWindowFilterAll: t('topology.metric-table.filter.all'),
                renderWindowFilterVisible: t('topology.metric-table.filter.visible'),
                renderWindowFilterPartial: t('topology.metric-table.filter.partial'),
                renderWindowFilterHidden: t('topology.metric-table.filter.hidden'),
                renderWindowFilterUnknown: t('topology.metric-table.filter.unknown'),
                rowAriaLabel: row => t('topology.metric-table.open-edge-aria', { edge: String(row.id) })
              }}
              onRowSelect={handleTopologyMetricRowSelect}
              boundary="framed"
            />
          </HzTopologyCompanionSection>

          {map.impactTimeline.length > 0 ? (
            <HzTopologyCompanionSection
              data-topology-companion-section="timeline"
              data-topology-companion-section-collapsible="timeline"
              sectionId="timeline"
              anchorId="topology-companion-timeline"
              density="graph-first"
              collapsible
              collapsed={topologyCompanionCollapsedSections.timeline ?? false}
              collapseLabel={t('topology.companion.section.collapse')}
              expandLabel={t('topology.companion.section.expand')}
              onCollapsedChange={collapsed => handleTopologyCompanionCollapsedChange('timeline', collapsed)}
            >
              <HzTopologyEvidenceList
                data-topology-impact-timeline="api-evidence"
                data-topology-impact-timeline-owner="hertzbeat-ui-evidence-list"
                data-topology-impact-timeline-boundary-owner="hertzbeat-ui-evidence-list-boundary"
                kind="impact-timeline"
                title={t('topology.timeline.title')}
                copy={t('topology.timeline.copy')}
                boundary="companion-timeline"
                items={map.impactTimeline.map(event => ({
                  id: event.id,
                  label: event.sourceLabel,
                  value: event.title,
                  meta: `${event.detail} · ${event.occurredAt} · ${event.actor}`,
                  tone: event.edgeId ? 'warning' : 'info',
                  'data-topology-impact-timeline-event': event.id,
                  'data-topology-impact-timeline-event-type': event.eventType,
                  'data-topology-impact-timeline-source': event.sourceKind,
                  'data-topology-impact-timeline-edge': event.edgeId ?? 'none'
                }))}
              />
            </HzTopologyCompanionSection>
          ) : null}

          {topologyDetailEdge ? (
            <HzTopologyCompanionSection
              data-topology-companion-section="edge-detail"
              data-topology-companion-section-collapsible="edge-detail"
              sectionId="edge-detail"
              anchorId="topology-companion-edge-detail"
              density="graph-first"
              collapsible
              collapsed={topologyCompanionCollapsedSections['edge-detail'] ?? false}
              collapseLabel={t('topology.companion.section.collapse')}
              expandLabel={t('topology.companion.section.expand')}
              onCollapsedChange={collapsed => handleTopologyCompanionCollapsedChange('edge-detail', collapsed)}
            >
              <HzTopologyDetailDrawer
                data-topology-edge-evidence-panel={topologyDetailEdge.id}
                data-topology-edge-evidence-window-owner="hertzbeat-ui-detail-drawer"
                data-topology-edge-evidence-first-seen={topologyDetailEdge.evidence.firstSeen || 'none'}
                data-topology-edge-evidence-last-seen={topologyDetailEdge.evidence.lastSeen || 'none'}
                data-topology-edge-evidence-sample-trace-id={topologyDetailEdge.evidence.sampleTraceId || 'none'}
                data-topology-edge-evidence-sample-span-id={topologyDetailEdge.evidence.sampleSpanId || 'none'}
                data-topology-detail-drawer-owner="hertzbeat-ui-detail-drawer"
                data-topology-detail-drawer-surface-owner="hertzbeat-ui-detail-surface"
                kind="edge"
                density="graph-first"
                subjectId={topologyDetailEdge.id}
                sourceId={topologyDetailEdge.from}
                targetId={topologyDetailEdge.to}
                relationType={topologyDetailEdge.relationshipType}
                sourceKind={topologyDetailEdge.source}
                surface="framed"
                eyebrow={t('topology.edge.evidence.title')}
                title={topologyDetailEdge.evidence.title}
                subtitle={`${topologyDetailEdge.evidence.sourceLabel} · ${topologyDetailEdge.evidence.collectedBy}`}
                boundary={topologyDetailEdge.evidence.boundary}
                boundaryProps={{
                  'data-topology-edge-evidence-boundary': 'roadmap-boundary',
                  'data-topology-detail-boundary-owner': 'hertzbeat-ui-detail-boundary'
                } as React.HTMLAttributes<HTMLDivElement>}
                facts={buildTopologyEdgeDetailFacts(topologyDetailEdge, t)}
                actions={buildTopologyEdgeDetailActions(topologyDetailEdge, t)}
                signalActions={buildTopologyEdgeSignalActions(topologyDetailEdge, t)}
              />
            </HzTopologyCompanionSection>
          ) : null}

          {primaryNode ? (
            <HzTopologyCompanionSection
              data-topology-companion-section="current-node"
              data-topology-companion-section-collapsible="current-node"
              sectionId="current-node"
              anchorId="topology-companion-current-node"
              density="graph-first"
              collapsible
              collapsed={topologyCompanionCollapsedSections['current-node'] ?? false}
              collapseLabel={t('topology.companion.section.collapse')}
              expandLabel={t('topology.companion.section.expand')}
              onCollapsedChange={collapsed => handleTopologyCompanionCollapsedChange('current-node', collapsed)}
            >
              <HzTopologyDetailDrawer
                data-topology-current-entity-panel={primaryNode.id}
                data-topology-current-entity-panel-owner="hertzbeat-ui-detail-drawer"
                data-topology-current-entity-panel-surface-owner="hertzbeat-ui-detail-surface"
                data-topology-current-entity-neighbor-owner="hertzbeat-ui-detail-neighbor-evidence"
                data-topology-current-entity-upstream-count={currentNodeNeighborEvidence?.upstreamNodeIds.length ?? 0}
                data-topology-current-entity-downstream-count={currentNodeNeighborEvidence?.downstreamNodeIds.length ?? 0}
                data-topology-current-entity-upstream-node-ids={currentNodeNeighborEvidence?.upstreamNodeIds.join(' ') || 'none'}
                data-topology-current-entity-downstream-node-ids={currentNodeNeighborEvidence?.downstreamNodeIds.join(' ') || 'none'}
                data-topology-current-entity-group-by={map.filterContext.groupBy}
                data-topology-current-entity-source-kind={map.filterContext.sourceKind ?? 'all'}
                data-topology-current-entity-view-mode={map.filterContext.viewMode}
                kind="node"
                density="graph-first"
                subjectId={primaryNode.id}
                entityType={primaryNode.entityType}
                sourceKind={primaryNode.source}
                surface="framed"
                eyebrow={t('topology.current-entity')}
                title={primaryNode.label}
                subtitle={`${primaryNode.entityId} · ${primaryNode.namespace} / ${primaryNode.environment}`}
                boundary={t('topology.current-entity.boundary')}
                boundaryProps={{
                  'data-topology-current-entity-boundary-owner': 'hertzbeat-ui-detail-boundary'
                } as React.HTMLAttributes<HTMLDivElement>}
                facts={buildTopologyNodeDetailFacts(
                  primaryNode,
                  currentNodeNeighborEvidence ?? buildTopologyNodeNeighborEvidence(primaryNode, map.nodes, map.edges),
                  t
                )}
                actions={buildTopologyNodeDetailActions(primaryNode, map.filterContext, map.apiDepth, t)}
                signalActions={buildTopologyNodeSignalActions(primaryNode, map.filterContext, map.apiDepth, t)}
                signalActionsLabel={t('topology.context-link.signals')}
              />
            </HzTopologyCompanionSection>
          ) : null}
        </HzTopologyCompanionRail>
        </HzTopologyWorkbenchSlot>
      </HzTopologyWorkbenchGrid>

      {map.faultContextRows.length > 0 ? (
        <HzTopologyEvidenceList
          data-topology-fault-context="incoming-evidence"
          data-topology-fault-context-owner="hertzbeat-ui-evidence-list"
          data-topology-fault-context-boundary-owner="hertzbeat-ui-evidence-list-boundary"
          kind="fault-context"
          title={t('topology.fault-context.title')}
          copy={t('topology.fault-context.copy')}
          boundary="toolbar-context"
          items={map.faultContextRows.map(row => ({
            id: row.label,
            label: row.label,
            value: row.value,
            meta: row.meta,
            tone: 'info',
            'data-topology-fault-context-row': row.label
          }))}
        />
      ) : null}

      <HzTopologyGroupPanel
        data-topology-group-panel="large-graph-grouping"
        data-topology-group-panel-owner="hertzbeat-ui-group-panel"
        data-topology-group-panel-boundary-owner="hertzbeat-ui-group-panel-boundary"
        title={t('topology.group-panel.title')}
        copy={t('topology.group-panel.copy')}
        groupByLabel={t('topology.group-panel.group-by')}
        boundary="framed"
        items={topologyGroupPanelItems}
        actions={[
          { id: 'clear-group', href: '/topology', label: t('topology.group-panel.clear-group') },
          { id: 'open-table', href: '#topology-metric-table', label: t('topology.group-panel.open-table') }
        ]}
      />

      {topologyInvestigationEdge && topologyHoverFromNode && topologyHoverToNode ? (
        <HzTopologyPathSummary
          data-topology-path-summary="selected-edge-context"
          data-topology-path-summary-owner="hertzbeat-ui-path-summary"
          data-topology-path-summary-boundary-owner="hertzbeat-ui-path-summary-boundary"
          title={t('topology.path-summary.title')}
          boundary="section"
          selectedEdgeId={topologyInvestigationEdge.id}
          hoveredEdgeId={topologyInvestigationEdge.id}
          sourceId={topologyHoverFromNode.id}
          targetId={topologyHoverToNode.id}
          relationType={topologyInvestigationEdge.relationshipType}
          sourceKind={topologyInvestigationEdge.source}
          source={{
            label: t('topology.path-summary.source'),
            value: topologyHoverFromNode.label,
            meta: `${topologyHoverFromNode.entityType} - ${topologyHoverFromNode.namespace}`
          }}
          target={{
            label: t('topology.path-summary.target'),
            value: topologyHoverToNode.label,
            meta: `${topologyHoverToNode.entityType} - ${topologyHoverToNode.namespace}`
          }}
          relation={{
            label: t('topology.path-summary.relation'),
            value: topologyInvestigationEdge.label,
            meta: topologyInvestigationEdge.evidence.sourceLabel
          }}
          directionLabel={t('topology.path-summary.direction')}
          metrics={buildTopologyPathSummaryMetrics(topologyInvestigationEdge, t)}
          evidenceBadges={topologyInvestigationEdge.evidenceBadges}
          actions={[
            { id: 'focus-path', href: topologyInvestigationEdge.drilldownHref, label: t('topology.path-summary.focus-path') },
            { id: 'open-trace', href: topologyInvestigationEdge.links.tracesHref, label: t('topology.path-summary.open-trace') }
          ]}
        />
      ) : null}
    </HzTopologyWorkbenchFrame>
  );
}
