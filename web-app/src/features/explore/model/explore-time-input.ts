/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
export const inputFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS";
export function parseWallTime(value: string, zone: string, original: number) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/u.test(value)) return NaN;
  const [clock, fraction = ''] = value.split('.');
  const normalized = `${clock?.length === 16 ? `${clock}:00` : clock}.${fraction.padEnd(3, '0')}`;
  if (normalized === formatInTimeZone(original, zone, inputFormat)) return original;
  const date = fromZonedTime(normalized, zone);
  if (!Number.isFinite(date.getTime())) return NaN;
  return formatInTimeZone(date, zone, inputFormat) === normalized ? date.getTime() : NaN;
}
