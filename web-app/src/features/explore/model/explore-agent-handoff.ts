/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogInvestigationTarget, TraceInvestigationTarget } from '@/shared/investigation';

import type { LogExploreQuery, TraceExploreQuery } from './explore-query';

export type ReadyTraceEvidence = { traceId: string; spanId?: string | undefined };

const maximumWindowMs = 7 * 24 * 60 * 60_000;
const safeId = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const supportedSeverities = new Set(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as const);

export type ReadyLogEvidence = {
  totalElements: number;
  number: number;
  size: number;
  contentCount: number;
};

export function materializeLogInvestigation(
  query: LogExploreQuery,
  evidence: ReadyLogEvidence | undefined,
  effectiveWindow?: ExactTimeWindow
): LogInvestigationTarget | undefined {
  const window = routeWindow(query.start, query.end) ?? effectiveWindow;
  const pageIndex = query.pageIndex ?? 0;
  if (!windowWithinBounds(window) || !validLogEvidence(evidence, pageIndex)) return undefined;
  if (!supportedLogScope(query)) return undefined;
  const severityText = normalizedSeverity(query.severityText);
  if (query.severityText !== undefined && severityText === undefined) return undefined;
  const log: LogInvestigationTarget['log'] = {
    start: window?.from ?? 0,
    end: window?.to ?? 0,
    hideInternal: Boolean(query.hideInternal),
    hideNoise: Boolean(query.hideNoise),
    pageIndex,
    pageSize: 20
  };
  copyText(log, 'traceId', query.traceId);
  copyText(log, 'spanId', query.spanId);
  copyText(log, 'severityText', severityText);
  copyText(log, 'search', query.query);
  copyText(log, 'serviceName', query.serviceName);
  copyText(log, 'serviceNamespace', query.serviceNamespace);
  copyText(log, 'environment', query.environment);
  copyText(log, 'resourceFilter', query.resourceFilter);
  copyText(log, 'attributeFilter', query.attributeFilter);
  return { log };
}

function validLogEvidence(evidence: ReadyLogEvidence | undefined, pageIndex: number) {
  if (!evidence || evidence.number !== pageIndex || evidence.size !== 20) return false;
  if (![evidence.totalElements, evidence.number, evidence.size, evidence.contentCount].every(Number.isSafeInteger))
    return false;
  const remaining = evidence.totalElements - evidence.number * evidence.size;
  return evidence.totalElements > 0 && evidence.contentCount > 0 && evidence.contentCount <= Math.min(20, remaining);
}

function supportedLogScope(query: LogExploreQuery) {
  if (query.live || [query.intakeProfileId, query.collectorId, query.instance, query.endpoint].some(Boolean))
    return false;
  if (
    (query.traceId !== undefined && !safeId.test(query.traceId)) ||
    (query.spanId !== undefined && !safeId.test(query.spanId))
  )
    return false;
  return [
    [query.query, 256],
    [query.serviceName, 512],
    [query.serviceNamespace, 512],
    [query.environment, 512],
    [query.resourceFilter, 2_048],
    [query.attributeFilter, 2_048]
  ].every(([value, maximum]) => boundedText(value as string | undefined, maximum as number));
}

function normalizedSeverity(value: string | undefined) {
  if (value === undefined) return undefined;
  const normalized = value.toUpperCase();
  return supportedSeverities.has(normalized as never)
    ? (normalized as LogInvestigationTarget['log']['severityText'])
    : undefined;
}

export function materializeTraceInvestigation(
  query: TraceExploreQuery,
  evidence: ReadyTraceEvidence | undefined,
  effectiveWindow?: ExactTimeWindow
): TraceInvestigationTarget | undefined {
  const window = routeWindow(query.start, query.end) ?? effectiveWindow;
  if (!evidence || !safeId.test(evidence.traceId) || !windowWithinBounds(window)) return undefined;
  if (!supportedDetailScope(query, evidence)) return undefined;
  const trace: TraceInvestigationTarget['trace'] = {
    traceId: evidence.traceId,
    start: window?.from ?? 0,
    end: window?.to ?? 0
  };
  copyText(trace, 'spanId', evidence.spanId);
  copyText(trace, 'serviceName', query.serviceName);
  copyText(trace, 'serviceNamespace', query.serviceNamespace);
  copyText(trace, 'environment', query.environment);
  copyText(trace, 'resourceFilter', query.resourceFilter);
  copyText(trace, 'attributeFilter', query.attributeFilter);
  copyNumber(trace, 'minDurationMs', query.minDurationMs);
  copyNumber(trace, 'maxDurationMs', query.maxDurationMs);
  return { trace };
}

function supportedDetailScope(query: TraceExploreQuery, evidence: ReadyTraceEvidence) {
  return (
    (evidence.spanId === undefined || safeId.test(evidence.spanId)) &&
    !unsupportedContext(query) &&
    !unsupportedDetailMode(query) &&
    supportedTextScope(query) &&
    supportedDurationScope(query.minDurationMs, query.maxDurationMs)
  );
}

function unsupportedContext(query: TraceExploreQuery) {
  return [query.intakeProfileId, query.collectorId, query.instance, query.endpoint, query.query].some(Boolean);
}

function unsupportedDetailMode(query: TraceExploreQuery) {
  return Boolean(query.errorOnly || query.spanScope || query.hideInternal || query.pageIndex);
}

function supportedTextScope(query: TraceExploreQuery) {
  return [
    [query.serviceName, 512],
    [query.serviceNamespace, 512],
    [query.environment, 512],
    [query.resourceFilter, 2_048],
    [query.attributeFilter, 2_048]
  ].every(([value, maximum]) => boundedText(value as string | undefined, maximum as number));
}

function supportedDurationScope(minimum: number | undefined, maximum: number | undefined) {
  return minimum == null || maximum == null || minimum <= maximum;
}

function routeWindow(start: number | undefined, end: number | undefined) {
  if (start === undefined && end === undefined) return undefined;
  if (start === undefined || end === undefined) return invalidWindow();
  return { from: start, to: end };
}

function invalidWindow(): ExactTimeWindow {
  return { from: 0, to: 0 };
}

function windowWithinBounds(window: ExactTimeWindow | undefined) {
  return Boolean(
    window &&
    Number.isSafeInteger(window.from) &&
    Number.isSafeInteger(window.to) &&
    window.from > 0 &&
    window.from < window.to &&
    window.to - window.from <= maximumWindowMs
  );
}

function boundedText(value: string | undefined, maximum: number) {
  return value === undefined || (value.length <= maximum && !hasControlCharacter(value));
}

function hasControlCharacter(value: string) {
  return [...value].some(character => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127;
  });
}

function copyText<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined) {
  if (value !== undefined) target[key] = value;
}

function copyNumber<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined) {
  if (value !== undefined) target[key] = value;
}
