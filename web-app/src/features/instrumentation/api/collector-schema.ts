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

const trimmedTextSchema = z
  .string()
  .min(1)
  .refine(value => value === value.trim());
const collectorStatusSchema = z.union([z.literal(0), z.literal(1)]);

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
