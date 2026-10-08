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

import type { MetricComposition } from '@/platform/perses';
import type { TraceEvidence as TraceRow } from '@/shared/trace-evidence';
import type { PagedCollection } from '@/shared/pagination';

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export const LIVE_LOG_RETENTION_LIMIT = 500;
export type ExplorePageResult<T> = PagedCollection<T>;

type TraceQueryCoverage = {
  sort: 'newest' | 'duration_desc';
  coverage: 'window' | 'bounded';
  rowLimit: number | null;
  truncated: boolean | null;
};

export type TracePageResult = ExplorePageResult<TraceRow> & { query?: TraceQueryCoverage | undefined };

export type { TraceEvidence as TraceRow } from '@/shared/trace-evidence';

type SharedLogRow = {
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
export type LogRow = SharedLogRow & {
  logRecordUid: string | null;
  timeUnixNano: string | null;
  observedTimeUnixNano: string | null;
};
export type LiveLogRow = SharedLogRow & {
  timeUnixNano: number | null;
  observedTimeUnixNano: number | null;
};
export type LogStreamGap = {
  observedAt: number;
  reason: 'queue_overflow';
  droppedCount: number;
};
export type LogOverview = {
  totalCount: number;
  traceCount: number;
  debugCount: number;
  infoCount: number;
  warnCount: number;
  errorCount: number;
  fatalCount: number;
};
export type LogTrend = {
  start: number;
  end: number;
  intervalMs: number;
  buckets: Array<{ start: number; count: number }>;
};
export type LogStatisticEvidence<T> = { kind: 'ready'; data: T } | { kind: 'error'; reason?: 'permission' };
export type LogHistoryEvidence = {
  page: ExplorePageResult<LogRow>;
  overview: LogStatisticEvidence<LogOverview> | { kind: 'count_only'; data: { totalCount: number } };
  trend: LogStatisticEvidence<LogTrend>;
  calculated?: CalculatedPageResponse | undefined;
};

type CalculatedOutput = { name: string; type: 'number' | 'string' | 'boolean' };
type CalculatedExecutedField =
  | { id: string; kind: 'formula'; name: string; expression: string; outputs: CalculatedOutput[] }
  | {
      id: string;
      kind: 'extraction';
      engine: 'regex' | 'grok';
      source: string;
      pattern: string;
      captures: Array<{ name: string }>;
      outputs: CalculatedOutput[];
    };
export type CalculatedPageResponse = {
  version: 2;
  window: { start: number; end: number };
  executed: {
    parameters: Record<string, string>;
    calculatedFields: { version: 2; fields: CalculatedExecutedField[] };
    operation: {
      kind: 'page';
      pageIndex: number;
      pageSize: number;
      sort: { field: string; direction: 'asc' | 'desc'; type?: 'number' | 'text' | undefined };
    };
  };
  result: {
    kind: 'page';
    totalElements: number;
    rows: Array<{ log: LogRow; derived: Record<string, string | number | boolean | null> }>;
  };
};

type MetricField = {
  name: string | null;
  type: 'number' | 'string' | 'time' | 'bool' | null;
  unit: string | null;
};
type MetricFrame = {
  schema: {
    fields: MetricField[] | null;
    labels: Record<string, string> | null;
    meta: Record<string, string> | null;
  } | null;
  data: JsonValue[][] | null;
};
export type MetricConsole = {
  composition?: MetricComposition;
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
export type MetricSignalEvidence = MetricConsole | { kind: 'selection_required' };

export function isMetricConsole(evidence: MetricSignalEvidence): evidence is MetricConsole {
  return !('kind' in evidence);
}

export { ExploreSignalContractError } from '@/shared/signal-contract-error';
export class ExploreSignalMissingError extends Error {
  constructor() {
    super('Explore signal detail is missing');
    this.name = 'ExploreSignalMissingError';
  }
}
export class ExploreSignalUnavailableError extends Error {
  constructor() {
    super('Explore signal evidence is unavailable');
    this.name = 'ExploreSignalUnavailableError';
  }
}
