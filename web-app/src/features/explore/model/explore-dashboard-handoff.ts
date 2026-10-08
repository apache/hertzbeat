/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { readLogNumericRange, validLogNumericRange } from '@/shared/log-numeric-range';
import { readLogGroupSelection, validLogGroupSelection } from '@/shared/log-group-selection';
import { readLogSort } from './explore-log-order';
import { blockedHandoffMode, validLogPanelQuery } from './explore-dashboard-handoff-mode';

import {
  parseHertzBeatDashboardDocument,
  metricPlanFromQuery,
  validateMetricPlan,
  parseLogView,
  parseLogAnalysis,
  DEFAULT_LOG_ANALYSIS
} from '@/platform/perses';
import { safeDashboardExploreReturnPath, type DashboardPanelHandoff } from '@/shared/navigation/signal-dashboard-paths';
import type { ExactTimeWindow } from '@/shared/query-context';
import { parseMetricAggregation, parseMetricStep } from './explore-field-contract';

import { readTraceView } from './explore-trace-view';
import { panelOptions, analyticalPanelHeight } from './explore-dashboard-panel-presentation';

import { buildExplorePath, mergeExploreQuery } from './explore-model';
import {
  exploreHandoffState,
  type ExploreQuery,
  type LogExploreQuery,
  type MetricExploreQuery,
  type TraceExploreQuery
} from './explore-query';

type HandoffOptions = { timeWindow: ExactTimeWindow; timeZone: string; title: string; dashboardKey: string };
type HandoffResult =
  | { state: 'ready'; handoff: DashboardPanelHandoff; pinned: boolean }
  | {
      state: 'unsupported';
      reason?:
        | 'log-group-selection'
        | 'log-transactions'
        | 'log-patterns'
        | 'log-calculated'
        | 'log-calculated-v2'
        | 'log-subquery'
        | 'trace-structure';
    };

export function buildExploreDashboardHandoff(query: ExploreQuery, options: HandoffOptions): HandoffResult {
  const grouped = blockedHandoffMode(query);
  if (grouped) return grouped;
  let controlled;
  try {
    if (
      query.signal === 'logs' &&
      query.logGroupSelection !== undefined &&
      (query.logAnalysis === undefined ? DEFAULT_LOG_ANALYSIS : parseLogAnalysis(query.logAnalysis)).representation ===
        'logs'
    )
      return { state: 'unsupported', reason: 'log-group-selection' };
    controlled = controlledPanelQuery(query);
  } catch {
    return { state: 'unsupported' };
  }
  if (!controlled) return { state: 'unsupported' };
  const returnTo = exactExploreReturnPath(query, options);
  if (!returnTo) return { state: 'unsupported' };
  const pinned = query.signal === 'traces' && Boolean(query.traceId);
  try {
    const document = parseHertzBeatDashboardDocument(panelDocument(query, controlled, pinned, options));
    return {
      state: 'ready',
      pinned,
      handoff: { version: 1, document, timeWindow: { ...options.timeWindow }, returnTo }
    };
  } catch {
    return { state: 'unsupported' };
  }
}

function exactExploreReturnPath(query: ExploreQuery, options: HandoffOptions) {
  const fixed = mergeExploreQuery(query, {
    start: options.timeWindow.from,
    end: options.timeWindow.to,
    timeZone: options.timeZone,
    windowMode: undefined,
    autoRefreshMs: undefined,
    pageIndex: undefined,
    // Changing the window ordinarily retires selection; this handoff keeps the inspected evidence.
    ...(query.signal !== 'metrics' ? { traceId: query.traceId, spanId: query.spanId } : {})
  });
  return exploreHandoffState(fixed) === 'invalid' ? undefined : safeDashboardExploreReturnPath(buildExplorePath(fixed));
}

function controlledPanelQuery(query: ExploreQuery) {
  if (query.signal === 'metrics') return metricPanelQuery(query);
  if (query.signal === 'logs') return logPanelQuery(query);
  return tracePanelQuery(query);
}

function metricPanelQuery(query: MetricExploreQuery) {
  if (query.metricPlan || query.metricView) {
    const plan = metricPlanFromQuery(query);
    if (validateMetricPlan(plan).length) return undefined;
    return {
      signal: 'metrics',
      queryKind: 'composition',
      ...panelContext(query),
      plan,
      ...definedFields({ operationName: query.operationName }),
      limit: 32
    };
  }
  const aggregation = parseMetricAggregation(query.aggregation);
  const step = parseMetricStep(query.step);
  if (!aggregation.valid || !step.valid) return undefined;
  return {
    signal: 'metrics',
    queryKind: 'time-series',
    ...panelContext(query),
    metric: definedFields({
      name: query.query ?? '',
      metricFilter: query.metricFilter,
      groupBy: query.groupBy,
      aggregation: aggregation.value,
      temporalAggregation: query.temporalAggregation,
      stepSeconds: step.value === undefined ? undefined : Number(step.value),
      operationName: query.operationName
    }),
    limit: 32
  };
}

