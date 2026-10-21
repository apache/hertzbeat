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

import { MonitorContractError } from '../model/monitor-contract';
import type { MonitorInvestigationSnapshot } from '../model/monitor-investigation-model';
import { nonNegativeIntegerSchema, positiveIntegerSchema } from './monitor-read-schema-primitives';

const signalSchema = z.enum(['metrics', 'logs', 'traces']);
const boundedStringSchema = z.string().max(2_048);
const nonEmptyStringSchema = boundedStringSchema.trim().min(1);
const nullableIdentitySchema = nonEmptyStringSchema.nullable();
const safeIntegerSchema = z.number().refine(Number.isSafeInteger);
const maximumRenderableEpoch = 8_640_000_000_000_000;
const positiveTimestampSchema = safeIntegerSchema.refine(value => value > 0 && value <= maximumRenderableEpoch);
const nonNegativeTimestampSchema = safeIntegerSchema.refine(value => value >= 0 && value <= maximumRenderableEpoch);
const windowSchema = z
  .object({
    start: positiveTimestampSchema,
    end: positiveTimestampSchema
  })
  .strict()
  .superRefine((window, context) => {
    if (window.end <= window.start || window.end - window.start > 86_400_000) {
      context.addIssue({ code: 'custom', message: 'Investigation window must be bounded to 24 hours' });
    }
  });

const collectionEventSchema = z
  .object({
    observedAt: positiveTimestampSchema,
    durationMillis: safeIntegerSchema.refine(value => value >= -1),
    outcome: z.enum(['SUCCESS', 'FAILURE']),
    collectorId: z.string().max(128),
    target: z.string().max(512),
    metricSet: z.string().max(192),
    failureClass: z.enum(['NONE', 'UNAVAILABLE', 'UNREACHABLE', 'UNCONNECTABLE', 'COLLECTION', 'TIMEOUT', 'UNKNOWN']),
    phase: z.enum(['UNKNOWN', 'RESOLVE', 'CONNECT', 'AUTHENTICATE', 'QUERY', 'PARSE', 'CONVERT', 'DISPATCH']),
    fieldCount: nonNegativeIntegerSchema,
    rowCount: nonNegativeIntegerSchema
  })
  .strict();

const collectionSchema = z.discriminatedUnion('state', [
  z
    .object({
      state: z.literal('ready'),
      source: z.literal('greptime_collection_events'),
      event: collectionEventSchema
    })
    .strict(),
  z
    .object({
      state: z.enum(['empty', 'unavailable']),
      source: z.literal('greptime_collection_events'),
      event: z.null()
    })
    .strict()
]);

const alertPreviewSchema = z
  .object({
    id: positiveIntegerSchema,
    status: z.literal('firing'),
    severity: z.string().trim().min(1).max(64).nullable(),
    summary: z.string().trim().min(1).max(512).nullable(),
    activeAt: nonNegativeTimestampSchema.nullable()
  })
  .strict();

const alertsSchema = z.discriminatedUnion('state', [
  z
    .object({
      state: z.literal('ready'),
      source: z.literal('current_alerts'),
      scope: z.literal('current'),
      activeCount: positiveIntegerSchema,
      previews: z.array(alertPreviewSchema).min(1).max(5)
    })
    .strict()
    .superRefine((alerts, context) => {
      if (alerts.activeCount < alerts.previews.length) {
        context.addIssue({ code: 'custom', message: 'Alert preview count exceeds the active alert count' });
      }
    }),
  z
    .object({
      state: z.literal('empty'),
      source: z.literal('current_alerts'),
      scope: z.literal('current'),
      activeCount: z.literal(0),
      previews: z.array(alertPreviewSchema).length(0)
    })
    .strict(),
  z
    .object({
      state: z.literal('unavailable'),
      source: z.literal('current_alerts'),
      scope: z.literal('current'),
      activeCount: z.null(),
      previews: z.array(alertPreviewSchema).length(0)
    })
    .strict()
]);

const identitySchema = z
  .object({
    monitorId: positiveIntegerSchema,
    entityId: positiveIntegerSchema,
    entityType: z.literal('service'),
    serviceName: nonEmptyStringSchema,
    serviceNamespace: nullableIdentitySchema,
    environment: nullableIdentitySchema,
    signals: z.array(signalSchema).max(3)
  })
  .strict()
  .superRefine((identity, context) => {
    if (new Set(identity.signals).size !== identity.signals.length) {
      context.addIssue({ code: 'custom', message: 'Signal identities must be unique' });
    }
  });

const bindingSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('ready'), identity: identitySchema }).strict(),
  z.object({ state: z.enum(['empty', 'unavailable']), identity: z.null() }).strict()
]);

const investigationSchema = z
  .object({
    monitorId: positiveIntegerSchema,
    window: windowSchema,
    collection: collectionSchema,
    alerts: alertsSchema,
    binding: bindingSchema
  })
  .strict()
  .superRefine((investigation, context) => {
    if (investigation.collection.state === 'ready') {
      const observedAt = investigation.collection.event.observedAt;
      if (observedAt < investigation.window.start || observedAt >= investigation.window.end) {
        context.addIssue({ code: 'custom', message: 'Collection event is outside the investigation window' });
      }
    }
    if (
      investigation.binding.state === 'ready' &&
      investigation.binding.identity.monitorId !== investigation.monitorId
    ) {
      context.addIssue({ code: 'custom', message: 'Binding monitor identity does not match the response' });
    }
  });

export function parseMonitorInvestigation(
  value: unknown,
  requestedMonitorId: number,
  requestedWindow: { from: number; to: number }
): MonitorInvestigationSnapshot {
  const result = investigationSchema.safeParse(value);
  if (
    !result.success ||
    result.data.monitorId !== requestedMonitorId ||
    result.data.window.start !== requestedWindow.from ||
    result.data.window.end !== requestedWindow.to
  ) {
    throw new MonitorContractError();
  }
  return result.data;
}
