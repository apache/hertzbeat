/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Page } from './Page';
import { CodeNavigationHint } from './EntityDetail';

export class TraceListItem {
  traceId!: string;
  rootSpanId?: string | null;
  serviceName?: string | null;
  serviceNamespace?: string | null;
  rootSpanName?: string | null;
  durationNanos?: number | null;
  status?: string | null;
  startTime?: number | string | null;
  errorSpanCount: number = 0;
  resourceAttributes?: Record<string, string>;
}

export class TraceSpanNode {
  traceId!: string;
  spanId!: string;
  parentSpanId?: string | null;
  spanName?: string | null;
  serviceName?: string | null;
  status?: string | null;
  spanKind?: string | null;
  statusMessage?: string | null;
  traceState?: string | null;
  scopeName?: string | null;
  scopeVersion?: string | null;
  durationNanos?: number | null;
  startTime?: number | string | null;
  highlighted: boolean = false;
  resourceAttributes?: Record<string, string>;
  spanAttributes?: Record<string, string>;
  events?: TraceSpanEvent[];
  links?: TraceSpanLink[];
  codeNavigationHint?: CodeNavigationHint | null;
}

export class TraceSpanEvent {
  timeUnixNano?: number | null;
  name?: string | null;
  attributes?: Record<string, unknown>;
  droppedAttributesCount?: number | null;
}

export class TraceSpanLink {
  traceId?: string | null;
  spanId?: string | null;
  traceState?: string | null;
  attributes?: Record<string, unknown>;
  droppedAttributesCount?: number | null;
}

export class TraceDetail {
  traceId!: string;
  rootSpanId?: string | null;
  serviceName?: string | null;
  serviceNamespace?: string | null;
  rootSpanName?: string | null;
  durationNanos?: number | null;
  status?: string | null;
  startTime?: number | string | null;
  errorSpanCount: number = 0;
  resourceAttributes?: Record<string, string>;
  spans: TraceSpanNode[] = [];
}

export class TraceOverview {
  totalTraceCount: number = 0;
  errorTraceCount: number = 0;
  latestObservedAt?: number | string | null;
  hasActiveTrace: boolean = false;
}

export type TraceListPage = Page<TraceListItem>;
