/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
export function normalizeLogBucketValue(value: number | null, intervalMs: number, transform: 'throughput' | undefined) {
  if (value === null || transform === undefined) return value;
  const normalized = value / (intervalMs / 1000);
  return Number.isFinite(normalized) ? normalized : null;
}
export function isPartialLogBucket(start: number, intervalMs: number, window: { start: number; end: number }) {
  return start < window.start || start + intervalMs > window.end;
}
