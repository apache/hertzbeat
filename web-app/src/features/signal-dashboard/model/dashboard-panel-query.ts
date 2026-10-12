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

import isEqual from 'lodash/isEqual';
import { encodeMetricView } from '@/platform/perses';
import { DEFAULT_TRACE_VIEW, encodeTraceView } from '@/platform/perses';
import { dashboardTableViewParams, dashboardTraceDisplay } from './dashboard-table-display';
import { encodeMetricPlan } from '@/platform/perses';

import { hertzBeatQuerySchema, type HertzBeatDashboardDocument, type HertzBeatQuery } from '@/platform/perses';
import { canonicalSignalDashboardPath } from '@/shared/navigation/signal-dashboard-paths';
import {
  buildInvestigationSignalHandoffPath,
  normalizeInvestigationTimeZone,
  type ExactTimeWindow
} from '@/shared/query-context';

type DashboardVariableValues = Partial<Record<'serviceName' | 'serviceNamespace' | 'environment', string>>;
export type DashboardPanelQueryInput = {
  panel: HertzBeatDashboardDocument['spec']['panels'][string];
  variables: HertzBeatDashboardDocument['spec']['variables'];
  variableValues: DashboardVariableValues;
  timeWindow: ExactTimeWindow;
};
export type DashboardPanelQueryResolution = { state: 'ready'; query: HertzBeatQuery } | { state: 'invalid' };

