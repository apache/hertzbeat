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

const maximumWindowMs = 7 * 24 * 60 * 60_000;
const safeId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u);

export const agentTraceSchema = z
  .object({
    traceId: safeId,
    spanId: safeId.optional(),
    start: z.number().int().positive(),
    end: z.number().int().positive(),
    serviceName: boundedText(512).optional(),
    serviceNamespace: boundedText(512).optional(),
    environment: boundedText(512).optional(),
    resourceFilter: boundedText(2_048).optional(),
    attributeFilter: boundedText(2_048).optional(),
    minDurationMs: z.number().int().nonnegative().optional(),
    maxDurationMs: z.number().int().nonnegative().optional()
  })
  .strict()
  .refine(traceValueValid);

const agentTraceWireSchema = z
  .object({
    traceId: safeId,
    spanId: safeId.nullable().optional(),
    start: z.number().int().positive(),
    end: z.number().int().positive(),
    serviceName: boundedText(512).nullable().optional(),
    serviceNamespace: boundedText(512).nullable().optional(),
    environment: boundedText(512).nullable().optional(),
    resourceFilter: boundedText(2_048).nullable().optional(),
    attributeFilter: boundedText(2_048).nullable().optional(),
    minDurationMs: z.number().int().nonnegative().nullable().optional(),
    maxDurationMs: z.number().int().nonnegative().nullable().optional()
  })
  .strict()
  .refine(traceValueValid)
  .transform(value => ({
    traceId: value.traceId,
    ...(value.spanId ? { spanId: value.spanId } : {}),
    start: value.start,
    end: value.end,
    ...(value.serviceName ? { serviceName: value.serviceName } : {}),
    ...(value.serviceNamespace ? { serviceNamespace: value.serviceNamespace } : {}),
    ...(value.environment ? { environment: value.environment } : {}),
    ...(value.resourceFilter ? { resourceFilter: value.resourceFilter } : {}),
    ...(value.attributeFilter ? { attributeFilter: value.attributeFilter } : {}),
    ...(value.minDurationMs != null ? { minDurationMs: value.minDurationMs } : {}),
    ...(value.maxDurationMs != null ? { maxDurationMs: value.maxDurationMs } : {})
  }));

export const traceSourceTargetWireSchema = z
  .object({
    version: z.null().optional(),
    monitorId: z.null().optional(),
    alertId: z.null().optional(),
    alertType: z.null().optional(),
    entityId: z.null().optional(),
    collector: z.null().optional(),
    signal: z.null().optional(),
    topology: z.null().optional(),
    trace: agentTraceWireSchema,
    log: z.null().optional(),
    service: z.null().optional(),
    authority: z.null().optional()
  })
  .strict()
  .transform(value => ({ trace: value.trace }));

export const traceTargetWireSchema = z
  .object({
    version: z.literal('trace-detail.v1'),
    monitorId: z.null().optional(),
    alertId: z.null().optional(),
    alertType: z.null().optional(),
    entityId: z.null().optional(),
    collector: z.null().optional(),
    signal: z.null().optional(),
    topology: z.null().optional(),
    trace: agentTraceWireSchema,
    log: z.null().optional(),
    service: z.null().optional(),
    authority: z
      .object({
        bindingId: z.null(),
        version: z.literal('trace-detail-authority.v1'),
        hash: z.string().regex(/^sha256:[0-9a-f]{64}$/u)
      })
      .strict()
  })
  .strict()
  .transform(value => ({ version: value.version, trace: value.trace }));

function traceValueValid(value: {
  start: number;
  end: number;
  minDurationMs?: number | null | undefined;
  maxDurationMs?: number | null | undefined;
}) {
  return (
    value.start < value.end &&
    value.end - value.start <= maximumWindowMs &&
    (value.minDurationMs == null || value.maxDurationMs == null || value.minDurationMs <= value.maxDurationMs)
  );
}

function boundedText(maximum: number) {
  return z
    .string()
    .trim()
    .min(1)
    .max(maximum)
    .refine(value => !hasControlCharacter(value));
}

function hasControlCharacter(value: string) {
  return [...value].some(character => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127;
  });
}
