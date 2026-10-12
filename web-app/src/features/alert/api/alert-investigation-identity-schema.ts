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

import { nullableText, safeInteger } from './alert-investigation-schema-primitives';

type AlertIdentityInput = {
  serviceName: string | null;
  serviceNamespace: string | null;
  deploymentEnvironment: string | null;
  entityId: number | null;
  entityType: string | null;
  monitorId: number | null;
  metricName: string | null;
  metricQuery: string | null;
};

const alertIdentitySchema = z
  .object({
    serviceName: nullableText(256),
    serviceNamespace: nullableText(256),
    deploymentEnvironment: nullableText(128),
    entityId: safeInteger.positive().nullable(),
    entityType: nullableText(64),
    monitorId: safeInteger.positive().nullable(),
    metricName: nullableText(256),
    metricQuery: nullableText(4_096)
  })
  .strict()
  .refine(hasAuthoritativeIdentity);

export const identityBlockSchema = z.discriminatedUnion('state', [
  z
    .object({
      state: z.literal('ready'),
      reason: z.literal('observed'),
      source: z.literal('persisted_alert'),
      identity: alertIdentitySchema
    })
    .strict(),
  z
    .object({
      state: z.literal('unavailable'),
      reason: z.enum(['identity_unavailable', 'malformed_data']),
      source: z.literal('persisted_alert'),
      identity: z.null()
    })
    .strict()
]);

function hasAuthoritativeIdentity(value: AlertIdentityInput) {
  return Boolean(value.serviceName || value.entityId || value.monitorId || value.metricName || value.metricQuery);
}
