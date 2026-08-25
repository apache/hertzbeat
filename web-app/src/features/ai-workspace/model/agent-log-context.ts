/* Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. */

import type { AgentLogRef, AgentLogSourceTarget } from './agent-workspace-contract';

export const logTargetQueryKeys = new Set([
  'source',
  'start',
  'end',
  'traceId',
  'spanId',
  'severityNumber',
  'severityText',
  'search',
  'serviceName',
  'serviceNamespace',
  'environment',
  'resourceFilter',
  'attributeFilter',
  'hideInternal',
  'hideNoise',
  'pageIndex',
  'pageSize',
  'returnTo'
]);

const maximumWindowMs = 7 * 24 * 60 * 60_000;
const safeId = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const severities = new Set(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']);

export function appendLogTargetParams(params: URLSearchParams, target: AgentLogSourceTarget) {
  const log = target.log;
  params.set('source', 'log');
  setInteger(params, 'start', log.start);
  setInteger(params, 'end', log.end);
  setText(params, 'traceId', log.traceId);
  setText(params, 'spanId', log.spanId);
  setInteger(params, 'severityNumber', log.severityNumber);
  setText(params, 'severityText', log.severityText);
  setText(params, 'search', log.search);
  setText(params, 'serviceName', log.serviceName);
  setText(params, 'serviceNamespace', log.serviceNamespace);
  setText(params, 'environment', log.environment);
  setText(params, 'resourceFilter', log.resourceFilter);
  setText(params, 'attributeFilter', log.attributeFilter);
  params.set('hideInternal', String(log.hideInternal));
  params.set('hideNoise', String(log.hideNoise));
  setInteger(params, 'pageIndex', log.pageIndex);
  setInteger(params, 'pageSize', log.pageSize);
}

export function explicitLogTarget(params: URLSearchParams): AgentLogSourceTarget | undefined {
  if (params.get('source') !== 'log' || !hasOnlyLogKeys(params)) return undefined;
  const start = readInteger(params, 'start', 1, Number.MAX_SAFE_INTEGER);
  const end = readInteger(params, 'end', 1, Number.MAX_SAFE_INTEGER);
  const hideInternal = readBoolean(params, 'hideInternal');
  const hideNoise = readBoolean(params, 'hideNoise');
  const pageIndex = readInteger(params, 'pageIndex', 0, 10_000);
  const pageSize = readInteger(params, 'pageSize', 1, 100);
  if (
    start === undefined ||
    end === undefined ||
    start >= end ||
    end - start > maximumWindowMs ||
    hideInternal === undefined ||
    hideNoise === undefined ||
    pageIndex === undefined ||
    pageSize === undefined
  )
    return undefined;
  const log: AgentLogRef = { start, end, hideInternal, hideNoise, pageIndex, pageSize };
  if (!appendOptionalLogScope(params, log)) return undefined;
  return { log };
}

function appendOptionalLogScope(params: URLSearchParams, log: AgentLogRef) {
  for (const key of ['traceId', 'spanId'] as const) {
    const value = readOptionalId(params, key);
    if (!optionalPresent(params, key, value)) return false;
    assign(log, key, value);
  }
  const severityNumber = readOptionalInteger(params, 'severityNumber', 1, 24);
  if (!optionalPresent(params, 'severityNumber', severityNumber)) return false;
  assign(log, 'severityNumber', severityNumber);
  const severityText = readOptionalSeverity(params);
  if (!optionalPresent(params, 'severityText', severityText)) return false;
  assign(log, 'severityText', severityText);
  for (const [key, maximum] of [
    ['search', 256],
    ['serviceName', 512],
    ['serviceNamespace', 512],
    ['environment', 512],
    ['resourceFilter', 2_048],
    ['attributeFilter', 2_048]
  ] as const) {
    const value = readOptionalText(params, key, maximum);
    if (!optionalPresent(params, key, value)) return false;
    assign(log, key, value);
  }
  return true;
}

function readOptionalSeverity(params: URLSearchParams) {
  if (!params.has('severityText')) return undefined;
  const value = params.get('severityText');
  return value && severities.has(value) ? (value as AgentLogRef['severityText']) : undefined;
}

function readOptionalId(params: URLSearchParams, key: string) {
  if (!params.has(key)) return undefined;
  const value = params.get(key);
  return value && safeId.test(value) ? value : undefined;
}

function readOptionalText(params: URLSearchParams, key: string, maximum: number) {
  if (!params.has(key)) return undefined;
  const value = params.get(key);
  return value && value === value.trim() && value.length <= maximum && !hasControlCharacter(value) ? value : undefined;
}

function readOptionalInteger(params: URLSearchParams, key: string, minimum: number, maximum: number) {
  return params.has(key) ? readInteger(params, key, minimum, maximum) : undefined;
}

function readInteger(params: URLSearchParams, key: string, minimum: number, maximum: number) {
  const value = params.get(key);
  if (value === null || !/^\d+$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : undefined;
}

function readBoolean(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function optionalPresent(params: URLSearchParams, key: string, value: unknown) {
  return params.has(key) === (value !== undefined);
}

function hasOnlyLogKeys(params: URLSearchParams) {
  return [...params.keys()].every(key => logTargetQueryKeys.has(key) && params.getAll(key).length === 1);
}

function setInteger(params: URLSearchParams, key: string, value: number | undefined) {
  if (value !== undefined && Number.isSafeInteger(value)) params.set(key, String(value));
}

function setText(params: URLSearchParams, key: string, value: string | undefined) {
  if (value !== undefined) params.set(key, value);
}

function assign<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined) {
  if (value !== undefined) target[key] = value;
}

function hasControlCharacter(value: string) {
  return [...value].some(character => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127;
  });
}
