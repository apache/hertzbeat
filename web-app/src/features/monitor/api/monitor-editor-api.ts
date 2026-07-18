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

import { apiMessageGet, apiMessagePost, apiMessagePut } from '@/core/http/api-message';
import type { MonitorCollector } from './monitor-contract';
import {
  parseMonitorCollectorPage,
  parseMonitorParamDefines,
  requireUniqueMonitorCollectors
} from './monitor-editor-schema';

export async function loadMonitorParamDefines(app: string, signal?: AbortSignal) {
  const value = await apiMessageGet(`/api/apps/${encodeURIComponent(app)}/params`, signal ? { signal } : undefined);
  return parseMonitorParamDefines(value, app);
}

export async function loadMonitorCollectors(signal?: AbortSignal) {
  const collectors: MonitorCollector[] = [];
  let pageIndex = 0;
  let totalPages = 1;
  do {
    const path = `/api/collector?pageIndex=${pageIndex}&pageSize=200`;
    const value = signal ? await apiMessageGet(path, { signal }) : await apiMessageGet(path);
    const page = parseMonitorCollectorPage(value, pageIndex);
    collectors.push(...page.collectors);
    totalPages = page.totalPages;
    pageIndex += 1;
  } while (pageIndex < totalPages);
  requireUniqueMonitorCollectors(collectors);
  return collectors;
}

export function detectMonitor(payload: unknown, signal?: AbortSignal) {
  return apiMessagePost('/api/monitor/detect', payload,
    { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000) });
}

export function saveMonitor(mode: 'new' | 'edit', payload: unknown, signal?: AbortSignal) {
  const options = signal ? { signal } : undefined;
  return mode === 'new' ? apiMessagePost('/api/monitor', payload, options)
    : apiMessagePut('/api/monitor', payload, options);
}
