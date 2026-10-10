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

import type { HertzBeatDashboardDocument } from '@/platform/perses';

type Panel = HertzBeatDashboardDocument['spec']['panels'][string];
type PanelContext = Panel['spec']['queries'][0]['spec']['plugin']['spec']['query']['context'];
export const dashboardPanelKinds = [
  'TimeSeriesChart',
  'StatChart',
  'GaugeChart',
  'Table',
  'LogsTable',
  'TraceTable',
  'TracingGanttChart'
] as const;
export type DashboardPanelKind = (typeof dashboardPanelKinds)[number];

export function newDashboardPanel(kind: DashboardPanelKind, title: string, context?: PanelContext): Panel {
  const definitions = {
    TimeSeriesChart: {
      kind: 'TimeSeriesQuery',
      plugin: 'HertzBeatTimeSeriesQuery',
      query: { signal: 'metrics', queryKind: 'time-series', metric: { name: '' } }
    },
    StatChart: {
      kind: 'TimeSeriesQuery',
      plugin: 'HertzBeatTimeSeriesQuery',
      query: { signal: 'metrics', queryKind: 'time-series', metric: { name: '' } }
    },
    GaugeChart: {
      kind: 'TimeSeriesQuery',
      plugin: 'HertzBeatTimeSeriesQuery',
      query: { signal: 'metrics', queryKind: 'time-series', metric: { name: '' } }
    },
    Table: {
      kind: 'TimeSeriesQuery',
      plugin: 'HertzBeatTimeSeriesQuery',
      query: { signal: 'metrics', queryKind: 'time-series', metric: { name: '' } }
    },
    LogsTable: {
      kind: 'LogQuery',
      plugin: 'HertzBeatLogQuery',
      query: { signal: 'logs', queryKind: 'table', limit: 100 }
    },
    TraceTable: {
      kind: 'TraceQuery',
      plugin: 'HertzBeatTraceQuery',
      query: { signal: 'traces', queryKind: 'table', limit: 100 }
    },
    TracingGanttChart: {
      kind: 'TraceQuery',
      plugin: 'HertzBeatTraceQuery',
      query: { signal: 'traces', queryKind: 'gantt', traceId: '' }
    }
  } as const;
  const query = definitions[kind];
  const definition = {
    ...query.query,
    ...(kind !== 'TracingGanttChart' && context !== undefined ? { context: { ...context } } : {})
  };
  return {
    kind: 'Panel',
    spec: {
      display: { name: title },
      plugin: newPanelPlugin(kind),
      queries: [{ kind: query.kind, spec: { plugin: { kind: query.plugin, spec: { version: 1, query: definition } } } }]
    }
  };
}

function newPanelPlugin(kind: DashboardPanelKind): Panel['spec']['plugin'] {
  if (kind === 'StatChart') return { kind, spec: { calculation: 'last-number', format: { unit: 'decimal' } } };
  if (kind === 'GaugeChart')
    return { kind, spec: { calculation: 'last-number', format: { unit: 'decimal' }, max: 100 } };
  if (kind === 'Table') return { kind, spec: { density: 'compact' } };
  return { kind, spec: {} };
}

export function addEmptyDashboardPanel(
  document: HertzBeatDashboardDocument,
  id: string,
  title: string
): HertzBeatDashboardDocument {
  const next = structuredClone(document);
  const panel = newDashboardPanel('LogsTable', title);
  const context = Object.fromEntries(
    next.spec.variables.map(variable => [variable.spec.name, '${' + variable.spec.name + '}'])
  );
  if (Object.keys(context).length) Object.assign(panel.spec.queries[0].spec.plugin.spec.query, { context });
  next.spec.panels[id] = panel;
  const items = next.spec.layouts[0].spec.items;
  items.push({
    x: 0,
    y: Math.max(0, ...items.map(item => item.y + item.height)),
    width: 24,
    height: 8,
    content: { $ref: '#/spec/panels/' + id }
  });
  return next;
}
