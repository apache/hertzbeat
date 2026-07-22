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

import { COLLECTOR_INTAKE_CAPABILITIES, COLLECTOR_INTAKE_ERROR_CODES } from '../model/instrumentation-collector';

const trimmedTextSchema = z
  .string()
  .min(1)
  .refine(value => value === value.trim());
const collectorIdSchema = trimmedTextSchema
  .max(128)
  .refine(value => !Array.from(value).some(character => /\p{Cc}/u.test(character)));
const publicHttpsEndpointSchema = trimmedTextSchema.refine(isPublicHttpsEndpoint);
const collectorStatusSchema = z.union([z.literal(0), z.literal(1)]);
const capabilitySchema = z
  .array(z.enum(COLLECTOR_INTAKE_CAPABILITIES))
  .min(1)
  .max(COLLECTOR_INTAKE_CAPABILITIES.length)
  .superRefine((capabilities, context) => {
    if (new Set(capabilities).size !== capabilities.length) {
      context.addIssue({ code: 'custom', message: 'Collector intake capabilities must be unique' });
    }
  });

const collectorSummarySchema = z
  .object({
    collector: z
      .object({
        name: trimmedTextSchema,
        ip: trimmedTextSchema,
        online: z.boolean().optional(),
        status: collectorStatusSchema.optional()
      })
      .passthrough()
      .superRefine((collector, context) => {
        if (collector.online === undefined && collector.status === undefined) {
          context.addIssue({ code: 'custom', message: 'Collector online evidence is missing' });
        }
        if (
          collector.online !== undefined &&
          collector.status !== undefined &&
          collector.online !== (collector.status === 0)
        ) {
          context.addIssue({ code: 'custom', message: 'Collector online evidence is contradictory' });
        }
      }),
    instrumentationIntake: z.unknown()
  })
  .passthrough()
  .superRefine((summary, context) => {
    if (!Object.hasOwn(summary, 'instrumentationIntake')) {
      context.addIssue({ code: 'custom', message: 'Collector instrumentation intake is required' });
    }
  });

export type CollectorSummaryWire = z.output<typeof collectorSummarySchema>;

export const collectorPageSchema = z.object({
  content: z.array(collectorSummarySchema),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  number: z.number().int().nonnegative(),
  size: z.number().int().positive()
});

export const availableCollectorIntakeSchema = z
  .object({
    schemaVersion: z.literal(1),
    collectorId: collectorIdSchema,
    state: z.literal('available'),
    gateway: z.enum(['collector', 'server']),
    capabilities: capabilitySchema,
    otlpHttpEndpoint: publicHttpsEndpointSchema.nullable(),
    otlpGrpcEndpoint: publicHttpsEndpointSchema.nullable(),
    authorizationHeader: z.literal('Authorization'),
    errorCode: z.null()
  })
  .strict()
  .superRefine((intake, context) => {
    const httpMatches = intake.capabilities.includes('otlp_http_protobuf') === (intake.otlpHttpEndpoint !== null);
    const grpcMatches = intake.capabilities.includes('otlp_grpc') === (intake.otlpGrpcEndpoint !== null);
    if (!httpMatches || !grpcMatches) {
      context.addIssue({ code: 'custom', message: 'Collector intake endpoints must match capabilities' });
    }
  });

export const unavailableCollectorIntakeSchema = z
  .object({
    schemaVersion: z.literal(1),
    collectorId: collectorIdSchema,
    state: z.literal('unavailable'),
    gateway: z.null(),
    capabilities: z.array(z.never()).length(0),
    otlpHttpEndpoint: z.null(),
    otlpGrpcEndpoint: z.null(),
    authorizationHeader: z.null(),
    errorCode: z.enum(COLLECTOR_INTAKE_ERROR_CODES)
  })
  .strict();

function isPublicHttpsEndpoint(value: string) {
  try {
    const endpoint = new URL(value);
    return (
      endpoint.protocol === 'https:' &&
      Boolean(endpoint.hostname) &&
      !endpoint.username &&
      !endpoint.password &&
      !endpoint.search &&
      !endpoint.hash
    );
  } catch {
    return false;
  }
}
