'use client';

import * as React from 'react';
import { Crosshair, Maximize2, RotateCcw, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { __iconNode as activityIconNode } from 'lucide-react/dist/esm/icons/activity.js';
import { __iconNode as appWindowIconNode } from 'lucide-react/dist/esm/icons/app-window.js';
import { __iconNode as circleHelpIconNode } from 'lucide-react/dist/esm/icons/circle-help.js';
import { __iconNode as containerIconNode } from 'lucide-react/dist/esm/icons/container.js';
import { __iconNode as databaseIconNode } from 'lucide-react/dist/esm/icons/database.js';
import { __iconNode as inboxIconNode } from 'lucide-react/dist/esm/icons/inbox.js';
import { __iconNode as memoryStickIconNode } from 'lucide-react/dist/esm/icons/memory-stick.js';
import { __iconNode as routeIconNode } from 'lucide-react/dist/esm/icons/route.js';
import { __iconNode as serverCogIconNode } from 'lucide-react/dist/esm/icons/server-cog.js';
import { __iconNode as serverIconNode } from 'lucide-react/dist/esm/icons/server.js';
import { __iconNode as triangleAlertIconNode } from 'lucide-react/dist/esm/icons/triangle-alert.js';
import { __iconNode as workflowIconNode } from 'lucide-react/dist/esm/icons/workflow.js';

export type HzTopologyG6Tone = 'success' | 'warning' | 'danger' | 'green' | 'blue' | 'orange' | 'purple' | 'red' | 'neutral';

export type HzTopologyG6RedMetrics = {
  requestRatePerSecond?: number;
  requestCount?: number;
  errorRate?: number;
  errorCount?: number;
  latencyP95Ms?: number;
  latencyAvgMs?: number;
};

export type HzTopologyG6NodeInput = {
  id: string;
  label: string;
  entityType: string;
  health?: string;
  tone?: HzTopologyG6Tone;
  focus?: 'normal' | 'active' | 'related' | 'dimmed' | string;
  source?: string;
  evidenceBadges?: string[];
  redMetrics?: HzTopologyG6RedMetrics;
  href?: string;
  focusHref?: string;
  entityHref?: string;
};

export type HzTopologyG6EdgeInput = {
  id: string;
  from: string;
  to: string;
  label?: string;
  relationshipType?: string;
  source?: string;
  tone?: HzTopologyG6Tone;
  focus?: 'normal' | 'active-path' | 'context-muted' | string;
  selected?: boolean;
  evidenceBadges?: string[];
  redMetrics?: HzTopologyG6RedMetrics;
  href?: string;
};

export type HzTopologyG6GraphInput = {
  nodes: HzTopologyG6NodeInput[];
  edges: HzTopologyG6EdgeInput[];
};

export type HzTopologyG6Datum = {
  id: string;
  type?: string;
  source?: string;
  target?: string;
  data?: Record<string, unknown>;
  style?: Record<string, unknown>;
  states?: string[];
};

export type HzTopologyG6GraphData = {
  nodes: HzTopologyG6Datum[];
  edges: HzTopologyG6Datum[];
};

type HzTopologyLucideIconNode = readonly [string, Record<string, string>][];

export type HzTopologyG6NodeIconKind =
  | 'application'
  | 'service'
  | 'endpoint'
  | 'database'
  | 'cache'
  | 'queue'
  | 'middleware'
  | 'k8s-workload'
  | 'monitor'
  | 'resource'
  | 'alert'
  | 'unknown';

export type HzTopologyG6NodeIconName =
  | 'app-window'
  | 'server-cog'
  | 'route'
  | 'database'
  | 'memory-stick'
  | 'inbox'
  | 'workflow'
  | 'container'
  | 'activity'
  | 'server'
  | 'triangle-alert'
  | 'circle-help';

export type HzTopologyG6NodeIconSpec = {
  kind: HzTopologyG6NodeIconKind;
  label: string;
  iconName: HzTopologyG6NodeIconName;
  aliases: readonly string[];
  iconSrc: string;
  iconLibrary: 'lucide-react';
  iconSource: 'entity-type-catalog';
};

export type HzTopologyG6ScaleTier = 'compact' | 'dense' | 'stress' | 'overflow';

export type HzTopologyG6ScaleProfile = {
  nodeCount: number;
  edgeCount: number;
  scaleTier: HzTopologyG6ScaleTier;
  layoutHint: 'layered-service' | 'force';
};

export type HzTopologyG6ShapeKind = 'empty' | 'node-only' | 'chain' | 'single-star' | 'mesh' | 'mixed-star-mesh';

export type HzTopologyG6ShapeProfile = {
  shape: HzTopologyG6ShapeKind;
  hubNodeCount: number;
  starEdgeCount: number;
  meshEdgeCount: number;
  evidence: 'degree-derived';
};

export type HzTopologyG6LargeGraphRequirement = 'optional' | 'recommended' | 'required';

export type HzTopologyG6LargeGraphStrategyName =
  | 'direct-canvas'
  | 'force-with-grouping'
  | 'grouped-table-companion'
  | 'filter-first';

export type HzTopologyG6LargeGraphStrategy = {
  nodeCount: number;
  edgeCount: number;
  scaleTier: HzTopologyG6ScaleTier;
  strategy: HzTopologyG6LargeGraphStrategyName;
  recommendedLayout: 'layered-service' | 'force';
  grouping: HzTopologyG6LargeGraphRequirement;
  filtering: HzTopologyG6LargeGraphRequirement;
  tableCompanion: HzTopologyG6LargeGraphRequirement;
  visibleNodeBudget: number;
};

export type HzTopologyG6InitialFitStrategy = 'center-only' | 'overflow-fit';

export type HzTopologyG6EdgeLabelPolicy = 'visible' | 'hidden-large-graph';
export type HzTopologyG6NodeLabelPolicy = 'visible' | 'hub-only-large-graph';

export type HzTopologyG6GraphBuildOptions = {
  edgeLabelPolicy?: HzTopologyG6EdgeLabelPolicy;
  nodeLabelPolicy?: HzTopologyG6NodeLabelPolicy;
  edgeReadabilityProfile?: HzTopologyG6EdgeReadabilityProfile;
};

export type HzTopologyG6NodeLabelCounts = {
  policy: HzTopologyG6NodeLabelPolicy;
  visibleCount: number;
  hiddenCount: number;
};

export type HzTopologyG6EdgeDensityPolicy = 'all-visible' | 'reduced-large-graph';

export type HzTopologyG6EdgeReadabilityPolicy = 'standard' | 'attenuated-large-graph';

export type HzTopologyG6EdgeReadabilityProfile = {
  policy: HzTopologyG6EdgeReadabilityPolicy;
  evidence: 'density-derived';
  rankingPolicy: 'red-priority-stable-render-order';
  stability: 'selection-hover-invariant';
  maxProminentEdgeCount: number;
  prominentEdgeCount: number;
  attenuatedEdgeCount: number;
  minimumOpacity: number;
  prominentEdgeIds: string[];
  attenuatedEdgeIds: string[];
};

export type HzTopologyG6EdgeDensityWindow = {
  graph: HzTopologyG6GraphInput;
  policy: HzTopologyG6EdgeDensityPolicy;
  totalEdgeCount: number;
  renderedEdgeCount: number;
  hiddenEdgeCount: number;
  maxVisibleEdgeCount: number;
};

export type HzTopologyG6EdgeDensityWindowOptions = {
  mode?: HzTopologyG6RenderWindow['mode'];
  maxVisibleEdgeCount?: number;
};

export type HzTopologyG6RenderWindow = {
  graph: HzTopologyG6GraphInput;
  mode: 'direct' | 'windowed';
  totalNodeCount: number;
  totalEdgeCount: number;
  renderedNodeCount: number;
  renderedEdgeCount: number;
  hiddenNodeCount: number;
  hiddenEdgeCount: number;
  visibleNodeBudget: number;
  tableCompanion: HzTopologyG6LargeGraphRequirement;
  priorityNodeIds: string[];
  priorityNodeCount: number;
};

export type HzTopologyG6RenderWindowOptions = {
  priorityNodeIds?: string[];
};

export type HzTopologyG6SearchFocus = {
  query: string;
  status: 'inactive' | 'matched' | 'empty';
  matchCount: number;
  firstMatchedNodeId?: string;
  matchedNodeIds: string[];
};

export type HzTopologyG6FilterScopeOptions = {
  environment?: string;
  sourceKind?: string;
  groupBy?: string;
  searchQuery?: string;
};

export type HzTopologyG6FilterScope = {
  environment: string;
  sourceKind: string;
  groupBy: string;
  searchQuery: string;
  visibleNodeCount: number;
  visibleEdgeCount: number;
  sourceKindMatched: boolean;
  groupCount: number;
};

export type HzTopologyG6GroupTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export type HzTopologyG6GroupSummaryItem = {
  id: string;
  label: string;
  nodeCount: number;
  edgeCount: number;
  collapsedNodeCount: number;
  worstTone: HzTopologyG6GroupTone;
  active: boolean;
};

export type HzTopologyG6GroupSummary = {
  groupBy: string;
  active: boolean;
  itemCount: number;
  totalCollapsedNodeCount: number;
  items: HzTopologyG6GroupSummaryItem[];
};

export type HzTopologyG6SemanticClusterPolicy = 'none' | 'hub-fanout-summary';

export type HzTopologyG6SemanticClusterItem = {
  id: string;
  rank: number;
  role: 'hub';
  nodeId: string;
  label: string;
  entityType: string;
  incomingEdgeCount: number;
  outgoingEdgeCount: number;
  totalEdgeCount: number;
  leafNodeCount: number;
};

export type HzTopologyG6SemanticClusterSummary = {
  policy: HzTopologyG6SemanticClusterPolicy;
  itemCount: number;
  hiddenNodeCount: number;
  hiddenEdgeCount: number;
  tableCompanion: HzTopologyG6LargeGraphRequirement;
  items: HzTopologyG6SemanticClusterItem[];
};

export type HzTopologyG6FilterControlKind = 'source-kind' | 'group-by' | 'search' | 'reset';

export type HzTopologyG6FilterControl = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'id'> & {
  id: string;
  kind: HzTopologyG6FilterControlKind;
  label: string;
  value?: string;
  active?: boolean;
  disabled?: boolean;
};

type G6GraphRuntime = {
  render: () => Promise<void>;
  destroy: () => void;
  setData: (data: HzTopologyG6GraphData) => void;
  draw: () => Promise<void>;
  resize: (width?: number, height?: number) => void;
  fitView?: (options?: Record<string, unknown>, animation?: Record<string, unknown> | boolean) => Promise<void>;
  fitCenter?: (animation?: Record<string, unknown> | boolean) => Promise<void>;
  zoomBy?: (scale: number, animation?: Record<string, unknown> | boolean) => Promise<void>;
  zoomTo?: (scale: number, animation?: Record<string, unknown> | boolean, origin?: number[]) => Promise<void>;
  setZoomRange?: (zoomRange: [number, number]) => void;
  getZoomRange?: () => [number, number];
  getZoom?: () => number;
  getPosition?: () => number[];
  translateTo?: (position: number[], animation?: Record<string, unknown> | boolean) => Promise<void>;
  translateBy?: (offset: number[], animation?: Record<string, unknown> | boolean) => Promise<void>;
  focusElement?: (id: string | string[], animation?: Record<string, unknown> | boolean) => Promise<void>;
  setElementState?: (state: Record<string, string | string[]>, animation?: boolean) => Promise<void>;
  on?: (eventName: string, handler: (event: HzTopologyG6PointerEvent) => void) => void;
};

export const HZ_TOPOLOGY_G6_MIN_ZOOM = 0.18;
export const HZ_TOPOLOGY_G6_MAX_ZOOM = 2.2;
export const HZ_TOPOLOGY_G6_COMPACT_MAX_ZOOM = 1.35;
export const HZ_TOPOLOGY_G6_AUTO_FIT_MAX_ZOOM = 1;
export const HZ_TOPOLOGY_G6_COMPACT_INITIAL_ZOOM = 1;
const HZ_TOPOLOGY_G6_POINTER_PAN_SELECTION_SUPPRESS_MS = 350;
export const HZ_TOPOLOGY_G6_VIEWPORT_RUNTIME_VERSION = "compact-viewport-guard-v3";
export const HZ_TOPOLOGY_G6_EDGE_LABEL_VISIBLE_EDGE_LIMIT = 120;
export const HZ_TOPOLOGY_G6_EDGE_DENSITY_VISIBLE_EDGE_LIMIT = 180;
export const HZ_TOPOLOGY_G6_EDGE_READABILITY_PROMINENT_EDGE_LIMIT = 72;
export const HZ_TOPOLOGY_G6_EDGE_READABILITY_MIN_OPACITY = 0.2;
export const HZ_TOPOLOGY_G6_WINDOWED_LANE_MAX_ROWS = 18;

type HzTopologyG6ViewportSnapshot = {
  zoom: number;
  position: number[];
};

type HzTopologyG6ViewportTelemetrySource =
  | 'initial'
  | 'initial-fit'
  | 'wheel'
  | 'pointer-pan'
  | 'zoom-control'
  | 'fit-view'
  | 'reset-view'
  | 'focus-element'
  | 'redraw-restore'
  | 'resize-restore'
  | 'runtime-zoom-guard';

type HzTopologyG6ViewportCommandAction = 'zoom-in' | 'zoom-out' | 'fit-view' | 'reset-view';

type HzTopologyG6ViewportTelemetry = {
  source: HzTopologyG6ViewportTelemetrySource;
  zoom?: number;
  position?: number[];
};

type HzTopologyG6PointerPanState = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  active: boolean;
};

type HzTopologyG6FocusActionTelemetrySource = 'none' | 'search-result' | 'selected-node';

type HzTopologyG6FocusActionTelemetry = {
  source: HzTopologyG6FocusActionTelemetrySource;
  targetId?: string;
};

type HzTopologyG6HoverElement = {
  nodeId?: string;
  edgeId?: string;
};

type HzTopologyG6PointerEvent = {
  target?: { id?: string };
  targetType?: string;
  itemId?: string;
  x?: number;
  y?: number;
  canvas?: { x?: number; y?: number };
  viewport?: { x?: number; y?: number };
  client?: { x?: number; y?: number };
  clientX?: number;
  clientY?: number;
  nativeEvent?: { clientX?: number; clientY?: number };
  originalEvent?: { clientX?: number; clientY?: number };
};

export type HzTopologyG6HoverAnchor = {
  x: number;
  y: number;
  source: 'g6-pointer' | 'fallback';
};

