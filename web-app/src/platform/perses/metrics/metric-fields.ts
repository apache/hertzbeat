/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
export const EXPLORE_METRIC_AGGREGATIONS = ['avg', 'sum', 'min', 'max', 'count'] as const;

export type ExploreMetricAggregation = (typeof EXPLORE_METRIC_AGGREGATIONS)[number];
export type OptionalExploreField<T> = { valid: true; value: T | undefined } | { valid: false };

const MAX_METRIC_STEP_SECONDS = 86_400;

export function parseMetricAggregation(
  value: string | null | undefined
): OptionalExploreField<ExploreMetricAggregation> {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  if (!normalized) return { valid: true, value: undefined };
  const aggregation = EXPLORE_METRIC_AGGREGATIONS.find(candidate => candidate === normalized);
  return aggregation ? { valid: true, value: aggregation } : { valid: false };
}

export function parseMetricStep(value: string | null | undefined): OptionalExploreField<string> {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return { valid: true, value: undefined };
  if (!/^[1-9]\d*$/.test(normalized)) return { valid: false };
  const seconds = Number(normalized);
  return Number.isSafeInteger(seconds) && seconds <= MAX_METRIC_STEP_SECONDS
    ? { valid: true, value: normalized }
    : { valid: false };
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function isMetricQueryName(value: string) {
  return /^[A-Za-z_:][A-Za-z0-9_:.-]*$/u.test(value);
}
