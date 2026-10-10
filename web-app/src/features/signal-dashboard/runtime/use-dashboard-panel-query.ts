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

import { useEffect, useId, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryHertzBeatData, type HertzBeatQuery } from '@/platform/perses';
import { loadCalculatedPage, type LogExploreQuery } from '@/features/explore';
import { resolveDashboardPanelQuery, type DashboardPanelQueryInput } from '../model/dashboard-panel-query';

export function useDashboardPanelQuery(
  input: DashboardPanelQueryInput & {
    panelId: string;
    enabled: boolean;
    refreshRevision: number;
    timeZone?: string | undefined;
  }
) {
  const resolution = resolveDashboardPanelQuery(input);
  const queryIdentity = JSON.stringify([resolution, input.timeZone]);
  const instanceId = useId();
  const { panelId, refreshRevision } = input;
  const queryKey = useMemo(
    () => ['dashboard-panel', instanceId, panelId, queryIdentity, refreshRevision],
    [instanceId, panelId, queryIdentity, refreshRevision]
  );
  const client = useQueryClient();
  const enabled = input.enabled && resolution.state === 'ready';
  const result = useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (resolution.state !== 'ready') throw new Error('Invalid dashboard query');
      return executePanelQuery(resolution.query, signal, input.timeZone);
    },
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    gcTime: 0
  });
  useEffect(() => {
    if (!enabled) void client.cancelQueries({ queryKey, exact: true });
    return () => {
      void client.cancelQueries({ queryKey, exact: true });
    };
  }, [client, queryKey, enabled]);
  return { resolution, result, runtimeIdentity: queryIdentity };
}

async function executePanelQuery(query: HertzBeatQuery, signal: AbortSignal, timeZone?: string) {
  if (query.signal === 'metrics' && query.queryKind === 'composition')
    return { kind: 'metric-composition' as const, query, outcome: await queryHertzBeatData(query, { signal }) };
  if (query.signal === 'metrics')
    return { kind: 'metrics' as const, query, outcome: await queryHertzBeatData(query, { signal }) };
  if (query.signal === 'logs' && query.queryKind === 'analysis')
    return { kind: 'log-analysis' as const, query, outcome: await queryHertzBeatData(query, { signal }) };
  if (query.signal === 'logs' && query.logCalculatedV2) {
    return executeCalculatedPanel(query, signal, timeZone);
  }
  if (query.signal === 'logs')
    return { kind: 'logs' as const, query, outcome: await queryHertzBeatData(query, { signal }) };
  if (query.queryKind === 'spans')
    return { kind: 'trace-spans' as const, query, outcome: await queryHertzBeatData(query, { signal }) };
  if (query.queryKind === 'groups')
    return { kind: 'trace-groups' as const, query, outcome: await queryHertzBeatData(query, { signal }) };
  if (query.queryKind === 'table')
    return { kind: 'trace-table' as const, query, outcome: await queryHertzBeatData(query, { signal }) };
  return { kind: 'trace-gantt' as const, query, outcome: await queryHertzBeatData(query, { signal }) };
}

async function executeCalculatedPanel(
  query: Extract<HertzBeatQuery, { signal: 'logs'; queryKind: 'table' }>,
  signal: AbortSignal,
  timeZone?: string
) {
  const explore: LogExploreQuery = {
    signal: 'logs',
    timeRange: 'last-30m',
    start: query.timeWindow.from,
    end: query.timeWindow.to,
    timeZone: timeZone ?? 'UTC',
    ...query.context,
    query: query.search,
    searchSyntax: query.searchSyntax,
    logCalculatedV2: query.logCalculatedV2,
    logSort: query.logSort ? JSON.stringify(query.logSort) : undefined,
    logNumericRange: query.logNumericRange ? JSON.stringify(query.logNumericRange) : undefined,
    sort: query.sort,
    severityText: query.severity,
    severityCategory: query.severityCategory,
    resourceFilter: query.resourceFilter,
    attributeFilter: query.attributeFilter,
    traceId: query.traceId,
    spanId: query.spanId,
    hideInternal: query.hideInternal,
    hideNoise: query.hideNoise
  };
  const calculated = await loadCalculatedPage(explore, signal);
  const rows = calculated.result.rows.map(row => row.log);
  return {
    kind: 'calculated-logs' as const,
    query,
    calculated,
    outcome: rows.length
      ? {
          state: 'ready' as const,
          data: { rows, total: calculated.result.totalElements },
          truncated: calculated.result.totalElements > rows.length
        }
      : { state: 'empty' as const, truncated: false }
  };
}
