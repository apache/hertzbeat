/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { createNativeLogTrendResult } from '@/platform/perses';
import { readLogNumericRange, validLogNumericRange } from '@/shared/log-numeric-range';
import { readLogSort } from './explore-log-order';

import type {
  HertzBeatLogQueryOutcome,
  HertzBeatLogTableQuery,
  HertzBeatMetricQuery,
  HertzBeatMetricQueryOutcome,
  HertzBeatTraceTableQuery,
  HertzBeatTraceTableQueryOutcome
} from '@/platform/perses';
import { traceEvidenceSchema } from '@/shared/trace-evidence';
import type { ExactTimeWindow } from '@/shared/query-context';

import { exploreEvidenceScopeKey } from './explore-model';
import type { ExploreQuery, LogExploreQuery, MetricExploreQuery, TraceExploreQuery } from './explore-query';
import {
  TracePageResult,
  ExploreSignalContractError,
  type ExplorePageResult,
  type LogOverview,
  type LogRow,
  type LogTrend,
  type MetricConsole
} from './explore-signal-contract';
import { metricSeries } from './explore-signal-model';

type Result<Query, Outcome> = { query: Query; outcome: Outcome; runtimeIdentity: string };
type ReadyMetric = Extract<HertzBeatMetricQueryOutcome, { state: 'ready' }>;
type ReadyLogs = Extract<HertzBeatLogQueryOutcome, { state: 'ready' }>;
type ReadyTraces = Extract<HertzBeatTraceTableQueryOutcome, { state: 'ready' }>;

export function createExploreMetricPersesResult(
  query: MetricExploreQuery,
  console: MetricConsole,
  timeWindow: ExactTimeWindow,
  revision: number,
  readySeries = metricSeries(console)
): Result<HertzBeatMetricQuery, ReadyMetric> {
  const names = metricLegendNames(readySeries);
  const series = readySeries.map((item, index) => ({
    ...item,
    displayName: names[index]!,
    points: strictMetricPoints(item.points, item.allowsGaps)
  }));
  if (series.length === 0) throw new ExploreSignalContractError();
  requireMetricWindow(console, timeWindow);
  return {
    query: {
      signal: 'metrics',
      queryKind: 'time-series',
      timeWindow,
      metric: { name: 'hertzbeat_explore_snapshot' },
      limit: series.length
    },
    outcome: {
      state: 'ready',
      truncated: false,
      data: { timeWindow, source: console.datasource, series }
    },
    runtimeIdentity: evidenceIdentity(query, timeWindow, revision)
  };
}

function metricLegendNames(series: ReturnType<typeof metricSeries>) {
  const keys = [...new Set(series.flatMap(item => Object.keys(item.labels)))].filter(key => key !== '__name__');
  const differing = keys.filter(key => new Set(series.map(item => item.labels[key])).size > 1).sort();
  const sharedName = new Set(series.map(item => item.name)).size === 1;
  return series.map(item => {
    const labels = differing
      .filter(key => Object.hasOwn(item.labels, key))
      .map(key => `${key}=${JSON.stringify(item.labels[key])}`)
      .join(', ');
    if (labels) return sharedName ? labels : `${item.name}{${labels}}`;
    return series.length > 1 && sharedName && !differing.length ? item.key : item.name;
  });
}

function requireMetricWindow(console: MetricConsole, window: ExactTimeWindow) {
  if (console.context && (console.context.start !== window.from || console.context.end !== window.to)) {
    throw new ExploreSignalContractError();
  }
}

export function createExploreLogPersesResult(
  query: LogExploreQuery,
  page: ExplorePageResult<LogRow>,
  timeWindow: ExactTimeWindow,
  revision: number
): Result<HertzBeatLogTableQuery, ReadyLogs> {
  if (!validLogNumericRange(query.logNumericRange)) throw new ExploreSignalContractError();
  const logSort = readLogSort(query.logSort);
  if (query.logSort !== undefined && (!logSort || query.sort === 'oldest')) throw new ExploreSignalContractError();
  return {
    query: {
      signal: 'logs',
      queryKind: 'table',
      timeWindow,
      limit: page.size,
      ...(query.sort === 'oldest' ? { sort: 'oldest' as const } : {}),
      ...(logSort ? { logSort } : {}),
      ...(query.logNumericRange ? { logNumericRange: readLogNumericRange(query.logNumericRange) } : {})
    },
    outcome: {
      state: 'ready',
      truncated: page.totalElements > page.content.length,
      data: { rows: page.content, total: page.totalElements }
    },
    runtimeIdentity: evidenceIdentity(query, timeWindow, revision)
  };
}

export function createExploreTracePersesResult(
  query: TraceExploreQuery,
  page: TracePageResult,
  timeWindow: ExactTimeWindow,
  revision: number
): Result<HertzBeatTraceTableQuery, ReadyTraces> {
  if (page.content.some(row => !traceEvidenceSchema.safeParse(row).success)) throw new ExploreSignalContractError();
  return {
    query: { signal: 'traces', queryKind: 'table', timeWindow, limit: page.size },
    outcome: {
      state: 'ready',
      truncated: page.query?.truncated ?? 'unknown',
      data: { rows: page.content, total: page.totalElements }
    },
    runtimeIdentity: evidenceIdentity(query, timeWindow, revision)
  };
}

export function createLogTrendPersesResult(
  trend: LogTrend,
  timeWindow: ExactTimeWindow,
  runtimeIdentity: string
): Result<HertzBeatMetricQuery, ReadyMetric> {
  return createNativeLogTrendResult(trend, timeWindow, runtimeIdentity);
}

export function exploreOverviewRows(overview: LogOverview) {
  return [
    ['total', overview.totalCount],
    ['trace', overview.traceCount],
    ['debug', overview.debugCount],
    ['info', overview.infoCount],
    ['warn', overview.warnCount],
    ['error', overview.errorCount],
    ['fatal', overview.fatalCount]
  ] as const;
}

function evidenceIdentity(query: ExploreQuery, window: ExactTimeWindow, revision: number) {
  return JSON.stringify({ scope: exploreEvidenceScopeKey(query), window, revision });
}

function strictMetricPoints(points: unknown[][], allowsGaps = false) {
  return points.map(point => {
    if (!Array.isArray(point) || point.length < 2) throw new ExploreSignalContractError();
    const timestamp = strictFiniteNumber(point[0]);
    const value = allowsGaps && point[1] === null ? null : strictFiniteNumber(point[1]);
    if (!Number.isSafeInteger(timestamp) || timestamp <= 0) throw new ExploreSignalContractError();
    return { timestamp, value };
  });
}

function strictFiniteNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) throw new ExploreSignalContractError();
  return parsed;
}
