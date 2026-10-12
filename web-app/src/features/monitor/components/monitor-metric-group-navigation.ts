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
