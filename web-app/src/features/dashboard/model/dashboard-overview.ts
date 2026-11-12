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

import { buildExplorePath, readSavedQuery, type SavedQueryRecord } from '@/features/explore';
import { buildAlertInvestigationPath, type AlertGroup } from '@/features/alert';
import { alertRoutePaths } from '@/shared/navigation/app-paths';

export function monitorDistribution(total: number, counts: number[]) {
  if (counts.length !== 3 || ![total, ...counts].every(value => Number.isSafeInteger(value) && value >= 0)) return null;
  const known = counts.reduce((sum, value) => sum + value, 0);
  return known <= total ? { total, counts } : null;
}

export function savedContinueItems(records: SavedQueryRecord[], favoriteKeys: string[], recentKeys: string[]) {
  const byKey = new Map(records.map(record => [record.viewKey, record]));
  const favorites = new Set(favoriteKeys);
  return [...new Set(recentKeys)]
    .flatMap(key => {
      const record = byKey.get(key);
      if (!record) return [];
      const read = readSavedQuery(record);
      return read.kind === 'ready'
        ? [
            {
              record,
              favorite: favorites.has(key),
              target: buildExplorePath({
                signal: record.signal,
                savedView: key,
                timeRange: 'last-15m',
                ...(record.signal === 'logs' ? { searchSyntax: 'structured-v1' } : {})
              })
            }
          ]
        : [];
    })
    .slice(0, 3);
}

export type DashboardOverview = {
  distribution: ReturnType<typeof monitorDistribution>;
  monitorState: 'ready' | 'error' | 'loading';
  downMonitors: import('@/features/monitor').Monitor[];
  downState: 'ready' | 'error' | 'loading';
  alerts: AlertGroup[];
  alertTotal: number | undefined;
  alertState: 'ready' | 'error' | 'loading';
  savedState: 'ready' | 'error' | 'loading';
  continueItems: ReturnType<typeof savedContinueItems>;
  favoriteMetrics: SavedQueryRecord[];
  recordOpen: (key: string) => void;
  refreshing: boolean;
  refresh: () => Promise<unknown>;
};

export function dashboardAlertTarget(group: AlertGroup) {
  for (const alert of group.alerts) {
    if (alert.status !== 'firing') continue;
    const target = buildAlertInvestigationPath(alert, 'UTC', alertRoutePaths.center);
    if (target) return target;
  }
  return `${alertRoutePaths.center}?status=firing`;
}

export function dashboardReadState(query: {
  error: unknown;
  isFetching: boolean;
  isPending: boolean;
  isSuccess: boolean;
}): 'ready' | 'loading' | 'error' {
  if (query.isFetching || query.isPending) return 'loading';
  if (query.error) return 'error';
  return query.isSuccess ? 'ready' : 'error';
}

export function dashboardAlertObjectName(group: AlertGroup) {
  return group.commonLabels?.['service.name'] || group.commonLabels?.service_name || '—';
}
