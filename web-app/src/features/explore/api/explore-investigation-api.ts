/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { isLogRecordUid } from '../model/explore-field-contract';

import { apiMessageGet } from '@/core/http/api-message';
import type { ExactTimeWindow } from '@/shared/query-context';

import { parseLogInvestigation, parseTraceInvestigation } from './explore-investigation-schema';

export async function loadTraceInvestigation(
  traceId: string,
  spanId: string | undefined,
  window: ExactTimeWindow,
  signal?: AbortSignal
) {
  const value = await apiMessageGet(buildTraceInvestigationApiPath(traceId, spanId, window), {
    signal: signal ?? null
  });
  return parseTraceInvestigation(value, traceId, spanId, window);
}

export async function loadLogInvestigation(logRecordUid: string, window: ExactTimeWindow, signal?: AbortSignal) {
  const value = await apiMessageGet(buildLogInvestigationApiPath(logRecordUid, window), {
    signal: signal ?? null
  });
  return parseLogInvestigation(value, logRecordUid, window);
}

export function buildTraceInvestigationApiPath(traceId: string, spanId: string | undefined, window: ExactTimeWindow) {
  const identity = requireTraceId(traceId);
  const params = windowParams(window);
  if (spanId != null) params.set('spanId', requireSpanId(spanId));
  return `/api/traces/${encodeURIComponent(identity)}?${params.toString()}`;
}

export function buildLogInvestigationApiPath(logRecordUid: string, window: ExactTimeWindow) {
  if (!isLogRecordUid(logRecordUid)) {
    throw new Error('Log record identity is invalid');
  }
  const params = new URLSearchParams({ logRecordUid, ...Object.fromEntries(windowParams(window)) });
  return `/api/logs/context?${params.toString()}`;
}

function windowParams(window: ExactTimeWindow) {
  if (
    !Number.isSafeInteger(window.from) ||
    !Number.isSafeInteger(window.to) ||
    window.from <= 0 ||
    window.to <= window.from ||
    window.to - window.from > 86_400_000
  ) {
    throw new Error('Investigation window is invalid');
  }
  return new URLSearchParams({ start: String(window.from), end: String(window.to) });
}

function requireTraceId(value: string) {
  if (!/^[0-9a-f]{32}$/u.test(value)) throw new Error('Trace identity is invalid');
  return value;
}

function requireSpanId(value: string) {
  if (!/^[0-9a-f]{16}$/u.test(value)) throw new Error('Span identity is invalid');
  return value;
}
