/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { isLogRecordUid } from '../model/explore-field-contract';

import { apiMessageGet } from '@/core/http/api-message';
import type { ExactTimeWindow } from '@/shared/query-context';

import { parseLogInvestigation, parseTraceInvestigation } from './explore-investigation-schema';

export async function loadTraceInvestigation(
  traceId: string,
  spanId: string | undefined,
  window: ExactTimeWindow,
  signal?: AbortSignal,
  source?: string
) {
  const value = await apiMessageGet(buildTraceInvestigationApiPath(traceId, spanId, window, source), {
    signal: signal ?? null
  });
  return parseTraceInvestigation(value, traceId, spanId, window);
}

export async function loadLogInvestigation(
  logRecordUid: string,
  window: ExactTimeWindow,
  signal?: AbortSignal,
  source?: string
) {
  const value = await apiMessageGet(buildLogInvestigationApiPath(logRecordUid, window, source), {
    signal: signal ?? null
  });
  return parseLogInvestigation(value, logRecordUid, window);
}

export function buildTraceInvestigationApiPath(
  traceId: string,
  spanId: string | undefined,
  window: ExactTimeWindow,
  source?: string
) {
  const identity = requireTraceId(traceId);
  const params = windowParams(window);
  if (source !== undefined && !['external', 'self'].includes(source)) throw new Error('Invalid telemetry source');
  if (source) params.set('source', source);
  if (spanId != null) params.set('spanId', requireSpanId(spanId));
  return `/api/traces/${encodeURIComponent(identity)}?${params.toString()}`;
}

export function buildLogInvestigationApiPath(logRecordUid: string, window: ExactTimeWindow, source?: string) {
  if (!isLogRecordUid(logRecordUid)) {
    throw new Error('Log record identity is invalid');
  }
  const params = new URLSearchParams({ logRecordUid, ...Object.fromEntries(windowParams(window)) });
  if (source !== undefined && !['external', 'self'].includes(source)) throw new Error('Invalid telemetry source');
  if (source) params.set('source', source);
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
