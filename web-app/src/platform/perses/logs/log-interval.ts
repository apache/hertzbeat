/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
export const LOG_ANALYSIS_INTERVALS = [
  1000, 5000, 10000, 30000, 60000, 300000, 900000, 1800000, 3600000, 21600000, 86400000
] as const;
export const logIntervalSchema = z
  .number()
  .refine(value => LOG_ANALYSIS_INTERVALS.some(interval => interval === value));
export function validLogIntervalGrid(window: { start: number; end: number }, interval: number | null) {
  return (
    interval === null ||
    (logIntervalSchema.safeParse(interval).success &&
      Math.floor(window.end / interval) - Math.floor(window.start / interval) + 1 <= 60)
  );
}
export function requestedLogInterval(analysis: { representation: string; intervalMs?: number | undefined }) {
  return analysis.representation === 'timeseries' ? analysis.intervalMs : undefined;
}
export function matchesLogInterval(
  actual: number | null,
  analysis: { representation: string; intervalMs?: number | undefined }
) {
  const expected = requestedLogInterval(analysis);
  return expected === undefined || expected === actual;
}
