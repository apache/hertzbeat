/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { HERTZBEAT_QUERY_LIMITS } from '@/platform/perses';
const TRACE_WINDOW_PADDING_MS = 30_000;

export function validObservedSelection(start: number | undefined, end: number | undefined) {
  return (
    start != null &&
    end != null &&
    Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    start > 0 &&
    end >= start
  );
}

export class TraceInvestigationWindowError extends Error {
  constructor() {
    super('Observed trace exceeds the bounded investigation window');
  }
}

export function observedTraceWindow(start: number, end: number) {
  const maximum = HERTZBEAT_QUERY_LIMITS.maximumWindowMs;
  if (end - start > maximum) throw new TraceInvestigationWindowError();
  const from = Math.max(1, start - TRACE_WINDOW_PADDING_MS);
  const to = Math.min(Number.MAX_SAFE_INTEGER, end + TRACE_WINDOW_PADDING_MS);
  if (to - from <= maximum) return { from, to };
  return { from: start, to: end };
}

export function validInvestigationWindow(from: number | undefined, to: number | undefined) {
  return (
    Number.isSafeInteger(from) &&
    Number.isSafeInteger(to) &&
    from! > 0 &&
    from! < to! &&
    to! - from! <= HERTZBEAT_QUERY_LIMITS.maximumWindowMs
  );
}
