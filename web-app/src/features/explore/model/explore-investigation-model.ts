/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { isLogRecordUid } from './explore-field-contract';

import {
  normalizeInvestigationTimeZone,
  type ExactTimeWindow,
  type InvestigationTimeWindow
} from '@/shared/query-context';

import { buildExplorePath } from './explore-url-model';
import { mergeExploreQuery, signalSelectionPatch } from './explore-model';
import { traceReturnTo } from './explore-trace-return-context';
import { observedTraceWindow, validObservedSelection, validInvestigationWindow } from './explore-observed-window';
export { TraceInvestigationWindowError } from './explore-observed-window';
import type { ExploreQuery } from './explore-query';

const TRACE_WINDOW_PADDING_MS = 30_000;
const LOG_WINDOW_PADDING_MS = 5 * 60_000;
const NANOSECONDS_PER_MILLISECOND = 1_000_000n;
const MAX_OTLP_UINT64 = 18_446_744_073_709_551_615n;
const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/u;
const SPAN_ID_PATTERN = /^[0-9a-f]{16}$/u;

export type ExploreInvestigationRoute =
  | { kind: 'inactive' }
  | { kind: 'invalid'; signal: 'logs' | 'traces' }
  | { kind: 'trace'; traceId: string; spanId?: string | undefined; window: InvestigationTimeWindow }
  | {
      kind: 'log';
      logRecordUid: string;
      traceId?: string | undefined;
      spanId?: string | undefined;
      window: InvestigationTimeWindow;
    };

export type TraceInvestigationSelection = {
  traceId: string;
  selectedSpanId?: string | null | undefined;
  startTime: number | null;
  durationNanos: number | null;
  observedStartTime?: number | undefined;
  observedEndTime?: number | undefined;
};

export type LogInvestigationSelection = {
  logRecordUid: string;
  timeUnixNano: string | null;
  traceId?: string | null | undefined;
  spanId?: string | null | undefined;
};

export function exploreInvestigationRoute(query: ExploreQuery): ExploreInvestigationRoute {
  if (query.signal === 'logs' && query.logRecordUid != null) {
    return logInvestigationRoute({ ...query, logRecordUid: query.logRecordUid });
  }
  if (query.signal !== 'traces' || query.traceId == null) return { kind: 'inactive' };
  return traceInvestigationRoute({ ...query, traceId: query.traceId });
}

function logInvestigationRoute(
  query: Extract<ExploreQuery, { signal: 'logs' }> & { logRecordUid: string }
): ExploreInvestigationRoute {
  if (query.live || !isLogRecordUid(query.logRecordUid)) return { kind: 'invalid', signal: 'logs' };
  if ((query.traceId != null && !validTraceId(query.traceId)) || (query.spanId != null && !validSpanId(query.spanId))) {
    return { kind: 'invalid', signal: 'logs' };
  }
  const window = focusedWindow(query);
  return window
    ? {
        kind: 'log',
        logRecordUid: query.logRecordUid,
        ...(query.traceId ? { traceId: query.traceId } : {}),
        ...(query.spanId ? { spanId: query.spanId } : {}),
        window
      }
    : { kind: 'invalid', signal: 'logs' };
}

function traceInvestigationRoute(
  query: Extract<ExploreQuery, { signal: 'traces' }> & { traceId: string }
): ExploreInvestigationRoute {
  const hasTimeEvidence = query.start != null || query.end != null || query.timeZone != null;
  if (!hasTimeEvidence) return { kind: 'inactive' };
  const window = focusedWindow(query);
  return validTraceId(query.traceId) && (query.spanId == null || validSpanId(query.spanId)) && window
    ? {
        kind: 'trace',
        traceId: query.traceId,
        ...(query.spanId ? { spanId: query.spanId } : {}),
        window
      }
    : { kind: 'invalid', signal: 'traces' };
}

export function buildTraceInvestigationPath(
  source: ExploreQuery,
  selection: TraceInvestigationSelection,
  effectiveWindow: ExactTimeWindow,
  browserTimeZone: string
) {
  const traceId = requireTraceId(selection.traceId);
  const spanId = optionalSpanId(selection.selectedSpanId);
  const sourceWindow = requireSourceWindow(effectiveWindow);
  const window = committedWindow(source) ?? traceSelectionWindow(selection, sourceWindow);
  return buildFocusedPath(
    source,
    'traces',
    window,
    resolveSelectionTimeZone(source, browserTimeZone),
    {
      traceId,
      spanId
    },
    traceReturnTo(source, effectiveWindow)
  );
}

export function buildLogInvestigationPath(
  source: ExploreQuery,
  selection: LogInvestigationSelection,
  effectiveWindow: ExactTimeWindow,
  browserTimeZone: string
) {
  const logRecordUid = requireLogRecordUid(selection.logRecordUid);
  const sourceWindow = requireSourceWindow(effectiveWindow);
  const window = committedWindow(source) ?? logSelectionWindow(selection.timeUnixNano, sourceWindow);
  return buildFocusedPath(
    source,
    'logs',
    window,
    resolveSelectionTimeZone(source, browserTimeZone),
    {
      logRecordUid,
      traceId: optionalTraceId(selection.traceId),
      spanId: optionalSpanId(selection.spanId)
    },
    traceReturnTo(source, effectiveWindow)
  );
}

