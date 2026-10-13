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

import type { InvestigationTraceDetail } from './explore-investigation-contract';
type Span = InvestigationTraceDetail['spans'][number];

export function validInvestigationForest(detail: InvestigationTraceDetail) {
  const byId = new Map(detail.spans.map(span => [span.spanId, span]));
  const roots = detail.spans.filter(span => span.parentSpanId === null);
  const missing = detail.spans.filter(span => span.parentSpanId && !byId.has(span.parentSpanId));
  if (
    byId.size !== detail.spans.length ||
    roots.length !== detail.rootSpanCount ||
    missing.length !== detail.missingParentCount ||
    detail.errorSpanCount > detail.spans.length ||
    (roots.length === 1 && roots[0]?.spanId !== detail.rootSpanId)
  )
    return false;
  return validRepresentative(detail, byId) && detail.spans.every(span => validTime(span, detail)) && acyclic(byId);
}

function validRepresentative(detail: InvestigationTraceDetail, byId: Map<string, Span>) {
  const span = byId.get(detail.representativeSpan.spanId);
  if (!span) return false;
  const representative = detail.representativeSpan;
  return (
    span.startTime === representative.startTime &&
    span.spanName === representative.spanName &&
    span.serviceName === representative.serviceName &&
    span.serviceNamespace === representative.serviceNamespace &&
    BigInt(span.durationNanos) === BigInt(representative.durationNanos)
  );
}

function validTime(span: Span, detail: InvestigationTraceDetail) {
  const start = BigInt(span.startTimeUnixNano);
  const duration = BigInt(span.durationNanos);
  return (
    start / 1000000n === BigInt(span.startTime) &&
    span.startTime >= detail.observedStartTime &&
    span.startTime <= detail.observedEndTime &&
    duration <= BigInt(Number.MAX_SAFE_INTEGER) &&
    (start + duration + 999999n) / 1000000n <= BigInt(detail.observedEndTime)
  );
}

function acyclic(byId: Map<string, Span>) {
  const complete = new Set<string>();
  for (const span of byId.values()) {
    const path = new Set<string>();
    let current: Span | undefined = span;
    while (current && !complete.has(current.spanId)) {
      if (path.has(current.spanId)) return false;
      path.add(current.spanId);
      current = current.parentSpanId ? byId.get(current.parentSpanId) : undefined;
    }
    for (const id of path) complete.add(id);
  }
  return true;
}
