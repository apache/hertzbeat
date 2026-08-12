/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import type { MetricView } from './monitor-metric-toolbar';

export function filterRealtimeGroups(
  groups: MonitorMetricWorkbenchController['state']['realtimeGroups'],
  favoriteGroups: Set<string>,
  view: MetricView,
  search: string,
  groupFilter: string
) {
  const normalized = search.trim().toLocaleLowerCase();
  return groups.flatMap(group => {
    if (groupFilter && group.group !== groupFilter) return [];
    if (view === 'favorites' && !favoriteGroups.has(group.group)) return [];
    const groupMatches = group.group.toLocaleLowerCase().includes(normalized);
    if (group.result.kind !== 'ready' && group.result.kind !== 'loading') {
      return normalized && !groupMatches ? [] : [group];
    }
    const rows = group.result.rows.filter(row => {
      const searchMatches =
        !normalized ||
        groupMatches ||
        row.field.toLocaleLowerCase().includes(normalized) ||
        row.value.toLocaleLowerCase().includes(normalized) ||
        Object.entries(row.labels).some(([key, value]) => `${key}=${value}`.toLocaleLowerCase().includes(normalized));
      return searchMatches;
    });
    return rows.length === 0 ? [] : [{ ...group, result: { ...group.result, rows } }];
  });
}

export function availableFavoriteGroups(evidence: MonitorMetricWorkbenchController['state']['favoriteCollection']) {
  return new Set(evidence.kind === 'ready' ? evidence.items.filter(item => item.available).map(item => item.key) : []);
}
