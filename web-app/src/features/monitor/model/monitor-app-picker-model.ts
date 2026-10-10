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

import type { RemotePayloadState } from '@/shared/remote-state';

import type { MonitorApp } from './monitor-contract';

type MonitorAppPickerItem = {
  value: string;
  label: string;
};

export type MonitorAppPickerGroup = {
  category: string;
  apps: MonitorAppPickerItem[];
};

export type MonitorAppPickerEvidence = RemotePayloadState<{ groups: MonitorAppPickerGroup[] }, 'unavailable' | 'error'>;

/**
 * Preserves the backend catalog order because maintainers curate that order for
 * the picker. A hidden navigation entry is still creatable; only system entries
 * and incomplete catalog rows are excluded from monitor creation.
 */
export function buildMonitorAppPickerGroups(items: readonly MonitorApp[]): MonitorAppPickerGroup[] {
  const groups = new Map<string, MonitorAppPickerGroup>();
  const seenApps = new Set<string>();

  for (const item of items) {
    const category = item.category?.trim();
    const value = item.value?.trim();
    if (!category || category === '__system__' || !value || seenApps.has(value)) continue;

    const group = groups.get(category) ?? { category, apps: [] };
    group.apps.push({ value, label: item.label?.trim() || value });
    groups.set(category, group);
    seenApps.add(value);
  }

  return [...groups.values()];
}

export function filterMonitorAppPickerGroups(
  groups: readonly MonitorAppPickerGroup[],
  search: string
): MonitorAppPickerGroup[] {
  const query = search.trim().toLowerCase();
  if (!query) return [...groups];

  return groups.flatMap(group => {
    const apps = group.apps.filter(
      app => app.label.toLowerCase().includes(query) || app.value.toLowerCase().includes(query)
    );
    return apps.length ? [{ ...group, apps }] : [];
  });
}