function logPanelQuery(query: LogExploreQuery) {
  if (!validLogNumericRange(query.logNumericRange) || !validLogGroupSelection(query.logGroupSelection))
    return undefined;
  const analysis = query.logAnalysis === undefined ? DEFAULT_LOG_ANALYSIS : parseLogAnalysis(query.logAnalysis);
  const analytical = analysis.representation !== 'logs';
  if (!validLogPanelQuery(query, analytical)) return undefined;
  return {
    signal: 'logs',
    queryKind: analytical ? 'analysis' : 'table',
    ...(analytical
      ? {
          analysis,
          ...definedFields({
            logGroupSelection: readLogGroupSelection(query.logGroupSelection),
            returnView: query.logView === undefined ? undefined : parseLogView(query.logView)
          })
        }
      : {}),
    ...panelContext(query),
    ...definedFields({
      search: query.query,
      searchSyntax: query.searchSyntax,
      logCalculatedV2: query.logCalculatedV2,
      sort: query.sort,
      logSort: readLogSort(query.logSort),
      logNumericRange: readLogNumericRange(query.logNumericRange),
      severity: query.severityText,
      severityCategory: query.severityCategory,
      resourceFilter: query.resourceFilter,
      attributeFilter: query.attributeFilter,
      traceId: query.traceId,
      spanId: query.spanId,
      hideInternal: query.hideInternal,
      hideNoise: query.hideNoise
    }),
    limit: 20
  };
}

function tracePanelQuery(query: TraceExploreQuery) {
  // A selected trace is intentionally pinned. Its original investigation filters remain in returnTo.
  if (query.traceId) {
    return { signal: 'traces', queryKind: 'gantt', traceId: query.traceId, ...definedFields({ spanId: query.spanId }) };
  }
  if (query.spanId) return undefined;
  const view = readTraceView(query.traceView);
  if (!view) return undefined;
  const common = {
    signal: 'traces',
    ...panelContext(query),
    ...definedFields({
      operationName: query.query,
      endExclusive: query.endExclusive,
      errorOnly: query.errorOnly,
      minDurationMs: query.minDurationMs,
      maxDurationMs: query.maxDurationMs,
      spanScope: query.spanScope,
      hideInternal: query.hideInternal,
      resourceFilter: query.resourceFilter,
      attributeFilter: query.attributeFilter
    }),
    limit: 20
  };
  if (view.mode === 'groups')
    return {
      ...common,
      queryKind: 'groups',
      population: view.population,
      groupBy: view.groupBy,
      orderBy: 'count-desc'
    };
  return {
    ...common,
    queryKind: view.population === 'matched_spans' ? 'spans' : 'table',
    ...definedFields({ sort: query.sort === 'newest' ? undefined : query.sort })
  };
}

function panelContext(query: ExploreQuery) {
  const context = definedFields({
    entityId: query.entityId,
    serviceName: query.serviceName,
    serviceNamespace: query.serviceNamespace,
    environment: query.environment,
    collectorId: query.collectorId,
    instance: query.instance,
    endpoint: query.endpoint
  });
  return Object.keys(context).length ? { context } : {};
}

function definedFields(fields: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined && value !== ''));
}

function panelDocument(explore: ExploreQuery, query: object, pinned: boolean, options: HandoffOptions) {
  const analysis = explore.signal === 'logs' && explore.logAnalysis ? parseLogAnalysis(explore.logAnalysis) : undefined;
  const analytical = analysis !== undefined && analysis.representation !== 'logs';
  const series = analysis?.representation === 'timeseries';
  const height = analyticalPanelHeight(analysis);
  const [panelKind, queryKind, queryPlugin] = series
    ? ['TimeSeriesChart', 'TimeSeriesQuery', 'HertzBeatTimeSeriesQuery']
    : {
        metrics: ['TimeSeriesChart', 'TimeSeriesQuery', 'HertzBeatTimeSeriesQuery'],
        logs: ['LogsTable', 'LogQuery', 'HertzBeatLogQuery'],
        traces: [pinned ? 'TracingGanttChart' : 'TraceTable', 'TraceQuery', 'HertzBeatTraceQuery']
      }[explore.signal];
  return {
    kind: 'Dashboard',
    metadata: { name: options.dashboardKey, project: 'hertzbeat' },
    spec: {
      display: { name: options.title },
      duration: explore.timeRange.slice(5),
      timezone: options.timeZone,
      variables: [],
      panels: {
        explore: {
          kind: 'Panel',
          spec: {
            display: { name: options.title },
            plugin: { kind: panelKind, spec: analytical ? {} : panelOptions(explore, pinned) },
            queries: [{ kind: queryKind, spec: { plugin: { kind: queryPlugin, spec: { version: 1, query } } } }]
          }
        }
      },
      layouts: [
        {
          kind: 'Grid',
          spec: { items: [{ x: 0, y: 0, width: 24, height, content: { $ref: '#/spec/panels/explore' } }] }
        }
      ]
    }
  };
}
