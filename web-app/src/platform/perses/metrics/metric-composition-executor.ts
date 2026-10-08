/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { validateMetricPlan, type MetricPlan, type MetricQueryRow } from './metric-plan';
import { evaluateMetricComposition } from './metric-evaluation';
import type { MetricComposition, MetricSourceResult } from './metric-composition';

export async function executeMetricComposition(
  plan: MetricPlan,
  load: (row: MetricQueryRow) => Promise<MetricSourceResult>,
  signal?: AbortSignal
): Promise<MetricComposition> {
  if (validateMetricPlan(plan).length) throw new Error('Invalid metric composition');
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  const sources = await Promise.all(plan.queries.map(load));
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  return { plan, sources, formulas: evaluateMetricComposition(plan, sources) };
}
