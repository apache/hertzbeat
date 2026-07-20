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

import { z } from 'zod';

const safeIntegerSchema = z.number().refine(Number.isSafeInteger, 'Expected a safe integer');
const nonNegativeIntegerSchema = safeIntegerSchema.refine(value => value >= 0, 'Expected a non-negative integer');
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0, 'Expected a positive integer');

// Audit metadata is optional in older responses. Normalize both absence and null
// so downstream view models do not need to distinguish two equivalent states.
const nullableTextSchema = z
  .string()
  .nullish()
  .transform(value => value ?? null);

const bulletinSchema = z.object({
  id: positiveIntegerSchema,
  name: z.string(),
  app: z.string(),
  monitorIds: z.array(positiveIntegerSchema),
  fields: z.record(z.string(), z.array(z.string())),
  creator: nullableTextSchema,
  modifier: nullableTextSchema,
  gmtCreate: nullableTextSchema,
  gmtUpdate: nullableTextSchema
});

const bulletinPageSchema = z.object({
  content: z.array(bulletinSchema),
  totalElements: nonNegativeIntegerSchema,
  totalPages: nonNegativeIntegerSchema,
  number: nonNegativeIntegerSchema,
  size: positiveIntegerSchema
});

const metricFieldSchema = z.object({
  key: z.string(),
  unit: z.string(),
  value: z.string()
});

const metricSchema = z.object({
  name: z.string(),
  // Each inner array is one backend metric sample. Keeping this nesting intact
  // prevents fields from different samples from being merged accidentally.
  fields: z.array(z.array(metricFieldSchema))
});

const metricsRowSchema = z.object({
  monitorName: z.string(),
  monitorId: positiveIntegerSchema,
  host: z.string(),
  metrics: z.array(metricSchema)
});

const metricsSchema = z.object({
  name: z.string(),
  content: z.array(metricsRowSchema)
});

export class BulletinContractError extends Error {
  readonly code = 'BULLETIN_RESPONSE_INVALID';

  constructor(message = 'Invalid bulletin response', options?: ErrorOptions) {
    super(message, options);
    this.name = 'BulletinContractError';
  }
}

export function parseBulletinWire(value: unknown) {
  return parseSchema(bulletinSchema, value, 'Bulletin');
}

export function parseBulletinPageWire(value: unknown) {
  return parseSchema(bulletinPageSchema, value, 'Bulletin page');
}

export function parseMetricsWire(value: unknown) {
  return parseSchema(metricsSchema, value, 'Bulletin metrics');
}

function parseSchema<T extends z.ZodType>(schema: T, value: unknown, label: string): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new BulletinContractError(`${label} did not match the response contract`, { cause: result.error });
}

export type BulletinMetricFieldWire = z.output<typeof metricFieldSchema>;
