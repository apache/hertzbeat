/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { safeRedirectTarget } from '@/core/auth/navigation';

import type { AgentMonitorMetricSourceTarget, AgentSourceTarget } from './agent-workspace-contract';
import { appendLogTargetParams, explicitLogTarget, logTargetQueryKeys } from './agent-log-context';
import { appendTopologyTargetParams, explicitTopologyTarget, topologyTargetQueryKeys } from './agent-topology-context';
import { appendTraceTargetParams, explicitTraceTarget, traceTargetQueryKeys } from './agent-trace-context';

type RouteLocation = { pathname: string; search: string };

const boundedTextLength = 2_048;
const monitorHistoryWindows = new Set(['30m', '1h', '6h', '24h', '1W', '4W', '12W']);
const maximumExactWindowMs = 12 * 7 * 24 * 60 * 60_000;
const targetQueryKeys = new Set([
  'monitorId',
  'source',
  'version',
  'authority',
  'workspaceId',
  'alertType',
  'service',
  'alertId',
  'entityId',
  'collector',
  'signal',
  'query',
  'timeRange',
  'start',
  'end',
  'timezone',
  'focusEntityId',
  'nodeId',
  'edgeId',
  'depth',
  'environment',
  'sourceKind',
  'hideInternal',
  'pageIndex',
  'pageSize',
  'relationType'
]);
topologyTargetQueryKeys.forEach(key => {
  if (key !== 'returnTo') targetQueryKeys.add(key);
});
traceTargetQueryKeys.forEach(key => {
  if (key !== 'returnTo') targetQueryKeys.add(key);
});
logTargetQueryKeys.forEach(key => {
  if (key !== 'returnTo') targetQueryKeys.add(key);
});

export type AgentTargetContext =
  | { kind: 'none'; key: 'none' }
  | { kind: 'valid'; key: string; target: AgentSourceTarget }
  | { kind: 'invalid'; key: string };

export function parseAgentTargetContextFromLocation(location: RouteLocation): AgentTargetContext {
  if (location.pathname !== '/ai') return { kind: 'none', key: 'none' };
  const params = new URLSearchParams(location.search);
  const target = explicitTarget(params);
  if (target) return { kind: 'valid', key: `valid:${JSON.stringify(target)}`, target };
  return [...params.keys()].some(key => targetQueryKeys.has(key))
    ? { kind: 'invalid', key: `invalid:${location.pathname}?${params.toString()}` }
    : { kind: 'none', key: 'none' };
}

export function deriveAgentTargetFromLocation(location: RouteLocation): AgentSourceTarget | undefined {
  const context = parseAgentTargetContextFromLocation(location);
  return context.kind === 'valid' ? context.target : undefined;
}

export function canMaterializeAgentInvestigation(location: RouteLocation) {
  if (exactNumericPath(location.pathname, /^\/entities\/(\d+)$/) !== undefined) return true;
  const params = new URLSearchParams(location.search);
  return (
    exactNumericPath(location.pathname, /^\/monitors\/(\d+)$/) !== undefined &&
    exactMetricKey(params.get('metric')) !== undefined &&
    monitorHistoryDurationMs(params.get('history')) !== undefined
  );
}

export function materializeAgentInvestigation(
  location: RouteLocation,
  clock: () => number = Date.now,
  timezoneResolver: () => string | undefined = resolvedTimezone
): AgentSourceTarget | undefined {
  if (!canMaterializeAgentInvestigation(location)) return undefined;
  const entityId = exactNumericPath(location.pathname, /^\/entities\/(\d+)$/);
  if (entityId !== undefined) return { entityId };
  const capturedAt = clock();
  const params = new URLSearchParams(location.search);
  const monitorId = exactNumericPath(location.pathname, /^\/monitors\/(\d+)$/);
  const metric = exactMetricKey(params.get('metric'));
  const durationMs = monitorHistoryDurationMs(params.get('history'));
  const timezone = validTimezone(timezoneResolver());
  if (
    monitorId === undefined ||
    metric === undefined ||
    durationMs === undefined ||
    !Number.isSafeInteger(capturedAt) ||
    capturedAt <= durationMs ||
    timezone === undefined
  )
    return undefined;
  return {
    monitorId,
    signal: { type: 'metrics', query: metric, start: capturedAt - durationMs, end: capturedAt, timezone }
  };
}

function exactMetricKey(value: string | null) {
  const metric = boundedText(value);
  if (!metric) return undefined;
  return /^[^.\s]+\.[^.\s]+$/.test(metric) ? metric : undefined;
}

