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

import { apiMessagePut } from '@/core/http/api-message';

import { MonitorContractError } from '../model/monitor-contract';
import { positiveIntegerSchema } from './monitor-read-schema-primitives';

const resultSchema = z.object({
  updated: z.array(positiveIntegerSchema),
  cron: z.array(positiveIntegerSchema),
  failed: z.array(positiveIntegerSchema)
});

export async function updateMonitorIntervals(ids: number[], intervals: number, signal: AbortSignal) {
  const response = await apiMessagePut('/api/monitors/interval', { ids, intervals }, { signal });
  const result = resultSchema.parse(response);
  const reported = [...result.updated, ...result.cron, ...result.failed];
  const expected = new Set(ids);
  if (
    reported.length !== expected.size ||
    new Set(reported).size !== reported.length ||
    reported.some(id => !expected.has(id))
  ) {
    throw new MonitorContractError();
  }
  return result;
}