/** Resolve only declared whole-value placeholders; the stored document remains unchanged. */
export function resolveDashboardPanelQuery(input: DashboardPanelQueryInput): DashboardPanelQueryResolution {
  const { panel, variables, variableValues, timeWindow } = input;
  const values = resolveVariableValues(variables, variableValues);
  if (!values) return { state: 'invalid' };
  const template = panel.spec.queries[0].spec.plugin.spec.query;
  if (template.queryKind === 'gantt' && template.context !== undefined) return { state: 'invalid' };
  const context = resolvePanelContext(template.context, values);
  if (!context) return { state: 'invalid' };
  const query = { ...template, ...(template.context ? { context } : {}), timeWindow };
  // Analytical payloads are literal data; only context supports variable substitution.
  const serialized = JSON.stringify(query.signal === 'logs' && query.queryKind === 'analysis' ? context : query);
  if (/\$\{|\$__/u.test(serialized)) return { state: 'invalid' };
  const parsed = hertzBeatQuerySchema.safeParse(query);
  return parsed.success && isEqual(parsed.data, query) ? { state: 'ready', query: parsed.data } : { state: 'invalid' };
}

function resolvePanelContext(contextTemplate: HertzBeatQuery['context'], values: Map<string, string>) {
  const context = { ...contextTemplate };
  for (const name of ['serviceName', 'serviceNamespace', 'environment'] as const) {
    if (context[name] !== '${' + name + '}') continue;
    const value = values.get(name);
    if (value === undefined) return undefined;
    if (value === '') delete context[name];
    else context[name] = value;
  }
  return context;
}

function resolveVariableValues(
  variables: DashboardPanelQueryInput['variables'],
  variableValues: DashboardVariableValues
) {
  const names = new Set<string>(variables.map(variable => variable.spec.name));
  if (names.size !== variables.length || Object.keys(variableValues).some(name => !names.has(name))) return undefined;
  const values = new Map<string, string>();
  for (const variable of variables) {
    const value =
      variableValues[variable.spec.name] ??
      (variable.kind === 'TextVariable' ? variable.spec.value : variable.spec.defaultValue);
    if (!validVariableValue(value)) return undefined;
    if (variable.kind === 'ListVariable' && !variable.spec.plugin.spec.values.includes(value)) return undefined;
    values.set(variable.spec.name, value);
  }
  return values;
}

function validVariableValue(value: string) {
  return (
    typeof value === 'string' &&
    value.length <= 256 &&
    value.trim() === value &&
    !value.includes('${') &&
    !value.includes('$__')
  );
}

export type DashboardPanelExploreLink =
  | { state: 'ready'; path: string }
  | {
      state: 'unsupported';
      reason: 'query' | 'context' | 'time-zone' | 'return-path';
    };

/** Explore uses the same conditions and exact window with its own result pagination. */
export function buildDashboardPanelExploreLink(
  query: HertzBeatQuery,
  timeZone: string,
  returnTo?: string,
  plugin?: DashboardPanelQueryInput['panel']['spec']['plugin']
): DashboardPanelExploreLink {
  const reason = unsupportedExploreReason(query, timeZone, returnTo);
  if (reason) return { state: 'unsupported', reason };
  const context = query.context ?? {};
  const dashboardReturnTo = returnTo === undefined ? undefined : canonicalSignalDashboardPath(returnTo);
  const url = new URL(
    buildInvestigationSignalHandoffPath(query.signal, context, { ...query.timeWindow, timeZone }),
    'https://hertzbeat.local'
  );
  const set = (key: string, value: string | number | boolean | undefined) => {
    if (value !== undefined && value !== false) url.searchParams.set(key, String(value));
  };
  for (const [key, value] of Object.entries(panelExploreFields(query))) set(key, value);
  for (const [key, value] of Object.entries(panelDisplayFields(query, plugin))) set(key, value);
  set('dashboardReturnTo', dashboardReturnTo);
  return { state: 'ready', path: `${url.pathname}?${url.searchParams}` };
}

function exploreSupportsContext(query: HertzBeatQuery) {
  const context = query.context ?? {};
  if (context.entityType || (query.queryKind === 'gantt' && query.context !== undefined)) return false;
  return !context.collectorId || Boolean(context.serviceName && context.serviceNamespace && context.environment);
}

function panelExploreFields(query: HertzBeatQuery): Record<string, string | number | boolean | undefined> {
  if (query.signal === 'metrics') {
    if (query.queryKind === 'composition')
      return { metricPlan: encodeMetricPlan(query.plan), operationName: query.operationName };
    return {
      query: query.metric.name,
      operationName: query.metric.operationName,
      aggregation: query.metric.aggregation,
      temporalAggregation: query.metric.temporalAggregation,
      step: query.metric.stepSeconds,
      metricFilter: query.metric.metricFilter,
      groupBy: query.metric.groupBy
    };
  }
  if (query.signal === 'logs')
    return {
      ...(query.queryKind === 'analysis'
        ? {
            logAnalysis: JSON.stringify(query.analysis),
            logGroupSelection: query.logGroupSelection ? JSON.stringify(query.logGroupSelection) : undefined
          }
        : {}),
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
  if (query.queryKind === 'gantt') return { traceId: query.traceId, spanId: query.spanId };
  return {
    query: query.operationName,
    endExclusive: query.endExclusive,
    errorOnly: query.errorOnly,
    minDurationMs: query.minDurationMs,
    maxDurationMs: query.maxDurationMs,
    spanScope: query.spanScope,
    hideInternal: query.hideInternal,
    resourceFilter: query.resourceFilter,
    attributeFilter: query.attributeFilter,
    sort: query.queryKind === 'groups' ? undefined : query.sort
  };
}
function panelTraceView(
  query: Extract<HertzBeatQuery, { signal: 'traces' }>,
  plugin: DashboardPanelQueryInput['panel']['spec']['plugin'] | undefined
) {
  const group = query.queryKind === 'groups' ? query : undefined;
  return encodeTraceView({
    ...DEFAULT_TRACE_VIEW,
    ...(plugin ? dashboardTraceDisplay(plugin) : {}),
    mode: group ? 'groups' : 'list',
    population: group?.population ?? (query.queryKind === 'spans' ? 'matched_spans' : 'matched_traces'),
    groupBy: group?.groupBy ?? 'serviceName'
  });
}

function unsupportedExploreReason(
  query: HertzBeatQuery,
  timeZone: string,
  returnTo: string | undefined
): Extract<DashboardPanelExploreLink, { state: 'unsupported' }>['reason'] | undefined {
  const parsed = hertzBeatQuerySchema.safeParse(query);
  if (!parsed.success || !isEqual(parsed.data, query)) return 'query';
  if (query.queryKind === 'groups' && query.orderBy === 'error-count-desc') return 'query';
  if (normalizeInvestigationTimeZone(timeZone) !== timeZone) return 'time-zone';
  if (!exploreSupportsContext(query)) return 'context';
  if (returnTo !== undefined && canonicalSignalDashboardPath(returnTo) === undefined) return 'return-path';
  return undefined;
}

function panelDisplayFields(
  query: HertzBeatQuery,
  plugin: DashboardPanelQueryInput['panel']['spec']['plugin'] | undefined
): Record<string, string> {
  if (query.signal === 'traces' && query.queryKind !== 'gantt') return { traceView: panelTraceView(query, plugin) };
  if (query.signal === 'metrics' && plugin?.kind === 'TimeSeriesChart' && plugin.spec.metricView)
    return { metricView: encodeMetricView(plugin.spec.metricView) };
  if (query.signal === 'logs' && query.queryKind === 'analysis')
    return query.returnView ? { logView: JSON.stringify(query.returnView) } : {};
  return plugin && query.signal === 'logs' ? dashboardTableViewParams(plugin) : {};
}
