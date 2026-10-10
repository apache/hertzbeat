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
import { logFacetFieldSchema } from './log-field';
export const logFieldSortSchema = z
  .object({
    version: z.literal(1),
    field: z.string(),
    type: z.enum(['number', 'text']),
    direction: z.enum(['asc', 'desc'])
  })
  .strict()
  .refine(value => {
    const [source, ...parts] = value.field.split(':');
    const key = parts.join(':');
    return source === 'calculated'
      ? /^[A-Za-z][A-Za-z0-9_]{0,63}$/u.test(key)
      : logFacetFieldSchema.safeParse({ id: value.field, source, key }).success &&
          (source !== 'builtin' || value.type === 'text');
  });
export type LogFieldSort = z.infer<typeof logFieldSortSchema>;
