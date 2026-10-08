/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import type { ExactTimeWindow } from '@/shared/query-context';

import type { EntityRedSignal } from '../model/entity-signal-contract';

const JAVA_LONG_MAX = '9223372036854775807';
const positiveJavaLong = z
  .string()
  .regex(/^[1-9]\d{0,18}$/u)
  .refine(value => value.length < JAVA_LONG_MAX.length || value <= JAVA_LONG_MAX);
const boundedText = z.string().trim().min(1).max(256);
const count = z.number().int().nonnegative().safe();
const rate = z.number().finite().nonnegative();
const ratio = z.number().finite().min(0).max(1);
const latency = z.number().finite().nonnegative().nullable();

export const redValuesSchema = z
  .object({
    requestCount: count,
    errorCount: count,
    requestRatePerSecond: rate,
    errorRate: ratio,
    latencyAverageMs: latency,
    latencyP95Ms: latency
  })
  .strict()
  .refine(value => value.errorCount <= value.requestCount, 'RED errors exceed requests');

const redPointSchema = redValuesSchema.and(z.object({ timestamp: count }).strict());

export const redIdentitySchema = z
  .object({
    workspaceId: boundedText,
    entityId: positiveJavaLong,
    entityType: boundedText,
    serviceName: boundedText,
    serviceNamespace: boundedText.nullable(),
    deploymentEnvironment: boundedText.nullable()
  })
  .strict();

const entityRedSignalSchema = z
  .object({
    state: z.enum(['ready', 'empty', 'unavailable']),
    source: z.literal('greptime_flow'),
    resolutionSeconds: z.literal(60),
    window: z.object({ start: count, end: count }).strict(),
    identity: redIdentitySchema,
    summary: redValuesSchema.nullable(),
    series: z.array(redPointSchema).max(1_440)
  })
  .strict()
  .superRefine((value, context) => {
    const ready = value.state === 'ready';
    if (ready !== (value.summary !== null && value.series.length > 0)) {
      context.addIssue({ code: 'custom', message: 'RED state contradicts its evidence' });
    }
    if (!ready && (value.summary !== null || value.series.length > 0)) {
      context.addIssue({ code: 'custom', message: 'RED non-ready state contains evidence' });
    }
    let previous = -1;
    value.series.forEach(point => {
      if (point.timestamp < value.window.start || point.timestamp >= value.window.end || point.timestamp <= previous) {
        context.addIssue({ code: 'custom', message: 'RED point is outside or out of order' });
      }
      previous = point.timestamp;
    });
  });

export class EntityRedSignalContractError extends Error {
  constructor() {
    super('Entity RED response is invalid');
    this.name = 'EntityRedSignalContractError';
  }
}

export function parseEntityRedSignal(value: unknown, entityId: number, window: ExactTimeWindow): EntityRedSignal {
  const parsed = entityRedSignalSchema.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.identity.entityId !== String(entityId) ||
    parsed.data.window.start !== window.from ||
    parsed.data.window.end !== window.to
  ) {
    throw new EntityRedSignalContractError();
  }
  return parsed.data as EntityRedSignal;
}
