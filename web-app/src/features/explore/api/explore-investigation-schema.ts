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

import { LOG_RECORD_UID_PATTERN } from '../model/explore-field-contract';

import { z } from 'zod';

import type { ExactTimeWindow } from '@/shared/query-context';

import type { LogInvestigationSnapshot, TraceInvestigationSnapshot } from '../model/explore-investigation-contract';
import {
  dependencyEdgeSchema,
  investigationIdentitySchema,
  investigationLogRecordSchema,
  investigationSpanIdSchema,
  investigationTraceIdSchema,
  investigationTraceDetailSchema,
  investigationWindowSchema,
  metricSeriesSchema,
  redPointSchema,
  redSummarySchema
} from './explore-investigation-schema-primitives';

const stateSchema = z.enum(['ready', 'empty', 'unavailable']);
const reasonSchema = z.enum([
  'observed',
  'no_data',
  'not_found',
  'not_correlated',
  'storage_unavailable',
  'malformed_data',
  'limit_exceeded',
  'identity_unavailable',
  'upstream_unavailable',
  'query_strategy_unavailable'
]);

const evidenceShape = (source: 'greptime_traces' | 'greptime_logs' | 'greptime_flow' | 'otlp_metrics') => ({
  state: stateSchema,
  reason: reasonSchema,
  source: z.literal(source)
});

const block = <T extends z.ZodRawShape>(source: Parameters<typeof evidenceShape>[0], payload: T) =>
  z.object(payload).extend(evidenceShape(source)).strict();

const ganttBlock = block('greptime_traces', { detail: investigationTraceDetailSchema.nullable() }).superRefine(
  (value, context) => requireReadyValue(value.state, value.detail, context)
);
const logsBlock = block('greptime_logs', {
  truncated: z.boolean(),
  logs: z.array(investigationLogRecordSchema).max(1_000)
}).superRefine((value, context) => requireReadyList(value.state, value.logs, value.truncated, context));
const metricsBlock = block('otlp_metrics', {
  truncated: z.boolean(),
  series: z.array(metricSeriesSchema).max(32)
}).superRefine((value, context) => requireReadyList(value.state, value.series, value.truncated, context));
const redBlock = block('greptime_flow', {
  resolutionSeconds: z.literal(60),
  identity: investigationIdentitySchema.nullable(),
  summary: redSummarySchema.nullable(),
  series: z.array(redPointSchema).max(1_440)
}).superRefine((value, context) => {
  const ready = value.state === 'ready';
  if (ready !== (value.summary !== null && value.series.length > 0)) addIssue(context, 'RED evidence is inconsistent');
  if (ready && value.identity === null) addIssue(context, 'Ready RED evidence requires identity');
});
const dependenciesBlock = block('greptime_traces', {
  truncated: z.boolean(),
  edges: z.array(dependencyEdgeSchema).max(1_000)
}).superRefine((value, context) => requireReadyList(value.state, value.edges, value.truncated, context));

const traceInvestigationSchema = z
  .object({
    traceId: investigationTraceIdSchema,
    selectedSpanId: investigationSpanIdSchema.nullable(),
    window: investigationWindowSchema,
    gantt: ganttBlock,
    sameTraceLogs: logsBlock,
    red: redBlock,
    metrics: metricsBlock,
    dependencies: dependenciesBlock
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.selectedSpanId &&
      value.gantt.detail &&
      !value.gantt.detail.spans.some(span => span.spanId === value.selectedSpanId)
    ) {
      addIssue(context, 'Selected span is absent from Gantt detail');
    }
    if (
      value.gantt.state !== 'ready' &&
      [value.red, value.metrics, value.dependencies].some(item => item.state === 'ready')
    ) {
      addIssue(context, 'Non-ready Trace cannot expose ready correlated evidence');
    }
    if (value.sameTraceLogs.logs.some(log => log.traceId !== value.traceId)) {
      addIssue(context, 'Same-trace logs must match the requested trace');
    }
    validateTimedBlocks(value.window, value, context);
  });

const selectedLogBlock = block('greptime_logs', { log: investigationLogRecordSchema.nullable() }).superRefine(
  (value, context) => requireReadyValue(value.state, value.log, context)
);
const traceBlock = ganttBlock;
const nearbyLogsBlock = block('greptime_logs', {
  hasMoreBefore: z.boolean(),
  hasMoreAfter: z.boolean(),
  before: z.array(investigationLogRecordSchema).max(1_000),
  after: z.array(investigationLogRecordSchema).max(1_000)
}).superRefine((value, context) => {
  requireReadyList(value.state, [...value.before, ...value.after], value.hasMoreBefore || value.hasMoreAfter, context);
});

