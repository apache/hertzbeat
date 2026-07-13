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

import { apiMessageGet, apiMessagePost, apiMessagePut, type PageResult } from '@/core/http/api-message';

import { buildMonitorListPath, type MonitorQuery } from './monitor-model';

export type Monitor = {
  id: number;
  name: string;
  app: string;
  instance: string;
  status: number;
  intervals?: number;
  scheduleType?: string;
  cronExpression?: string;
  description?: string;
  scrape?: string;
  labels?: Record<string, string>;
  gmtCreate?: number;
  gmtUpdate?: number;
};

export type MonitorParam = { field: string; type?: number; paramValue?: unknown; display?: boolean };
export type MonitorParamDefine = {
  field: string;
  name?: string | Record<string, string>;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string | Record<string, string>;
  hide?: boolean;
};
export type MonitorDetail = {
  monitor: Monitor;
  params?: MonitorParam[];
  collector?: string | null;
  grafanaDashboard?: Record<string, unknown>;
};

export type MonitorApp = {
  category?: string | null;
  value?: string | null;
  label?: string | null;
  hide?: boolean | null;
};

export function loadMonitors(query: MonitorQuery) {
  return apiMessageGet<PageResult<Monitor>>(buildMonitorListPath(query));
}

export function loadMonitorApps() {
  return apiMessageGet<MonitorApp[]>('/api/apps/hierarchy');
}

export function loadMonitorDetail(id: string) {
  return apiMessageGet<MonitorDetail>(`/api/monitor/${encodeURIComponent(id)}`);
}

export function loadMonitorParamDefines(app: string) {
  return apiMessageGet<MonitorParamDefine[]>(`/api/apps/${encodeURIComponent(app)}/params`);
}

export function detectMonitor(payload: unknown) {
  return apiMessagePost<unknown>('/api/monitor/detect', payload, { signal: AbortSignal.timeout(15_000) });
}

export function saveMonitor(mode: 'new' | 'edit', payload: unknown) {
  return mode === 'new' ? apiMessagePost<unknown>('/api/monitor', payload) : apiMessagePut<unknown>('/api/monitor', payload);
}