function buildFocusedPath(
  source: ExploreQuery,
  signal: 'logs' | 'traces',
  window: ExactTimeWindow,
  timeZone: string,
  identity: { traceId?: string | undefined; spanId?: string | undefined; logRecordUid?: string | undefined },
  returnTo?: string
) {
  return buildExplorePath(
    mergeExploreQuery(source, {
      ...(source.signal === signal ? {} : signalSelectionPatch(signal)),
      pageIndex: undefined,
      signal,
      ...(signal === 'traces' ? { traceStructure: undefined, traceStructureView: undefined } : {}),
      ...identity,
      returnTo,
      start: window.from,
      end: window.to,
      timeZone
    })
  );
}

function committedWindow(query: ExploreQuery): ExactTimeWindow | undefined {
  return query.windowMode !== 'preset' && validInvestigationWindow(query.start, query.end)
    ? { from: query.start!, to: query.end! }
    : undefined;
}

function focusedWindow(query: ExploreQuery): InvestigationTimeWindow | undefined {
  const timeZone = normalizeInvestigationTimeZone(query.timeZone);
  if (!timeZone || !validInvestigationWindow(query.start, query.end)) return undefined;
  return { from: query.start!, to: query.end!, timeZone };
}

function requireSourceWindow(window: ExactTimeWindow) {
  if (!validInvestigationWindow(window.from, window.to))
    throw new Error('Investigation requires a bounded effective window');
  return window;
}

function resolveSelectionTimeZone(source: ExploreQuery, browserTimeZone: string) {
  const routed = normalizeInvestigationTimeZone(source.timeZone);
  const browser = normalizeInvestigationTimeZone(browserTimeZone);
  if (routed) return routed;
  if (browser) return browser;
  throw new Error('Investigation requires a valid IANA time zone');
}

function traceSelectionWindow(selection: TraceInvestigationSelection, source: ExactTimeWindow) {
  const observedStart = selection.observedStartTime;
  const observedEnd = selection.observedEndTime;
  if (observedStart != null || observedEnd != null) {
    return validObservedSelection(observedStart, observedEnd)
      ? observedTraceWindow(observedStart!, observedEnd!)
      : source;
  }
  const start = selection.startTime;
  const duration = selection.durationNanos;
  if (!Number.isSafeInteger(start) || start == null || start <= 0 || !validDuration(duration)) return source;
  const durationMillis = Math.ceil(duration / 1_000_000);
  if (!Number.isSafeInteger(durationMillis)) return source;
  return clampWindow(start - TRACE_WINDOW_PADDING_MS, start + durationMillis + TRACE_WINDOW_PADDING_MS, source);
}

function validDuration(value: number | null): value is number {
  return value != null && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function logSelectionWindow(value: string | null, source: ExactTimeWindow) {
  const nanos = parseNanoseconds(value);
  if (nanos == null) return source;
  const floorMillis = nanos / NANOSECONDS_PER_MILLISECOND;
  const ceilMillis = (nanos + NANOSECONDS_PER_MILLISECOND - 1n) / NANOSECONDS_PER_MILLISECOND;
  if (floorMillis > BigInt(Number.MAX_SAFE_INTEGER) || ceilMillis > BigInt(Number.MAX_SAFE_INTEGER)) return source;
  return clampWindow(Number(floorMillis) - LOG_WINDOW_PADDING_MS, Number(ceilMillis) + LOG_WINDOW_PADDING_MS, source);
}

export function investigationUnixNanoToEpochMillis(value: string) {
  const nanos = parseNanoseconds(value);
  if (nanos == null) return undefined;
  const millis = nanos / NANOSECONDS_PER_MILLISECOND;
  return millis <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(millis) : undefined;
}

export function investigationDurationNanoToMillis(value: string) {
  const nanos = parseNanoseconds(value);
  if (nanos == null) return undefined;
  const wholeMillis = nanos / NANOSECONDS_PER_MILLISECOND;
  if (wholeMillis > BigInt(Number.MAX_SAFE_INTEGER)) return undefined;
  const remainderNanos = nanos % NANOSECONDS_PER_MILLISECOND;
  return Number(wholeMillis) + Number(remainderNanos) / 1_000_000;
}

function parseNanoseconds(value: string | null) {
  if (!value || !/^(0|[1-9]\d{0,19})$/u.test(value)) return undefined;
  const parsed = BigInt(value);
  return parsed <= MAX_OTLP_UINT64 ? parsed : undefined;
}

function clampWindow(from: number, to: number, source: ExactTimeWindow): ExactTimeWindow {
  const clamped = { from: Math.max(source.from, from), to: Math.min(source.to, to) };
  return validInvestigationWindow(clamped.from, clamped.to) ? clamped : source;
}

function optionalTraceId(value: string | null | undefined) {
  if (value == null) return undefined;
  if (!validTraceId(value)) throw new Error('Investigation trace identity is invalid');
  return value;
}

function optionalSpanId(value: string | null | undefined) {
  if (value == null) return undefined;
  if (!validSpanId(value)) throw new Error('Investigation span identity is invalid');
  return value;
}

function requireTraceId(value: string) {
  if (!validTraceId(value)) throw new Error('Trace investigation requires a trace identity');
  return value;
}

function requireLogRecordUid(value: string) {
  if (!isLogRecordUid(value)) throw new Error('Log investigation requires a record identity');
  return value;
}

function validTraceId(value: string) {
  return TRACE_ID_PATTERN.test(value);
}

function validSpanId(value: string) {
  return SPAN_ID_PATTERN.test(value);
}
