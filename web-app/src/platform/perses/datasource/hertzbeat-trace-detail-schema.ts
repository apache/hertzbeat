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
import type { ExactTimeWindow } from '@/shared/query-context';
import { HertzBeatResponseContractError, HertzBeatResponseStateError } from './hertzbeat-response-errors';
import { compositeDetail, traceCompositeSchema } from './hertzbeat-trace-composite-schema';
import { requireObservedTraceStructure } from './hertzbeat-trace-structure-validation';

export function parseTraceGantt(
  value: unknown,
  traceId: string,
  selectedSpanId: string | undefined,
  window: ExactTimeWindow
): HertzBeatTraceDetail | undefined {
  const result = traceCompositeSchema.safeParse(value);
  if (
    !result.success ||
    result.data.traceId !== traceId ||
    (selectedSpanId != null && result.data.selectedSpanId !== selectedSpanId) ||
    result.data.window.start !== window.from ||
    result.data.window.end !== window.to
  ) {
    throw new HertzBeatResponseContractError();
  }
  if (result.data.gantt.state === 'empty') return undefined;
  if (result.data.gantt.state === 'unavailable') throw new HertzBeatResponseStateError('unavailable');
  const detail = result.data.gantt.detail;
  const expectedSelection = selectedSpanId ?? detail.rootSpanId ?? detail.representativeSpan.spanId;
  if (result.data.selectedSpanId !== expectedSelection) throw new HertzBeatResponseContractError();
  requireObservedTraceStructure(result.data.gantt.detail, result.data.selectedSpanId);
  return compositeTraceDetail(result.data.gantt.detail, traceId);
}

function compositeTraceDetail(detail: z.infer<typeof compositeDetail>, traceId: string) {
  const spanIds = detail.spans.map(span => span.spanId);
  if (new Set(spanIds).size !== spanIds.length || (detail.rootSpanId != null && !spanIds.includes(detail.rootSpanId))) {
    throw new HertzBeatResponseContractError();
  }
  return {
    rootState: detail.rootState,
    rootSpanCount: detail.rootSpanCount,
    representativeSpan: detail.representativeSpan,
    observedStartTime: detail.observedStartTime,
    observedEndTime: detail.observedEndTime,
    missingParentCount: detail.missingParentCount,
    traceId,
    rootSpanId: detail.rootSpanId,
    serviceName: detail.serviceName,
    serviceNamespace: detail.serviceNamespace,
    rootSpanName: detail.rootSpanName,
    durationNanos: detail.durationNanos,
    status: detail.status,
    startTime: detail.startTime,
    errorSpanCount: detail.errorSpanCount,
    resourceAttributes: detail.resourceAttributes,
    spans: detail.spans.map(span => ({
      traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      spanName: span.spanName,
      serviceName: span.serviceName,
      status: span.status,
      statusMessage: span.statusMessage,
      spanKind: span.spanKind,
      traceState: span.traceState,
      scopeName: span.scopeName,
      scopeVersion: span.scopeVersion,
      durationNanos: span.durationNanos,
      startTime: span.startTime,
      startTimeUnixNano: span.startTimeUnixNano,
      highlighted: span.highlighted,
      resourceAttributes: span.resourceAttributes,
      spanAttributes: span.spanAttributes,
      events: span.events,
      links: span.links,
      codeNavigationHint: span.codeNavigationHint
    }))
  };
}

export type HertzBeatTraceDetail = ReturnType<typeof compositeTraceDetail>;
