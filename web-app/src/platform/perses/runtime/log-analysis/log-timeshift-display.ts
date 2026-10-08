/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { formatInTimeZone } from 'date-fns-tz';
export function formatComparisonTimestamp(value: number, timeZone?: string) {
  return formatInTimeZone(
    value,
    timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    'yyyy-MM-dd HH:mm:ss.SSS XXX'
  );
}
