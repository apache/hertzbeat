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

import { apiMessageDelete, apiMessageGet, apiMessagePut } from '@/core/http/api-message';

import {
  dashboardKeySchema,
  dashboardRevisionSchema,
  signalDashboardRecordSchema,
  type SignalDashboardRecord
} from '../model/signal-dashboard-record';
import { buildSignalDashboardWrite, matchesDashboardWrite } from '../model/signal-dashboard-write';

const basePath = '/api/signal/dashboard';

export async function loadSignalDashboards(abortSignal?: AbortSignal): Promise<SignalDashboardRecord[]> {
  const raw = await apiMessageGet(basePath, abortSignal ? { signal: abortSignal } : undefined);
  const records = z.array(signalDashboardRecordSchema).parse(raw);
  if (new Set(records.map(record => record.dashboardKey)).size !== records.length) {
    throw new Error('Duplicate dashboard identities');
  }
  return records;
}

export async function saveSignalDashboard(
  document: unknown,
  original?: SignalDashboardRecord
): Promise<SignalDashboardRecord> {
  const request = buildSignalDashboardWrite(document, original);
  const response = signalDashboardRecordSchema.parse(await apiMessagePut(basePath, request));
  if (!matchesDashboardWrite(request, response))
    throw new Error('Dashboard response does not match submitted document');
  return response;
}

export async function deleteSignalDashboard(key: string, revision: number): Promise<void> {
  dashboardKeySchema.parse(key);
  dashboardRevisionSchema.parse(revision);
  await apiMessageDelete(`${basePath}/${encodeURIComponent(key)}?revision=${revision}`);
}
