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

import { z } from 'zod';

import type { ExactTimeWindow } from '@/shared/query-context';

import type { AlertInvestigationSnapshot } from '../model/alert-investigation-contract';

import {
  collectionBlockSchema,
  identityBlockSchema,
  logsBlockSchema,
  metricsBlockSchema,
  topologyBlockSchema,
  tracesBlockSchema
} from './alert-investigation-block-schemas';
import { boundedMap, nullableText, positiveTimestamp, safeInteger } from './alert-investigation-schema-primitives';

const alertInvestigationSchema = z
  .object({
    alertId: safeInteger.positive(),
    window: z.object({ start: positiveTimestamp, end: positiveTimestamp, anchor: positiveTimestamp }).strict(),
    alert: z
      .object({
        name: nullableText(256),
        status: nullableText(64),
        severity: nullableText(64),
        summary: nullableText(1_024),
        content: nullableText(4_096),
        labels: boundedMap(64, 1_024),
        annotations: boundedMap(64, 4_096)
      })
      .strict(),
    identity: identityBlockSchema,
    metrics: metricsBlockSchema,
    logs: logsBlockSchema,
    traces: tracesBlockSchema,
    topology: topologyBlockSchema,
    collection: collectionBlockSchema
  })
  .strict()
  .superRefine(validateSnapshotWindow);

export class AlertInvestigationContractError extends Error {
  constructor() {
    super('Alert investigation response is invalid');
    this.name = 'AlertInvestigationContractError';
  }
}

export function parseAlertInvestigation(
  value: unknown,
  alertId: number,
  window: ExactTimeWindow
): AlertInvestigationSnapshot {
  const result = alertInvestigationSchema.safeParse(value);
  if (
    !result.success ||
    result.data.alertId !== alertId ||
    result.data.window.start !== window.from ||
    result.data.window.end !== window.to
  ) {
    throw new AlertInvestigationContractError();
  }
  return result.data;
}

function validateSnapshotWindow(value: z.infer<typeof alertInvestigationSchema>, context: z.RefinementCtx) {
  const window = value.window;
  if (window.start >= window.end || window.end - window.start > 86_400_000 || !inside(window.anchor, window)) {
    addIssue(context, 'Alert investigation window is inconsistent');
  }
  validateMetricTimestamps(value, context);
  validateLogTimestamps(value, context);
  validateTraceTimestamps(value, context);
  validateOperationalTimestamps(value, context);
}

function validateMetricTimestamps(value: z.infer<typeof alertInvestigationSchema>, context: z.RefinementCtx) {
  for (const series of value.metrics.series) {
    for (const point of series.points) {
      if (!inside(point.timestamp, value.window)) addIssue(context, 'Metric point is outside window');
    }
  }
}

function validateLogTimestamps(value: z.infer<typeof alertInvestigationSchema>, context: z.RefinementCtx) {
  for (const record of value.logs.records) {
    if (!nanoInside(record.timeUnixNano, value.window)) addIssue(context, 'Log record is outside window');
    if (record.observedTimeUnixNano && !nanoInside(record.observedTimeUnixNano, value.window)) {
      addIssue(context, 'Observed log time is outside window');
    }
  }
}

function validateTraceTimestamps(value: z.infer<typeof alertInvestigationSchema>, context: z.RefinementCtx) {
  for (const trace of value.traces.traces) {
    if (!nanoInside(trace.startTimeUnixNano, value.window)) addIssue(context, 'Trace is outside window');
  }
}

function validateOperationalTimestamps(value: z.infer<typeof alertInvestigationSchema>, context: z.RefinementCtx) {
  for (const edge of value.topology.edges) {
    if (!inside(edge.observedAt, value.window)) addIssue(context, 'Topology edge is outside window');
  }
  if (value.collection.event && !inside(value.collection.event.observedAt, value.window)) {
    addIssue(context, 'Collection event is outside window');
  }
}

function inside(timestamp: number, window: { start: number; end: number }) {
  return timestamp >= window.start && timestamp < window.end;
}

function nanoInside(value: string, window: { start: number; end: number }) {
  const timestamp = BigInt(value);
  return timestamp >= BigInt(window.start) * 1_000_000n && timestamp < BigInt(window.end) * 1_000_000n;
}

function addIssue(context: z.RefinementCtx, message: string) {
  context.addIssue({ code: 'custom', message });
}
