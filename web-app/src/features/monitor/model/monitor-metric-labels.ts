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

import type { MonitorMetricOption } from './monitor-contract';

/** Display aliases never replace app, group, field, query or favorite identities. */
export type MonitorMetricLabels = Readonly<Record<string, string>>;
export const emptyMonitorMetricLabels: MonitorMetricLabels = Object.freeze({});

export function selectMonitorMetricLabels(
  app: string | undefined,
  resources: Readonly<Record<string, string>>
): MonitorMetricLabels {
  if (!app) return emptyMonitorMetricLabels;
  const prefix = `monitor.app.${app}.metrics.`;
  return Object.fromEntries(
    Object.entries(resources)
      .filter(([key, value]) => key.startsWith(prefix) && value.trim() && value.trim() !== key)
      .map(([key, value]) => [key.slice(prefix.length), value.trim()])
  );
}

export function monitorGroupLabel(labels: MonitorMetricLabels | undefined, group: string) {
  return ownLabel(labels, group) ?? group;
}

export function monitorFieldLabel(labels: MonitorMetricLabels | undefined, group: string | undefined, field: string) {
  return (group ? ownLabel(labels, `${group}.metric.${field}`) : undefined) ?? field;
}

export function monitorHistoryLabel(labels: MonitorMetricLabels | undefined, metric: MonitorMetricOption) {
  const group = monitorGroupLabel(labels, metric.group);
  const field = monitorFieldLabel(labels, metric.group, metric.field);
  return group === metric.group && field === metric.field ? metric.key : `${group} / ${field}`;
}

function ownLabel(labels: MonitorMetricLabels | undefined, key: string) {
  return labels && Object.prototype.hasOwnProperty.call(labels, key) ? labels[key]?.trim() || undefined : undefined;
}
