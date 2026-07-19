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
const publicHttpsEndpointSchema = trimmedTextSchema.refine(isPublicHttpsEndpoint);
const capabilitySchema = z
  .array(z.enum(COLLECTOR_INTAKE_CAPABILITIES))
  .length(COLLECTOR_INTAKE_CAPABILITIES.length)
  .superRefine((capabilities, context) => {
    const unique = new Set(capabilities);
    if (
      unique.size !== COLLECTOR_INTAKE_CAPABILITIES.length ||
      !COLLECTOR_INTAKE_CAPABILITIES.every(capability => unique.has(capability))
    ) {
      context.addIssue({ code: 'custom', message: 'Collector intake capabilities are incomplete' });
    }
  });

export const collectorPageSchema = z.object({
  content: z.array(
    z
      .object({
        collector: z
          .object({
            name: trimmedTextSchema,
            ip: trimmedTextSchema,
            online: z.boolean().optional(),
            status: z.number().optional()
          })
          .passthrough(),
        instrumentationIntake: z.unknown().optional()
      })
      .passthrough()
  )
});

export const availableCollectorIntakeSchema = z.object({
  schemaVersion: z.literal(1),
  collectorId: trimmedTextSchema,
  state: z.literal('available'),
  gateway: z.enum(['collector', 'server']),
  capabilities: capabilitySchema,
  otlpHttpEndpoint: publicHttpsEndpointSchema,
  otlpGrpcEndpoint: publicHttpsEndpointSchema,
  authorizationHeader: z.literal('Authorization'),
  errorCode: z.null()
});

export const unavailableCollectorIntakeSchema = z.object({
  schemaVersion: z.literal(1),
  collectorId: trimmedTextSchema,
  state: z.literal('unavailable'),
  gateway: z.null(),
  capabilities: z.array(z.never()).length(0),
  otlpHttpEndpoint: z.null(),
  otlpGrpcEndpoint: z.null(),
  authorizationHeader: z.null(),
  errorCode: z.enum(COLLECTOR_INTAKE_ERROR_CODES)
});

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
