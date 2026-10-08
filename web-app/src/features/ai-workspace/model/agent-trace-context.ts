/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import {
  readOptionalText,
  readOptionalInteger,
  readInteger,
  optionalPresent,
  setInteger,
  setText,
  assign
} from './agent-context-fields';
import type { AgentTraceRef, AgentTraceSourceTarget } from './agent-workspace-contract';

export const traceTargetQueryKeys = new Set([
  'source',
  'traceId',
  'spanId',
  'start',
  'end',
  'serviceName',
  'serviceNamespace',
  'environment',
  'resourceFilter',
  'attributeFilter',
  'minDurationMs',
  'maxDurationMs',
  'returnTo'
]);

const maximumWindowMs = 7 * 24 * 60 * 60_000;
const safeId = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

export function appendTraceTargetParams(params: URLSearchParams, target: AgentTraceSourceTarget) {
  const trace = target.trace;
  params.set('source', 'trace');
  params.set('traceId', trace.traceId);
  setText(params, 'spanId', trace.spanId);
  setInteger(params, 'start', trace.start);
  setInteger(params, 'end', trace.end);
  setText(params, 'serviceName', trace.serviceName);
  setText(params, 'serviceNamespace', trace.serviceNamespace);
  setText(params, 'environment', trace.environment);
  setText(params, 'resourceFilter', trace.resourceFilter);
  setText(params, 'attributeFilter', trace.attributeFilter);
  setInteger(params, 'minDurationMs', trace.minDurationMs);
  setInteger(params, 'maxDurationMs', trace.maxDurationMs);
}

export function explicitTraceTarget(params: URLSearchParams): AgentTraceSourceTarget | undefined {
  if (params.get('source') !== 'trace' || !hasOnlyTraceKeys(params)) return undefined;
  const identity = readTraceIdentity(params);
  const durations = readTraceDurations(params);
  if (!identity || !durations) return undefined;
  const trace: AgentTraceRef = { traceId: identity.traceId, start: identity.start, end: identity.end };
  assign(trace, 'spanId', identity.spanId);
  if (!appendOptionalTraceText(params, trace)) return undefined;
  assign(trace, 'minDurationMs', durations.minimum);
  assign(trace, 'maxDurationMs', durations.maximum);
  return { trace };
}

function readTraceIdentity(params: URLSearchParams) {
  const traceId = readId(params, 'traceId');
  const spanId = readOptionalId(params, 'spanId');
  const start = readInteger(params, 'start', 1, Number.MAX_SAFE_INTEGER);
  const end = readInteger(params, 'end', 1, Number.MAX_SAFE_INTEGER);
  if (!traceId || !optionalPresent(params, 'spanId', spanId) || start === undefined || end === undefined) return;
  return validWindow(start, end) ? { traceId, spanId, start, end } : undefined;
}

function readTraceDurations(params: URLSearchParams) {
  const minimum = readOptionalInteger(params, 'minDurationMs', 0, Number.MAX_SAFE_INTEGER);
  const maximum = readOptionalInteger(params, 'maxDurationMs', 0, Number.MAX_SAFE_INTEGER);
  if (!optionalPresent(params, 'minDurationMs', minimum)) return;
  if (!optionalPresent(params, 'maxDurationMs', maximum) || (minimum != null && maximum != null && minimum > maximum))
    return;
  return { minimum, maximum };
}

function appendOptionalTraceText(params: URLSearchParams, trace: AgentTraceRef) {
  for (const [key, maximumLength] of [
    ['serviceName', 512],
    ['serviceNamespace', 512],
    ['environment', 512],
    ['resourceFilter', 2_048],
    ['attributeFilter', 2_048]
  ] as const) {
    const value = readOptionalText(params, key, maximumLength);
    if (!optionalPresent(params, key, value)) return false;
    assign(trace, key, value);
  }
  return true;
}

function readId(params: URLSearchParams, key: string) {
  const value = params.get(key);
  return value && safeId.test(value) ? value : undefined;
}

function readOptionalId(params: URLSearchParams, key: string) {
  return params.has(key) ? readId(params, key) : undefined;
}

function validWindow(start: number, end: number) {
  return start < end && end - start <= maximumWindowMs;
}

function hasOnlyTraceKeys(params: URLSearchParams) {
  return [...params.keys()].every(key => traceTargetQueryKeys.has(key) && params.getAll(key).length === 1);
}
