/* Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. See the NOTICE file distributed with this work for additional information regarding copyright ownership. */
export const TRACE_COLUMNS = [
  'traceName',
  'service',
  'spanCount',
  'errorCount',
  'duration',
  'startTime',
  'traceId'
] as const;
export type HertzBeatTraceColumn = (typeof TRACE_COLUMNS)[number];
export type HertzBeatTraceDisplay = { columns: HertzBeatTraceColumn[]; density: 'compact' | 'comfortable' };
export const DEFAULT_TRACE_COLUMNS: HertzBeatTraceColumn[] = ['traceName', 'spanCount', 'duration', 'startTime'];
export function validTraceColumns(value: unknown): value is HertzBeatTraceColumn[] {
  return (
    Array.isArray(value) &&
    value.length <= TRACE_COLUMNS.length &&
    value.includes('traceName') &&
    new Set(value).size === value.length &&
    value.every(column => TRACE_COLUMNS.some(key => key === column))
  );
}
