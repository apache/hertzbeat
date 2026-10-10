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
export const logFacetFieldSchema = z
  .object({
    id: z.string().max(266),
    source: z.enum(['builtin', 'resource', 'attribute']),
    scalar: z.boolean().optional(),
    key: z
      .string()
      .min(1)
      .max(256)
      .regex(/^[A-Za-z0-9_.:-]+$/u)
  })
  .strict()
  .refine(
    field =>
      field.id === `${field.source}:${field.key}` &&
      (field.source !== 'builtin' || ['serviceName', 'environment', 'severityCategory'].includes(field.key))
  );
export type LogFacetField = z.infer<typeof logFacetFieldSchema>;