function monitorHistoryDurationMs(history: string | null | undefined) {
  if (!history || !monitorHistoryWindows.has(history)) return undefined;
  const unit = history.at(-1);
  const amount = Number(history.slice(0, -1));
  if (!Number.isSafeInteger(amount) || amount <= 0) return undefined;
  if (unit === 'm') return amount * 60_000;
  if (unit === 'h') return amount * 60 * 60_000;
  if (unit === 'W') return amount * 7 * 24 * 60 * 60_000;
  return undefined;
}

export function buildAgentWorkspacePath(target?: AgentSourceTarget, returnTo?: string) {
  if (!target) return '/ai';
  const params = new URLSearchParams();
  if ('topology' in target) {
    appendTopologyTargetParams(params, target);
  } else if ('trace' in target) {
    appendTraceTargetParams(params, target);
  } else if ('log' in target) {
    appendLogTargetParams(params, target);
  } else if ('alertId' in target) {
    params.set('source', 'singleAlert');
    setInteger(params, 'alertId', target.alertId);
  } else if ('entityId' in target) {
    params.set('source', 'entity');
    setInteger(params, 'entityId', target.entityId);
  } else {
    setInteger(params, 'monitorId', target.monitorId);
    params.set('signal', 'metrics');
    params.set('query', target.signal.query);
    setInteger(params, 'start', target.signal.start);
    setInteger(params, 'end', target.signal.end);
    params.set('timezone', target.signal.timezone);
  }
  const safeReturnTo = returnTo ? safeRedirectTarget(returnTo) : null;
  if (safeReturnTo) params.set('returnTo', safeReturnTo);
  const search = params.toString();
  return search ? `/ai?${search}` : '/ai';
}

function explicitTarget(params: URLSearchParams): AgentSourceTarget | undefined {
  if (params.get('source') === 'topology') {
    return explicitTopologyTarget(params);
  }
  if (params.get('source') === 'trace') {
    return explicitTraceTarget(params);
  }
  if (params.get('source') === 'log') {
    return explicitLogTarget(params);
  }
  if (params.get('source') === 'singleAlert') {
    return explicitSingleAlertTarget(params);
  }
  if (params.get('source') === 'entity') {
    return explicitEntityTarget(params);
  }
  return explicitMonitorMetricTarget(params);
}

function explicitSingleAlertTarget(params: URLSearchParams): AgentSourceTarget | undefined {
  const alertId = positiveInteger(params.get('alertId'));
  if (alertId === undefined) return undefined;
  if (!hasExactKeys(params, new Set(['source', 'alertId', 'returnTo']))) return undefined;
  return { alertId, alertType: 'single' };
}

function explicitEntityTarget(params: URLSearchParams): AgentSourceTarget | undefined {
  const entityId = positiveInteger(params.get('entityId'));
  if (entityId === undefined) return undefined;
  if (!hasExactKeys(params, new Set(['source', 'entityId', 'returnTo']))) return undefined;
  return { entityId };
}

function explicitMonitorMetricTarget(params: URLSearchParams): AgentMonitorMetricSourceTarget | undefined {
  const monitorId = positiveInteger(params.get('monitorId'));
  const query = exactMetricKey(params.get('query'));
  const start = positiveInteger(params.get('start'));
  const end = positiveInteger(params.get('end'));
  const timezone = validTimezone(params.get('timezone') ?? undefined);
  if (monitorId === undefined) return undefined;
  if (params.get('signal') !== 'metrics') return undefined;
  if (query === undefined) return undefined;
  if (start === undefined) return undefined;
  if (end === undefined) return undefined;
  if (start >= end) return undefined;
  if (end - start > maximumExactWindowMs) return undefined;
  if (timezone === undefined) return undefined;
  if (!hasExactKeys(params, new Set(['monitorId', 'signal', 'query', 'start', 'end', 'timezone', 'returnTo']))) {
    return undefined;
  }
  return { monitorId, signal: { type: 'metrics', query, start, end, timezone } };
}

function hasExactKeys(params: URLSearchParams, allowed: Set<string>) {
  return [...params.keys()].every(key => allowed.has(key) && params.getAll(key).length === 1);
}

function exactNumericPath(pathname: string, pattern: RegExp) {
  return positiveInteger(pattern.exec(pathname)?.[1] ?? null);
}

function positiveInteger(value: string | null) {
  return boundedInteger(value, 1, Number.MAX_SAFE_INTEGER);
}

function boundedInteger(value: string | null, minimum: number, maximum: number) {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : undefined;
}

function boundedText(value: string | null | undefined, maximum = boundedTextLength) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= maximum ? trimmed : undefined;
}

function setInteger(params: URLSearchParams, key: string, value: number | undefined) {
  if (value !== undefined && Number.isSafeInteger(value)) params.set(key, String(value));
}

function resolvedTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function validTimezone(value: string | undefined) {
  const timezone = boundedText(value, 128);
  if (!timezone) return undefined;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(0);
    return timezone;
  } catch {
    return undefined;
  }
}
