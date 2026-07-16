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

export type TraceRow = {
  traceId?: string;
  rootSpanId?: string;
  serviceName?: string;
  serviceNamespace?: string;
  rootSpanName?: string;
  durationNanos?: number;
  status?: string;
  startTime?: number;
  errorSpanCount?: number;
  resourceAttributes?: Record<string, string>;
};

type TraceEvent = {
  timeUnixNano?: number;
  name?: string;
  attributes?: Record<string, unknown>;
};

export type TraceSpan = {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  spanName?: string;
  serviceName?: string;
  status?: string;
  statusMessage?: string;
  spanKind?: string;
  scopeName?: string;
  scopeVersion?: string;
  durationNanos?: number;
  startTime?: number;
  highlighted?: boolean;
  resourceAttributes?: Record<string, string>;
  spanAttributes?: Record<string, string>;
  events?: TraceEvent[];
};

export type TraceDetail = TraceRow & { spans?: TraceSpan[] };

export type LogRow = {
  timeUnixNano?: number;
  observedTimeUnixNano?: number;
  severityNumber?: number;
  severityText?: string;
  body?: unknown;
  attributes?: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
  resource?: Record<string, unknown>;
};

type MetricField = { name?: string; type?: string; unit?: string };
type MetricFrame = {
  schema?: {
    fields?: MetricField[];
    labels?: Record<string, string>;
  };
  data?: unknown[][];
};

export type MetricConsole = {
  query?: string;
  datasource?: string;
  queryMode?: string;
  results?: {
    status?: number;
    msg?: string;
    frames?: MetricFrame[];
  };
  stats?: {
    totalSeries?: number;
    nonEmptySeries?: number;
    latestObservedAt?: number;
  };
  emptyStateReason?: string;
  errorMessage?: string;
};
