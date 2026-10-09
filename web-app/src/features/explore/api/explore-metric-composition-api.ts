/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { ApiMessageError } from '@/core/http/api-message';
import type { HertzBeatQueryFailure } from '@/platform/perses';
import { classifyExploreSignalError } from './explore-signal-api-model';
import type { ExactTimeWindow } from '@/shared/query-context';
import { ExploreSignalContractError, type MetricConsole } from '../model/explore-signal-contract';
import type { MetricExploreQuery } from '../model/explore-query';
import {
  metricOutputStep,
  metricPlanFromQuery,
  metricTemporalControl,
  shiftedMetricWindow,
  validateMetricPlan,
  type MetricQueryRow
} from '@/platform/perses';
import { metricResultState } from '../model/explore-signal-model';
import { executeMetricComposition } from '@/platform/perses';
import type { MetricSourceResult } from '@/platform/perses';

type Loader = (query: MetricExploreQuery, signal?: AbortSignal) => Promise<MetricConsole>;
export async function loadMetricComposition(
  query: MetricExploreQuery,
  window: ExactTimeWindow,
  loader: Loader,
  signal?: AbortSignal
): Promise<MetricConsole> {
  const plan = metricPlanFromQuery(query);
  if (validateMetricPlan(plan).length) throw new ExploreSignalContractError();
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  const composition = await executeMetricComposition(
    plan,
    row => loadSource(query, row, window, loader, signal),
    signal
  );
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  return {
    context: null,
    query: query.metricPlan ?? null,
    datasource: null,
    queryMode: 'composition',
    results: null,
    stats: null,
    emptyStateReason: null,
    errorMessage: null,
    composition
  };
}

async function loadSource(
  query: MetricExploreQuery,
  row: MetricQueryRow,
  window: ExactTimeWindow,
  loader: Loader,
  signal?: AbortSignal
): Promise<MetricSourceResult> {
  try {
    const shiftedWindow = shiftedMetricWindow(window, row.timeShiftSeconds);
    if (!shiftedWindow) throw new ApiMessageError('observability_query_context_invalid', { status: 400 });
    const evidence = await loader(
      {
        ...query,
        metricPlan: undefined,
        metricView: undefined,
        windowMode: undefined,
        start: shiftedWindow.from,
        end: shiftedWindow.to,
        query: row.metric,
        metricFilter: row.metricFilter,
        aggregation: row.aggregation,
        groupBy: row.groupBy,
        temporalAggregation: metricTemporalControl(row),
        step: metricOutputStep(row)?.toString()
      },
      signal
    );
    if (
      evidence.context &&
      (evidence.context.start !== shiftedWindow.from || evidence.context.end !== shiftedWindow.to)
    )
      throw new ExploreSignalContractError();
    const state = metricResultState(evidence);
    const offsetMs = (row.timeShiftSeconds ?? 0) * 1000;
    const series =
      state.kind === 'ready'
        ? state.series.map(item => ({
            ...item,
            refId: row.refId,
            key: `${row.refId}:${item.key}`,
            name: row.timeShiftSeconds ? `${item.name} [-${row.timeShiftSeconds}s]` : item.name,
            points: offsetMs ? item.points.map(point => [Number(point[0]) + offsetMs, ...point.slice(1)]) : item.points
          }))
        : [];
    return {
      refId: row.refId,
      state: state.kind,
      series,
      provenance: { datasource: evidence.datasource, queryMode: evidence.queryMode }
    } satisfies MetricSourceResult;
  } catch (error) {
    const failure = metricSourceFailure(error);
    return {
      refId: row.refId,
      state:
        failure.kind === 'contract_error'
          ? 'contract_error'
          : failure.kind === 'invalid_request'
            ? 'invalid_query'
            : 'error',
      failure,
      series: []
    } satisfies MetricSourceResult;
  }
}

function metricSourceFailure(error: unknown): HertzBeatQueryFailure {
  const reason = classifyExploreSignalError(error);
  if (reason === 'permission') return { kind: 'permission', messageKey: 'perses.query.permission', retryable: false };
  if (error instanceof ApiMessageError && error.status === 429)
    return { kind: 'overloaded', messageKey: 'perses.query.overloaded', retryable: true };
  if (reason === 'contract_error')
    return { kind: 'contract_error', messageKey: 'perses.query.contract', retryable: false };
  if (reason === 'invalid_query')
    return { kind: 'invalid_request', messageKey: 'perses.query.invalid', retryable: false };
  return { kind: 'unavailable', messageKey: 'perses.query.unavailable', retryable: true };
}
