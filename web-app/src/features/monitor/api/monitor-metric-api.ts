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

import { apiMessageDelete, apiMessageGet, apiMessagePost } from '@/core/http/api-message';
import type { Monitor, MonitorMetricOption } from './monitor-contract';
import {
  parseFavoriteMetrics,
  parseHistoryMetric,
  parseMonitorMetricCatalog,
  parseRealtimeMetric
} from './monitor-metric-schema';

export function buildRealtimeMetricPath(monitorId: number, metricKey: string) {
  return `/api/monitor/${monitorId}/metrics/${encodeURIComponent(metricKey)}`;
}

export function buildMetricCatalogPath(monitor: Monitor) {
  const app = monitor.scrape && monitor.scrape !== 'static' ? monitor.scrape : monitor.app;
  if (app === 'push') return `/api/apps/${monitor.id}/pushdefine`;
  if (app === 'prometheus') return `/api/apps/${monitor.id}/define/dynamic`;
  return `/api/apps/${app}/define`;
}

export function buildFavoriteMetricPath(monitorId: number, metricKey?: string) {
  return metricKey == null ? `/api/metrics/favorite/${monitorId}`
    : `/api/metrics/favorite/${monitorId}/${encodeURIComponent(metricKey)}`;
}

export function buildHistoryMetricPath(monitor: Monitor, metric: MonitorMetricOption, history: string) {
  const sourceApp = monitor.scrape && monitor.scrape !== 'static' ? monitor.scrape : monitor.app;
  const app = sourceApp === 'prometheus' ? `_prometheus_${monitor.name}` : sourceApp;
  const fullMetric = `${app}.${metric.group}.${metric.field}`;
  const params = new URLSearchParams({ history, interval: 'false' });
  return `/api/monitor/${encodeURIComponent(monitor.instance)}/metric/${fullMetric}?${params.toString()}`;
}

export async function loadFavoriteMetrics(monitorId: number, signal?: AbortSignal) {
  const value = await apiMessageGet<unknown>(buildFavoriteMetricPath(monitorId), signal ? { signal } : undefined);
  return parseFavoriteMetrics(value);
}

export async function loadMonitorMetricCatalog(monitor: Monitor, signal?: AbortSignal) {
  const value = await apiMessageGet<unknown>(buildMetricCatalogPath(monitor), signal ? { signal } : undefined);
  return parseMonitorMetricCatalog(value);
}

export function updateFavoriteMetric(monitorId: number, metricKey: string, favorite: boolean) {
  const path = buildFavoriteMetricPath(monitorId, metricKey);
  return favorite ? apiMessagePost<unknown>(path, null) : apiMessageDelete<unknown>(path);
}

export async function loadRealtimeMetric(monitorId: number, metric: MonitorMetricOption,
  signal?: AbortSignal) {
  const value = await apiMessageGet<unknown>(buildRealtimeMetricPath(monitorId, metric.group), signal ? { signal } : undefined);
  return parseRealtimeMetric(value, monitorId, metric.group);
}

export async function loadHistoryMetric(monitor: Monitor, metric: MonitorMetricOption, history: string,
  signal?: AbortSignal) {
  const value = await apiMessageGet<unknown>(buildHistoryMetricPath(monitor, metric, history), signal ? { signal } : undefined);
  return parseHistoryMetric(value, monitor.instance, metric.group, metric.field);
}
