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

import { apiMessageDelete, apiMessageGet, apiMessagePut } from '@/core/http/api-message';

import type { MonitorMetricLayoutDocument } from '../model/monitor-metric-layout-model';
import { MonitorMetricLayoutContractError, parseMonitorMetricLayout } from './monitor-metric-layout-schema';

export type MonitorMetricLayoutSavePayload = MonitorMetricLayoutDocument & { expectedRevision: string };

function buildMonitorMetricLayoutPath(application: string) {
  return `/api/metrics/layout/${encodeURIComponent(application)}`;
}

export async function loadMonitorMetricLayout(application: string, signal?: AbortSignal) {
  const value = await apiMessageGet(buildMonitorMetricLayoutPath(application), signal ? { signal } : undefined);
  return parseMatchingMonitorMetricLayout(value, application);
}

export async function saveMonitorMetricLayout(application: string, payload: MonitorMetricLayoutSavePayload) {
  const layout = parseMatchingMonitorMetricLayout(
    await apiMessagePut(buildMonitorMetricLayoutPath(application), payload),
    application
  );
  if (!layout) throw new MonitorMetricLayoutContractError();
  return layout;
}

export async function resetMonitorMetricLayout(application: string, expectedRevision: string) {
  const params = new URLSearchParams({ expectedRevision });
  await apiMessageDelete(`${buildMonitorMetricLayoutPath(application)}?${params.toString()}`);
}

function parseMatchingMonitorMetricLayout(value: unknown, application: string) {
  const layout = parseMonitorMetricLayout(value);
  if (layout && layout.application !== application) throw new MonitorMetricLayoutContractError();
  return layout;
}
