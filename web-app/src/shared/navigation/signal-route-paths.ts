/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

/** Historical signal pages still represented by persisted shared query assets. */
export const legacySignalRoutes = [
  { id: 'legacy-metrics-manage', path: '/metrics/manage', signal: 'metrics' },
  { id: 'legacy-trace-manage', path: '/trace/manage', signal: 'traces' },
  { id: 'legacy-log-manage', path: '/log/manage', signal: 'logs' },
  { id: 'legacy-ingestion-otlp-metrics', path: '/ingestion/otlp/metrics', signal: 'metrics' }
] as const;

export function normalizeSavedQueryKey(value: string | null | undefined) {
  return value && /^[A-Za-z0-9_.:-]{1,128}$/u.test(value) ? value : undefined;
}
