/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import { isMetricQueryName } from '../model/explore-field-contract';
import { apiMessageGet } from '@/core/http/api-message';
import type { ExactTimeWindow } from '@/shared/query-context';
import { exactTimeRangePatch } from '../model/explore-model';
import type { MetricExploreQuery } from '../model/explore-query';
import { METRIC_INVENTORY_LIMIT, type MetricLabels } from '../model/explore-metric-inventory';
import { ExploreSignalContractError } from '../model/explore-signal-contract';
import { buildSignalApiPath } from './explore-api';
import { metricContextSchema } from './explore-metric-schema';

const labelsSchema = z
  .object({
    context: metricContextSchema,
    source: z.literal('greptime-labels'),
    state: z.enum(['ready', 'unavailable', 'scope_too_large']),
    limit: z.number().int().min(1).max(METRIC_INVENTORY_LIMIT),
    truncated: z.boolean(),
    items: z.array(z.string()).max(METRIC_INVENTORY_LIMIT)
  })
  .refine(
    value => value.items.length <= value.limit && (value.state === 'ready' || (!value.items.length && !value.truncated))
  );

export function buildMetricLabelsPath(query: MetricExploreQuery, window: ExactTimeWindow, label?: string) {
  const patch = exactTimeRangePatch(window, query.timeZone ?? 'UTC');
  if (
    !patch ||
    !query.query ||
    !isMetricQueryName(query.query) ||
    (label !== undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(label))
  )
    throw new ExploreSignalContractError();
  const params = new URLSearchParams(
    buildSignalApiPath({
      ...query,
      start: window.from,
      end: window.to,
      timeZone: patch.timeZone,
      windowMode: undefined
    }).split('?')[1]
  );
  for (const field of ['aggregation', 'temporalAggregation', 'groupBy', 'step']) params.delete(field);
  params.set('limit', String(METRIC_INVENTORY_LIMIT));
  if (label !== undefined) params.set('label', label);
  return `/api/ingestion/otlp/metrics/labels?${params}`;
}

export async function loadMetricLabels(
  query: MetricExploreQuery,
  window: ExactTimeWindow,
  label?: string,
  signal?: AbortSignal
): Promise<MetricLabels> {
  const path = buildMetricLabelsPath(query, window, label);
  const result = labelsSchema.safeParse(await apiMessageGet(path, signal ? { signal } : undefined));
  if (!result.success || result.data.context.start !== window.from || result.data.context.end !== window.to)
    throw new ExploreSignalContractError();
  return result.data;
}
