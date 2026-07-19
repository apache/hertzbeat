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

import { MonitorContractError, type MonitorApp } from '../model/monitor-contract';
import { nonEmptyStringSchema, nullableStringSchema } from './monitor-read-schema-primitives';

const monitorAppSchema = z.object({
  category: nullableStringSchema,
  value: nonEmptyStringSchema,
  label: nullableStringSchema,
  hide: z.boolean().nullable().optional()
});

const monitorAppsSchema = z.array(monitorAppSchema);

export function parseMonitorApps(value: unknown): MonitorApp[] {
  const result = monitorAppsSchema.safeParse(value);
  if (!result.success) throw new MonitorContractError();
  return result.data.map(app => ({
    category: app.category,
    value: app.value,
    label: app.label,
    ...(app.hide === undefined ? {} : { hide: app.hide })
  }));
}
