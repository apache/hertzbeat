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

import type { z } from 'zod';
import type { compositeDetail } from './hertzbeat-trace-composite-schema';
import { HertzBeatResponseContractError } from './hertzbeat-response-errors';

type Detail = z.infer<typeof compositeDetail>;

export function requireObservedTraceStructure(detail: Detail, selectedSpanId: string | null) {
  const ids = new Set(detail.spans.map(span => span.spanId));
  const roots = detail.spans.filter(span => span.parentSpanId === null);
  const missing = detail.spans.filter(span => span.parentSpanId != null && !ids.has(span.parentSpanId));
  const representative = detail.spans.find(span => span.spanId === detail.representativeSpan.spanId);
  if (
    ids.size !== detail.spans.length ||
    roots.length !== detail.rootSpanCount ||
    missing.length !== detail.missingParentCount ||
    !representative ||
    selectedSpanId == null ||
    !ids.has(selectedSpanId) ||
    (detail.rootState === 'unique' && roots[0]?.spanId !== detail.rootSpanId) ||
    !matchesRepresentative(detail.representativeSpan, representative) ||
    !matchesBounds(detail)
  ) {
    throw new HertzBeatResponseContractError();
  }
}

function matchesRepresentative(rep: Detail['representativeSpan'], span: Detail['spans'][number]) {
  return (
    rep.startTime === span.startTime &&
    BigInt(rep.durationNanos) === BigInt(span.durationNanos) &&
    rep.spanName === span.spanName &&
    rep.serviceName === span.serviceName &&
    rep.serviceNamespace === span.serviceNamespace
  );
}

function matchesBounds(detail: Detail) {
  const starts = detail.spans.map(span => BigInt(span.startTimeUnixNano));
  const ends = detail.spans.map(span => BigInt(span.startTimeUnixNano) + BigInt(span.durationNanos));
  const earliest = starts.reduce((a, b) => (a < b ? a : b));
  const latest = ends.reduce((a, b) => (a > b ? a : b));
  if (
    earliest / 1000000n !== BigInt(detail.observedStartTime) ||
    (latest + 999999n) / 1000000n !== BigInt(detail.observedEndTime)
  )
    return false;
  return detail.spans.every(span => BigInt(span.startTimeUnixNano) / 1000000n === BigInt(span.startTime));
}
