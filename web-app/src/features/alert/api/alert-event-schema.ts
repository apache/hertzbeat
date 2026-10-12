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

import { alertRecordStatuses } from '../model/alert-model';

const alertEventSignalSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(alertRecordStatuses)
});

export type AlertEventSignal = z.output<typeof alertEventSignalSchema>;

/** Drops alert bodies and labels at the SSE boundary before feature code sees them. */
export function parseAlertEventSignal(data: string): AlertEventSignal | null {
  try {
    const result = alertEventSignalSchema.safeParse(JSON.parse(data));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