const logInvestigationSchema = z
  .object({
    logRecordUid: z.string().regex(LOG_RECORD_UID_PATTERN),
    window: investigationWindowSchema,
    selectedLog: selectedLogBlock,
    trace: traceBlock,
    metrics: metricsBlock,
    nearbyLogs: nearbyLogsBlock
  })
  .strict()
  .superRefine((value, context) => {
    const dependents = [value.trace, value.metrics, value.nearbyLogs];
    if (value.selectedLog.state !== 'ready' && dependents.some(item => item.state === 'ready')) {
      addIssue(context, 'Non-ready selected Log cannot expose ready correlated evidence');
    }
    if (
      value.selectedLog.state === 'unavailable' &&
      dependents.some(item => item.state !== 'unavailable' || item.reason !== 'upstream_unavailable')
    ) {
      addIssue(context, 'Unavailable selected Log requires unavailable upstream evidence');
    }
  });

export class ExploreInvestigationContractError extends Error {
  constructor() {
    super('Explore investigation response does not match its contract');
    this.name = 'ExploreInvestigationContractError';
  }
}

export function parseTraceInvestigation(
  value: unknown,
  traceId: string,
  selectedSpanId: string | undefined,
  window: ExactTimeWindow
): TraceInvestigationSnapshot {
  const parsed = traceInvestigationSchema.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.traceId !== traceId ||
    parsed.data.selectedSpanId !== (selectedSpanId ?? defaultSpanSelection(parsed.data.gantt.detail)) ||
    !validEvidenceReasons([
      parsed.data.gantt,
      parsed.data.sameTraceLogs,
      parsed.data.red,
      parsed.data.metrics,
      parsed.data.dependencies
    ]) ||
    !sameWindow(parsed.data.window, window)
  ) {
    throw new ExploreInvestigationContractError();
  }
  return parsed.data;
}

function defaultSpanSelection(detail: TraceInvestigationSnapshot['gantt']['detail']) {
  return detail ? (detail.rootSpanId ?? detail.representativeSpan.spanId) : null;
}

export function parseLogInvestigation(
  value: unknown,
  logRecordUid: string,
  window: ExactTimeWindow
): LogInvestigationSnapshot {
  const parsed = logInvestigationSchema.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.logRecordUid !== logRecordUid ||
    (parsed.data.selectedLog.log !== null && parsed.data.selectedLog.log.logRecordUid !== logRecordUid) ||
    !validEvidenceReasons([parsed.data.selectedLog, parsed.data.trace, parsed.data.metrics, parsed.data.nearbyLogs]) ||
    !sameWindow(parsed.data.window, window)
  ) {
    throw new ExploreInvestigationContractError();
  }
  return parsed.data;
}

function validStateReason(state: z.infer<typeof stateSchema>, reason: z.infer<typeof reasonSchema>) {
  if (state === 'ready') return reason === 'observed';
  if (state === 'empty') return ['no_data', 'not_found', 'not_correlated'].includes(reason);
  return [
    'storage_unavailable',
    'malformed_data',
    'limit_exceeded',
    'identity_unavailable',
    'upstream_unavailable',
    'query_strategy_unavailable'
  ].includes(reason);
}

function validEvidenceReasons(
  blocks: Array<{ state: z.infer<typeof stateSchema>; reason: z.infer<typeof reasonSchema> }>
) {
  return blocks.every(item => validStateReason(item.state, item.reason));
}

function requireReadyValue(state: string, value: unknown, context: z.RefinementCtx) {
  if ((state === 'ready') !== (value != null)) addIssue(context, 'Ready evidence requires a value');
}

function requireReadyList(state: string, values: unknown[], truncated: boolean, context: z.RefinementCtx) {
  if ((state === 'ready') !== values.length > 0) addIssue(context, 'Ready evidence requires values');
  if (state !== 'ready' && truncated) addIssue(context, 'Non-ready evidence cannot be truncated');
}

function validateTimedBlocks(
  window: { start: number; end: number },
  value: z.infer<typeof traceInvestigationSchema>,
  context: z.RefinementCtx
) {
  for (const point of [...value.red.series, ...value.metrics.series.flatMap(series => series.points)]) {
    if (point.timestamp < window.start || point.timestamp >= window.end) addIssue(context, 'Point is outside window');
  }
}

function sameWindow(actual: { start: number; end: number }, expected: ExactTimeWindow) {
  return actual.start === expected.from && actual.end === expected.to;
}

function addIssue(context: z.RefinementCtx, message: string) {
  context.addIssue({ code: 'custom', message });
}
