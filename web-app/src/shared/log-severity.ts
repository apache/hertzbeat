/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
const LEVELS = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as const;
export function logSeverityLabel(row: { severityText?: string | null; severityNumber?: number | null }) {
  if (row.severityText?.trim()) return row.severityText.toUpperCase();
  return logSeverityCategory(row.severityNumber);
}
export function logSeverityCategory(number: number | null | undefined) {
  if (number == null || !Number.isInteger(number) || number < 1 || number > 24) return undefined;
  return LEVELS[Math.floor((number - 1) / 4)];
}
