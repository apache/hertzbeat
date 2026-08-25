/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { AgentTopologyRef, AgentTopologySourceTarget } from './agent-workspace-contract';

export const topologyTargetQueryKeys = new Set([
  'source',
  'focusEntityId',
  'nodeId',
  'edgeId',
  'depth',
  'environment',
  'sourceKind',
  'start',
  'end',
  'relationType',
  'hideInternal',
  'pageIndex',
  'pageSize',
  'returnTo'
]);

const sourceKinds = new Set([
  'all',
  'alert-impact',
  'entity-relation',
  'monitor-bind',
  'monitor-ownership',
  'otlp-trace-call',
  'k8s-workload',
  'cmdb-manual-label',
  'database-middleware-connection',
  'template-dependency'
]);
const maximumWindowMs = 7 * 24 * 60 * 60_000;

export function appendTopologyTargetParams(params: URLSearchParams, target: AgentTopologySourceTarget) {
  const topology = target.topology;
  params.set('source', 'topology');
  setAgentInteger(params, 'focusEntityId', topology.rootEntityId);
  setAgentText(params, 'nodeId', topology.nodeId);
  setAgentText(params, 'edgeId', topology.edgeId);
  setAgentInteger(params, 'depth', topology.depth);
  setAgentText(params, 'environment', topology.environment);
  setAgentText(params, 'sourceKind', topology.sourceKind);
  setAgentInteger(params, 'start', topology.start);
  setAgentInteger(params, 'end', topology.end);
  setAgentText(params, 'relationType', topology.relationType);
  params.set('hideInternal', String(topology.hideInternal));
  setAgentInteger(params, 'pageIndex', topology.pageIndex);
  setAgentInteger(params, 'pageSize', topology.pageSize);
}

export function explicitTopologyTarget(params: URLSearchParams): AgentTopologySourceTarget | undefined {
  if (params.get('source') !== 'topology' || !hasOnlyTopologyKeys(params)) return undefined;
  const topology = readRequiredTopology(params);
  const optional = readOptionalTopology(params);
  if (!topology || !optionalTopologyValid(params, optional)) return undefined;
  if (optional.nodeId) topology.nodeId = optional.nodeId;
  if (optional.edgeId) topology.edgeId = optional.edgeId;
  if (optional.environment) topology.environment = optional.environment;
  if (optional.start !== undefined && optional.end !== undefined) {
    topology.start = optional.start;
    topology.end = optional.end;
  }
  if (optional.relationType) topology.relationType = optional.relationType;
  return { topology };
}

function readRequiredTopology(params: URLSearchParams): AgentTopologyRef | undefined {
  const rootEntityId = readAgentInteger(params, 'focusEntityId', 1, Number.MAX_SAFE_INTEGER);
  const depth = readAgentInteger(params, 'depth', 1, 2);
  const sourceKind = readAgentText(params, 'sourceKind', 64)?.toLowerCase();
  const hideInternal = readAgentBoolean(params, 'hideInternal');
  const pageIndex = readAgentInteger(params, 'pageIndex', 0, 10_000);
  const pageSize = readAgentInteger(params, 'pageSize', 1, 100);
  if (rootEntityId === undefined || depth === undefined || sourceKind === undefined) return undefined;
  if (hideInternal === undefined || pageIndex === undefined || pageSize === undefined) return undefined;
  if (!sourceKinds.has(sourceKind)) return undefined;
  return { rootEntityId, depth: depth as 1 | 2, sourceKind, hideInternal, pageIndex, pageSize };
}

function readOptionalTopology(params: URLSearchParams) {
  return {
    nodeId: readAgentText(params, 'nodeId', 512),
    edgeId: readAgentText(params, 'edgeId', 512),
    environment: readAgentText(params, 'environment', 128),
    relationType: readAgentText(params, 'relationType', 128),
    start: readAgentInteger(params, 'start', 1, Number.MAX_SAFE_INTEGER),
    end: readAgentInteger(params, 'end', 1, Number.MAX_SAFE_INTEGER)
  };
}

function optionalTopologyValid(params: URLSearchParams, values: ReturnType<typeof readOptionalTopology>) {
  if (values.nodeId !== undefined && values.edgeId !== undefined) return false;
  if (!topologyWindowValid(values.start, values.end)) return false;
  return [
    ['nodeId', values.nodeId],
    ['edgeId', values.edgeId],
    ['environment', values.environment],
    ['relationType', values.relationType],
    ['start', values.start],
    ['end', values.end]
  ].every(([key, value]) => params.has(String(key)) === (value !== undefined));
}

function topologyWindowValid(start: number | undefined, end: number | undefined) {
  if ((start === undefined) !== (end === undefined)) return false;
  return start === undefined || end === undefined || (start < end && end - start <= maximumWindowMs);
}

function hasOnlyTopologyKeys(params: URLSearchParams) {
  return [...params.keys()].every(key => topologyTargetQueryKeys.has(key) && params.getAll(key).length === 1);
}

function readAgentInteger(params: URLSearchParams, key: string, minimum: number, maximum: number) {
  const value = params.get(key);
  if (value === null || !/^\d+$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : undefined;
}

function readAgentBoolean(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function readAgentText(params: URLSearchParams, key: string, maximum: number) {
  const value = params.get(key);
  const normalized = value?.trim();
  if (!normalized || normalized !== value || normalized.length > maximum || hasControlCharacter(normalized)) {
    return undefined;
  }
  return normalized;
}

function setAgentInteger(params: URLSearchParams, key: string, value: number | undefined) {
  if (value !== undefined && Number.isSafeInteger(value)) params.set(key, String(value));
}

function setAgentText(params: URLSearchParams, key: string, value: string | undefined) {
  if (value !== undefined) params.set(key, value);
}

function hasControlCharacter(value: string) {
  return [...value].some(character => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127;
  });
}
