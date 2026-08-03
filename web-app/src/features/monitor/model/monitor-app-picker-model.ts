/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { MonitorApp } from './monitor-contract';

export type MonitorAppPickerItem = {
  value: string;
  label: string;
};

export type MonitorAppPickerGroup = {
  category: string;
  apps: MonitorAppPickerItem[];
};

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
