/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { executeMetricComposition } from '../metrics/metric-composition-executor';
import { parseMetricAggregation, parseMetricStep } from '../metrics/metric-fields';
import type { MetricSourceResult } from '../metrics/metric-composition';
import { shiftedMetricWindow } from '../metrics/metric-time-shift';
import { metricOutputStep, metricTemporalControl } from '../metrics/metric-plan';
import type {
  HertzBeatMetricCompositionQuery,
  HertzBeatMetricQuery,
  HertzBeatQueryOutcome
} from './hertzbeat-query-contract';
import type { HertzBeatMetricData } from './hertzbeat-query-schema';

type ScalarLoader = (query: HertzBeatMetricQuery) => Promise<HertzBeatQueryOutcome<HertzBeatMetricData>>;
export async function queryMetricComposition(
  query: HertzBeatMetricCompositionQuery,
  load: ScalarLoader,
  signal?: AbortSignal
) {
  const data = await executeMetricComposition(
    query.plan,
    async row => {
      const aggregation = parseMetricAggregation(row.aggregation);
      const step = parseMetricStep(metricOutputStep(row)?.toString());
      const shiftedWindow = shiftedMetricWindow(query.timeWindow, row.timeShiftSeconds);
      if (!shiftedWindow) {
        return metricSourceOutcome(row.refId, {
          state: 'error',
          error: { kind: 'invalid_request', messageKey: 'perses.query.invalid', retryable: false }
        });
      }
      const result = await load({
        signal: 'metrics',
        queryKind: 'time-series',
        timeWindow: shiftedWindow,
        context: query.context,
        limit: query.limit,
        metric: {
          name: row.metric.trim(),
          metricFilter: row.metricFilter,
          groupBy: row.groupBy,
          aggregation: aggregation.valid ? aggregation.value : undefined,
          stepSeconds: step.valid && step.value ? Number(step.value) : undefined,
          temporalAggregation: metricTemporalControl(row),
          operationName: query.operationName
        }
      });
      return metricSourceOutcome(row.refId, result, row.timeShiftSeconds);
    },
    signal
  );
  const failure = data.sources[0]?.failure;
  if (failure && data.sources.every(source => source.failure?.kind === failure.kind))
    return { state: 'error' as const, error: failure };
  return { state: 'ready' as const, data, truncated: 'unknown' as const };
}

export function metricSourceOutcome(
  refId: string,
  result: HertzBeatQueryOutcome<HertzBeatMetricData>,
  timeShiftSeconds = 0
): MetricSourceResult {
  return {
    refId,
    ...(result.state === 'error' ? { failure: result.error } : {}),
    state:
      result.state === 'error'
        ? result.error.kind === 'contract_error'
          ? 'contract_error'
          : result.error.kind === 'invalid_request'
            ? 'invalid_query'
            : 'error'
        : result.state,
    series:
      result.state === 'ready'
        ? result.data.series.map(series => ({
            ...series,
            refId: refId,
            key: `${refId}:${series.key}`,
            name: timeShiftSeconds ? `${series.name} [-${timeShiftSeconds}s]` : series.name,
            points: series.points.map(point => [point.timestamp + timeShiftSeconds * 1000, point.value])
          }))
        : []
  } satisfies MetricSourceResult;
}
