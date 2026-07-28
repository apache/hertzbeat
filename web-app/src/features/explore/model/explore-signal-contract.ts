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

import type { PagedCollection } from '@/shared/pagination';

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type ExplorePageResult<T> = PagedCollection<T>;

export type TraceRow = {
  traceId: string;
  rootSpanId: string | null;
  serviceName: string | null;
  serviceNamespace: string | null;
  rootSpanName: string | null;
  durationNanos: number | null;
  status: string | null;
  startTime: number | null;
  errorSpanCount: number;
  resourceAttributes: Record<string, string> | null;
};
export type TraceEvent = {
  timeUnixNano: number | null;
  name: string | null;
  attributes: Record<string, JsonValue> | null;
  droppedAttributesCount: number | null;
};
export type TraceLink = {
  traceId: string | null;
  spanId: string | null;
  traceState: string | null;
  attributes: Record<string, JsonValue> | null;
  droppedAttributesCount: number | null;
};
export type CodeNavigationHint = {
  repositoryUrl: string | null;
  provider: string | null;
  defaultPath: string | null;
  searchQuery: string | null;
  label: string | null;
};
export type TraceSpan = {
  traceId: string | null;
  spanId: string | null;
  parentSpanId: string | null;
  spanName: string | null;
  serviceName: string | null;
  status: string | null;
  spanKind: string | null;
  statusMessage: string | null;
  traceState: string | null;
  scopeName: string | null;
  scopeVersion: string | null;
  durationNanos: number | null;
  startTime: number | null;
  highlighted: boolean;
  resourceAttributes: Record<string, string> | null;
  spanAttributes: Record<string, string> | null;
  events: TraceEvent[] | null;
  links: TraceLink[] | null;
  codeNavigationHint: CodeNavigationHint | null;
};
export type TraceDetail = TraceRow & { spans: TraceSpan[] | null };

export type LogRow = {
  timeUnixNano: number | null;
  observedTimeUnixNano: number | null;
  severityNumber: number | null;
  severityText: string | null;
  body: JsonValue;
  attributes: Record<string, JsonValue> | null;
  droppedAttributesCount: number | null;
  traceId: string | null;
  spanId: string | null;
  traceFlags: number | null;
  resource: Record<string, JsonValue> | null;
  resourceSchemaUrl: string | null;
  instrumentationScope: {
    name: string | null;
    version: string | null;
    attributes: Record<string, JsonValue> | null;
    droppedAttributesCount: number | null;
  } | null;
  scopeSchemaUrl: string | null;
};
export type LogStreamGap = {
  observedAt: number;
  reason: 'queue_overflow';
  droppedCount: number;
};

export type MetricField = {
  name: string | null;
  type: 'number' | 'string' | 'time' | 'bool' | null;
  unit: string | null;
};
export type MetricFrame = {
  schema: {
    fields: MetricField[] | null;
    labels: Record<string, string> | null;
    meta: Record<string, string> | null;
  } | null;
  data: JsonValue[][] | null;
};
export type MetricConsole = {
  context: {
    entityId: number | null;
    entityType: string | null;
    entityName: string | null;
    serviceName: string | null;
    serviceNamespace: string | null;
    environment: string | null;
    operationName: string | null;
    start: number | null;
    end: number | null;
  } | null;
  query: string | null;
  datasource: string | null;
  queryMode: string | null;
  results: { refId: string | null; status: number | null; msg: string | null; frames: MetricFrame[] | null } | null;
  stats: { totalSeries: number; nonEmptySeries: number; latestObservedAt: number | null } | null;
  emptyStateReason: string | null;
  errorMessage: string | null;
};

export class ExploreSignalContractError extends Error {
  constructor(message = 'Explore signal response does not match its contract') {
    super(message);
    this.name = 'ExploreSignalContractError';
  }
}
export class ExploreSignalMissingError extends Error {
  constructor() {
    super('Explore signal detail is missing');
    this.name = 'ExploreSignalMissingError';
  }
}
