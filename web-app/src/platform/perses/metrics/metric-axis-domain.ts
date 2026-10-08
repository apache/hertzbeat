/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
export type MetricAxisDomain = { min?: number | undefined; max?: number | undefined };
export function metricAxisBoundsValid(domain: MetricAxisDomain) {
  if (![domain.min, domain.max].every(value => value === undefined || Number.isFinite(value))) return false;
  return (
    domain.min === undefined ||
    domain.max === undefined ||
    (domain.min < domain.max && Number.isFinite(domain.max - domain.min))
  );
}
export function metricAxisDataExtent(values: Iterable<number | null>): MetricAxisDomain | undefined {
  let min = Infinity,
    max = -Infinity;
  for (const value of values) {
    if (value === null) continue;
    if (!Number.isFinite(value)) return { min: NaN, max: NaN };
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return min === Infinity ? undefined : { min, max };
}
