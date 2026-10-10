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

import type { MonitorHistoryChart, MonitorMetricWorkbenchController } from '../model/monitor-detail-model';

export function selectedCurrentValue(state: MonitorMetricWorkbenchController['state'], field: string) {
  const selectedRows = state.realtime.kind === 'ready' || state.realtime.kind === 'loading' ? state.realtime.rows : [];
  const groupRows = state.realtimeGroups.flatMap(group =>
    group.result.kind === 'ready' || group.result.kind === 'loading' ? group.result.rows : []
  );
  const row =
    selectedRows.find(candidate => candidate.field === field) ?? groupRows.find(candidate => candidate.field === field);
  return { value: row?.value ?? '—', time: row?.collectedAt ?? row?.time ?? null };
}

export function historyStatistics(chart: MonitorHistoryChart) {
  if (chart.result.kind !== 'ready') return undefined;
  const values = chart.result.rows.flatMap(series => series.points.map(([, value]) => value)).filter(Number.isFinite);
  if (values.length === 0) return undefined;
  const format = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  return {
    minimum: format(Math.min(...values)),
    maximum: format(Math.max(...values)),
    average: format(values.reduce((total, value) => total + value, 0) / values.length),
    samples: values.length
  };
}

export function formatMetricTime(value: number | null) {
  return value == null
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(value);
}
