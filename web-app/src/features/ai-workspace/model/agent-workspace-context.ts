/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { AgentSignalRef, AgentTargetRef, AgentTopologyRef } from './agent-workspace-contract';

type RouteLocation = { pathname: string; search: string };

const boundedTextLength = 2_048;

export function deriveAgentTargetFromLocation(location: RouteLocation): AgentTargetRef | undefined {
  const monitorId = exactNumericPath(location.pathname, /^\/monitors\/(\d+)$/);
  if (monitorId !== undefined) return { monitorId };
  const entityId = exactNumericPath(location.pathname, /^\/entities\/(\d+)$/);
  if (entityId !== undefined) return { entityId };
  const params = new URLSearchParams(location.search);
  if (location.pathname === '/ai') return explicitTarget(params);
  if (location.pathname === '/explore') return signalTarget(params);
  if (location.pathname === '/topology') return topologyTarget(params);
  if (location.pathname === '/alerts') {
    const alertId = positiveInteger(params.get('alertId'));
    return alertId === undefined ? undefined : { alertId };
  }
  return undefined;
}

export function buildAgentWorkspacePath(target?: AgentTargetRef) {
  if (!target) return '/ai';
  const params = new URLSearchParams();
  setInteger(params, 'monitorId', target.monitorId);
  setInteger(params, 'alertId', target.alertId);
  setInteger(params, 'entityId', target.entityId);
  setText(params, 'collector', target.collector);
  if (target.signal) {
    params.set('signal', target.signal.type);
    setText(params, 'query', target.signal.query);
    setText(params, 'timeRange', target.signal.timeRange);
    setInteger(params, 'start', target.signal.start);
    setInteger(params, 'end', target.signal.end);
  }
  if (target.topology) {
    setInteger(params, 'focusEntityId', target.topology.rootEntityId);
    setText(params, 'nodeId', target.topology.nodeId);
    setText(params, 'edgeId', target.topology.edgeId);
    setInteger(params, 'depth', target.topology.depth);
  }
  const search = params.toString();
  return search ? `/ai?${search}` : '/ai';
}

function explicitTarget(params: URLSearchParams): AgentTargetRef | undefined {
  const target: AgentTargetRef = {};
  const monitorId = positiveInteger(params.get('monitorId'));
  const alertId = positiveInteger(params.get('alertId'));
  const entityId = positiveInteger(params.get('entityId'));
  const collector = boundedText(params.get('collector'), 128);
  if (monitorId !== undefined) target.monitorId = monitorId;
  if (alertId !== undefined) target.alertId = alertId;
  if (entityId !== undefined) target.entityId = entityId;
  if (collector !== undefined) target.collector = collector;
  if (params.has('signal')) Object.assign(target, signalTarget(params));
  if (params.has('focusEntityId') || params.has('nodeId') || params.has('edgeId') || params.has('depth')) {
    Object.assign(target, topologyTarget(params));
  }
  return Object.keys(target).length === 0 ? undefined : target;
}

function signalTarget(params: URLSearchParams): AgentTargetRef | undefined {
  const type = params.get('signal');
  if (type !== 'metrics' && type !== 'logs' && type !== 'traces') return undefined;
  const signal: AgentSignalRef = { type };
  const query = boundedText(params.get('query'));
  const timeRange = boundedText(params.get('timeRange'), 64);
  const start = nonNegativeInteger(params.get('start'));
  const end = nonNegativeInteger(params.get('end'));
  if ((start === undefined) !== (end === undefined) || (start !== undefined && end !== undefined && start > end)) {
    return undefined;
  }
  if (query !== undefined) signal.query = query;
  if (timeRange !== undefined) signal.timeRange = timeRange;
  if (start !== undefined && end !== undefined) {
    signal.start = start;
    signal.end = end;
  }
  return { signal };
}

function topologyTarget(params: URLSearchParams): AgentTargetRef | undefined {
  const topology: AgentTopologyRef = {};
  const rootEntityId = positiveInteger(params.get('focusEntityId'));
  const nodeId = boundedText(params.get('nodeId'), 128);
  const edgeId = boundedText(params.get('edgeId'), 128);
  const depth = boundedInteger(params.get('depth'), 1, 10);
  if (nodeId !== undefined && edgeId !== undefined) return undefined;
  if (rootEntityId !== undefined) topology.rootEntityId = rootEntityId;
  if (nodeId !== undefined) topology.nodeId = nodeId;
  if (edgeId !== undefined) topology.edgeId = edgeId;
  if (depth !== undefined) topology.depth = depth;
  return Object.keys(topology).length === 0 ? undefined : { topology };
}

function exactNumericPath(pathname: string, pattern: RegExp) {
  return positiveInteger(pattern.exec(pathname)?.[1] ?? null);
}

function positiveInteger(value: string | null) {
  return boundedInteger(value, 1, Number.MAX_SAFE_INTEGER);
}

function nonNegativeInteger(value: string | null) {
  return boundedInteger(value, 0, Number.MAX_SAFE_INTEGER);
}

function boundedInteger(value: string | null, minimum: number, maximum: number) {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : undefined;
}

function boundedText(value: string | null, maximum = boundedTextLength) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= maximum ? trimmed : undefined;
}

function setText(params: URLSearchParams, key: string, value: string | undefined) {
  if (value !== undefined) params.set(key, value);
}

function setInteger(params: URLSearchParams, key: string, value: number | undefined) {
  if (value !== undefined && Number.isSafeInteger(value)) params.set(key, String(value));
}
