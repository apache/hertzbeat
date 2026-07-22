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

import type { PagedCollection } from '@/shared/pagination';

export const monitorScrapeValues = [
  'static',
  'http_sd',
  'nacos_sd',
  'dns_sd',
  'eureka_sd',
  'consul_sd',
  'zookeeper_sd'
] as const;
export const monitorScheduleTypes = ['interval', 'cron'] as const;
export const monitorStatusCodes = { paused: 0, available: 1, unavailable: 2 } as const;
export const monitorStatusFilters = {
  all: '9',
  paused: String(monitorStatusCodes.paused),
  available: String(monitorStatusCodes.available),
  unavailable: String(monitorStatusCodes.unavailable)
} as const;
export type MonitorScrape = (typeof monitorScrapeValues)[number];
export type MonitorScheduleType = (typeof monitorScheduleTypes)[number];
export type MonitorEditorMode = 'new' | 'edit';

export function normalizeMonitorScrape(value: string | null | undefined): MonitorScrape {
  return monitorScrapeValues.includes(value as MonitorScrape) ? (value as MonitorScrape) : 'static';
}

export class MonitorContractError extends Error {
  constructor(message = 'Monitor response is invalid') {
    super(message);
    this.name = 'MonitorContractError';
  }
}

export type Monitor = {
  id: number;
  jobId?: number | null;
  name: string;
  app: string;
  instance: string;
  status: number;
  type?: number;
  intervals?: number | null;
  scheduleType?: MonitorScheduleType | null;
  cronExpression?: string | null;
  description?: string | null;
  scrape?: MonitorScrape | null;
  labels?: Record<string, string> | null;
  annotations?: Record<string, string> | null;
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: number | string | null;
  gmtUpdate?: number | string | null;
};

export type MonitorParam = {
  id?: number | null;
  monitorId?: number | null;
  field: string;
  type?: number;
  paramValue?: string | null;
  gmtCreate?: number | string | null;
  gmtUpdate?: number | string | null;
};
export type MonitorDetailMetric = {
  name: string;
  favorited?: boolean | null;
  visible?: boolean;
  fields?: Array<{ type?: number; field?: string; unit?: string; label?: boolean }>;
};
export type MonitorParamDefine = {
  id: number | null;
  app: string;
  field: string;
  name: Record<string, string>;
  type: string;
  required: boolean;
  defaultValue: string | null;
  placeholder: string | null;
  range: string | null;
  limit: number | null;
  options: Array<{ label: string; value: string }> | null;
  keyAlias: string | null;
  valueAlias: string | null;
  depend: Record<string, Array<string | number | boolean | null>> | null;
  hide: boolean;
};
export type MonitorGrafanaDashboard = {
  monitorId: number | null;
  folderUid: string | null;
  slug: string | null;
  status: string | null;
  uid: string | null;
  url: string | null;
  version: number | null;
  enabled: boolean;
  template: string | null;
};
export type MonitorDetail = {
  monitor: Monitor;
  params?: MonitorParam[];
  collector?: string | null;
  grafanaDashboard?: MonitorGrafanaDashboard | null;
  metrics?: MonitorDetailMetric[];
};
export type MonitorApp = {
  category?: string | null;
  value?: string | null;
  label?: string | null;
  hide?: boolean | null;
};
export type MonitorAppHierarchyNode = {
  category: string | null;
  value: string;
  label: string | null;
  isLeaf: boolean;
  hide: boolean | null;
  type: number | null;
  unit: string | null;
  children: MonitorAppHierarchyNode[];
};
export type MonitorCollector = {
  name: string;
  online: boolean;
};
export const monitorPageSizes = [10, 20, 50] as const;
export type MonitorQuery = {
  search: string;
  app: string;
  status: string;
  labels: string;
  pageIndex: number;
  pageSize: number;
};
export type MonitorPage = PagedCollection<Monitor>;
export type MonitorAction = 'copy' | 'enable' | 'pause' | 'delete';
export type MonitorMetricOption = {
  key: string;
  group: string;
  field: string;
  unit?: string;
};
export type MonitorMetricValue = {
  origin: string | null;
  mean: string | null;
  median: string | null;
  min: string | null;
  max: string | null;
  time: number | null;
};
export type MonitorRealtimeMetric = {
  fields: Array<{ name: string; type: number; unit: string | null; label: boolean }>;
  valueRows: Array<{ labels: Record<string, string>; values: MonitorMetricValue[] }>;
};
export type MonitorHistoryMetric = { values: Record<string, MonitorMetricValue[]> };