function finiteMetric(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function formatMetric(value: number | undefined, suffix = '') {
  const metric = finiteMetric(value);
  if (metric === undefined) return undefined;
  return `${String(metric)}${suffix}`;
}

function toneStroke(tone: HzTopologyG6Tone | undefined, health?: string) {
  if (tone === 'danger' || tone === 'red' || health === 'critical') return '#ef4444';
  if (tone === 'warning' || tone === 'orange' || health === 'warning') return '#f59e0b';
  if (tone === 'purple') return '#a78bfa';
  if (tone === 'blue') return '#60a5fa';
  if (tone === 'success' || tone === 'green' || health === 'healthy') return '#22c55e';
  return '#94a3b8';
}

function nodeFill(tone: HzTopologyG6Tone | undefined, health?: string) {
  if (tone === 'danger' || tone === 'red' || health === 'critical') return '#251012';
  if (tone === 'warning' || tone === 'orange' || health === 'warning') return '#241a0b';
  if (tone === 'purple') return '#181225';
  if (tone === 'blue') return '#0c1726';
  if (tone === 'success' || tone === 'green' || health === 'healthy') return '#0b1f16';
  return '#10141d';
}

function encodeLucideAttribute(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function lucideSvgDataUri(iconNode: HzTopologyLucideIconNode) {
  const paths = iconNode
    .map(([tag, attributes]) => {
      const attrs = Object.entries(attributes)
        .filter(([name]) => name !== 'key')
        .map(([name, value]) => `${name}="${encodeLucideAttribute(value)}"`)
        .join(' ');
      return `<${tag}${attrs ? ` ${attrs}` : ''}/>`;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e5edf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function topologyNodeIconSpec(
  kind: HzTopologyG6NodeIconKind,
  label: string,
  iconName: HzTopologyG6NodeIconName,
  aliases: readonly string[],
  iconNode: HzTopologyLucideIconNode
): HzTopologyG6NodeIconSpec {
  return {
    kind,
    label,
    iconName,
    aliases,
    iconSrc: lucideSvgDataUri(iconNode),
    iconLibrary: 'lucide-react',
    iconSource: 'entity-type-catalog'
  };
}

export const HZ_TOPOLOGY_G6_NODE_ICON_CATALOG: readonly HzTopologyG6NodeIconSpec[] = [
  topologyNodeIconSpec('application', 'Application', 'app-window', ['application', 'app'], appWindowIconNode),
  topologyNodeIconSpec('service', 'Service', 'server-cog', ['service', 'api'], serverCogIconNode),
  topologyNodeIconSpec('endpoint', 'Endpoint', 'route', ['endpoint', 'route', 'path', 'url', '/api/'], routeIconNode),
  topologyNodeIconSpec('database', 'Database', 'database', ['database', 'db', 'mysql', 'postgres', 'postgresql', 'mongo'], databaseIconNode),
  topologyNodeIconSpec('cache', 'Cache', 'memory-stick', ['cache', 'redis', 'memcached'], memoryStickIconNode),
  topologyNodeIconSpec('queue', 'Queue', 'inbox', ['queue', 'mq', 'broker', 'topic', 'messaging', 'kafka', 'rabbit'], inboxIconNode),
  topologyNodeIconSpec(
    'middleware',
    'Middleware',
    'workflow',
    ['middleware'],
    workflowIconNode
  ),
  topologyNodeIconSpec(
    'k8s-workload',
    'Workload',
    'container',
    ['k8s', 'kubernetes', 'workload', 'pod', 'deployment', 'daemonset', 'statefulset', 'job', 'cronjob'],
    containerIconNode
  ),
  topologyNodeIconSpec('monitor', 'Monitor', 'activity', ['monitor', 'collector', 'agent', 'probe', 'check'], activityIconNode),
  topologyNodeIconSpec('resource', 'Resource', 'server', ['resource', 'host', 'node', 'server', 'vm', 'device'], serverIconNode),
  topologyNodeIconSpec('alert', 'Alert', 'triangle-alert', ['alert', 'incident', 'event'], triangleAlertIconNode),
  topologyNodeIconSpec('unknown', 'Unknown', 'circle-help', [], circleHelpIconNode)
];

export const HZ_TOPOLOGY_G6_NODE_ICON_CATALOG_SUMMARY = HZ_TOPOLOGY_G6_NODE_ICON_CATALOG.map(
  icon => `${icon.kind}:${icon.iconName}`
).join(' ');

export function getHzTopologyG6NodeIcon(entityType: string | undefined): HzTopologyG6NodeIconSpec {
  const normalized = (entityType ?? '').toLowerCase();
  if (normalized.startsWith('/') || normalized.includes('/api/')) {
    return HZ_TOPOLOGY_G6_NODE_ICON_CATALOG.find(icon => icon.kind === 'endpoint')
      ?? HZ_TOPOLOGY_G6_NODE_ICON_CATALOG[HZ_TOPOLOGY_G6_NODE_ICON_CATALOG.length - 1];
  }
  const matchedIcon = HZ_TOPOLOGY_G6_NODE_ICON_CATALOG.find(
    icon => icon.kind !== 'unknown' && icon.aliases.some(alias => normalized.includes(alias))
  );
  return matchedIcon ?? HZ_TOPOLOGY_G6_NODE_ICON_CATALOG[HZ_TOPOLOGY_G6_NODE_ICON_CATALOG.length - 1];
}

function edgeWidth(metrics: HzTopologyG6RedMetrics | undefined) {
  const rate = finiteMetric(metrics?.requestRatePerSecond);
  if (rate === undefined) return 1.6;
  return Math.max(1.6, Math.min(5.5, 1.8 + Math.log10(rate + 1) * 1.9));
}

function nodeStat(node: HzTopologyG6NodeInput) {
  const latency = formatMetric(node.redMetrics?.latencyP95Ms, 'ms');
  const rate = formatMetric(node.redMetrics?.requestRatePerSecond, '/s');
  if (latency && rate) return `${latency} · ${rate}`;
  return latency ?? rate ?? node.entityType;
}

function edgeLabel(edge: HzTopologyG6EdgeInput) {
  const rate = formatMetric(edge.redMetrics?.requestRatePerSecond, '/s');
  const error = finiteMetric(edge.redMetrics?.errorRate);
  if (rate && error !== undefined) {
    const percent = Math.abs(error) <= 1 ? error * 100 : error;
    return `${rate} · ${percent.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
  }
  return edge.label ?? edge.relationshipType ?? edge.source ?? '';
}

function normalizedScopeValue(value: string | undefined, fallback: string) {
  const trimmed = (value ?? '').trim();
  return trimmed || fallback;
}

function isEditableG6ShortcutTarget(target: EventTarget | null) {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLocaleLowerCase();
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.closest('[contenteditable="true"]') !== null;
}

export function buildHzTopologyG6FilterScope(
  input: HzTopologyG6GraphInput,
  options: HzTopologyG6FilterScopeOptions = {}
): HzTopologyG6FilterScope {
  const environment = normalizedScopeValue(options.environment, 'all');
  const sourceKind = normalizedScopeValue(options.sourceKind, 'all');
  const groupBy = normalizedScopeValue(options.groupBy, 'none');
  const searchQuery = normalizedScopeValue(options.searchQuery, 'none');
  const sourceKindMatched =
    sourceKind === 'all' || input.nodes.some(node => node.source === sourceKind) || input.edges.some(edge => edge.source === sourceKind);
  const groupValues = new Set<string>();

  if (groupBy === 'source-kind') {
    input.nodes.forEach(node => groupValues.add(node.source ?? 'unknown'));
    input.edges.forEach(edge => groupValues.add(edge.source ?? 'unknown'));
  } else if (groupBy === 'entity-type') {
    input.nodes.forEach(node => groupValues.add(node.entityType || 'unknown'));
  } else if (groupBy === 'environment') {
    groupValues.add(environment);
  } else if (groupBy === 'health') {
    input.nodes.forEach(node => groupValues.add(node.health || 'unknown'));
  }

  return {
    environment,
    sourceKind,
    groupBy,
    searchQuery,
    visibleNodeCount: input.nodes.length,
    visibleEdgeCount: input.edges.length,
    sourceKindMatched,
    groupCount: groupBy === 'none' ? 0 : groupValues.size
  };
}

function groupValueForNode(node: HzTopologyG6NodeInput, groupBy: string, fallbackEnvironment: string) {
  if (groupBy === 'source-kind') return node.source ?? 'unknown';
  if (groupBy === 'entity-type') return node.entityType || 'unknown';
  if (groupBy === 'environment') return fallbackEnvironment;
  if (groupBy === 'health') return node.health || 'unknown';
  return 'all';
}

function groupValueForEdge(edge: HzTopologyG6EdgeInput, groupBy: string, fallbackEnvironment: string) {
  if (groupBy === 'source-kind') return edge.source ?? 'unknown';
  if (groupBy === 'entity-type') return edge.relationshipType || 'relationship';
  if (groupBy === 'environment') return fallbackEnvironment;
  if (groupBy === 'health') return edge.tone ?? 'unknown';
  return 'all';
}

function toneSeverity(tone: string | undefined) {
  if (tone === 'critical' || tone === 'danger' || tone === 'red') return 3;
  if (tone === 'warning' || tone === 'orange') return 2;
  if (tone === 'healthy' || tone === 'success' || tone === 'green') return 1;
  return 0;
}

function summaryToneFromSeverity(severity: number): HzTopologyG6GroupTone {
  if (severity >= 3) return 'danger';
  if (severity >= 2) return 'warning';
  if (severity >= 1) return 'success';
  return 'neutral';
}

function groupItemLabel(value: string) {
  return value === 'all' || value === 'none' ? value : value.replace(/[-_]+/g, ' ');
}

export function buildHzTopologyG6GroupSummary(
  input: HzTopologyG6GraphInput,
  options: HzTopologyG6FilterScopeOptions = {}
): HzTopologyG6GroupSummary {
  const activeFilterScope = buildHzTopologyG6FilterScope(input, options);
  const groupBy = activeFilterScope.groupBy;

  if (groupBy === 'none') {
    return {
      groupBy,
      active: false,
      itemCount: 0,
      totalCollapsedNodeCount: 0,
      items: []
    };
  }

  const groups = new Map<
    string,
    {
      nodeIds: Set<string>;
      edgeCount: number;
      severity: number;
    }
  >();
  const nodesById = new Map(input.nodes.map(node => [node.id, node]));

  const ensureGroup = (value: string) => {
    const existing = groups.get(value);
    if (existing) return existing;
    const group = { nodeIds: new Set<string>(), edgeCount: 0, severity: 0 };
    groups.set(value, group);
    return group;
  };

  const addNodeToGroup = (group: { nodeIds: Set<string>; edgeCount: number; severity: number }, node: HzTopologyG6NodeInput | undefined) => {
    if (!node) return;
    group.nodeIds.add(node.id);
    group.severity = Math.max(group.severity, toneSeverity(node.tone), toneSeverity(node.health));
  };

  input.nodes.forEach(node => {
    const group = ensureGroup(groupValueForNode(node, groupBy, activeFilterScope.environment));
    addNodeToGroup(group, node);
  });

  input.edges.forEach(edge => {
    const group = ensureGroup(groupValueForEdge(edge, groupBy, activeFilterScope.environment));
    group.edgeCount += 1;
    group.severity = Math.max(group.severity, toneSeverity(edge.tone));
    if (groupBy === 'source-kind') {
      addNodeToGroup(group, nodesById.get(edge.from));
      addNodeToGroup(group, nodesById.get(edge.to));
    }
  });

  const items = [...groups.entries()]
    .map(([id, group]) => {
      const nodeCount = group.nodeIds.size;
      return {
        id,
        label: groupItemLabel(id),
        nodeCount,
        edgeCount: group.edgeCount,
        collapsedNodeCount: Math.max(0, nodeCount - 1),
        worstTone: summaryToneFromSeverity(group.severity),
        active: groupBy === 'source-kind' ? activeFilterScope.sourceKind !== 'all' && id === activeFilterScope.sourceKind : false
      };
    })
    .sort((left, right) => right.nodeCount - left.nodeCount || right.edgeCount - left.edgeCount || left.id.localeCompare(right.id));

  return {
    groupBy,
    active: true,
    itemCount: items.length,
    totalCollapsedNodeCount: items.reduce((total, item) => total + item.collapsedNodeCount, 0),
    items
  };
}

function scaleNodeId(index: number, prefix: string) {
  return `${prefix}-svc-${String(index).padStart(3, '0')}`;
}

function scaleTone(index: number): HzTopologyG6Tone {
  if (index % 17 === 0) return 'danger';
  if (index % 7 === 0) return 'warning';
  if (index % 5 === 0) return 'blue';
  return 'success';
}

function scaleHealth(index: number) {
  if (index % 17 === 0) return 'critical';
  if (index % 7 === 0) return 'warning';
  return 'healthy';
}

function scaleMetrics(index: number): HzTopologyG6RedMetrics {
  return {
    requestRatePerSecond: Number((4 + (index % 23) * 0.71).toFixed(2)),
    errorRate: Number((((index % 17) + 1) / 1000).toFixed(3)),
    latencyP95Ms: 32 + (index % 19) * 9
  };
}

export function buildHzTopologyG6SemanticClusterSummary(
  input: HzTopologyG6GraphInput,
  renderWindow: Pick<HzTopologyG6RenderWindow, 'mode' | 'hiddenNodeCount' | 'hiddenEdgeCount' | 'tableCompanion'>
): HzTopologyG6SemanticClusterSummary {
  if (renderWindow.mode !== 'windowed' || input.nodes.length === 0 || input.edges.length === 0) {
    return {
      policy: 'none',
      itemCount: 0,
      hiddenNodeCount: renderWindow.hiddenNodeCount,
      hiddenEdgeCount: renderWindow.hiddenEdgeCount,
      tableCompanion: renderWindow.tableCompanion,
      items: []
    };
  }

  const nodesById = new Map(input.nodes.map(node => [node.id, node]));
  const degreeByNodeId = new Map<
    string,
    {
      incomingEdgeCount: number;
      outgoingEdgeCount: number;
      leafNodeIds: Set<string>;
    }
  >();
  const ensureDegree = (nodeId: string) => {
    const existing = degreeByNodeId.get(nodeId);
    if (existing) return existing;
    const next = { incomingEdgeCount: 0, outgoingEdgeCount: 0, leafNodeIds: new Set<string>() };
    degreeByNodeId.set(nodeId, next);
    return next;
  };

  input.nodes.forEach(node => ensureDegree(node.id));
  input.edges.forEach(edge => {
    const source = ensureDegree(edge.from);
    const target = ensureDegree(edge.to);
    source.outgoingEdgeCount += 1;
    target.incomingEdgeCount += 1;
  });
  input.edges.forEach(edge => {
    const source = ensureDegree(edge.from);
    const target = ensureDegree(edge.to);
    if (target.outgoingEdgeCount === 0) source.leafNodeIds.add(edge.to);
  });

  const items = input.nodes
    .map((node, index) => {
      const degree = ensureDegree(node.id);
      const totalEdgeCount = degree.incomingEdgeCount + degree.outgoingEdgeCount;
      return {
        node,
        index,
        totalEdgeCount,
        incomingEdgeCount: degree.incomingEdgeCount,
        outgoingEdgeCount: degree.outgoingEdgeCount,
        leafNodeCount: degree.leafNodeIds.size
      };
    })
    .filter(item => item.totalEdgeCount > 1 && (item.outgoingEdgeCount >= 2 || item.leafNodeCount > 0))
    .sort(
      (left, right) =>
        right.leafNodeCount - left.leafNodeCount ||
        right.outgoingEdgeCount - left.outgoingEdgeCount ||
        right.totalEdgeCount - left.totalEdgeCount ||
        left.index - right.index
    )
    .slice(0, 4)
    .map((item, index): HzTopologyG6SemanticClusterItem => {
      const node = nodesById.get(item.node.id) ?? item.node;
      return {
        id: `hub-${node.id}`,
        rank: index + 1,
        role: 'hub',
        nodeId: node.id,
        label: node.label,
        entityType: node.entityType,
        incomingEdgeCount: item.incomingEdgeCount,
        outgoingEdgeCount: item.outgoingEdgeCount,
        totalEdgeCount: item.totalEdgeCount,
        leafNodeCount: item.leafNodeCount
      };
    });

  return {
    policy: items.length > 0 ? 'hub-fanout-summary' : 'none',
    itemCount: items.length,
    hiddenNodeCount: renderWindow.hiddenNodeCount,
    hiddenEdgeCount: renderWindow.hiddenEdgeCount,
    tableCompanion: renderWindow.tableCompanion,
    items
  };
}

export function buildHzTopologyG6ScaleFixture(
  nodeCount: 50 | 200 | 500 | number,
  options: { prefix?: string; namespace?: string; environment?: string } = {}
): HzTopologyG6GraphInput {
  const count = Math.max(1, Math.floor(nodeCount));
  const prefix = options.prefix ?? 'scale';
  const namespace = options.namespace ?? 'scale';
  const environment = options.environment ?? 'prod';
  const nodes: HzTopologyG6NodeInput[] = Array.from({ length: count }, (_, index) => ({
    id: scaleNodeId(index, prefix),
    label: `Service ${String(index).padStart(3, '0')}`,
    entityType: index % 20 === 0 && index > 0 ? 'database' : 'service',
    health: scaleHealth(index),
    tone: scaleTone(index),
    source: 'otlp-trace-call',
    evidenceBadges: ['trace', 'scale-fixture'],
    redMetrics: scaleMetrics(index),
    href: `/topology?sourceKind=otlp-trace-call&environment=${environment}&serviceNamespace=${namespace}&entityId=${scaleNodeId(index, prefix)}`
  }));
  const edges: HzTopologyG6EdgeInput[] = [];

  for (let index = 1; index < count; index += 1) {
    const previous = index - 1;
    edges.push({
      id: `${prefix}-edge-${String(previous).padStart(3, '0')}-${String(index).padStart(3, '0')}`,
      from: scaleNodeId(previous, prefix),
      to: scaleNodeId(index, prefix),
      label: 'HTTP call',
      relationshipType: 'trace-call',
      source: 'otlp-trace-call',
      tone: scaleTone(index),
      evidenceBadges: ['trace', 'scale-fixture'],
      redMetrics: scaleMetrics(index),
      href: `/topology?sourceKind=otlp-trace-call&environment=${environment}&edgeId=${prefix}-edge-${String(previous).padStart(3, '0')}-${String(index).padStart(3, '0')}`
    });

    if (index >= 5 && index % 5 === 0) {
      const sourceIndex = Math.max(0, index - 3);
      edges.push({
        id: `${prefix}-fanout-${String(sourceIndex).padStart(3, '0')}-${String(index).padStart(3, '0')}`,
        from: scaleNodeId(sourceIndex, prefix),
        to: scaleNodeId(index, prefix),
        label: 'fan-out',
        relationshipType: 'trace-call',
        source: 'otlp-trace-call',
        tone: scaleTone(sourceIndex + index),
        evidenceBadges: ['trace', 'scale-fixture'],
        redMetrics: scaleMetrics(sourceIndex + index)
      });
    }

    if (index >= 11 && index % 11 === 0) {
      const sourceIndex = Math.max(0, index - 8);
      edges.push({
        id: `${prefix}-async-${String(sourceIndex).padStart(3, '0')}-${String(index).padStart(3, '0')}`,
        from: scaleNodeId(sourceIndex, prefix),
        to: scaleNodeId(index, prefix),
        label: 'async publish',
        relationshipType: 'trace-call',
        source: 'otlp-trace-call',
        tone: 'blue',
        evidenceBadges: ['trace', 'scale-fixture'],
        redMetrics: scaleMetrics(sourceIndex + index + 3)
      });
    }
  }

  return { nodes, edges };
}

export function buildHzTopologyG6ScaleProfile(input: HzTopologyG6GraphInput): HzTopologyG6ScaleProfile {
  const nodeCount = input.nodes.length;
  const edgeCount = input.edges.length;
  const scaleTier: HzTopologyG6ScaleTier =
    nodeCount <= 50 ? 'compact' : nodeCount <= 200 ? 'dense' : nodeCount <= 500 ? 'stress' : 'overflow';
  return {
    nodeCount,
    edgeCount,
    scaleTier,
    layoutHint: nodeCount <= 50 ? 'layered-service' : 'force'
  };
}

export function buildHzTopologyG6LargeGraphStrategy(input: HzTopologyG6GraphInput): HzTopologyG6LargeGraphStrategy {
  const profile = buildHzTopologyG6ScaleProfile(input);
  if (profile.scaleTier === 'overflow') {
    return {
      ...profile,
      strategy: 'filter-first',
      recommendedLayout: 'force',
      grouping: 'required',
      filtering: 'required',
      tableCompanion: 'required',
      visibleNodeBudget: 200
    };
  }
  if (profile.scaleTier === 'stress') {
    return {
      ...profile,
      strategy: 'grouped-table-companion',
      recommendedLayout: 'force',
      grouping: 'required',
      filtering: 'required',
      tableCompanion: 'required',
      visibleNodeBudget: 200
    };
  }
  if (profile.scaleTier === 'dense') {
    return {
      ...profile,
      strategy: 'force-with-grouping',
      recommendedLayout: 'force',
      grouping: 'recommended',
      filtering: 'recommended',
      tableCompanion: 'recommended',
      visibleNodeBudget: 200
    };
  }
  return {
    ...profile,
    strategy: 'direct-canvas',
    recommendedLayout: 'layered-service',
    grouping: 'optional',
    filtering: 'optional',
    tableCompanion: 'recommended',
    visibleNodeBudget: 120
  };
}

export function buildHzTopologyG6InitialFitStrategy(input: HzTopologyG6GraphInput): HzTopologyG6InitialFitStrategy {
  const nodeCount = input.nodes.length;
  const edgeCount = input.edges.length;
  return nodeCount > 0 && nodeCount <= 12 && edgeCount <= 18 ? 'center-only' : 'overflow-fit';
}

export function buildHzTopologyG6OperatorMaxZoom(initialFitStrategy: HzTopologyG6InitialFitStrategy) {
  return initialFitStrategy === 'center-only' ? HZ_TOPOLOGY_G6_COMPACT_MAX_ZOOM : HZ_TOPOLOGY_G6_MAX_ZOOM;
}

export function buildHzTopologyG6RuntimeMaxZoom(
  initialFitStrategy: HzTopologyG6InitialFitStrategy,
  hasUserViewportInteracted: boolean
) {
  if (initialFitStrategy === 'center-only' && !hasUserViewportInteracted) return HZ_TOPOLOGY_G6_COMPACT_INITIAL_ZOOM;
  return buildHzTopologyG6OperatorMaxZoom(initialFitStrategy);
}

export function buildHzTopologyG6RenderWindow(
  input: HzTopologyG6GraphInput,
  strategy: HzTopologyG6LargeGraphStrategy = buildHzTopologyG6LargeGraphStrategy(input),
  options: HzTopologyG6RenderWindowOptions = {}
): HzTopologyG6RenderWindow {
  const visibleNodeBudget = strategy.visibleNodeBudget;
  const inputNodeIds = new Set(input.nodes.map(node => node.id));
  const priorityNodeIds = (options.priorityNodeIds ?? []).reduce<string[]>((accumulator, nodeId) => {
    if (!inputNodeIds.has(nodeId) || accumulator.includes(nodeId)) return accumulator;
    return [...accumulator, nodeId];
  }, []);

  if (input.nodes.length <= visibleNodeBudget) {
    return {
      graph: input,
      mode: 'direct',
      totalNodeCount: input.nodes.length,
      totalEdgeCount: input.edges.length,
      renderedNodeCount: input.nodes.length,
      renderedEdgeCount: input.edges.length,
      hiddenNodeCount: 0,
      hiddenEdgeCount: 0,
      visibleNodeBudget,
      tableCompanion: strategy.tableCompanion,
      priorityNodeIds,
      priorityNodeCount: priorityNodeIds.length
    };
  }

  const nodesById = new Map(input.nodes.map(node => [node.id, node]));
  const visibleNodes = priorityNodeIds
    .map(nodeId => nodesById.get(nodeId))
    .filter((node): node is HzTopologyG6NodeInput => Boolean(node))
    .slice(0, visibleNodeBudget);
  const visibleNodeIdSet = new Set(visibleNodes.map(node => node.id));
  for (const node of input.nodes) {
    if (visibleNodes.length >= visibleNodeBudget) break;
    if (visibleNodeIdSet.has(node.id)) continue;
    visibleNodes.push(node);
    visibleNodeIdSet.add(node.id);
  }
  const visibleNodeIds = new Set(visibleNodes.map(node => node.id));
  const visibleEdges = input.edges.filter(edge => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to));

  return {
    graph: {
      nodes: visibleNodes,
      edges: visibleEdges
    },
    mode: 'windowed',
    totalNodeCount: input.nodes.length,
    totalEdgeCount: input.edges.length,
    renderedNodeCount: visibleNodes.length,
    renderedEdgeCount: visibleEdges.length,
    hiddenNodeCount: Math.max(0, input.nodes.length - visibleNodes.length),
    hiddenEdgeCount: Math.max(0, input.edges.length - visibleEdges.length),
    visibleNodeBudget,
    tableCompanion: strategy.tableCompanion,
    priorityNodeIds,
    priorityNodeCount: priorityNodeIds.length
  };
}

function scoreHzTopologyG6EdgeForDensity(edge: HzTopologyG6EdgeInput, index: number) {
  const metrics = edge.redMetrics;
  const requestWeight = metrics?.requestRatePerSecond ?? metrics?.requestCount ?? 0;
  const errorWeight = (metrics?.errorRate ?? 0) * 1000 + (metrics?.errorCount ?? 0) * 8;
  const latencyWeight = (metrics?.latencyP95Ms ?? metrics?.latencyAvgMs ?? 0) / 10;
  const focusWeight = edge.selected || edge.focus === 'active-path' ? 1_000_000 : edge.focus === 'context-muted' ? -10_000 : 0;
  const severityWeight = edge.tone === 'danger' || edge.tone === 'red' ? 20_000 : edge.tone === 'warning' || edge.tone === 'orange' ? 8_000 : 0;
  const sourceWeight = edge.source === 'otlp-trace-call' || edge.relationshipType === 'trace-call' ? 500 : 0;

  return focusWeight + severityWeight + requestWeight + errorWeight + latencyWeight + sourceWeight - index / 10_000;
}

export function buildHzTopologyG6EdgeDensityWindow(
  input: HzTopologyG6GraphInput,
  options: HzTopologyG6EdgeDensityWindowOptions = {}
): HzTopologyG6EdgeDensityWindow {
  const maxVisibleEdgeCount = options.maxVisibleEdgeCount ?? HZ_TOPOLOGY_G6_EDGE_DENSITY_VISIBLE_EDGE_LIMIT;
  const shouldReduce = options.mode === 'windowed' && input.edges.length > maxVisibleEdgeCount;

  if (!shouldReduce) {
    return {
      graph: input,
      policy: 'all-visible',
      totalEdgeCount: input.edges.length,
      renderedEdgeCount: input.edges.length,
      hiddenEdgeCount: 0,
      maxVisibleEdgeCount
    };
  }

  const rankedEdges = input.edges
    .map((edge, index) => ({
      edge,
      index,
      score: scoreHzTopologyG6EdgeForDensity(edge, index)
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, maxVisibleEdgeCount)
    .sort((left, right) => left.index - right.index)
    .map(item => item.edge);

  return {
    graph: {
      nodes: input.nodes,
      edges: rankedEdges
    },
    policy: 'reduced-large-graph',
    totalEdgeCount: input.edges.length,
    renderedEdgeCount: rankedEdges.length,
    hiddenEdgeCount: Math.max(0, input.edges.length - rankedEdges.length),
    maxVisibleEdgeCount
  };
}

export function buildHzTopologyG6EdgeReadabilityProfile(
  input: HzTopologyG6GraphInput,
  densityPolicy: HzTopologyG6EdgeDensityPolicy = 'all-visible',
  options: { maxProminentEdgeCount?: number; minimumOpacity?: number } = {}
): HzTopologyG6EdgeReadabilityProfile {
  const maxProminentEdgeCount = options.maxProminentEdgeCount ?? HZ_TOPOLOGY_G6_EDGE_READABILITY_PROMINENT_EDGE_LIMIT;
  const minimumOpacity = options.minimumOpacity ?? HZ_TOPOLOGY_G6_EDGE_READABILITY_MIN_OPACITY;
  const shouldAttenuate = densityPolicy === 'reduced-large-graph' && input.edges.length > maxProminentEdgeCount;

  if (!shouldAttenuate) {
    return {
      policy: 'standard',
      evidence: 'density-derived',
      rankingPolicy: 'red-priority-stable-render-order',
      stability: 'selection-hover-invariant',
      maxProminentEdgeCount,
      prominentEdgeCount: input.edges.length,
      attenuatedEdgeCount: 0,
      minimumOpacity,
      prominentEdgeIds: input.edges.map(edge => edge.id),
      attenuatedEdgeIds: []
    };
  }

  const prominentEdgeIdSet = new Set(
    input.edges
      .map((edge, index) => ({
        edge,
        index,
        score: scoreHzTopologyG6EdgeForDensity(edge, index)
      }))
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .slice(0, maxProminentEdgeCount)
      .map(item => item.edge.id)
  );
  const prominentEdgeIds = input.edges.map(edge => edge.id).filter(edgeId => prominentEdgeIdSet.has(edgeId));
  const attenuatedEdgeIds = input.edges.map(edge => edge.id).filter(edgeId => !prominentEdgeIdSet.has(edgeId));

  return {
    policy: 'attenuated-large-graph',
    evidence: 'density-derived',
    rankingPolicy: 'red-priority-stable-render-order',
    stability: 'selection-hover-invariant',
    maxProminentEdgeCount,
    prominentEdgeCount: prominentEdgeIds.length,
    attenuatedEdgeCount: attenuatedEdgeIds.length,
    minimumOpacity,
    prominentEdgeIds,
    attenuatedEdgeIds
  };
}

export function buildHzTopologyG6SearchFocus(input: HzTopologyG6GraphInput, query: string | undefined): HzTopologyG6SearchFocus {
  const normalizedQuery = (query ?? '').trim();
  if (!normalizedQuery) {
    return {
      query: '',
      status: 'inactive',
      matchCount: 0,
      matchedNodeIds: []
    };
  }
  const needle = normalizedQuery.toLocaleLowerCase();
  const matchedNodeIds = input.nodes
    .filter(node => {
      const haystack = [
        node.id,
        node.label,
        node.entityType,
        node.health,
        node.source,
        ...(node.evidenceBadges ?? [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();
      return haystack.includes(needle);
    })
    .map(node => node.id);

  return {
    query: normalizedQuery,
    status: matchedNodeIds.length > 0 ? 'matched' : 'empty',
    matchCount: matchedNodeIds.length,
    firstMatchedNodeId: matchedNodeIds[0],
    matchedNodeIds
  };
}

export type HzTopologyG6NeighborNodeRole = 'focus' | 'upstream' | 'downstream' | 'dimmed' | 'normal';
export type HzTopologyG6NeighborEdgeRole = 'incoming' | 'outgoing' | 'selected' | 'dimmed' | 'normal';

export type HzTopologyG6NeighborFocus = {
  focusNodeId?: string;
  focusEdgeId?: string;
  upstreamNodeIds: string[];
  downstreamNodeIds: string[];
  dimmedNodeIds: string[];
  incomingEdgeIds: string[];
  outgoingEdgeIds: string[];
  selectedEdgeIds: string[];
  dimmedEdgeIds: string[];
  nodeRoles: Record<string, HzTopologyG6NeighborNodeRole>;
  edgeRoles: Record<string, HzTopologyG6NeighborEdgeRole>;
};

function orderedIds<T extends { id: string }>(items: T[], ids: Set<string>) {
  return items.map(item => item.id).filter(id => ids.has(id));
}

export function buildHzTopologyG6NeighborFocus(
  input: HzTopologyG6GraphInput,
  options: { selectedNodeId?: string; selectedEdgeId?: string } = {}
): HzTopologyG6NeighborFocus {
  const nodeIds = new Set(input.nodes.map(node => node.id));
  const selectedNodeId = options.selectedNodeId && nodeIds.has(options.selectedNodeId) ? options.selectedNodeId : undefined;
  const selectedEdge = input.edges.find(edge => edge.id === options.selectedEdgeId);
  const focusEdgeId = selectedEdge?.id;
  const upstreamNodeIds = new Set<string>();
  const downstreamNodeIds = new Set<string>();
  const incomingEdgeIds = new Set<string>();
  const outgoingEdgeIds = new Set<string>();
  const selectedEdgeIds = new Set<string>();

  if (focusEdgeId) selectedEdgeIds.add(focusEdgeId);

  if (selectedNodeId) {
    input.edges.forEach(edge => {
      if (edge.to === selectedNodeId) {
        incomingEdgeIds.add(edge.id);
        if (nodeIds.has(edge.from)) upstreamNodeIds.add(edge.from);
      }
      if (edge.from === selectedNodeId) {
        outgoingEdgeIds.add(edge.id);
        if (nodeIds.has(edge.to)) downstreamNodeIds.add(edge.to);
      }
    });
  } else if (selectedEdge) {
    if (nodeIds.has(selectedEdge.from)) upstreamNodeIds.add(selectedEdge.from);
    if (nodeIds.has(selectedEdge.to)) downstreamNodeIds.add(selectedEdge.to);
  }

  const hasFocus = Boolean(selectedNodeId || selectedEdge);
  const relatedNodeIds = new Set<string>([...upstreamNodeIds, ...downstreamNodeIds]);
  if (selectedNodeId) relatedNodeIds.add(selectedNodeId);
  const activeEdgeIds = new Set<string>([...incomingEdgeIds, ...outgoingEdgeIds, ...selectedEdgeIds]);
  const dimmedNodeIds = new Set<string>();
  const dimmedEdgeIds = new Set<string>();
  const nodeRoles: Record<string, HzTopologyG6NeighborNodeRole> = {};
  const edgeRoles: Record<string, HzTopologyG6NeighborEdgeRole> = {};

  input.nodes.forEach(node => {
    if (selectedNodeId && node.id === selectedNodeId) {
      nodeRoles[node.id] = 'focus';
    } else if (upstreamNodeIds.has(node.id)) {
      nodeRoles[node.id] = 'upstream';
    } else if (downstreamNodeIds.has(node.id)) {
      nodeRoles[node.id] = 'downstream';
    } else if (hasFocus) {
      nodeRoles[node.id] = 'dimmed';
      dimmedNodeIds.add(node.id);
    } else {
      nodeRoles[node.id] = 'normal';
    }
  });

  input.edges.forEach(edge => {
    if (selectedNodeId && incomingEdgeIds.has(edge.id)) {
      edgeRoles[edge.id] = 'incoming';
    } else if (selectedNodeId && outgoingEdgeIds.has(edge.id)) {
      edgeRoles[edge.id] = 'outgoing';
    } else if (!selectedNodeId && selectedEdgeIds.has(edge.id)) {
      edgeRoles[edge.id] = 'selected';
    } else if (hasFocus && !activeEdgeIds.has(edge.id)) {
      edgeRoles[edge.id] = 'dimmed';
      dimmedEdgeIds.add(edge.id);
    } else {
      edgeRoles[edge.id] = 'normal';
    }
  });

  return {
    focusNodeId: selectedNodeId,
    focusEdgeId,
    upstreamNodeIds: orderedIds(input.nodes, upstreamNodeIds),
    downstreamNodeIds: orderedIds(input.nodes, downstreamNodeIds),
    dimmedNodeIds: orderedIds(input.nodes, dimmedNodeIds),
    incomingEdgeIds: orderedIds(input.edges, incomingEdgeIds),
    outgoingEdgeIds: orderedIds(input.edges, outgoingEdgeIds),
    selectedEdgeIds: orderedIds(input.edges, selectedEdgeIds),
    dimmedEdgeIds: orderedIds(input.edges, dimmedEdgeIds),
    nodeRoles,
    edgeRoles
  };
}

function buildHzTopologyG6NodeDegrees(input: HzTopologyG6GraphInput) {
  const degrees = new Map<string, { incoming: number; outgoing: number; total: number }>();
  input.nodes.forEach(node => degrees.set(node.id, { incoming: 0, outgoing: 0, total: 0 }));
  input.edges.forEach(edge => {
    const from = degrees.get(edge.from);
    if (from) {
      from.outgoing += 1;
      from.total += 1;
    }
    const to = degrees.get(edge.to);
    if (to) {
      to.incoming += 1;
      to.total += 1;
    }
  });
  return degrees;
}

function buildHzTopologyG6NodeLabelVisibility(input: HzTopologyG6GraphInput, policy: HzTopologyG6NodeLabelPolicy) {
  const visibleNodeIds = new Set<string>();
  if (policy === 'visible') {
    input.nodes.forEach(node => visibleNodeIds.add(node.id));
    return { visibleNodeIds };
  }

  const degrees = buildHzTopologyG6NodeDegrees(input);
  input.nodes.forEach(node => {
    const degree = degrees.get(node.id) ?? { incoming: 0, outgoing: 0, total: 0 };
    const isFocused = node.focus === 'active' || node.focus === 'related';
    const isHub = degree.outgoing >= 2 || degree.incoming >= 3 || degree.total >= 4;
    const isRoot = degree.incoming === 0 && degree.outgoing > 0;
    if (isFocused || isHub || isRoot) {
      visibleNodeIds.add(node.id);
    }
  });

  if (visibleNodeIds.size === 0) {
    input.nodes.slice(0, 12).forEach(node => visibleNodeIds.add(node.id));
  }

  return { visibleNodeIds };
}

export function buildHzTopologyG6NodeLabelCounts(
  input: HzTopologyG6GraphInput,
  policy: HzTopologyG6NodeLabelPolicy = 'visible'
): HzTopologyG6NodeLabelCounts {
  const visibility = buildHzTopologyG6NodeLabelVisibility(input, policy);
  return {
    policy,
    visibleCount: visibility.visibleNodeIds.size,
    hiddenCount: Math.max(0, input.nodes.length - visibility.visibleNodeIds.size)
  };
}

export function buildHzTopologyG6ShapeProfile(input: HzTopologyG6GraphInput): HzTopologyG6ShapeProfile {
  if (input.nodes.length === 0) {
    return { shape: 'empty', hubNodeCount: 0, starEdgeCount: 0, meshEdgeCount: 0, evidence: 'degree-derived' };
  }
  if (input.edges.length === 0) {
    return { shape: 'node-only', hubNodeCount: 0, starEdgeCount: 0, meshEdgeCount: 0, evidence: 'degree-derived' };
  }

  const degrees = buildHzTopologyG6NodeDegrees(input);
  const hubNodeIds = new Set<string>();
  input.nodes.forEach(node => {
    const degree = degrees.get(node.id) ?? { incoming: 0, outgoing: 0, total: 0 };
    if (degree.outgoing >= 8 || degree.incoming >= 8 || degree.total >= 12) {
      hubNodeIds.add(node.id);
    }
  });

  let starEdgeCount = 0;
  let meshEdgeCount = 0;
  input.edges.forEach(edge => {
    const fromDegree = degrees.get(edge.from) ?? { incoming: 0, outgoing: 0, total: 0 };
    const toDegree = degrees.get(edge.to) ?? { incoming: 0, outgoing: 0, total: 0 };
    const touchesHub = hubNodeIds.has(edge.from) || hubNodeIds.has(edge.to);
    const touchesLeaf = fromDegree.total <= 2 || toDegree.total <= 2;

    if (touchesHub && touchesLeaf) {
      starEdgeCount += 1;
    } else if (fromDegree.total >= 2 && toDegree.total >= 2) {
      meshEdgeCount += 1;
    }
  });

  const shape: HzTopologyG6ShapeKind =
    starEdgeCount > 0 && meshEdgeCount > 0
      ? 'mixed-star-mesh'
      : meshEdgeCount > 0
        ? 'mesh'
        : starEdgeCount > 0
          ? 'single-star'
          : 'chain';

  return {
    shape,
    hubNodeCount: hubNodeIds.size,
    starEdgeCount,
    meshEdgeCount,
    evidence: 'degree-derived'
  };
}

export function buildHzTopologyG6Graph(input: HzTopologyG6GraphInput, options: HzTopologyG6GraphBuildOptions = {}): HzTopologyG6GraphData {
  const showEdgeLabels = options.edgeLabelPolicy !== 'hidden-large-graph';
  const nodeLabelVisibility = buildHzTopologyG6NodeLabelVisibility(input, options.nodeLabelPolicy ?? 'visible');
  const attenuatedEdgeIds = new Set(options.edgeReadabilityProfile?.attenuatedEdgeIds ?? []);
  const edgeReadabilityMinimumOpacity =
    options.edgeReadabilityProfile?.minimumOpacity ?? HZ_TOPOLOGY_G6_EDGE_READABILITY_MIN_OPACITY;
  return {
    nodes: input.nodes.map(node => {
      const stroke = toneStroke(node.tone, node.health);
      const icon = getHzTopologyG6NodeIcon(node.entityType);
      const showNodeLabel = nodeLabelVisibility.visibleNodeIds.has(node.id);
      return {
        id: node.id,
        type: 'circle',
        states: [node.focus === 'active' ? 'selected' : undefined, node.focus === 'dimmed' ? 'inactive' : undefined].filter(
          (state): state is string => Boolean(state)
        ),
        data: {
          label: node.label,
          entityType: node.entityType,
          iconKind: icon.kind,
          iconLibrary: icon.iconLibrary,
          iconLabel: icon.label,
          iconName: icon.iconName,
          iconSource: icon.iconSource,
          nodeShape: 'circle-icon-label',
          health: node.health,
          tone: node.tone,
          focus: node.focus,
          source: node.source,
          evidenceBadges: node.evidenceBadges ?? [],
          requestRatePerSecond: node.redMetrics?.requestRatePerSecond,
          errorRate: node.redMetrics?.errorRate,
          latencyP95Ms: node.redMetrics?.latencyP95Ms,
          focusHref: node.focusHref
        },
        style: {
          size: 54,
          fill: nodeFill(node.tone, node.health),
          stroke,
          lineWidth: node.focus === 'active' ? 2.8 : 1.6,
          shadowColor: stroke,
          shadowBlur: node.focus === 'active' ? 14 : 5,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          iconSrc: icon.iconSrc,
          iconWidth: 18,
          iconHeight: 18,
          iconOpacity: node.focus === 'dimmed' ? 0.62 : 0.94,
          labelText: showNodeLabel ? node.label : '',
          labelFill: '#e5edf8',
          labelFontFamily: 'Inter, ui-sans-serif, system-ui',
          labelFontSize: 12,
          labelFontWeight: 650,
          labelPlacement: 'bottom',
          labelOffsetY: 10,
          halo: true,
          haloStroke: stroke,
          haloLineWidth: node.focus === 'active' ? 5 : 3,
          ports: [{ key: 'left', placement: 'left' }, { key: 'right', placement: 'right' }],
          badgeText: nodeStat(node),
          badgePlacement: 'top',
          badgeFill: '#05070a',
          badgeStroke: '#263244',
          badgeTextFill: '#aebbd0'
        }
      };
    }),
    edges: input.edges.map(edge => {
      const stroke = toneStroke(edge.tone);
      const isReadabilityAttenuated = attenuatedEdgeIds.has(edge.id);
      const edgeOpacity = isReadabilityAttenuated ? edgeReadabilityMinimumOpacity : edge.focus === 'context-muted' ? 0.28 : 0.92;
      const labelStyle = showEdgeLabels
        ? {
            labelText: edgeLabel(edge),
            labelFill: '#cbd5e1',
            labelFontFamily: 'Inter, ui-sans-serif, system-ui',
            labelFontSize: 10,
            labelBackground: true,
            labelBackgroundFill: '#080b10',
            labelBackgroundStroke: '#1d2738',
            labelBackgroundRadius: 3
          }
        : {
            labelText: ''
          };
      return {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        type: 'cubic-horizontal',
        states: [edge.selected ? 'selected' : undefined, edge.focus === 'context-muted' ? 'inactive' : undefined].filter(
          (state): state is string => Boolean(state)
        ),
        data: {
          label: edge.label,
          relationshipType: edge.relationshipType,
          source: edge.source,
          focus: edge.focus,
          selected: edge.selected,
          evidenceBadges: edge.evidenceBadges ?? [],
          requestRatePerSecond: edge.redMetrics?.requestRatePerSecond,
          errorRate: edge.redMetrics?.errorRate,
          latencyP95Ms: edge.redMetrics?.latencyP95Ms,
          href: edge.href
        },
        style: {
          stroke,
          lineWidth: isReadabilityAttenuated
            ? Math.min(edgeWidth(edge.redMetrics), 1.1)
            : edge.selected
              ? edgeWidth(edge.redMetrics) + 1.2
              : edgeWidth(edge.redMetrics),
          increasedLineWidthForHitTesting: 16,
          opacity: edgeOpacity,
          radius: 16,
          endArrow: true,
          ...labelStyle
        }
      };
    })
  };
}

type HzTopologyG6WindowedLaneRole = 'root' | 'hub' | 'leaf' | 'isolated';

type HzTopologyG6WindowedLaneConfig = {
  baseX: number;
  columnGap: number;
  rowGap: number;
  maxRows: number;
};

const hzTopologyG6WindowedLaneConfigs: Record<HzTopologyG6WindowedLaneRole, HzTopologyG6WindowedLaneConfig> = {
  root: { baseX: -420, columnGap: 112, rowGap: 74, maxRows: HZ_TOPOLOGY_G6_WINDOWED_LANE_MAX_ROWS },
  hub: { baseX: -84, columnGap: 112, rowGap: 74, maxRows: HZ_TOPOLOGY_G6_WINDOWED_LANE_MAX_ROWS },
  leaf: { baseX: 260, columnGap: 96, rowGap: 74, maxRows: HZ_TOPOLOGY_G6_WINDOWED_LANE_MAX_ROWS },
  isolated: { baseX: 560, columnGap: 96, rowGap: 74, maxRows: HZ_TOPOLOGY_G6_WINDOWED_LANE_MAX_ROWS }
};

function windowedLaneRole(inDegree: number, outDegree: number, totalDegree: number): HzTopologyG6WindowedLaneRole {
  if (totalDegree === 0) return 'isolated';
  if (inDegree === 0 && outDegree > 0) return 'root';
  if (outDegree >= 3 || (inDegree > 0 && outDegree > 0) || totalDegree >= 8) return 'hub';
  return 'leaf';
}

export function buildHzTopologyG6WindowedLaneGraph(input: HzTopologyG6GraphData): HzTopologyG6GraphData {
  if (input.nodes.length === 0 || input.edges.length === 0) return input;

  const degreeByNodeId = new Map<string, { inDegree: number; outDegree: number }>();
  const ensureDegree = (nodeId: string) => {
    const existing = degreeByNodeId.get(nodeId);
    if (existing) return existing;
    const next = { inDegree: 0, outDegree: 0 };
    degreeByNodeId.set(nodeId, next);
    return next;
  };

  input.nodes.forEach(node => ensureDegree(node.id));
  input.edges.forEach(edge => {
    if (edge.source) ensureDegree(edge.source).outDegree += 1;
    if (edge.target) ensureDegree(edge.target).inDegree += 1;
  });

  const indexedNodes = input.nodes.map((node, index) => {
    const degree = ensureDegree(node.id);
    const totalDegree = degree.inDegree + degree.outDegree;
    return {
      node,
      index,
      totalDegree,
      role: windowedLaneRole(degree.inDegree, degree.outDegree, totalDegree)
    };
  });

  const positions = new Map<string, { x: number; y: number }>();
  (['root', 'hub', 'leaf', 'isolated'] as HzTopologyG6WindowedLaneRole[]).forEach(role => {
    const config = hzTopologyG6WindowedLaneConfigs[role];
    const roleNodes = indexedNodes
      .filter(item => item.role === role)
      .sort((a, b) => b.totalDegree - a.totalDegree || a.index - b.index);

    roleNodes.forEach((item, roleIndex) => {
      const laneColumn = Math.floor(roleIndex / config.maxRows);
      const laneRow = roleIndex % config.maxRows;
      positions.set(item.node.id, {
        x: config.baseX + laneColumn * config.columnGap,
        y: (laneRow - (config.maxRows - 1) / 2) * config.rowGap
      });
    });
  });

  return {
    ...input,
    nodes: input.nodes.map(node => {
      const position = positions.get(node.id);
      if (!position) return node;
      return {
        ...node,
        style: {
          ...node.style,
          x: position.x,
          y: position.y
        }
      };
    })
  };
}

export function buildHzTopologyG6NodeOnlyGridGraph(input: HzTopologyG6GraphData): HzTopologyG6GraphData {
  const nodeCount = input.nodes.length;
  if (nodeCount === 0 || input.edges.length > 0) return input;
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodeCount)));
  const columnGap = 144;
  const rowGap = 126;
  const gridWidth = (Math.min(cols, nodeCount) - 1) * columnGap;
  return {
    ...input,
    nodes: input.nodes.map((node, index) => {
      const column = index % cols;
      const row = Math.floor(index / cols);
      return {
        ...node,
        style: {
          ...node.style,
          x: column * columnGap - gridWidth / 2,
          y: row * rowGap
        }
      };
    })
  };
}

function buildHzTopologyG6StructureKey(input: HzTopologyG6GraphInput) {
  const nodes = input.nodes.map(node => `${node.id}:${node.entityType}`).join('|');
  const edges = input.edges.map(edge => `${edge.id}:${edge.from}->${edge.to}`).join('|');
  return `${nodes}::${edges}`;
}

function buildHzTopologyG6RenderKey(input: HzTopologyG6GraphData) {
  const nodes = input.nodes
    .map(node => `${node.id}:${node.states?.join(',') ?? ''}:${node.style?.stroke ?? ''}:${node.style?.opacity ?? ''}`)
    .join('|');
  const edges = input.edges
    .map(edge => `${edge.id}:${edge.states?.join(',') ?? ''}:${edge.style?.stroke ?? ''}:${edge.style?.opacity ?? ''}:${edge.style?.lineWidth ?? ''}`)
    .join('|');
  return `${nodes}::${edges}`;
}

function buildHzTopologyG6LifecycleKeyFingerprint(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `g6k-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export type HzTopologyG6CanvasProps = React.HTMLAttributes<HTMLDivElement> & {
  graph: HzTopologyG6GraphInput;
  selectedNodeId?: string;
  selectedEdgeId?: string;
  hoveredNodeId?: string;
  hoveredEdgeId?: string;
  layout?: 'layered-service' | 'force';
  height?: 'compact' | 'workbench';
  overlayMode?: 'standard' | 'non-occluding';
  selectionMode?: 'drawer-sync' | 'none';
  searchQuery?: string;
  filterScope?: HzTopologyG6FilterScopeOptions;
  filterControls?: HzTopologyG6FilterControl[];
  groupItemHrefs?: Record<string, string>;
  legendSlot?: React.ReactNode;
  summaryLabel?: string;
  nodeOnlyExplanationLabel?: string;
  fitViewLabel?: string;
  resetViewLabel?: string;
  selectedFocusLabel?: string;
  searchFocusLabel?: string;
  zoomInLabel?: string;
  zoomOutLabel?: string;
  edgeDensityDrilldownLabel?: string;
  edgeDensityDrilldownDetailLabel?: string;
  edgeDensityDrilldownTargetId?: string;
  onEdgeDensityDrilldown?: () => void;
  onNodeSelect?: (nodeId: string) => void;
  onNodeFocus?: (nodeId: string) => void;
  onEdgeSelect?: (edgeId: string) => void;
  onNodeHover?: (nodeId: string, anchor?: HzTopologyG6HoverAnchor) => void;
  onEdgeHover?: (edgeId: string, anchor?: HzTopologyG6HoverAnchor) => void;
  onHoverClear?: () => void;
};

function readG6EventId(event: {
  target?: {
    id?: string;
    data?: { id?: string };
    attributes?: { id?: string };
    parentElement?: { id?: string };
  };
  item?: { id?: string };
  itemId?: string;
}) {
  return event.target?.id
    ?? event.target?.data?.id
    ?? event.target?.attributes?.id
    ?? event.target?.parentElement?.id
    ?? event.item?.id
    ?? event.itemId;
}

function readFiniteG6Coordinate(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function clampG6HoverCoordinate(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function clampHzTopologyG6AutoFitZoom(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(HZ_TOPOLOGY_G6_MIN_ZOOM, Math.min(HZ_TOPOLOGY_G6_AUTO_FIT_MAX_ZOOM, value));
}

export function clampHzTopologyG6OperatorZoom(value: number | undefined, maxZoom: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(HZ_TOPOLOGY_G6_MIN_ZOOM, Math.min(maxZoom, value));
}

function readG6EventAnchor(event: HzTopologyG6PointerEvent, stage: HTMLElement): HzTopologyG6HoverAnchor {
  const rect = stage.getBoundingClientRect();
  const canvasX = readFiniteG6Coordinate(event.canvas?.x ?? event.viewport?.x ?? event.x);
  const canvasY = readFiniteG6Coordinate(event.canvas?.y ?? event.viewport?.y ?? event.y);
  const clientX = readFiniteG6Coordinate(event.client?.x ?? event.clientX ?? event.nativeEvent?.clientX ?? event.originalEvent?.clientX);
  const clientY = readFiniteG6Coordinate(event.client?.y ?? event.clientY ?? event.nativeEvent?.clientY ?? event.originalEvent?.clientY);
  const rawX = canvasX ?? (clientX !== undefined ? clientX - rect.left : undefined);
  const rawY = canvasY ?? (clientY !== undefined ? clientY - rect.top : undefined);
  const fallbackX = Math.max(16, rect.width - 340);
  const fallbackY = 116;
  const maxX = Math.max(16, rect.width - 320);
  const maxY = Math.max(116, rect.height - 180);

  return {
    x: Math.round(clampG6HoverCoordinate(rawX ?? fallbackX, 16, maxX)),
    y: Math.round(clampG6HoverCoordinate(rawY ?? fallbackY, 116, maxY)),
    source: rawX !== undefined && rawY !== undefined ? 'g6-pointer' : 'fallback'
  };
}

async function fitAndCenterG6Viewport(
  runtimeGraph: G6GraphRuntime | null | undefined,
  fitOptions: Record<string, unknown>,
  animation: Record<string, unknown> | boolean
) {
  if (!runtimeGraph) return;
  await withG6AutoFitZoomRange(runtimeGraph, async () => {
    await runtimeGraph.fitView?.(fitOptions, animation);
    await runtimeGraph.fitCenter?.(animation);
    const currentZoom = runtimeGraph.getZoom?.();
    const clampedZoom = clampHzTopologyG6AutoFitZoom(currentZoom);
    if (clampedZoom !== undefined && currentZoom !== undefined && clampedZoom < currentZoom) {
      await runtimeGraph.zoomTo?.(clampedZoom, false);
      await runtimeGraph.fitCenter?.(false);
    }
  });
}

async function centerOnlyG6Viewport(
  runtimeGraph: G6GraphRuntime | null | undefined,
  animation: Record<string, unknown> | boolean
) {
  if (!runtimeGraph) return;
  await runtimeGraph.zoomTo?.(HZ_TOPOLOGY_G6_COMPACT_INITIAL_ZOOM, false);
  await runtimeGraph.fitCenter?.(animation);
  await runtimeGraph.zoomTo?.(HZ_TOPOLOGY_G6_COMPACT_INITIAL_ZOOM, animation);
  await runtimeGraph.fitCenter?.(false);
}

async function withG6AutoFitZoomRange(runtimeGraph: G6GraphRuntime, action: () => Promise<void>) {
  runtimeGraph.setZoomRange?.([HZ_TOPOLOGY_G6_MIN_ZOOM, HZ_TOPOLOGY_G6_AUTO_FIT_MAX_ZOOM]);
  try {
    await action();
  } finally {
    runtimeGraph.setZoomRange?.([HZ_TOPOLOGY_G6_MIN_ZOOM, HZ_TOPOLOGY_G6_MAX_ZOOM]);
  }
}

function scheduleInitialFitView(
  runtimeGraph: G6GraphRuntime,
  initialFitStrategy: HzTopologyG6InitialFitStrategy,
  shouldRun: () => boolean
) {
  return window.setTimeout(() => {
    if (!shouldRun()) return;
    if (initialFitStrategy === "center-only") {
      void centerOnlyG6Viewport(runtimeGraph, { duration: 120 });
      return;
    }
    void fitAndCenterG6Viewport(runtimeGraph, { when: 'overflow' }, { duration: 120 });
  }, 180);
}

function captureG6ViewportSnapshot(runtimeGraph: G6GraphRuntime): HzTopologyG6ViewportSnapshot | undefined {
  const zoom = runtimeGraph.getZoom?.();
  const position = runtimeGraph.getPosition?.();
  if (typeof zoom !== 'number' || !Number.isFinite(zoom) || !Array.isArray(position)) return undefined;
  const [x = 0, y = 0] = position;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return { zoom, position: [x, y] };
}

async function restoreG6ViewportSnapshot(
  runtimeGraph: G6GraphRuntime,
  snapshot: HzTopologyG6ViewportSnapshot | undefined,
  maxZoom: number
) {
  if (!snapshot) return;
  const clampedZoom = clampHzTopologyG6OperatorZoom(snapshot.zoom, maxZoom);
  if (clampedZoom !== undefined) await runtimeGraph.zoomTo?.(clampedZoom, false);
  await runtimeGraph.translateTo?.(snapshot.position, false);
}

export function buildHzTopologyG6PointerPanDelta(delta: { x: number; y: number }) {
  const x = Number.isFinite(delta.x) ? delta.x : 0;
  const y = Number.isFinite(delta.y) ? delta.y : 0;
  return [Math.round(x), Math.round(y)];
}

async function enforceG6OperatorZoomBounds(
  runtimeGraph: G6GraphRuntime | null | undefined,
  maxZoom: number
) {
  if (!runtimeGraph) return false;
  runtimeGraph.setZoomRange?.([HZ_TOPOLOGY_G6_MIN_ZOOM, maxZoom]);
  const currentZoom = runtimeGraph.getZoom?.();
  const clampedZoom = clampHzTopologyG6OperatorZoom(currentZoom, maxZoom);
  if (currentZoom === undefined || clampedZoom === undefined || clampedZoom === currentZoom) return false;
  await runtimeGraph.zoomTo?.(clampedZoom, false);
  return true;
}

function formatG6ViewportZoom(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : 'unknown';
}

function formatG6ViewportPosition(position: number[] | undefined) {
  if (!Array.isArray(position)) return 'unknown';
  const [x = 0, y = 0] = position;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 'unknown';
  return `${Math.round(x)},${Math.round(y)}`;
}

function centerG6ViewportOrigin(stage: HTMLElement | null): number[] | undefined {
  if (!stage) return undefined;
  const rect = stage.getBoundingClientRect();
  return [Math.max(0, rect.width / 2), Math.max(0, rect.height / 2)];
}

function readG6WheelViewportOrigin(event: WheelEvent, stage: HTMLElement): number[] {
  const rect = stage.getBoundingClientRect();
  const x = clampG6HoverCoordinate(event.clientX - rect.left, 0, rect.width);
  const y = clampG6HoverCoordinate(event.clientY - rect.top, 0, rect.height);
  return [x, y];
}

export function HzTopologyG6Canvas({
  graph,
  selectedNodeId,
  selectedEdgeId,
  hoveredNodeId,
  hoveredEdgeId,
  layout = 'layered-service',
  height = 'workbench',
  overlayMode = 'standard',
  selectionMode = 'drawer-sync',
  searchQuery,
  filterScope,
  filterControls = [],
  groupItemHrefs = {},
  legendSlot,
  summaryLabel,
  nodeOnlyExplanationLabel = 'Entities only · no relation edges',
  fitViewLabel = 'Fit view',
  resetViewLabel = 'Reset view',
  selectedFocusLabel = 'Focus selected node',
  searchFocusLabel = 'Focus search result',
  zoomInLabel = 'Zoom in',
  zoomOutLabel = 'Zoom out',
  edgeDensityDrilldownLabel = 'Open edge table',
  edgeDensityDrilldownDetailLabel,
  edgeDensityDrilldownTargetId = 'topology-metric-table',
  onEdgeDensityDrilldown,
  onNodeSelect,
  onNodeFocus,
  onEdgeSelect,
  onNodeHover,
  onEdgeHover,
  onHoverClear,
  className,
  onPointerLeave,
  ...props
}: HzTopologyG6CanvasProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const graphRef = React.useRef<G6GraphRuntime | null>(null);
  const lastFitStructureKeyRef = React.useRef<string | undefined>(undefined);
  const lastDrawGraphKeyRef = React.useRef<string | undefined>(undefined);
  const hasUserViewportInteractedRef = React.useRef(false);
  const pointerPanStateRef = React.useRef<HzTopologyG6PointerPanState | undefined>(undefined);
  const pointerPanSelectionSuppressedUntilRef = React.useRef(0);
  const initialFitTimerRef = React.useRef<number | undefined>(undefined);
  const latestG6GraphRef = React.useRef<HzTopologyG6GraphData | undefined>(undefined);
  const latestG6RenderKeyRef = React.useRef<string | undefined>(undefined);
  const selectedElementStateRef = React.useRef<{ nodeId?: string; edgeId?: string }>({});
  const hoveredElementRef = React.useRef<HzTopologyG6HoverElement>({});
  const hoveredNodeIdRef = React.useRef<string | undefined>(hoveredNodeId);
  const hoveredEdgeIdRef = React.useRef<string | undefined>(hoveredEdgeId);
  const onNodeSelectRef = React.useRef(onNodeSelect);
  const onNodeFocusRef = React.useRef(onNodeFocus);
  const onEdgeSelectRef = React.useRef(onEdgeSelect);
  const onNodeHoverRef = React.useRef(onNodeHover);
  const onEdgeHoverRef = React.useRef(onEdgeHover);
  const onHoverClearRef = React.useRef(onHoverClear);
  const [renderState, setRenderState] = React.useState<'idle' | 'ready' | 'fallback'>('idle');
  const [viewportInteractionState, setViewportInteractionState] = React.useState<'pristine' | 'operator-adjusted'>('pristine');
  const [viewportTelemetry, setViewportTelemetry] = React.useState<HzTopologyG6ViewportTelemetry>({ source: 'initial' });
  const [focusActionTelemetry, setFocusActionTelemetry] = React.useState<HzTopologyG6FocusActionTelemetry>({
    source: 'none'
  });
  const [hoveredElement, setHoveredElement] = React.useState<HzTopologyG6HoverElement>({});
  React.useEffect(() => {
    hoveredNodeIdRef.current = hoveredNodeId;
    hoveredEdgeIdRef.current = hoveredEdgeId;
    onNodeSelectRef.current = onNodeSelect;
    onNodeFocusRef.current = onNodeFocus;
    onEdgeSelectRef.current = onEdgeSelect;
    onNodeHoverRef.current = onNodeHover;
    onEdgeHoverRef.current = onEdgeHover;
    onHoverClearRef.current = onHoverClear;
  }, [hoveredEdgeId, hoveredNodeId, onEdgeHover, onEdgeSelect, onHoverClear, onNodeFocus, onNodeHover, onNodeSelect]);
  const searchFocus = React.useMemo(() => buildHzTopologyG6SearchFocus(graph, searchQuery), [graph, searchQuery]);
  const activeSearchNodeId =
    searchFocus.status === 'matched' && searchFocus.firstMatchedNodeId
      ? searchFocus.firstMatchedNodeId
      : undefined;
  const searchMatchedNodeIds = React.useMemo(() => new Set(searchFocus.matchedNodeIds), [searchFocus.matchedNodeIds]);
  const selectedFocusNodeId = React.useMemo(
    () => (selectedNodeId && graph.nodes.some(node => node.id === selectedNodeId) ? selectedNodeId : undefined),
    [graph.nodes, selectedNodeId]
  );
  const activeHoveredNodeId = hoveredNodeId ?? hoveredElement.nodeId;
  const activeHoveredEdgeId = hoveredEdgeId ?? hoveredElement.edgeId;
  const activeFocusNodeId = activeHoveredNodeId ?? (activeHoveredEdgeId ? undefined : activeSearchNodeId ?? selectedFocusNodeId);
  const activeFocusEdgeId = activeHoveredEdgeId ?? (activeSearchNodeId ? undefined : selectedEdgeId);
  const activeFocusSource = activeHoveredNodeId
    ? 'hover-node'
    : activeHoveredEdgeId
      ? 'hover-edge'
      : activeSearchNodeId
        ? 'search-node'
      : selectedNodeId || selectedEdgeId
        ? 'selection'
        : 'none';
  const shouldAutoFocusSearchResult = false;
  const g6StyleFocusNodeId = activeSearchNodeId;
  const g6StyleFocusEdgeId = undefined;
  const neighborFocus = React.useMemo(
    () => buildHzTopologyG6NeighborFocus(graph, { selectedNodeId: activeFocusNodeId, selectedEdgeId: activeFocusEdgeId }),
    [activeFocusEdgeId, activeFocusNodeId, graph]
  );
  const g6NeighborFocus = React.useMemo(
    () => buildHzTopologyG6NeighborFocus(graph, { selectedNodeId: g6StyleFocusNodeId, selectedEdgeId: g6StyleFocusEdgeId }),
    [g6StyleFocusEdgeId, g6StyleFocusNodeId, graph]
  );
  const selectedGraph = React.useMemo<HzTopologyG6GraphInput>(() => ({
    nodes: graph.nodes.map(node => ({
      ...node,
      focus:
        activeFocusNodeId && node.id === activeFocusNodeId
          ? 'active'
          : searchFocus.status === 'matched' && searchMatchedNodeIds.has(node.id)
            ? 'related'
          : searchFocus.status === 'matched'
            ? 'dimmed'
          : neighborFocus.nodeRoles[node.id] === 'dimmed'
            ? 'dimmed'
            : neighborFocus.nodeRoles[node.id] === 'upstream' || neighborFocus.nodeRoles[node.id] === 'downstream'
              ? 'related'
              : node.focus
    })),
    edges: graph.edges.map(edge => ({
      ...edge,
      selected: (activeFocusEdgeId && edge.id === activeFocusEdgeId) || (selectedEdgeId && edge.id === selectedEdgeId) ? true : edge.selected,
      focus:
        activeFocusEdgeId && edge.id === activeFocusEdgeId
          ? 'active-path'
          : neighborFocus.edgeRoles[edge.id] === 'dimmed'
            ? 'context-muted'
            : neighborFocus.edgeRoles[edge.id] === 'incoming' ||
                neighborFocus.edgeRoles[edge.id] === 'outgoing' ||
                neighborFocus.edgeRoles[edge.id] === 'selected'
              ? 'active-path'
      : edge.focus
    }))
  }), [
    activeFocusEdgeId,
    activeFocusNodeId,
    graph,
    neighborFocus.edgeRoles,
    neighborFocus.nodeRoles,
    searchFocus.status,
    searchMatchedNodeIds,
    selectedEdgeId
  ]);
  const canvasGraph = React.useMemo<HzTopologyG6GraphInput>(() => ({
    nodes: graph.nodes.map(node => ({
      ...node,
      focus:
        g6StyleFocusNodeId && node.id === g6StyleFocusNodeId
          ? 'active'
          : searchFocus.status === 'matched' && searchMatchedNodeIds.has(node.id)
            ? 'related'
          : searchFocus.status === 'matched'
            ? 'dimmed'
          : g6NeighborFocus.nodeRoles[node.id] === 'dimmed'
            ? 'dimmed'
            : g6NeighborFocus.nodeRoles[node.id] === 'upstream' || g6NeighborFocus.nodeRoles[node.id] === 'downstream'
              ? 'related'
              : undefined
    })),
    edges: graph.edges.map(edge => ({
      ...edge,
      selected: g6StyleFocusEdgeId && edge.id === g6StyleFocusEdgeId ? true : false,
      focus:
        g6StyleFocusEdgeId && edge.id === g6StyleFocusEdgeId
          ? 'active-path'
          : g6NeighborFocus.edgeRoles[edge.id] === 'dimmed'
            ? 'context-muted'
            : g6NeighborFocus.edgeRoles[edge.id] === 'incoming' ||
                g6NeighborFocus.edgeRoles[edge.id] === 'outgoing' ||
                g6NeighborFocus.edgeRoles[edge.id] === 'selected'
              ? 'active-path'
      : undefined
    }))
  }), [
    graph,
    g6NeighborFocus.edgeRoles,
    g6NeighborFocus.nodeRoles,
    g6StyleFocusEdgeId,
    g6StyleFocusNodeId,
    searchFocus.status,
    searchMatchedNodeIds
  ]);
  const graphStructureKey = React.useMemo(() => buildHzTopologyG6StructureKey(graph), [graph]);
  const scaleProfile = React.useMemo(() => buildHzTopologyG6ScaleProfile(graph), [graph]);
  const largeGraphStrategy = React.useMemo(() => buildHzTopologyG6LargeGraphStrategy(graph), [graph]);
  const largeGraphOverflowPolicy =
    largeGraphStrategy.scaleTier === 'overflow' ? 'filter-first-before-expanded-render' : 'not-overflow';
  const renderWindowPriorityNodeIds = React.useMemo(
    () => [activeSearchNodeId].filter((nodeId): nodeId is string => Boolean(nodeId)),
    [activeSearchNodeId]
  );
  const renderWindow = React.useMemo(
    () => buildHzTopologyG6RenderWindow(canvasGraph, largeGraphStrategy, { priorityNodeIds: renderWindowPriorityNodeIds }),
    [canvasGraph, largeGraphStrategy, renderWindowPriorityNodeIds]
  );
  const semanticClusterSummary = React.useMemo(
    () => buildHzTopologyG6SemanticClusterSummary(renderWindow.graph, renderWindow),
    [renderWindow]
  );
  const shapeProfile = React.useMemo(() => buildHzTopologyG6ShapeProfile(renderWindow.graph), [renderWindow.graph]);
  const edgeLabelPolicy: HzTopologyG6EdgeLabelPolicy =
    renderWindow.mode === 'windowed' || renderWindow.renderedEdgeCount > HZ_TOPOLOGY_G6_EDGE_LABEL_VISIBLE_EDGE_LIMIT
      ? 'hidden-large-graph'
      : 'visible';
  const edgeDensityWindow = React.useMemo(
    () => buildHzTopologyG6EdgeDensityWindow(renderWindow.graph, { mode: renderWindow.mode }),
    [renderWindow.graph, renderWindow.mode]
  );
  const renderWindowRenderedEdgeCount = edgeDensityWindow.renderedEdgeCount;
  const renderWindowHiddenEdgeCount = Math.max(0, renderWindow.totalEdgeCount - renderWindowRenderedEdgeCount);
  const nodeLabelPolicy: HzTopologyG6NodeLabelPolicy = renderWindow.mode === 'windowed' ? 'hub-only-large-graph' : 'visible';
  const nodeLabelCounts = React.useMemo(
    () => buildHzTopologyG6NodeLabelCounts(edgeDensityWindow.graph, nodeLabelPolicy),
    [edgeDensityWindow.graph, nodeLabelPolicy]
  );
  const edgeReadabilityProfile = React.useMemo(
    () => buildHzTopologyG6EdgeReadabilityProfile(edgeDensityWindow.graph, edgeDensityWindow.policy),
    [edgeDensityWindow.graph, edgeDensityWindow.policy]
  );
  const edgeLabelVisibleCount = edgeLabelPolicy === 'visible' ? edgeDensityWindow.renderedEdgeCount : 0;
  const edgeLabelHiddenCount = edgeLabelPolicy === 'hidden-large-graph' ? edgeDensityWindow.renderedEdgeCount : 0;
  const initialFitStrategy = React.useMemo(() => buildHzTopologyG6InitialFitStrategy(renderWindow.graph), [renderWindow.graph]);
  const operatorMaxZoom = buildHzTopologyG6OperatorMaxZoom(initialFitStrategy);
  const operatorZoomTier = initialFitStrategy === 'center-only' ? 'compact-readable' : 'full-canvas';
  const viewportRuntimeVersion = HZ_TOPOLOGY_G6_VIEWPORT_RUNTIME_VERSION;
  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;
  const shouldUseWindowedLaneLayout = renderWindow.mode === 'windowed' && renderWindow.renderedNodeCount > 0;
  const windowedLayoutPolicy = shouldUseWindowedLaneLayout ? 'packed-lanes' : 'g6-managed';
  const g6LayoutMode = edgeCount === 0 && nodeCount > 0 ? 'node-only-grid' : shouldUseWindowedLaneLayout ? 'windowed-lanes' : layout;
  const shouldFastPaintNodeOnlyGraph = g6LayoutMode === 'node-only-grid';
  const relationState = shouldFastPaintNodeOnlyGraph ? 'entities-without-relation-edges' : 'relation-edges-present-or-empty';
  const nodeOnlyExplanationVisibility = shouldFastPaintNodeOnlyGraph ? 'visible' : 'hidden';
  const g6Graph = React.useMemo(
    () => buildHzTopologyG6Graph(edgeDensityWindow.graph, { edgeLabelPolicy, nodeLabelPolicy, edgeReadabilityProfile }),
    [edgeDensityWindow.graph, edgeLabelPolicy, edgeReadabilityProfile, nodeLabelPolicy]
  );
  const windowedLaneG6Graph = React.useMemo(
    () => (shouldUseWindowedLaneLayout ? buildHzTopologyG6WindowedLaneGraph(g6Graph) : g6Graph),
    [g6Graph, shouldUseWindowedLaneLayout]
  );
  const runtimeG6Graph = React.useMemo(
    () => (shouldFastPaintNodeOnlyGraph ? buildHzTopologyG6NodeOnlyGridGraph(g6Graph) : windowedLaneG6Graph),
    [g6Graph, shouldFastPaintNodeOnlyGraph, windowedLaneG6Graph]
  );
  const renderedG6ElementIds = React.useMemo(
    () => ({
      nodeIds: new Set(runtimeG6Graph.nodes.map(node => node.id)),
      edgeIds: new Set(runtimeG6Graph.edges.map(edge => edge.id))
    }),
    [runtimeG6Graph]
  );
  const renderedSelectionState = React.useMemo(
    () => ({
      nodeId:
        selectedFocusNodeId && renderedG6ElementIds.nodeIds.has(selectedFocusNodeId)
          ? selectedFocusNodeId
          : undefined,
      edgeId:
        selectedEdgeId && renderedG6ElementIds.edgeIds.has(selectedEdgeId)
          ? selectedEdgeId
          : undefined
    }),
    [renderedG6ElementIds, selectedEdgeId, selectedFocusNodeId]
  );
  const selectionStateSelectedNodeRendered = selectedFocusNodeId
    ? renderedG6ElementIds.nodeIds.has(selectedFocusNodeId)
      ? 'true'
      : 'false'
    : 'none';
  const selectionStateSelectedEdgeRendered = selectedEdgeId
    ? renderedG6ElementIds.edgeIds.has(selectedEdgeId)
      ? 'true'
      : 'false'
    : 'none';
  const selectionStateSkippedTargetCount =
    (selectedFocusNodeId && !renderedG6ElementIds.nodeIds.has(selectedFocusNodeId) ? 1 : 0) +
    (selectedEdgeId && !renderedG6ElementIds.edgeIds.has(selectedEdgeId) ? 1 : 0);
  const g6RenderKey = React.useMemo(() => buildHzTopologyG6RenderKey(runtimeG6Graph), [runtimeG6Graph]);
  const graphStructureKeyFingerprint = React.useMemo(
    () => buildHzTopologyG6LifecycleKeyFingerprint(graphStructureKey),
    [graphStructureKey]
  );
  const g6RenderKeyFingerprint = React.useMemo(() => buildHzTopologyG6LifecycleKeyFingerprint(g6RenderKey), [g6RenderKey]);
  latestG6GraphRef.current = runtimeG6Graph;
  latestG6RenderKeyRef.current = g6RenderKey;
  const filterEnvironment = filterScope?.environment;
  const filterSourceKind = filterScope?.sourceKind;
  const filterGroupBy = filterScope?.groupBy;
  const filterSearchQuery = filterScope?.searchQuery;
  const activeFilterScope = React.useMemo(
    () =>
      buildHzTopologyG6FilterScope(graph, {
        environment: filterEnvironment,
        sourceKind: filterSourceKind,
        groupBy: filterGroupBy,
        searchQuery: filterSearchQuery ?? searchQuery
      }),
    [filterEnvironment, filterGroupBy, filterSearchQuery, filterSourceKind, graph, searchQuery]
  );
  const groupSummary = React.useMemo(
    () =>
      buildHzTopologyG6GroupSummary(graph, {
        environment: activeFilterScope.environment,
        sourceKind: activeFilterScope.sourceKind,
        groupBy: activeFilterScope.groupBy,
        searchQuery: activeFilterScope.searchQuery
      }),
    [activeFilterScope.environment, activeFilterScope.groupBy, activeFilterScope.searchQuery, activeFilterScope.sourceKind, graph]
  );
  const summaryCountPolicy = renderWindow.mode === 'windowed' ? 'windowed-rendered-vs-total' : 'direct-total';
  const canvasSummary = summaryLabel ?? (
    renderWindow.mode === 'windowed'
      ? `Showing ${renderWindow.renderedNodeCount}/${nodeCount} nodes · ${edgeDensityWindow.renderedEdgeCount}/${edgeCount} edges`
      : `${nodeCount} nodes · ${edgeCount} edges`
  );
  const activeFilterControlIds = filterControls.filter(control => control.active).map(control => control.id);
  const activeGroupActionCount = groupSummary.items.filter(item => groupItemHrefs[item.id]).length;
  const nonOccludingOverlay = overlayMode === 'non-occluding';
  const hasViewportTarget = nodeCount > 0 || edgeCount > 0;
  const isViewportFitPending =
    hasViewportTarget && !hasUserViewportInteractedRef.current && graphStructureKey !== lastFitStructureKeyRef.current;
  const viewportFitState = isViewportFitPending ? 'pending' : 'settled';
  const initialPaintVisibility = renderState === 'idle' || isViewportFitPending ? 'hidden-until-fit' : 'visible-after-fit';
  const nodeOnlyPrepaintVisibility = shouldFastPaintNodeOnlyGraph && renderState === 'idle' ? 'visible-until-g6-ready' : 'hidden-after-g6-ready';
  const runtimeLoadingVisibility =
    hasViewportTarget && !shouldFastPaintNodeOnlyGraph && renderState === 'idle'
      ? 'visible-until-g6-ready'
      : 'hidden-after-g6-ready';
  const viewportToolbarVisibility = hasViewportTarget ? 'visible' : 'hidden-empty-graph';
  const summaryVisibility = hasViewportTarget ? (nonOccludingOverlay ? 'assistive' : 'visible') : 'hidden-empty-graph';
  const groupSurfaceVisibility = hasViewportTarget ? (nonOccludingOverlay ? 'assistive' : 'visible') : 'hidden-empty-graph';
  const filterControlSurfaceVisibility = hasViewportTarget ? (nonOccludingOverlay ? 'assistive' : 'visible') : 'hidden-empty-graph';
  const minimapVisibility = hasViewportTarget ? (nonOccludingOverlay ? 'assistive' : 'visible') : 'hidden-empty-graph';
  const minimapOcclusion = hasViewportTarget ? (nonOccludingOverlay ? 'none' : 'low-interruption') : 'none';
  const edgeDensityAffordanceVisible = hasViewportTarget && edgeDensityWindow.hiddenEdgeCount > 0;
  const edgeDensityAffordanceTotalEdgeCount = edgeCount;
  const edgeDensityAffordanceTotalHiddenEdgeCount = Math.max(0, edgeDensityAffordanceTotalEdgeCount - edgeDensityWindow.renderedEdgeCount);
  const edgeDensityAffordanceDetailLabel =
    edgeDensityDrilldownDetailLabel ?? `${edgeDensityAffordanceTotalHiddenEdgeCount} more in table`;
  const semanticClusterVisibility =
    hasViewportTarget && semanticClusterSummary.policy === 'hub-fanout-summary' && semanticClusterSummary.itemCount > 0
      ? 'visible'
      : 'hidden';
  const minimapZoom = formatG6ViewportZoom(viewportTelemetry.zoom);
  const minimapPosition = formatG6ViewportPosition(viewportTelemetry.position);
  const publishViewportTelemetry = React.useCallback((source: HzTopologyG6ViewportTelemetrySource) => {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      if (source === "initial-fit" && hasUserViewportInteractedRef.current) return;
      const runtimeGraph = graphRef.current;
      const snapshot = runtimeGraph ? captureG6ViewportSnapshot(runtimeGraph) : undefined;
      setViewportTelemetry({
        source,
        zoom: snapshot?.zoom,
        position: snapshot?.position
      });
    });
  }, []);
  const publishViewportTelemetryAfterViewportAction = React.useCallback(
    (source: HzTopologyG6ViewportTelemetrySource, action: () => Promise<void> | void | undefined) => {
      const publishAfterAction = () => {
        if (typeof window === 'undefined') return;
        window.requestAnimationFrame(() => publishViewportTelemetry(source));
      };

      Promise.resolve(action()).then(publishAfterAction).catch(publishAfterAction);
    },
    [publishViewportTelemetry]
  );
  const shouldSuppressG6SelectionAfterPointerPan = React.useCallback(() => {
    if (pointerPanStateRef.current?.active) return true;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return pointerPanSelectionSuppressedUntilRef.current > now;
  }, []);
  const cancelPendingInitialFitView = React.useCallback(() => {
    if (typeof window === 'undefined' || initialFitTimerRef.current === undefined) return;
    window.clearTimeout(initialFitTimerRef.current);
    initialFitTimerRef.current = undefined;
  }, []);
  const markUserViewportInteraction = React.useCallback(() => {
    cancelPendingInitialFitView();
    hasUserViewportInteractedRef.current = true;
    setViewportInteractionState("operator-adjusted");
  }, [cancelPendingInitialFitView]);
  const clearSharedHover = React.useCallback(() => {
    const hasSharedHover = Boolean(
      hoveredElementRef.current.nodeId
        || hoveredElementRef.current.edgeId
        || hoveredNodeIdRef.current
        || hoveredEdgeIdRef.current
    );
    if (!hasSharedHover) return;
    hoveredElementRef.current = {};
    setHoveredElement({});
    onHoverClearRef.current?.();
  }, []);
  const handleG6DocumentPointerMoveHoverBoundary = React.useCallback(
    (event: PointerEvent) => {
      const hasSharedHover = Boolean(
        hoveredElementRef.current.nodeId
          || hoveredElementRef.current.edgeId
          || hoveredNodeIdRef.current
          || hoveredEdgeIdRef.current
      );
      if (!hasSharedHover) return;
      const canvasRect = rootRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const isInsideCanvas =
        event.clientX >= canvasRect.left
        && event.clientX <= canvasRect.right
        && event.clientY >= canvasRect.top
        && event.clientY <= canvasRect.bottom;
      if (!isInsideCanvas) clearSharedHover();
    },
    [clearSharedHover]
  );
  const handleG6CanvasPointerLeave = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      clearSharedHover();
      onPointerLeave?.(event);
    },
    [clearSharedHover, onPointerLeave]
  );
  React.useEffect(() => {
    document.addEventListener("pointermove", handleG6DocumentPointerMoveHoverBoundary);
    return () => {
      document.removeEventListener("pointermove", handleG6DocumentPointerMoveHoverBoundary);
    };
  }, [handleG6DocumentPointerMoveHoverBoundary]);
  const handleG6NodeSelect = React.useCallback(
    (nodeId: string) => {
      clearSharedHover();
      onNodeSelectRef.current?.(nodeId);
    },
    [clearSharedHover]
  );
  const handleG6NodeFocus = React.useCallback(
    (nodeId: string) => {
      clearSharedHover();
      onNodeFocusRef.current?.(nodeId);
    },
    [clearSharedHover]
  );
  const handleG6EdgeSelect = React.useCallback(
    (edgeId: string) => {
      clearSharedHover();
      onEdgeSelectRef.current?.(edgeId);
    },
    [clearSharedHover]
  );
  const handleMetadataNodeClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, nodeId: string) => {
      event.preventDefault();
      handleG6NodeSelect(nodeId);
    },
    [handleG6NodeSelect]
  );
  const handleMetadataEdgeClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, edgeId: string) => {
      event.preventDefault();
      handleG6EdgeSelect(edgeId);
    },
    [handleG6EdgeSelect]
  );
  const handleEdgeDensityDrilldown = React.useCallback(() => {
    onEdgeDensityDrilldown?.();
    document.getElementById(edgeDensityDrilldownTargetId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, [edgeDensityDrilldownTargetId, onEdgeDensityDrilldown]);

  React.useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;
    let observedStage: HTMLDivElement | undefined;
    let handleG6WheelViewportControl: ((event: WheelEvent) => void) | undefined;
    let handleG6PointerPanStart: ((event: PointerEvent) => void) | undefined;
    let handleG6PointerPanMove: ((event: PointerEvent) => void) | undefined;
    let handleG6PointerPanEnd: ((event: PointerEvent) => void) | undefined;

    async function mountGraph() {
      const stage = stageRef.current;
      if (!stage) return;
      observedStage = stage;

      try {
        const g6 = await import('@antv/g6');
        if (disposed || !stageRef.current) return;
        stage.innerHTML = '';
        const { Graph } = g6;
        const [width, graphHeight] = [stage.clientWidth || 960, stage.clientHeight || (height === 'compact' ? 420 : 640)];
        const initialGraphData = latestG6GraphRef.current ?? g6Graph;
        const runtimeGraph = new Graph(({
          container: stage,
          width,
          height: graphHeight,
          autoFit: false,
          zoomRange: [HZ_TOPOLOGY_G6_MIN_ZOOM, operatorMaxZoom],
          background: '#08090c',
          animation: false,
          data: initialGraphData,
          layout:
            g6LayoutMode === 'node-only-grid'
              ? undefined
              : g6LayoutMode === 'windowed-lanes'
              ? undefined
              : g6LayoutMode === 'force'
              ? { type: 'force', preventOverlap: true, nodeSize: 72, linkDistance: 146 }
              : { type: 'dagre', rankdir: 'LR', nodesep: 58, ranksep: 122 },
          node: {
            type: (datum: HzTopologyG6Datum) => String(datum.type ?? 'circle'),
            style: (datum: HzTopologyG6Datum) => ({ ...datum.style })
          },
          edge: {
            type: (datum: HzTopologyG6Datum) => String(datum.type ?? 'cubic-horizontal'),
            style: (datum: HzTopologyG6Datum) => ({ ...datum.style })
          },
          behaviors: [],
          theme: 'dark'
        }) as unknown as ConstructorParameters<typeof Graph>[0]) as unknown as G6GraphRuntime;
        graphRef.current = runtimeGraph;
        runtimeGraph.on?.('node:click', event => {
          if (shouldSuppressG6SelectionAfterPointerPan()) return;
          const id = readG6EventId(event);
          if (id) handleG6NodeSelect(String(id));
        });
        runtimeGraph.on?.('node:dblclick', event => {
          const id = readG6EventId(event);
          if (id) handleG6NodeFocus(String(id));
        });
        runtimeGraph.on?.('edge:click', event => {
          if (shouldSuppressG6SelectionAfterPointerPan()) return;
          const id = readG6EventId(event);
          if (id) handleG6EdgeSelect(String(id));
        });
        runtimeGraph.on?.('node:pointerover', event => {
          const id = readG6EventId(event);
          if (id) {
            hoveredElementRef.current = { nodeId: String(id) };
            setHoveredElement(hoveredElementRef.current);
            onNodeHoverRef.current?.(String(id), readG6EventAnchor(event, stage));
          }
        });
        runtimeGraph.on?.('edge:pointerover', event => {
          const id = readG6EventId(event);
          if (id) {
            hoveredElementRef.current = { edgeId: String(id) };
            setHoveredElement(hoveredElementRef.current);
            onEdgeHoverRef.current?.(String(id), readG6EventAnchor(event, stage));
          }
        });
        runtimeGraph.on?.('node:pointerleave', event => {
          const id = readG6EventId(event);
          if (!id || hoveredElementRef.current.nodeId === String(id)) clearSharedHover();
        });
        runtimeGraph.on?.('edge:pointerleave', event => {
          const id = readG6EventId(event);
          if (!id || hoveredElementRef.current.edgeId === String(id)) clearSharedHover();
        });
        runtimeGraph.on?.('canvas:pointerover', () => {
          clearSharedHover();
        });
        let runtimeMaxZoom = buildHzTopologyG6RuntimeMaxZoom(initialFitStrategy, hasUserViewportInteractedRef.current);
        if (shouldFastPaintNodeOnlyGraph && !disposed) {
          setRenderState('ready');
        }
        await runtimeGraph.render();
        if (shouldFastPaintNodeOnlyGraph && !disposed) {
          window.requestAnimationFrame(() => {
            void centerOnlyG6Viewport(runtimeGraph, false).then(async () => {
              runtimeMaxZoom = buildHzTopologyG6RuntimeMaxZoom(initialFitStrategy, hasUserViewportInteractedRef.current);
              await enforceG6OperatorZoomBounds(runtimeGraph, runtimeMaxZoom);
              publishViewportTelemetry("initial-fit");
            });
          });
        } else if (initialFitStrategy === "center-only") {
          await centerOnlyG6Viewport(runtimeGraph, false);
          runtimeMaxZoom = buildHzTopologyG6RuntimeMaxZoom(initialFitStrategy, hasUserViewportInteractedRef.current);
          await enforceG6OperatorZoomBounds(runtimeGraph, runtimeMaxZoom);
          publishViewportTelemetry("initial-fit");
        } else {
          await fitAndCenterG6Viewport(runtimeGraph, { when: 'overflow' }, false);
          runtimeMaxZoom = buildHzTopologyG6RuntimeMaxZoom(initialFitStrategy, hasUserViewportInteractedRef.current);
          await enforceG6OperatorZoomBounds(runtimeGraph, runtimeMaxZoom);
          publishViewportTelemetry("initial-fit");
        }
        lastFitStructureKeyRef.current = graphStructureKey;
        lastDrawGraphKeyRef.current = latestG6RenderKeyRef.current;
        initialFitTimerRef.current = scheduleInitialFitView(runtimeGraph, initialFitStrategy, () => !hasUserViewportInteractedRef.current);
        if (!disposed) setRenderState('ready');
        handleG6WheelViewportControl = event => {
          event.preventDefault();
          markUserViewportInteraction();
          const rawDelta = event.deltaY || event.deltaX;
          const clampedDelta = Math.max(-260, Math.min(260, rawDelta));
          const wheelScale = Math.exp(-clampedDelta / 650);
          const currentZoom = runtimeGraph.getZoom?.() ?? 1;
          const nextZoom = Math.max(HZ_TOPOLOGY_G6_MIN_ZOOM, Math.min(operatorMaxZoom, currentZoom * wheelScale));
          const origin = readG6WheelViewportOrigin(event, stage);
          runtimeGraph.setZoomRange?.([HZ_TOPOLOGY_G6_MIN_ZOOM, operatorMaxZoom]);
          publishViewportTelemetryAfterViewportAction("wheel", () => runtimeGraph.zoomTo?.(nextZoom, { duration: 80 }, origin));
        };
        handleG6PointerPanStart = event => {
          if (event.button !== 0) return;
          const snapshot = captureG6ViewportSnapshot(runtimeGraph);
          if (!snapshot) return;
          pointerPanStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            lastX: event.clientX,
            lastY: event.clientY,
            active: false
          };
          stage.setPointerCapture?.(event.pointerId);
        };
        handleG6PointerPanMove = event => {
          const state = pointerPanStateRef.current;
          if (!state || state.pointerId !== event.pointerId) return;
          const delta = { x: event.clientX - state.startX, y: event.clientY - state.startY };
          if (!state.active && Math.hypot(delta.x, delta.y) < 4) return;
          const panDelta = buildHzTopologyG6PointerPanDelta({ x: event.clientX - state.lastX, y: event.clientY - state.lastY });
          state.lastX = event.clientX;
          state.lastY = event.clientY;
          if (panDelta[0] === 0 && panDelta[1] === 0) return;
          state.active = true;
          event.preventDefault();
          markUserViewportInteraction();
          publishViewportTelemetryAfterViewportAction("pointer-pan", () => runtimeGraph.translateBy?.(panDelta, false));
        };
        handleG6PointerPanEnd = event => {
          const state = pointerPanStateRef.current;
          if (!state || state.pointerId !== event.pointerId) return;
          pointerPanStateRef.current = undefined;
          stage.releasePointerCapture?.(event.pointerId);
          if (state.active) {
            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
            pointerPanSelectionSuppressedUntilRef.current = now + HZ_TOPOLOGY_G6_POINTER_PAN_SELECTION_SUPPRESS_MS;
            publishViewportTelemetry("pointer-pan");
          }
        };
        stage.addEventListener("wheel", handleG6WheelViewportControl, { passive: false });
        stage.addEventListener("pointerdown", handleG6PointerPanStart);
        stage.addEventListener("pointermove", handleG6PointerPanMove);
        stage.addEventListener("pointerup", handleG6PointerPanEnd);
        stage.addEventListener("pointercancel", handleG6PointerPanEnd);
        resizeObserver = new ResizeObserver(entries => {
          const entry = entries[0];
          if (!entry || disposed) return;
          const resizeSnapshot = hasUserViewportInteractedRef.current ? captureG6ViewportSnapshot(runtimeGraph) : undefined;
          runtimeGraph.resize(Math.floor(entry.contentRect.width), Math.floor(entry.contentRect.height));
          runtimeMaxZoom = buildHzTopologyG6RuntimeMaxZoom(initialFitStrategy, hasUserViewportInteractedRef.current);
          void restoreG6ViewportSnapshot(runtimeGraph, resizeSnapshot, runtimeMaxZoom).then(() => {
            void enforceG6OperatorZoomBounds(runtimeGraph, runtimeMaxZoom).then(clamped => {
              if (resizeSnapshot) publishViewportTelemetry(clamped ? "runtime-zoom-guard" : "resize-restore");
            });
          });
        });
        resizeObserver.observe(stage);
      } catch (error) {
        console.warn('HzTopologyG6Canvas failed to mount AntV G6, keeping metadata fallback.', error);
        if (!disposed) setRenderState('fallback');
      }
    }

    mountGraph();

    return () => {
      disposed = true;
      cancelPendingInitialFitView();
      resizeObserver?.disconnect();
      if (handleG6WheelViewportControl) observedStage?.removeEventListener("wheel", handleG6WheelViewportControl);
      if (handleG6PointerPanStart) observedStage?.removeEventListener("pointerdown", handleG6PointerPanStart);
      if (handleG6PointerPanMove) observedStage?.removeEventListener("pointermove", handleG6PointerPanMove);
      if (handleG6PointerPanEnd) {
        observedStage?.removeEventListener("pointerup", handleG6PointerPanEnd);
        observedStage?.removeEventListener("pointercancel", handleG6PointerPanEnd);
      }
      graphRef.current?.destroy();
      graphRef.current = null;
    };
    // The mount lifecycle intentionally excludes g6Graph so hover/selection style redraws do not destroy and refit the operator viewport.
    // Graph data updates flow through the setData/draw effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelPendingInitialFitView, clearSharedHover, g6LayoutMode, graphStructureKey, handleG6EdgeSelect, handleG6NodeFocus, handleG6NodeSelect, height, initialFitStrategy, markUserViewportInteraction, nodeCount, operatorMaxZoom, publishViewportTelemetry, shouldSuppressG6SelectionAfterPointerPan, viewportRuntimeVersion]);

  React.useEffect(() => {
    const runtimeGraph = graphRef.current;
    if (!runtimeGraph || renderState !== 'ready') return;
    if (g6RenderKey === lastDrawGraphKeyRef.current) return;
    const shouldFitAfterDataChange = graphStructureKey !== lastFitStructureKeyRef.current && !hasUserViewportInteractedRef.current;
    const shouldPreserveViewportAfterRedraw = !shouldFitAfterDataChange;
    const snapshot = shouldPreserveViewportAfterRedraw ? captureG6ViewportSnapshot(runtimeGraph) : undefined;
    runtimeGraph.setData(runtimeG6Graph);
    runtimeGraph.draw().then(async () => {
      if (shouldFitAfterDataChange) {
        lastDrawGraphKeyRef.current = g6RenderKey;
        if (initialFitStrategy === "center-only") {
          await centerOnlyG6Viewport(runtimeGraph, false);
        } else {
          await fitAndCenterG6Viewport(runtimeGraph, { when: "overflow" }, false);
        }
        const runtimeMaxZoom = buildHzTopologyG6RuntimeMaxZoom(initialFitStrategy, hasUserViewportInteractedRef.current);
        const clamped = await enforceG6OperatorZoomBounds(runtimeGraph, runtimeMaxZoom);
        lastFitStructureKeyRef.current = graphStructureKey;
        publishViewportTelemetry(clamped ? "runtime-zoom-guard" : "initial-fit");
      } else {
        const runtimeMaxZoom = buildHzTopologyG6RuntimeMaxZoom(initialFitStrategy, hasUserViewportInteractedRef.current);
        await restoreG6ViewportSnapshot(runtimeGraph, snapshot, runtimeMaxZoom);
        const clamped = await enforceG6OperatorZoomBounds(runtimeGraph, runtimeMaxZoom);
        publishViewportTelemetry(clamped ? "runtime-zoom-guard" : "redraw-restore");
        lastFitStructureKeyRef.current = graphStructureKey;
        lastDrawGraphKeyRef.current = g6RenderKey;
      }
    }).catch(error => {
      console.warn('HzTopologyG6Canvas failed to update AntV G6 data.', error);
    });
  }, [g6RenderKey, graphStructureKey, initialFitStrategy, operatorMaxZoom, publishViewportTelemetry, renderState, runtimeG6Graph]);

  React.useEffect(() => {
    const runtimeGraph = graphRef.current;
    if (!runtimeGraph || renderState !== 'ready') return;
    const runtimeMaxZoom = buildHzTopologyG6RuntimeMaxZoom(initialFitStrategy, hasUserViewportInteractedRef.current);
    void enforceG6OperatorZoomBounds(runtimeGraph, runtimeMaxZoom).then(clamped => {
      if (clamped) publishViewportTelemetry("runtime-zoom-guard");
    });
  }, [initialFitStrategy, publishViewportTelemetry, renderState]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const handleBrowserResumeZoomGuard = () => {
      if (document.visibilityState === 'hidden') return;
      const runtimeGraph = graphRef.current;
      if (!runtimeGraph || renderState !== 'ready') return;
      const runtimeMaxZoom = buildHzTopologyG6RuntimeMaxZoom(initialFitStrategy, hasUserViewportInteractedRef.current);
      void enforceG6OperatorZoomBounds(runtimeGraph, runtimeMaxZoom).then(clamped => {
        if (clamped) publishViewportTelemetry("runtime-zoom-guard");
      });
    };

    document.addEventListener("visibilitychange", handleBrowserResumeZoomGuard);
    window.addEventListener("focus", handleBrowserResumeZoomGuard);
    handleBrowserResumeZoomGuard();
    return () => {
      document.removeEventListener("visibilitychange", handleBrowserResumeZoomGuard);
      window.removeEventListener("focus", handleBrowserResumeZoomGuard);
    };
  }, [initialFitStrategy, publishViewportTelemetry, renderState, viewportRuntimeVersion]);

  React.useEffect(() => {
    const runtimeGraph = graphRef.current;
    if (!runtimeGraph || renderState !== 'ready') return;
    const nextState = renderedSelectionState;
    const previousState = selectedElementStateRef.current;
    const selectionStatePatch: Record<string, string[]> = {};

    if (previousState.nodeId && previousState.nodeId !== nextState.nodeId) selectionStatePatch[previousState.nodeId] = [];
    if (previousState.edgeId && previousState.edgeId !== nextState.edgeId) selectionStatePatch[previousState.edgeId] = [];
    if (nextState.nodeId) selectionStatePatch[nextState.nodeId] = ['selected'];
    if (nextState.edgeId) selectionStatePatch[nextState.edgeId] = ['selected'];

    selectedElementStateRef.current = nextState;
    if (Object.keys(selectionStatePatch).length === 0) return;
    runtimeGraph.setElementState?.(selectionStatePatch, false).catch(error => {
      console.warn('HzTopologyG6Canvas failed to update AntV G6 selection state.', error);
    });
  }, [renderState, renderedSelectionState]);

  const centerGraphView = React.useCallback(async (action: 'fit-view' | 'reset-view') => {
    if (initialFitStrategy === "center-only") {
      await centerOnlyG6Viewport(graphRef.current, { duration: 180 });
      return;
    }
    if (action === 'reset-view') await graphRef.current?.zoomTo?.(1, { duration: 180 });
    await fitAndCenterG6Viewport(graphRef.current, { when: 'overflow' }, { duration: 180 });
  }, [initialFitStrategy]);

  const fitView = React.useCallback(() => {
    publishViewportTelemetryAfterViewportAction("fit-view", () => centerGraphView("fit-view"));
  }, [centerGraphView, publishViewportTelemetryAfterViewportAction]);

  const resetView = React.useCallback(() => {
    publishViewportTelemetryAfterViewportAction("reset-view", () => centerGraphView("reset-view"));
  }, [centerGraphView, publishViewportTelemetryAfterViewportAction]);

  const zoomBy = React.useCallback((scale: number, origin = centerG6ViewportOrigin(stageRef.current)) => {
    markUserViewportInteraction();
    const currentZoom = graphRef.current?.getZoom?.() ?? 1;
    const nextZoom = Math.max(HZ_TOPOLOGY_G6_MIN_ZOOM, Math.min(operatorMaxZoom, currentZoom * scale));
    graphRef.current?.setZoomRange?.([HZ_TOPOLOGY_G6_MIN_ZOOM, operatorMaxZoom]);
    publishViewportTelemetryAfterViewportAction("zoom-control", () => graphRef.current?.zoomTo?.(nextZoom, { duration: 120 }, origin));
  }, [markUserViewportInteraction, operatorMaxZoom, publishViewportTelemetryAfterViewportAction]);

  const executeViewportCommandAction = React.useCallback(
    (commandAction: string | null | undefined) => {
      if (commandAction === "zoom-in") zoomBy(1.18);
      if (commandAction === "zoom-out") zoomBy(0.82);
      if (commandAction === "fit-view") fitView();
      if (commandAction === "reset-view") resetView();
    },
    [fitView, resetView, zoomBy]
  );

  const handleG6ViewportKeyboardShortcut = React.useCallback(
    (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isEditableG6ShortcutTarget(event.target)) return;
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomBy(1.18);
        return;
      }
      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomBy(0.82);
        return;
      }
      if (event.key === "0") {
        event.preventDefault();
        resetView();
        return;
      }
      if (event.key.toLocaleLowerCase() === "f") {
        event.preventDefault();
        fitView();
      }
    },
    [fitView, resetView, zoomBy]
  );

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const handleViewportCommandEvent = (event: Event) => {
      const commandAction = (event as CustomEvent<{ action?: HzTopologyG6ViewportCommandAction }>).detail?.action;
      executeViewportCommandAction(commandAction);
    };
    const handleViewportCommandRequest = () => {
      const commandRequest = root.getAttribute("data-hz-topology-g6-command-request");
      const commandAction = commandRequest?.split(":")[0];
      executeViewportCommandAction(commandAction);
    };
    const viewportCommandObserver = new MutationObserver(handleViewportCommandRequest);

    root.addEventListener("hz-topology-g6-viewport-command", handleViewportCommandEvent);
    viewportCommandObserver.observe(root, { attributes: true, attributeFilter: ["data-hz-topology-g6-command-request"] });
    return () => {
      root.removeEventListener("hz-topology-g6-viewport-command", handleViewportCommandEvent);
      viewportCommandObserver.disconnect();
    };
  }, [executeViewportCommandAction]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.addEventListener("keydown", handleG6ViewportKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleG6ViewportKeyboardShortcut);
  }, [handleG6ViewportKeyboardShortcut]);

  const focusGraphElement = React.useCallback(
    (target: 'search-result' | 'selected-node', nodeId: string | undefined) => {
      if (!nodeId) return;
      clearSharedHover();
      setFocusActionTelemetry({ source: target, targetId: nodeId });
      Promise.resolve(graphRef.current?.focusElement?.(nodeId, { duration: 180 }))
        .then(() => publishViewportTelemetry("focus-element"))
        .catch(() => publishViewportTelemetry("focus-element"));
    },
    [clearSharedHover, publishViewportTelemetry]
  );

  const focusSearchResult = React.useCallback(() => {
    focusGraphElement('search-result', searchFocus.firstMatchedNodeId);
  }, [focusGraphElement, searchFocus.firstMatchedNodeId]);

  const focusSelectedNode = React.useCallback(() => {
    focusGraphElement('selected-node', selectedFocusNodeId);
  }, [focusGraphElement, selectedFocusNodeId]);

  const scalePerformancePolicy =
    renderWindow.mode === 'windowed' ? 'windowed-interactive-budget' : 'direct-interactive-budget';
  const scalePerformanceInvariants =
    renderWindow.mode === 'windowed'
      ? 'windowed-render pan-zoom-no-url-change no-remount no-refit viewport-preserved render-key-stable table-companion'
      : 'direct-render pan-zoom-no-url-change no-remount no-refit viewport-preserved render-key-stable';

  return (
    <div
      {...props}
      ref={rootRef}
      onPointerLeave={handleG6CanvasPointerLeave}
      className={[
        'absolute inset-0 overflow-hidden rounded-[2px] border border-[#1b202b] bg-[#08090c]',
        height === 'compact' ? 'min-h-[420px]' : 'min-h-[620px]',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      data-hz-ui="topology-g6-canvas"
      data-hz-topology-primitive="g6-canvas"
      data-hz-topology-g6-canvas-owner="hertzbeat-ui-g6-canvas"
      data-hz-topology-g6-visual-language="hertzbeat-dark-hard-canvas"
      data-hz-topology-g6-canvas-background="neutral-graphite"
      data-hz-topology-g6-canvas-radius="hard-2px"
      data-hz-topology-g6-node-visual="circle-icon-label"
      data-hz-topology-g6-node-icon-source="lucide-entity-type-catalog"
      data-hz-topology-g6-node-icon-library="lucide-react"
      data-hz-topology-g6-node-icon-no-handdrawn="true"
      data-hz-topology-g6-no-handdrawn-icons="true"
      data-hz-topology-g6-icon-source-proof="lucide-react:entity-type-catalog"
      data-hz-topology-g6-node-icon-catalog-owner="lucide-react-entity-type-catalog"
      data-hz-topology-g6-node-icon-catalog={HZ_TOPOLOGY_G6_NODE_ICON_CATALOG_SUMMARY}
      data-hz-topology-g6-engine="antv-g6"
      data-hz-topology-g6-interaction-owner="hertzbeat-ui-g6-interaction"
      data-hz-topology-g6-viewport-owner="hertzbeat-ui-g6-viewport"
      data-hz-topology-g6-auto-fit="initial-only"
      data-hz-topology-g6-auto-fit-owner="hertzbeat-ui-g6-auto-fit"
      data-hz-topology-g6-auto-fit-zoom-bounds={`${HZ_TOPOLOGY_G6_MIN_ZOOM}-${HZ_TOPOLOGY_G6_AUTO_FIT_MAX_ZOOM}`}
      data-hz-topology-g6-auto-fit-max-zoom={HZ_TOPOLOGY_G6_AUTO_FIT_MAX_ZOOM}
      data-hz-topology-g6-auto-fit-growth="no-magnify-small-graphs"
      data-hz-topology-g6-auto-fit-zoom-range-owner="hertzbeat-ui-g6-auto-fit-zoom-range"
      data-hz-topology-g6-initial-paint-policy="hide-stage-until-fit-ready"
      data-hz-topology-g6-initial-fit-strategy={initialFitStrategy}
      data-hz-topology-g6-initial-fit-strategy-owner="hertzbeat-ui-g6-initial-fit-strategy"
      data-hz-topology-g6-viewport-fit-state={viewportFitState}
      data-hz-topology-g6-viewport-fit-state-owner="hertzbeat-ui-g6-fit-settle-state"
      data-hz-topology-g6-node-only-first-paint={shouldFastPaintNodeOnlyGraph ? 'render-before-center' : 'fit-ready'}
      data-hz-topology-g6-node-only-first-paint-owner="hertzbeat-ui-g6-node-only-first-paint"
      data-hz-topology-g6-node-only-prepaint={shouldFastPaintNodeOnlyGraph ? 'source-backed-node-overlay' : 'none'}
      data-hz-topology-g6-node-only-prepaint-owner="hertzbeat-ui-g6-node-only-prepaint"
      data-hz-topology-g6-node-only-prepaint-visibility={nodeOnlyPrepaintVisibility}
      data-hz-topology-g6-node-only-prepaint-icon-source="lucide-react:entity-type-catalog"
      data-hz-topology-g6-compact-final-zoom-clamp="true"
      data-hz-topology-g6-compact-fit-mode="center-1x-no-fill"
      data-hz-topology-g6-compact-initial-zoom={HZ_TOPOLOGY_G6_COMPACT_INITIAL_ZOOM}
      data-hz-topology-g6-normal-browser-stale-fit-guard="compact-1x-before-center"
      data-hz-topology-g6-preinteraction-zoom-guard="compact-1x"
      data-hz-topology-g6-preinteraction-zoom-guard-owner="hertzbeat-ui-g6-preinteraction-zoom-guard"
      data-hz-topology-g6-operator-zoom-bounds={`${HZ_TOPOLOGY_G6_MIN_ZOOM}-${operatorMaxZoom}`}
      data-hz-topology-g6-operator-zoom-growth="bounded-readable-nodes"
      data-hz-topology-g6-operator-zoom-tier={operatorZoomTier}
      data-hz-topology-g6-fit-mode="overflow-only-center"
      data-hz-topology-g6-viewport-interaction-state={viewportInteractionState}
      data-hz-topology-g6-viewport-interaction-owner="hertzbeat-ui-g6-viewport-interaction"
      data-hz-topology-g6-viewport-preservation="clamped-wheel-pan-zoom"
      data-hz-topology-g6-pan-mode="manual-stage-drag-fallback"
      data-hz-topology-g6-pan-owner="hertzbeat-ui-g6-pan"
      data-hz-topology-g6-pan-runtime="manual-only-no-antv-double-pan"
      data-hz-topology-g6-pan-telemetry="pointer-drag-translateBy"
      data-hz-topology-g6-pan-selection-guard="drag-pan-suppresses-click-selection"
      data-hz-topology-g6-pan-selection-guard-owner="hertzbeat-ui-g6-pan-selection-guard"
      data-hz-topology-g6-live-interaction-owner="hertzbeat-ui-g6-live-interaction"
      data-hz-topology-g6-live-interaction-invariants="no-url-change no-remount no-refit viewport-preserved render-key-stable"
      data-hz-topology-g6-edge-live-interaction-owner="hertzbeat-ui-g6-edge-live-interaction"
      data-hz-topology-g6-edge-live-interaction-invariants="edge-click-drawer no-url-change no-remount no-refit viewport-preserved render-key-stable"
      data-hz-topology-g6-scale-performance-owner="hertzbeat-ui-g6-scale-performance"
      data-hz-topology-g6-scale-performance-policy={scalePerformancePolicy}
      data-hz-topology-g6-scale-performance-invariants={scalePerformanceInvariants}
      data-hz-topology-g6-scale-performance-rendered-node-budget={renderWindow.visibleNodeBudget}
      data-hz-topology-g6-scale-performance-rendered-edge-budget={edgeDensityWindow.maxVisibleEdgeCount}
      data-hz-topology-g6-scale-performance-rendered-node-count={renderWindow.renderedNodeCount}
      data-hz-topology-g6-scale-performance-rendered-edge-count={edgeDensityWindow.renderedEdgeCount}
      data-hz-topology-g6-viewport-redraw-preservation="zoom-position"
      data-hz-topology-g6-viewport-redraw-preservation-owner="hertzbeat-ui-g6-viewport-redraw-preservation"
      data-hz-topology-g6-viewport-restore-clamp="operator-max"
      data-hz-topology-g6-live-zoom-guard="operator-max"
      data-hz-topology-g6-live-zoom-guard-owner="hertzbeat-ui-g6-live-zoom-guard"
      data-hz-topology-g6-runtime-version={viewportRuntimeVersion}
      data-hz-topology-g6-runtime-version-owner="hertzbeat-ui-g6-runtime-version"
      data-hz-topology-g6-browser-resume-zoom-guard="operator-max"
      data-hz-topology-g6-resize-preservation="operator-viewport-snapshot"
      data-hz-topology-g6-resize-preservation-owner="hertzbeat-ui-g6-resize-preservation"
      data-hz-topology-g6-viewport-telemetry="live"
      data-hz-topology-g6-viewport-telemetry-owner="hertzbeat-ui-g6-viewport-telemetry"
      data-hz-topology-g6-viewport-telemetry-timing="after-action-settled"
      data-hz-topology-g6-viewport-telemetry-timing-owner="hertzbeat-ui-g6-viewport-telemetry-timing"
      data-hz-topology-g6-command-bridge="custom-event"
      data-hz-topology-g6-command-bridge-owner="hertzbeat-ui-g6-command-bridge"
      data-hz-topology-g6-command-event="hz-topology-g6-viewport-command"
      data-hz-topology-g6-command-request="idle"
      data-hz-topology-g6-command-request-owner="hertzbeat-ui-g6-command-request"
      data-hz-topology-g6-command-actions="zoom-in zoom-out fit-view reset-view"
      data-hz-topology-g6-mount-lifecycle-owner="hertzbeat-ui-g6-mount-lifecycle"
      data-hz-topology-g6-mount-lifecycle-policy="structure-layout-height-only"
      data-hz-topology-g6-mount-lifecycle-redraw-policy="setData-draw-preserve-viewport"
      data-hz-topology-g6-mount-lifecycle-structure-key={graphStructureKeyFingerprint}
      data-hz-topology-g6-mount-lifecycle-structure-key-owner="hertzbeat-ui-g6-structure-key-fingerprint"
      data-hz-topology-g6-mount-lifecycle-structure-key-policy="short-fingerprint"
      data-hz-topology-g6-mount-lifecycle-structure-key-length={graphStructureKey.length}
      data-hz-topology-g6-mount-lifecycle-render-key={g6RenderKeyFingerprint}
      data-hz-topology-g6-mount-lifecycle-render-key-owner="hertzbeat-ui-g6-render-key-fingerprint"
      data-hz-topology-g6-mount-lifecycle-render-key-policy="short-fingerprint"
      data-hz-topology-g6-mount-lifecycle-render-key-length={g6RenderKey.length}
      data-hz-topology-g6-wheel-mode="manual-clamped-g6-zoom"
      data-hz-topology-g6-wheel-owner="hertzbeat-ui-g6-wheel"
      data-hz-topology-g6-wheel-listener-passive="false-control"
      data-hz-topology-g6-wheel-origin="pointer-clamped"
      data-hz-topology-g6-wheel-zoom-bounds={`${HZ_TOPOLOGY_G6_MIN_ZOOM}-${operatorMaxZoom}`}
      data-hz-topology-g6-node-motion="locked-layout"
      data-hz-topology-g6-node-motion-owner="hertzbeat-ui-g6-node-motion"
      data-hz-topology-g6-selection-engine="hertzbeat-controlled"
      data-hz-topology-g6-selection-engine-owner="hertzbeat-ui-g6-selection-engine"
      data-hz-topology-g6-selection-redraw-behavior="element-state-no-data-redraw"
      data-hz-topology-g6-selection-state-owner="hertzbeat-ui-g6-selection-state"
      data-hz-topology-g6-selection-state-policy="rendered-elements-only"
      data-hz-topology-g6-selected-node-rendered={selectionStateSelectedNodeRendered}
      data-hz-topology-g6-selected-edge-rendered={selectionStateSelectedEdgeRendered}
      data-hz-topology-g6-selection-state-selected-node-rendered={selectionStateSelectedNodeRendered}
      data-hz-topology-g6-selection-state-selected-edge-rendered={selectionStateSelectedEdgeRendered}
      data-hz-topology-g6-selection-state-skipped-target-count={selectionStateSkippedTargetCount}
      data-hz-topology-g6-keyboard-shortcuts="plus-minus-zero-fit"
      data-hz-topology-g6-keyboard-shortcuts-owner="hertzbeat-ui-g6-keyboard"
      data-hz-topology-g6-keyboard-actions="zoom-in zoom-out reset-view fit-view"
      data-hz-topology-g6-initial-fit-cancel="operator-viewport-interaction"
      data-hz-topology-g6-initial-fit-cancel-owner="hertzbeat-ui-g6-initial-fit-cancel"
      data-hz-topology-g6-viewport-telemetry-source={viewportTelemetry.source}
      data-hz-topology-g6-viewport-telemetry-zoom={formatG6ViewportZoom(viewportTelemetry.zoom)}
      data-hz-topology-g6-viewport-telemetry-position={formatG6ViewportPosition(viewportTelemetry.position)}
      data-hz-topology-g6-viewport-alias-owner="hertzbeat-ui-g6-viewport-telemetry-alias"
      data-hz-topology-g6-viewport-zoom={formatG6ViewportZoom(viewportTelemetry.zoom)}
      data-hz-topology-g6-viewport-position={formatG6ViewportPosition(viewportTelemetry.position)}
      data-hz-topology-g6-style-redraw-behavior="no-auto-fit"
      data-hz-topology-g6-style-redraw-skip="identical-render-key"
      data-hz-topology-g6-blank-hover-clear="no-op-without-hover"
      data-hz-topology-g6-fit-behavior="overflow-fit-and-center"
      data-hz-topology-g6-reset-behavior="zoom-one-overflow-fit-center"
      data-hz-topology-g6-node-selection={selectionMode}
      data-hz-topology-g6-edge-selection={selectionMode}
      data-hz-topology-g6-edge-hit-target="wide-pointer-band"
      data-hz-topology-g6-edge-hit-target-owner="hertzbeat-ui-g6-edge-hit-target"
      data-hz-topology-g6-focus-entry="double-click-node"
      data-hz-topology-g6-focus-entry-owner="hertzbeat-ui-g6-focus-entry"
      data-hz-topology-g6-focus-depth-target="1-hop"
      data-hz-topology-g6-selection-clear="hover"
      data-hz-topology-g6-edge-to-edge-selection-continuity="adjacent-edge-click-updates-selection-and-summary"
      data-hz-topology-g6-edge-to-edge-selection-invariants="edge-click edge-click no-stale-hover summary-selected-match no-url-change no-remount no-refit viewport-preserved render-key-stable"
      data-hz-topology-g6-node-edge-selection-continuity="node-click-clears-edge edge-click-clears-node"
      data-hz-topology-g6-node-edge-selection-invariants="edge-node node-edge clear-opposite-selection clear-stale-hover no-url-change no-remount no-refit viewport-preserved render-key-stable"
      data-hz-topology-g6-selected-edge-node-hover-continuity="selected-edge-survives-node-hover"
      data-hz-topology-g6-selected-edge-node-hover-invariants="selected-edge path-summary-selected node-hover-no-summary-overwrite pointer-leave-clears-hover no-url-change no-remount no-refit viewport-preserved render-key-stable"
      data-hz-topology-g6-selected-node-edge-hover-continuity="selected-node-survives-edge-hover"
      data-hz-topology-g6-selected-node-edge-hover-invariants="selected-node edge-hover-no-node-overwrite edge-hover-no-url-change pointer-leave-clears-hover no-remount no-refit viewport-preserved render-key-stable"
      data-hz-topology-g6-neighbor-highlight="metadata-only"
      data-hz-topology-g6-hover-state-engine="metadata-only-no-g6-state"
      data-hz-topology-g6-hover-owner="hertzbeat-ui-g6-hover"
      data-hz-topology-g6-hover-clear="canvas-boundary"
      data-hz-topology-g6-hover-clear-fallback="document-boundary-pointermove"
      data-hz-topology-g6-hover-clear-selection-continuity="next-edge-click-selects-rendered-edge"
      data-hz-topology-g6-hover-clear-selection-invariants="cleared-hover next-edge-click no-url-change no-remount no-refit viewport-preserved render-key-stable"
      data-hz-topology-g6-hover-source={activeHoveredNodeId ? 'node' : activeHoveredEdgeId ? 'edge' : activeFocusSource === 'selection' ? 'selection' : 'none'}
      data-hz-topology-g6-hover-viewport-behavior="highlight-only"
      data-hz-topology-g6-hover-viewport-owner="hertzbeat-ui-g6-hover-viewport"
      data-hz-topology-g6-hover-redraw-behavior="metadata-only"
      data-hz-topology-g6-hover-redraw-owner="hertzbeat-ui-g6-hover-redraw"
      data-hz-topology-g6-search-auto-focus="explicit-action-only"
      data-hz-topology-g6-search-auto-focus-owner="hertzbeat-ui-g6-search-auto-focus"
      data-hz-topology-g6-search-auto-focus-guard="operator-viewport-interaction"
      data-hz-topology-g6-search-viewport-behavior="highlight-only"
      data-hz-topology-g6-selection-auto-focus="explicit-action-only"
      data-hz-topology-g6-selection-auto-focus-owner="hertzbeat-ui-g6-selection-auto-focus"
      data-hz-topology-g6-hovered-node={activeHoveredNodeId ?? 'none'}
      data-hz-topology-g6-hovered-edge={activeHoveredEdgeId ?? 'none'}
      data-hz-topology-g6-active-focus-source={activeFocusSource}
      data-hz-topology-g6-neighbor-focus-owner="hertzbeat-ui-g6-neighbor-focus"
      data-hz-topology-g6-focused-node={neighborFocus.focusNodeId ?? 'none'}
      data-hz-topology-g6-focused-edge={neighborFocus.focusEdgeId ?? 'none'}
      data-hz-topology-g6-upstream-node-count={neighborFocus.upstreamNodeIds.length}
      data-hz-topology-g6-downstream-node-count={neighborFocus.downstreamNodeIds.length}
      data-hz-topology-g6-dimmed-node-count={neighborFocus.dimmedNodeIds.length}
      data-hz-topology-g6-incoming-edge-count={neighborFocus.incomingEdgeIds.length}
      data-hz-topology-g6-outgoing-edge-count={neighborFocus.outgoingEdgeIds.length}
      data-hz-topology-g6-selected-edge-count={neighborFocus.selectedEdgeIds.length}
      data-hz-topology-g6-dimmed-edge-count={neighborFocus.dimmedEdgeIds.length}
      data-hz-topology-g6-focus-behavior="focus-element"
      data-hz-topology-g6-scale-owner="hertzbeat-ui-g6-scale"
      data-hz-topology-g6-scale-tier={scaleProfile.scaleTier}
      data-hz-topology-g6-scale-node-count={scaleProfile.nodeCount}
      data-hz-topology-g6-scale-edge-count={scaleProfile.edgeCount}
      data-hz-topology-g6-scale-layout-hint={scaleProfile.layoutHint}
      data-hz-topology-g6-large-graph-owner="hertzbeat-ui-g6-large-graph"
      data-hz-topology-g6-large-graph-strategy={largeGraphStrategy.strategy}
      data-hz-topology-g6-large-graph-recommended-layout={largeGraphStrategy.recommendedLayout}
      data-hz-topology-g6-large-graph-grouping={largeGraphStrategy.grouping}
      data-hz-topology-g6-large-graph-filtering={largeGraphStrategy.filtering}
      data-hz-topology-g6-large-graph-table-companion={largeGraphStrategy.tableCompanion}
      data-hz-topology-g6-large-graph-visible-node-budget={largeGraphStrategy.visibleNodeBudget}
      data-hz-topology-g6-large-graph-overflow-policy={largeGraphOverflowPolicy}
      data-hz-topology-g6-large-graph-overflow-policy-owner="hertzbeat-ui-g6-large-graph-overflow"
      data-hz-topology-g6-render-window-owner="hertzbeat-ui-g6-render-window"
      data-hz-topology-g6-render-window-mode={renderWindow.mode}
      data-hz-topology-g6-render-window-total-node-count={renderWindow.totalNodeCount}
      data-hz-topology-g6-render-window-total-edge-count={renderWindow.totalEdgeCount}
      data-hz-topology-g6-render-window-visible-node-budget={renderWindow.visibleNodeBudget}
      data-hz-topology-g6-render-window-rendered-node-count={renderWindow.renderedNodeCount}
      data-hz-topology-g6-render-window-rendered-edge-count={renderWindowRenderedEdgeCount}
      data-hz-topology-g6-render-window-rendered-edge-count-owner="hertzbeat-ui-g6-edge-density"
      data-hz-topology-g6-render-window-candidate-edge-count={renderWindow.renderedEdgeCount}
      data-hz-topology-g6-rendered-node-count={renderWindow.renderedNodeCount}
      data-hz-topology-g6-rendered-edge-count={edgeDensityWindow.renderedEdgeCount}
      data-hz-topology-g6-rendered-edge-owner="hertzbeat-ui-g6-rendered-edge-proof"
      data-hz-topology-g6-render-window-hidden-node-count={renderWindow.hiddenNodeCount}
      data-hz-topology-g6-render-window-hidden-edge-count={renderWindowHiddenEdgeCount}
      data-hz-topology-g6-render-window-table-companion={renderWindow.tableCompanion}
      data-hz-topology-g6-render-window-priority-behavior="search-only-no-selection-reorder"
      data-hz-topology-g6-render-window-priority-owner="hertzbeat-ui-g6-render-window-priority"
      data-hz-topology-g6-render-window-priority-node-count={renderWindow.priorityNodeCount}
      data-hz-topology-g6-render-window-priority-node-ids={renderWindow.priorityNodeIds.join(' ') || 'none'}
      data-hz-topology-g6-edge-label-owner="hertzbeat-ui-g6-edge-label"
      data-hz-topology-g6-edge-label-policy={edgeLabelPolicy}
      data-hz-topology-g6-edge-label-visible-count={edgeLabelVisibleCount}
      data-hz-topology-g6-edge-label-hidden-count={edgeLabelHiddenCount}
      data-hz-topology-g6-edge-label-large-graph-threshold={HZ_TOPOLOGY_G6_EDGE_LABEL_VISIBLE_EDGE_LIMIT}
      data-hz-topology-g6-node-label-owner="hertzbeat-ui-g6-node-label"
      data-hz-topology-g6-node-label-policy={nodeLabelPolicy}
      data-hz-topology-g6-node-label-visible-count={nodeLabelCounts.visibleCount}
      data-hz-topology-g6-node-label-hidden-count={nodeLabelCounts.hiddenCount}
      data-hz-topology-g6-node-label-metadata-policy="preserve-data-label"
      data-hz-topology-g6-shape-profile-owner="hertzbeat-ui-g6-shape-profile"
      data-hz-topology-g6-shape-profile={shapeProfile.shape}
      data-hz-topology-g6-shape-profile-evidence={shapeProfile.evidence}
      data-hz-topology-g6-shape-profile-hub-node-count={shapeProfile.hubNodeCount}
      data-hz-topology-g6-shape-profile-star-edge-count={shapeProfile.starEdgeCount}
      data-hz-topology-g6-shape-profile-mesh-edge-count={shapeProfile.meshEdgeCount}
      data-hz-topology-g6-edge-density-owner="hertzbeat-ui-g6-edge-density"
      data-hz-topology-g6-edge-density-policy={edgeDensityWindow.policy}
      data-hz-topology-g6-edge-density-total-edge-count={edgeDensityWindow.totalEdgeCount}
      data-hz-topology-g6-edge-density-rendered-edge-count={edgeDensityWindow.renderedEdgeCount}
      data-hz-topology-g6-edge-density-hidden-edge-count={edgeDensityWindow.hiddenEdgeCount}
      data-hz-topology-g6-edge-density-max-visible={edgeDensityWindow.maxVisibleEdgeCount}
      data-hz-topology-g6-edge-readability-owner="hertzbeat-ui-g6-edge-readability"
      data-hz-topology-g6-edge-readability-policy={edgeReadabilityProfile.policy}
      data-hz-topology-g6-edge-readability-evidence={edgeReadabilityProfile.evidence}
      data-hz-topology-g6-edge-readability-ranking-policy={edgeReadabilityProfile.rankingPolicy}
      data-hz-topology-g6-edge-readability-stability={edgeReadabilityProfile.stability}
      data-hz-topology-g6-edge-readability-max-prominent-edge-count={edgeReadabilityProfile.maxProminentEdgeCount}
      data-hz-topology-g6-edge-readability-prominent-edge-count={edgeReadabilityProfile.prominentEdgeCount}
      data-hz-topology-g6-edge-readability-attenuated-edge-count={edgeReadabilityProfile.attenuatedEdgeCount}
      data-hz-topology-g6-edge-readability-minimum-opacity={edgeReadabilityProfile.minimumOpacity}
      data-hz-topology-g6-windowed-layout-owner="hertzbeat-ui-g6-windowed-layout"
      data-hz-topology-g6-windowed-layout-policy={windowedLayoutPolicy}
      data-hz-topology-g6-windowed-layout-max-lane-rows={HZ_TOPOLOGY_G6_WINDOWED_LANE_MAX_ROWS}
      data-hz-topology-g6-windowed-layout-rendered-node-count={renderWindow.renderedNodeCount}
      data-hz-topology-g6-filter-owner="hertzbeat-ui-g6-filter"
      data-hz-topology-g6-filter-environment={activeFilterScope.environment}
      data-hz-topology-g6-filter-source-kind={activeFilterScope.sourceKind}
      data-hz-topology-g6-filter-search-query={activeFilterScope.searchQuery}
      data-hz-topology-g6-filter-group-by={activeFilterScope.groupBy}
      data-hz-topology-g6-filter-visible-node-count={activeFilterScope.visibleNodeCount}
      data-hz-topology-g6-filter-visible-edge-count={activeFilterScope.visibleEdgeCount}
      data-hz-topology-g6-filter-source-match={activeFilterScope.sourceKindMatched ? 'true' : 'false'}
      data-hz-topology-g6-filter-group-count={activeFilterScope.groupCount}
      data-hz-topology-g6-filter-control-owner="hertzbeat-ui-g6-filter-control"
      data-hz-topology-g6-filter-control-count={filterControls.length}
      data-hz-topology-g6-filter-control-active={activeFilterControlIds.join(' ') || 'none'}
      data-hz-topology-g6-legend-dock-state={legendSlot ? 'in-canvas' : 'none'}
      data-hz-topology-g6-legend-dock-owner="hertzbeat-ui-g6-legend-dock"
      data-hz-topology-g6-group-owner="hertzbeat-ui-g6-group"
      data-hz-topology-g6-group-by={groupSummary.groupBy}
      data-hz-topology-g6-group-active={groupSummary.active ? 'true' : 'false'}
      data-hz-topology-g6-group-item-count={groupSummary.itemCount}
      data-hz-topology-g6-group-collapsed-node-count={groupSummary.totalCollapsedNodeCount}
      data-hz-topology-g6-group-action-count={activeGroupActionCount}
      data-hz-topology-g6-group-surface-visibility={groupSurfaceVisibility}
      data-hz-topology-g6-semantic-cluster-owner="hertzbeat-ui-g6-semantic-cluster"
      data-hz-topology-g6-semantic-cluster-policy={semanticClusterSummary.policy}
      data-hz-topology-g6-semantic-cluster-visibility={semanticClusterVisibility}
      data-hz-topology-g6-semantic-cluster-item-count={semanticClusterSummary.itemCount}
      data-hz-topology-g6-semantic-cluster-hidden-node-count={semanticClusterSummary.hiddenNodeCount}
      data-hz-topology-g6-semantic-cluster-hidden-edge-count={semanticClusterSummary.hiddenEdgeCount}
      data-hz-topology-g6-semantic-cluster-table-companion={semanticClusterSummary.tableCompanion}
      data-hz-topology-g6-search-owner="hertzbeat-ui-g6-search"
      data-hz-topology-g6-search-query={searchFocus.query || 'none'}
      data-hz-topology-g6-search-status={searchFocus.status}
      data-hz-topology-g6-search-match-count={searchFocus.matchCount}
      data-hz-topology-g6-search-first-match={searchFocus.firstMatchedNodeId ?? 'none'}
      data-hz-topology-g6-search-focus-behavior="focus-first-match"
      data-hz-topology-g6-search-focus-clear="hover"
      data-hz-topology-g6-selected-focus-owner="hertzbeat-ui-g6-selected-focus"
      data-hz-topology-g6-selected-focus-target={selectedFocusNodeId ?? 'none'}
      data-hz-topology-g6-selected-focus-status={selectedFocusNodeId ? 'ready' : 'disabled'}
      data-hz-topology-g6-selected-focus-behavior="focus-selected-node"
      data-hz-topology-g6-selected-focus-clear="hover"
      data-hz-topology-g6-focus-action-owner="hertzbeat-ui-g6-focus-action"
      data-hz-topology-g6-focus-action-behavior="explicit-toolbar-recenter"
      data-hz-topology-g6-focus-action-source={focusActionTelemetry.source}
      data-hz-topology-g6-focus-action-target={focusActionTelemetry.targetId ?? 'none'}
      data-hz-topology-g6-toolbar-visibility={viewportToolbarVisibility}
      data-hz-topology-g6-minimap-visibility={minimapVisibility}
      data-hz-topology-g6-summary-visibility={summaryVisibility}
      data-hz-topology-g6-filter-control-surface-visibility={filterControlSurfaceVisibility}
      data-hz-topology-g6-render-state={renderState}
      data-hz-topology-g6-layout={g6LayoutMode}
      data-hz-topology-g6-layout-mode={g6LayoutMode}
      data-hz-topology-g6-node-only-layout={g6LayoutMode === 'node-only-grid' ? 'grid' : 'none'}
      data-hz-topology-g6-relation-state={relationState}
      data-hz-topology-g6-relation-state-owner="hertzbeat-ui-g6-relation-state"
      data-hz-topology-g6-node-only-explanation={nodeOnlyExplanationVisibility}
      data-hz-topology-g6-overlay-mode={overlayMode}
      data-hz-topology-g6-node-count={nodeCount}
      data-hz-topology-g6-edge-count={edgeCount}
      data-hz-topology-g6-selected-node={selectedNodeId ?? 'none'}
      data-hz-topology-g6-selected-edge={selectedEdgeId ?? 'none'}
    >
      <div
        ref={stageRef}
        className={[
          'absolute inset-0 transition-opacity duration-75',
          initialPaintVisibility === 'hidden-until-fit' ? 'opacity-0' : 'opacity-100'
        ].join(' ')}
        data-hz-topology-g6-stage="antv-g6-stage"
        data-hz-topology-g6-stage-owner="hertzbeat-ui-g6-stage"
        data-hz-topology-g6-stage-initial-paint={initialPaintVisibility}
      />
      {hasViewportTarget && !shouldFastPaintNodeOnlyGraph ? (
        <div
          className={[
            'pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-75',
            runtimeLoadingVisibility === 'visible-until-g6-ready' ? 'opacity-100' : 'opacity-0'
          ].join(' ')}
          data-hz-topology-g6-runtime-loading-layer={runtimeLoadingVisibility}
          data-hz-topology-g6-runtime-loading-owner="hertzbeat-ui-g6-runtime-loading"
          data-hz-topology-g6-runtime-loading-node-count={nodeCount}
          data-hz-topology-g6-runtime-loading-edge-count={edgeCount}
          data-hz-topology-g6-runtime-loading-icon-policy="none"
          data-hz-topology-g6-runtime-loading-no-handdrawn-icon="true"
        >
          <div className="min-w-[220px] rounded-[3px] bg-[#08090c]/88 px-3 py-2 text-[11px] text-[#aebbd0] shadow-[0_14px_40px_rgba(0,0,0,0.2)]">
            <div className="font-mono text-[#d6e2f2]">{canvasSummary}</div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#151922]">
              <div className="h-full w-1/2 rounded-full bg-[#45c16f]/70" />
            </div>
          </div>
        </div>
      ) : null}
      {edgeDensityAffordanceVisible ? (
        <button
          type="button"
          className="pointer-events-auto absolute left-3 top-3 z-20 flex max-w-[min(360px,calc(100%-1.5rem))] items-center gap-2 rounded-[3px] border border-[#253149] bg-[#08090c]/92 px-2.5 py-1.5 text-left text-[10px] font-medium text-[#c9d5e8] shadow-[0_14px_40px_rgba(0,0,0,0.22)] transition hover:border-[#334155] hover:bg-[#111827] hover:text-white"
          data-hz-topology-g6-edge-density-affordance-owner="hertzbeat-ui-g6-edge-density-affordance"
          data-hz-topology-g6-edge-density-affordance-visibility="visible"
          data-hz-topology-g6-edge-density-affordance-action="scroll-edge-table"
          data-hz-topology-g6-edge-density-affordance-target={edgeDensityDrilldownTargetId}
          data-hz-topology-g6-edge-density-affordance-url-policy="preserve-current-url"
          data-hz-topology-g6-edge-density-affordance-live-owner="hertzbeat-ui-g6-edge-density-affordance"
          data-hz-topology-g6-edge-density-affordance-invariants="table-scroll no-url-change no-remount no-refit viewport-preserved render-key-stable"
          data-hz-topology-g6-edge-density-affordance-hidden-edge-count={edgeDensityAffordanceTotalHiddenEdgeCount}
          data-hz-topology-g6-edge-density-affordance-window-edge-count={edgeDensityWindow.totalEdgeCount}
          data-hz-topology-g6-edge-density-affordance-total-edge-count={edgeDensityAffordanceTotalEdgeCount}
          data-hz-topology-g6-edge-density-affordance-total-hidden-edge-count={edgeDensityAffordanceTotalHiddenEdgeCount}
          data-hz-topology-g6-edge-density-affordance-rendered-edge-count={edgeDensityWindow.renderedEdgeCount}
          data-hz-topology-g6-edge-density-affordance-table-companion={renderWindow.tableCompanion}
          data-hz-topology-g6-edge-density-affordance-explanation-policy="render-window-not-missing-edges"
          data-hz-topology-g6-edge-density-affordance-detail-label={edgeDensityAffordanceDetailLabel}
          onClick={handleEdgeDensityDrilldown}
        >
          <span className="grid min-w-0 gap-0.5">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">{edgeDensityDrilldownLabel}</span>
              <span className="shrink-0 font-mono text-[#718096]">
                {edgeDensityWindow.renderedEdgeCount}/{edgeDensityAffordanceTotalEdgeCount}
              </span>
            </span>
            <span className="truncate text-[9px] font-normal text-[#7f8da3]">{edgeDensityAffordanceDetailLabel}</span>
          </span>
        </button>
      ) : null}
      {semanticClusterVisibility === 'visible' ? (
        <section
          className="pointer-events-none absolute left-3 top-12 z-10 grid max-w-[min(420px,calc(100%-1.5rem))] gap-1 rounded-[3px] bg-[#08090c]/82 px-2.5 py-2 text-[10px] text-[#9fb2ca] shadow-[0_14px_40px_rgba(0,0,0,0.16)]"
          data-hz-topology-g6-semantic-cluster-surface="canvas-hub-summary"
          data-hz-topology-g6-semantic-cluster-surface-owner="hertzbeat-ui-g6-semantic-cluster"
        >
          <div className="font-mono text-[#718096]">hub clusters</div>
          <div className="flex flex-wrap gap-1">
            {semanticClusterSummary.items.map(item => (
              <span
                key={item.id}
                className="grid min-h-6 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 rounded-[3px] bg-[#0b111d]/86 px-2 py-1"
                data-hz-topology-g6-semantic-cluster-item={item.nodeId}
                data-hz-topology-g6-semantic-cluster-item-rank={item.rank}
                data-hz-topology-g6-semantic-cluster-item-role={item.role}
                data-hz-topology-g6-semantic-cluster-item-entity-type={item.entityType}
                data-hz-topology-g6-semantic-cluster-item-incoming-edge-count={item.incomingEdgeCount}
                data-hz-topology-g6-semantic-cluster-item-outgoing-edge-count={item.outgoingEdgeCount}
                data-hz-topology-g6-semantic-cluster-item-total-edge-count={item.totalEdgeCount}
                data-hz-topology-g6-semantic-cluster-item-leaf-node-count={item.leafNodeCount}
              >
                <span className="max-w-[150px] truncate text-[#c9d5e8]">{item.label}</span>
                <span className="font-mono text-[#718096]">{item.totalEdgeCount}</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}
      {shouldFastPaintNodeOnlyGraph ? (
        <div
          className={[
            'pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-75',
            nodeOnlyPrepaintVisibility === 'visible-until-g6-ready' ? 'opacity-100' : 'opacity-0'
          ].join(' ')}
          data-hz-topology-g6-node-only-prepaint-layer="source-backed-node-overlay"
          data-hz-topology-g6-node-only-prepaint-visibility={nodeOnlyPrepaintVisibility}
          data-hz-topology-g6-node-only-prepaint-node-count={renderWindow.graph.nodes.length}
        >
          <div className="grid max-w-[560px] grid-cols-2 gap-x-16 gap-y-10">
            {renderWindow.graph.nodes.map(node => {
              const icon = getHzTopologyG6NodeIcon(node.entityType);
              return (
                <div
                  key={node.id}
                  className="grid min-w-[120px] place-items-center gap-2 text-center"
                  data-hz-topology-g6-node-only-prepaint-node={node.id}
                  data-hz-topology-g6-node-only-prepaint-node-label={node.label}
                  data-hz-topology-g6-node-only-prepaint-node-icon-source={`${icon.iconLibrary}:${icon.iconSource}`}
                  data-hz-topology-g6-node-only-prepaint-node-icon-name={icon.iconName}
                  data-hz-topology-g6-node-only-prepaint-node-icon-no-handdrawn="true"
                >
                  <span
                    className="grid h-14 w-14 place-items-center rounded-full border border-[#8b5e09]/80 bg-[#3a2507]/90 shadow-[0_0_0_2px_rgba(245,158,11,0.18)]"
                    aria-hidden="true"
                  >
                    <span
                      className="h-5 w-5 bg-contain bg-center bg-no-repeat opacity-90"
                      style={{ backgroundImage: `url("${icon.iconSrc}")` }}
                    />
                  </span>
                  <span className="max-w-[160px] truncate text-[13px] font-semibold text-[#cbd5e1]">{node.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(148,163,184,0.035),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.018),transparent_34%)]"
        data-hz-topology-g6-theme-overlay="neutral-graphite"
      />
      {legendSlot ? (
        <div
          className="absolute bottom-3 left-3 z-10 max-w-[min(420px,calc(100%-1.5rem))] rounded-[3px] bg-[#07101c]/86 p-2 text-[10px] text-[#aebbd0] shadow-[0_14px_40px_rgba(0,0,0,0.18)]"
          data-hz-topology-g6-legend-dock="in-canvas"
          data-hz-topology-g6-legend-dock-container="true"
          data-hz-topology-g6-legend-dock-selector="container-only"
          data-hz-topology-g6-legend-dock-owner="hertzbeat-ui-g6-legend-dock"
          data-hz-topology-g6-legend-dock-placement="canvas-bottom-left"
          data-hz-topology-g6-legend-dock-occlusion="inside-canvas-low-interruption"
          data-hz-topology-g6-legend-dock-border="none"
        >
          {legendSlot}
        </div>
      ) : null}
      {hasViewportTarget ? (
        <div
          className={
            nonOccludingOverlay
              ? 'sr-only'
              : 'pointer-events-none absolute bottom-3 right-3 w-[172px] rounded-[3px] border border-[#253149] bg-[#07101c]/88 p-2 text-[10px] text-[#aebbd0] shadow-[0_14px_40px_rgba(0,0,0,0.22)]'
          }
          data-hz-topology-g6-minimap="viewport-overview"
          data-hz-topology-g6-minimap-owner="hertzbeat-ui-g6-minimap"
          data-hz-topology-g6-minimap-visibility={minimapVisibility}
          data-hz-topology-g6-minimap-occlusion={minimapOcclusion}
          data-hz-topology-g6-minimap-node-count={nodeCount}
          data-hz-topology-g6-minimap-edge-count={edgeCount}
          data-hz-topology-g6-minimap-scale-tier={scaleProfile.scaleTier}
          data-hz-topology-g6-minimap-layout-hint={scaleProfile.layoutHint}
          data-hz-topology-g6-minimap-viewport-source={viewportTelemetry.source}
          data-hz-topology-g6-minimap-viewport-zoom={minimapZoom}
          data-hz-topology-g6-minimap-viewport-position={minimapPosition}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate uppercase tracking-[0.08em] text-[#718096]">viewport</span>
            <span className="font-mono text-[#d6e2f2]">{scaleProfile.scaleTier}</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <span className="rounded-[2px] bg-[#0f1b2d] px-1.5 py-1 font-mono text-[#dbeafe]">{nodeCount}n</span>
            <span className="rounded-[2px] bg-[#0f1b2d] px-1.5 py-1 font-mono text-[#dbeafe]">{edgeCount}e</span>
            <span className="rounded-[2px] bg-[#101827] px-1.5 py-1 font-mono text-[#9fb2ca]">z {minimapZoom}</span>
            <span className="truncate rounded-[2px] bg-[#101827] px-1.5 py-1 font-mono text-[#9fb2ca]">{minimapPosition}</span>
          </div>
        </div>
      ) : null}
      {hasViewportTarget ? (
        <div
          className={
            nonOccludingOverlay
              ? 'sr-only'
              : 'pointer-events-none absolute left-3 top-3 rounded-[3px] border border-[#253149] bg-[#07101c]/90 px-2 py-1 text-[11px] font-medium text-[#b8c7dd]'
          }
          data-hz-topology-g6-summary-owner="hertzbeat-ui-g6-summary"
          data-hz-topology-g6-summary-visibility={summaryVisibility}
          data-hz-topology-g6-summary-count-policy={summaryCountPolicy}
          data-hz-topology-g6-summary-rendered-node-count={renderWindow.renderedNodeCount}
          data-hz-topology-g6-summary-total-node-count={nodeCount}
          data-hz-topology-g6-summary-rendered-edge-count={edgeDensityWindow.renderedEdgeCount}
          data-hz-topology-g6-summary-total-edge-count={edgeCount}
        >
          {canvasSummary}
        </div>
      ) : null}
      {shouldFastPaintNodeOnlyGraph ? (
        <div
          className="pointer-events-none absolute left-3 top-12 rounded-[3px] bg-[#07101c]/88 px-2 py-1 text-[10px] font-medium text-[#9fb2ca] shadow-[0_14px_40px_rgba(0,0,0,0.18)]"
          data-hz-topology-g6-node-only-explanation-owner="hertzbeat-ui-g6-node-only-explanation"
          data-hz-topology-g6-node-only-explanation-reason="current-filter-has-nodes-no-edges"
        >
          {nodeOnlyExplanationLabel}
        </div>
      ) : null}
      {hasViewportTarget && groupSummary.active ? (
        <div
          className={
            nonOccludingOverlay
              ? 'sr-only'
              : 'absolute left-3 top-12 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1 rounded-[3px] border border-[#253149] bg-[#07101c]/88 p-1 text-[10px] text-[#aebbd0] shadow-[0_14px_40px_rgba(0,0,0,0.2)]'
          }
          data-hz-topology-g6-group-surface-owner="hertzbeat-ui-g6-group-surface"
          data-hz-topology-g6-group-surface-visibility={groupSurfaceVisibility}
        >
          {groupSummary.items.slice(0, 4).map(item => {
            const groupItemHref = groupItemHrefs[item.id];
            const groupItemClassName = [
                'grid min-h-6 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 rounded-[3px] border px-2 py-1',
                item.active ? 'border-[#3b82f6]/55 bg-[#0b2745]/82 text-[#dbeafe]' : 'border-[#1d2635] bg-[#0b111d]/74',
                item.worstTone === 'danger'
                  ? 'shadow-[inset_2px_0_0_#ef4444]'
                  : item.worstTone === 'warning'
                    ? 'shadow-[inset_2px_0_0_#f59e0b]'
                    : item.worstTone === 'success'
                    ? 'shadow-[inset_2px_0_0_#22c55e]'
                    : 'shadow-[inset_2px_0_0_#64748b]'
              ].join(' ');
            const groupItemContent = (
              <>
              <span className="max-w-[150px] truncate font-mono text-[#d6e2f2]">{item.label}</span>
              <span className="font-mono text-[#718096]">
                {item.nodeCount}/{item.edgeCount}
              </span>
              </>
            );

            return groupItemHref ? (
              <a
                key={item.id}
                href={groupItemHref}
                className={groupItemClassName}
                data-hz-topology-g6-group-item={item.id}
                data-hz-topology-g6-group-item-action-owner="hertzbeat-ui-g6-group-item-action"
                data-hz-topology-g6-group-item-action="filter-group"
                data-hz-topology-g6-group-item-href={groupItemHref}
                data-hz-topology-g6-group-item-node-count={item.nodeCount}
                data-hz-topology-g6-group-item-edge-count={item.edgeCount}
                data-hz-topology-g6-group-item-collapsed-node-count={item.collapsedNodeCount}
                data-hz-topology-g6-group-item-worst-tone={item.worstTone}
                data-hz-topology-g6-group-item-active={item.active ? 'true' : 'false'}
              >
                {groupItemContent}
              </a>
            ) : (
              <span
                key={item.id}
                className={groupItemClassName}
                data-hz-topology-g6-group-item={item.id}
                data-hz-topology-g6-group-item-href="none"
                data-hz-topology-g6-group-item-node-count={item.nodeCount}
                data-hz-topology-g6-group-item-edge-count={item.edgeCount}
                data-hz-topology-g6-group-item-collapsed-node-count={item.collapsedNodeCount}
                data-hz-topology-g6-group-item-worst-tone={item.worstTone}
                data-hz-topology-g6-group-item-active={item.active ? 'true' : 'false'}
              >
                {groupItemContent}
              </span>
            );
          })}
          {groupSummary.itemCount > 4 ? (
            <span
              className="rounded-[3px] border border-[#1d2635] bg-[#0b111d]/74 px-2 py-1 font-mono text-[#718096]"
              data-hz-topology-g6-group-overflow-count={groupSummary.itemCount - 4}
            >
              +{groupSummary.itemCount - 4}
            </span>
          ) : null}
        </div>
      ) : null}
      {hasViewportTarget && filterControls.length > 0 ? (
        <div
          className={
            nonOccludingOverlay
              ? 'sr-only'
              : 'absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1 rounded-[3px] border border-[#253149] bg-[#07101c]/92 p-1 shadow-[0_14px_40px_rgba(0,0,0,0.24)]'
          }
          data-hz-topology-g6-filter-control-surface-owner="hertzbeat-ui-g6-filter-control-surface"
          data-hz-topology-g6-filter-control-surface-visibility={filterControlSurfaceVisibility}
        >
          {filterControls.map(control => {
            const { id, kind, label, value, active, disabled, className: controlClassName, href, ...controlProps } = control;
            return (
              <a
                key={id}
                {...controlProps}
                href={disabled ? undefined : href}
                aria-disabled={disabled ? 'true' : undefined}
                className={[
                  'grid min-h-7 max-w-[190px] grid-cols-[auto_minmax(0,1fr)] items-center gap-x-1 rounded-[3px] border px-2 py-1 text-left text-[10px] leading-tight transition',
                  active
                    ? 'border-[#3b82f6]/50 bg-[#0b2745]/85 text-[#dbeafe]'
                    : 'border-[#1d2635] bg-[#0b111d]/78 text-[#9aa8ba] hover:border-[#334155] hover:bg-[#111827] hover:text-white',
                  disabled ? 'pointer-events-none opacity-55' : '',
                  controlClassName
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-hz-topology-g6-filter-control={id}
                data-hz-topology-g6-filter-control-kind={kind}
                data-hz-topology-g6-filter-control-value={value ?? 'none'}
                data-hz-topology-g6-filter-control-active-state={active ? 'true' : 'false'}
                data-hz-topology-g6-filter-control-disabled={disabled ? 'true' : 'false'}
              >
                <span className="truncate uppercase text-[#718096]" data-hz-topology-g6-filter-control-label-owner="hertzbeat-ui-g6-filter-control-label">
                  {label}
                </span>
                <span className="truncate font-mono text-[#d6e2f2]" data-hz-topology-g6-filter-control-value-owner="hertzbeat-ui-g6-filter-control-value">
                  {value ?? 'none'}
                </span>
              </a>
            );
          })}
        </div>
      ) : null}
      {hasViewportTarget ? (
        <div
          className="absolute right-3 top-3 flex items-center gap-1 rounded-[3px] border border-[#253149] bg-[#07101c]/92 p-1 shadow-[0_14px_40px_rgba(0,0,0,0.24)]"
          data-hz-topology-g6-toolbar-owner="hertzbeat-ui-g6-toolbar"
          data-hz-topology-g6-toolbar-visibility={viewportToolbarVisibility}
          data-hz-topology-g6-toolbar-action-count="4"
          data-hz-topology-g6-toolbar-visible-actions="zoom-out zoom-in fit-view reset-view"
          data-hz-topology-g6-toolbar-focus-actions-visibility="assistive"
        >
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-[3px] text-[#c9d5e8] transition hover:bg-[#162136] hover:text-white"
          title={zoomOutLabel}
          aria-label={zoomOutLabel}
          data-hz-topology-g6-action="zoom-out"
          data-hz-topology-g6-action-owner="hertzbeat-ui-g6-action"
          data-hz-topology-g6-action-state="ready"
          data-hz-topology-g6-action-behavior="zoom-scale"
          data-hz-topology-g6-action-target="viewport"
          onClick={() => zoomBy(0.82)}
        >
          <ZoomOut size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-[3px] text-[#c9d5e8] transition hover:bg-[#162136] hover:text-white"
          title={zoomInLabel}
          aria-label={zoomInLabel}
          data-hz-topology-g6-action="zoom-in"
          data-hz-topology-g6-action-owner="hertzbeat-ui-g6-action"
          data-hz-topology-g6-action-state="ready"
          data-hz-topology-g6-action-behavior="zoom-scale"
          data-hz-topology-g6-action-target="viewport"
          onClick={() => zoomBy(1.18)}
        >
          <ZoomIn size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-[3px] text-[#c9d5e8] transition hover:bg-[#162136] hover:text-white"
          title={fitViewLabel}
          aria-label={fitViewLabel}
          data-hz-topology-g6-action="fit-view"
          data-hz-topology-g6-action-owner="hertzbeat-ui-g6-action"
          data-hz-topology-g6-action-state="ready"
          data-hz-topology-g6-action-behavior="overflow-fit-and-center"
          data-hz-topology-g6-action-target="viewport"
          onClick={fitView}
        >
          <Maximize2 size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-[3px] text-[#c9d5e8] transition hover:bg-[#162136] hover:text-white"
          title={resetViewLabel}
          aria-label={resetViewLabel}
          data-hz-topology-g6-action="reset-view"
          data-hz-topology-g6-action-owner="hertzbeat-ui-g6-action"
          data-hz-topology-g6-action-state="ready"
          data-hz-topology-g6-action-behavior="zoom-one-overflow-fit-center"
          data-hz-topology-g6-action-target="viewport"
          onClick={resetView}
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>
        </div>
      ) : null}
      <div
        className="sr-only"
        data-hz-topology-g6-focus-toolbar-owner="hertzbeat-ui-g6-focus-toolbar"
        data-hz-topology-g6-toolbar-focus-actions-visibility="assistive"
        data-hz-topology-g6-toolbar-assistive-actions="focus-selected-node focus-search-result"
      >
        <button
          type="button"
          className="sr-only"
          title={selectedFocusLabel}
          aria-label={selectedFocusLabel}
          data-hz-topology-g6-action="focus-selected-node"
          data-hz-topology-g6-action-owner="hertzbeat-ui-g6-action"
          data-hz-topology-g6-action-state={selectedFocusNodeId ? 'ready' : 'disabled'}
          data-hz-topology-g6-action-behavior="focus-selected-node"
          data-hz-topology-g6-action-target={selectedFocusNodeId ?? 'none'}
          disabled={!selectedFocusNodeId}
          onClick={focusSelectedNode}
        >
          <Crosshair size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="sr-only"
          title={searchFocusLabel}
          aria-label={searchFocusLabel}
          data-hz-topology-g6-action="focus-search-result"
          data-hz-topology-g6-action-owner="hertzbeat-ui-g6-action"
          data-hz-topology-g6-action-state={searchFocus.firstMatchedNodeId ? 'ready' : 'disabled'}
          data-hz-topology-g6-action-behavior="focus-first-match"
          data-hz-topology-g6-action-target={searchFocus.firstMatchedNodeId ?? 'none'}
          disabled={!searchFocus.firstMatchedNodeId}
          onClick={focusSearchResult}
        >
          <Search size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="sr-only" data-hz-topology-g6-metadata-owner="hertzbeat-ui-g6-metadata">
        {selectedGraph.nodes.map(node => (
          <button
            key={node.id}
            type="button"
            onClick={event => handleMetadataNodeClick(event, node.id)}
            data-hz-ui="topology-node"
            data-hz-topology-primitive="node"
            data-hz-topology-node-owner="hertzbeat-ui-node"
            data-hz-topology-g6-metadata-role="selection-button"
            data-hz-topology-g6-metadata-click-behavior="in-page-select"
            data-hz-topology-g6-metadata-click-target="node"
            data-hz-topology-g6-node-select-owner="hertzbeat-ui-g6-node-select"
            data-hz-topology-g6-node-focus-owner="hertzbeat-ui-g6-node-focus"
            data-hz-topology-g6-selection-target="node"
            data-hz-topology-g6-node-neighbor-owner="hertzbeat-ui-g6-node-neighbor"
            data-hz-topology-g6-neighbor-role={neighborFocus.nodeRoles[node.id] ?? 'normal'}
            data-hz-topology-g6-search-match={searchMatchedNodeIds.has(node.id) ? 'true' : 'false'}
            data-hz-topology-g6-filter-node-source-match={
              activeFilterScope.sourceKind === 'all' || node.source === activeFilterScope.sourceKind ? 'true' : 'false'
            }
            data-hz-topology-g6-node-group={groupValueForNode(node, activeFilterScope.groupBy, activeFilterScope.environment)}
            data-hz-topology-node-focus={node.focus ?? 'normal'}
            data-hz-topology-node-label-owner="hertzbeat-ui-node-label"
            data-hz-topology-node-health-owner="hertzbeat-ui-node-health"
            data-hz-topology-node-health-label-owner="hertzbeat-ui-node-health-label"
            data-hz-topology-node-red-owner="hertzbeat-ui-node-red"
            data-hz-topology-node-badge-list-owner="hertzbeat-ui-node-badge-list"
            data-topology-node="service-node"
            data-topology-node-owner="hertzbeat-ui-node"
            data-topology-node-metadata-owner="hertzbeat-ui-g6-node-metadata"
            data-topology-node-id={node.id}
            data-topology-node-focus={node.focus ?? 'normal'}
            data-topology-node-active={node.focus === 'active' ? 'true' : 'false'}
            data-topology-node-entity-type={node.entityType}
            data-hz-topology-node-icon-library={getHzTopologyG6NodeIcon(node.entityType).iconLibrary}
            data-hz-topology-node-icon-name={getHzTopologyG6NodeIcon(node.entityType).iconName}
            data-hz-topology-node-icon-kind={getHzTopologyG6NodeIcon(node.entityType).kind}
            data-hz-topology-node-icon-source={getHzTopologyG6NodeIcon(node.entityType).iconSource}
            data-hz-topology-node-icon-no-handdrawn="true"
            data-topology-node-icon-library={getHzTopologyG6NodeIcon(node.entityType).iconLibrary}
            data-topology-node-icon-name={getHzTopologyG6NodeIcon(node.entityType).iconName}
            data-topology-node-icon-kind={getHzTopologyG6NodeIcon(node.entityType).kind}
            data-topology-node-icon-source={getHzTopologyG6NodeIcon(node.entityType).iconSource}
            data-topology-node-icon-no-handdrawn="true"
            data-topology-node-source={node.source}
            data-topology-node-health={node.health}
            data-topology-node-evidence-badges={(node.evidenceBadges ?? []).join(' ') || 'none'}
            data-topology-node-request-rate={formatMetric(node.redMetrics?.requestRatePerSecond)}
            data-topology-node-error-rate={formatMetric(node.redMetrics?.errorRate)}
            data-topology-node-latency-p95-ms={formatMetric(node.redMetrics?.latencyP95Ms)}
            data-topology-node-health-affordance="lightweight-service-health"
            data-topology-node-select-mode="in-page-drawer"
            data-topology-node-select-url-policy="preserve-current-url"
            data-topology-node-focus-href={node.focusHref ?? node.href}
            data-topology-node-entity-href={node.entityHref ?? node.href}
          >
            {node.label}
            <span data-topology-node-health-copy="lightweight-service-health">{node.health}</span>
            <span data-hz-topology-node-red-metric-owner="hertzbeat-ui-node-red-metric">
              {formatMetric(node.redMetrics?.requestRatePerSecond)}
            </span>
            <span data-hz-topology-node-badge-owner="hertzbeat-ui-node-badge">{(node.evidenceBadges ?? []).join(' ')}</span>
          </button>
        ))}
        {selectedGraph.edges.map(edge => (
          <button
            key={edge.id}
            type="button"
            onClick={event => handleMetadataEdgeClick(event, edge.id)}
            data-hz-ui="topology-edge"
            data-hz-topology-primitive="edge"
            data-hz-topology-edge-owner="hertzbeat-ui-edge"
            data-hz-topology-g6-metadata-role="selection-button"
            data-hz-topology-g6-metadata-click-behavior="in-page-select"
            data-hz-topology-g6-metadata-click-target="edge"
            data-hz-topology-g6-edge-select-owner="hertzbeat-ui-g6-edge-select"
            data-hz-topology-g6-selection-target="edge"
            data-hz-topology-g6-edge-neighbor-owner="hertzbeat-ui-g6-edge-neighbor"
            data-hz-topology-g6-neighbor-role={neighborFocus.edgeRoles[edge.id] ?? 'normal'}
            data-hz-topology-g6-neighbor-selected={neighborFocus.selectedEdgeIds.includes(edge.id) ? 'true' : 'false'}
            data-hz-topology-g6-filter-edge-source-match={
              activeFilterScope.sourceKind === 'all' || edge.source === activeFilterScope.sourceKind ? 'true' : 'false'
            }
            data-hz-topology-g6-edge-group={groupValueForEdge(edge, activeFilterScope.groupBy, activeFilterScope.environment)}
            data-hz-topology-edge-variant="line"
            data-hz-topology-edge-line-owner="hertzbeat-ui-edge-line"
            data-hz-topology-edge-path-owner="hertzbeat-ui-edge-path"
            data-hz-topology-edge-arrow-owner="hertzbeat-ui-edge-arrow"
            data-hz-topology-edge-red-owner="hertzbeat-ui-edge-red"
            data-topology-edge="service-edge"
            data-topology-edge-owner="hertzbeat-ui-edge"
            data-topology-edge-metadata-owner="hertzbeat-ui-g6-edge-metadata"
            data-topology-edge-id={edge.id}
            data-topology-edge-source={edge.source}
            data-topology-edge-relationship-type={edge.relationshipType}
            data-topology-edge-evidence-badges={(edge.evidenceBadges ?? []).join(' ') || 'none'}
            data-topology-edge-request-rate={formatMetric(edge.redMetrics?.requestRatePerSecond)}
            data-topology-edge-error-rate={formatMetric(edge.redMetrics?.errorRate)}
            data-topology-edge-latency-p95-ms={formatMetric(edge.redMetrics?.latencyP95Ms)}
            data-topology-edge-focus={edge.focus ?? 'normal'}
            data-topology-edge-selected={edge.selected ? 'true' : 'false'}
            data-topology-edge-drilldown={edge.id}
          >
            {edgeLabel(edge)}
            <span data-hz-topology-edge-variant="drilldown" data-hz-topology-edge-drilldown-owner="hertzbeat-ui-edge-drilldown" />
            <span
              data-hz-topology-edge-hit-target="wide-pointer-band"
              data-hz-topology-edge-hit-target-owner="hertzbeat-ui-edge-hit-target"
            />
            <span data-hz-topology-edge-badge-owner="hertzbeat-ui-edge-badge">{(edge.evidenceBadges ?? []).join(' ')}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
