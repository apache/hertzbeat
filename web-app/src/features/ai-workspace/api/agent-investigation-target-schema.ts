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

const positive = z.number().int().positive();
const absent = z.null().optional();
const investigationSignalSchema = z
  .object({
    type: z.literal('investigation'),
    start: positive,
    end: positive,
    timezone: z.string().min(1)
  })
  .strict()
  .refine(value => value.start < value.end && value.end - value.start <= 24 * 60 * 60_000)
  .refine(value => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value.timezone });
      return true;
    } catch {
      return false;
    }
  });
export const entityInvestigationSourceSchema = z
  .object({ entityId: positive, signal: investigationSignalSchema })
  .strict();
const wireSignal = investigationSignalSchema.safeExtend({ query: absent, timeRange: absent });
const emptyTargetFields = { monitorId: absent, collector: absent, topology: absent, trace: absent, log: absent };
const authority = z
  .object({ bindingId: positive, version: z.string().min(1), hash: z.string().regex(/^sha256:[0-9a-f]{64}$/u) })
  .strict();
export const entityInvestigationSourceWireSchema = z
  .object({
    ...emptyTargetFields,
    entityId: positive,
    signal: wireSignal,
    version: absent,
    alertId: absent,
    alertType: absent,
    incident: absent,
    service: absent,
    authority: absent
  })
  .strict()
  .transform(value => ({ entityId: value.entityId, signal: signal(value.signal) }));
export const entityInvestigationTargetWireSchema = z
  .object({
    ...emptyTargetFields,
    entityId: positive,
    signal: wireSignal,
    version: z.literal('entity-investigation.v1'),
    alertId: absent,
    alertType: absent,
    incident: absent,
    service: z
      .object({
        name: z.string().min(1),
        namespace: z.string().min(1),
        environment: z.string().min(1)
      })
      .strict()
      .nullish(),
    authority: authority.safeExtend({ version: z.literal('entity-investigation-authority.v1') })
  })
  .strict()
  .refine(value => value.authority.bindingId === value.entityId)
  .transform(value => ({
    version: value.version,
    entityId: value.entityId,
    signal: signal(value.signal),
    ...(value.service ? { service: value.service } : {})
  }));
export const incidentTargetWireSchema = z
  .object({
    ...emptyTargetFields,
    version: z.literal('incident.v1'),
    alertId: positive,
    alertType: z.literal('single'),
    entityId: absent,
    signal: absent,
    service: absent,
    authority,
    incident: z
      .object({
        analysisPolicyId: positive,
        alertIds: z.array(positive).min(1),
        windowStartedAt: positive,
        end: positive
      })
      .strict()
  })
  .strict()
  .refine(
    value => value.incident.windowStartedAt < value.incident.end && value.incident.alertIds.includes(value.alertId)
  )
  .transform(value => ({
    version: value.version,
    alertId: value.alertId,
    alertType: value.alertType,
    incident: value.incident
  }));
function signal(value: z.infer<typeof wireSignal>) {
  return { type: value.type, start: value.start, end: value.end, timezone: value.timezone };
}
