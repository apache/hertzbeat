/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { ExactTimeWindow } from '@/shared/query-context';

import {
  entityRelationTopologySource,
  parseTopologyQuery,
  parseTopologySelection,
  withTopologyPageDefaults
} from './topology-model';

type RouteLocation = { pathname: string; search: string };

type TopologyInvestigationTarget = {
  topology: {
    rootEntityId: number;
    nodeId?: string;
    edgeId?: string;
    depth: 1 | 2;
    environment?: string;
    sourceKind: string;
    start?: number;
    end?: number;
    relationType?: string;
    hideInternal: boolean;
    pageIndex: number;
    pageSize: number;
  };
};

const maximumWindowMs = 7 * 24 * 60 * 60_000;
const sourceKinds = new Set([
  'all',
  'alert-impact',
  entityRelationTopologySource,
  'monitor-bind',
  'monitor-ownership',
  'otlp-trace-call',
  'k8s-workload',
  'cmdb-manual-label',
  'database-middleware-connection',
  'template-dependency'
]);

export function materializeTopologyInvestigation(
  location: RouteLocation,
  effectiveWindow?: ExactTimeWindow
): TopologyInvestigationTarget | undefined {
  if (location.pathname !== '/topology') return undefined;
  try {
    return resolveTopologyInvestigation(new URLSearchParams(location.search), effectiveWindow);
  } catch {
    return undefined;
  }
}

function resolveTopologyInvestigation(params: URLSearchParams, effectiveWindow?: ExactTimeWindow) {
  const query = withTopologyPageDefaults(parseTopologyQuery(params));
  const selection = parseTopologySelection(params);
  const sourceKind = (query.sourceKind ?? entityRelationTopologySource).toLowerCase();
  const window = query.window ?? effectiveWindow;
  if (query.focusEntityId === undefined || !agentQuerySupported(query, sourceKind, window)) return undefined;
  return { topology: buildTopologyRef(query, query.focusEntityId, selection, sourceKind, window) };
}

function buildTopologyRef(
  query: ReturnType<typeof parseTopologyQuery>,
  rootEntityId: number,
  selection: ReturnType<typeof parseTopologySelection>,
  sourceKind: string,
  window: ExactTimeWindow | undefined
) {
  const topology: TopologyInvestigationTarget['topology'] = {
    rootEntityId,
    depth: query.depth,
    sourceKind,
    hideInternal: query.hideInternal ?? false,
    pageIndex: query.pageIndex ?? 0,
    pageSize: query.pageSize ?? 25
  };
  if (selection.kind === 'node') topology.nodeId = selection.nodeId;
  if (selection.kind === 'edge') topology.edgeId = selection.edgeId;
  if (query.environment) topology.environment = query.environment;
  if (window) {
    topology.start = window.from;
    topology.end = window.to;
  }
  if (query.relationType) topology.relationType = query.relationType;
  return topology;
}

function agentQuerySupported(
  query: ReturnType<typeof parseTopologyQuery>,
  sourceKind: string,
  window: ExactTimeWindow | undefined
) {
  if (!sourceKinds.has(sourceKind)) return false;
  if (!scopeText(query.environment, 128)) return false;
  if (!scopeText(query.relationType, 128)) return false;
  if (!pageWithinAgentBounds(query.pageIndex, query.pageSize)) return false;
  return windowWithinAgentBounds(window);
}

function pageWithinAgentBounds(pageIndex: number | undefined, pageSize: number | undefined) {
  return pageIndex !== undefined && pageIndex <= 10_000 && pageSize !== undefined && pageSize <= 100;
}

function windowWithinAgentBounds(window: ExactTimeWindow | undefined) {
  return (
    window === undefined ||
    (Number.isSafeInteger(window.from) &&
      Number.isSafeInteger(window.to) &&
      window.from > 0 &&
      window.from < window.to &&
      window.to - window.from <= maximumWindowMs)
  );
}

function scopeText(value: string | undefined, maximum: number) {
  return value === undefined || (value.length <= maximum && !hasControlCharacter(value));
}

function hasControlCharacter(value: string) {
  return [...value].some(character => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127;
  });
}
