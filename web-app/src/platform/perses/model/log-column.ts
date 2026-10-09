/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { logFieldSortSchema } from '@/shared/log-sort';
import { z } from 'zod';
export const MAX_LOG_COLUMNS = 8;
const builtin = z.object({ kind: z.enum(['time', 'severity', 'service', 'message', 'traceId', 'spanId']) }).strict();
const field = z
  .object({
    kind: z.literal('field'),
    scope: z.enum(['resource', 'attributes', 'instrumentationScope']),
    path: z.array(z.string().min(1).max(256)).min(1).max(8)
  })
  .strict();
export const logColumnSchema = z.union([builtin, field]);
export type LogColumn = z.infer<typeof logColumnSchema>;
export type LogColumnControls = { columns: LogColumn[]; onColumnsChange: (columns: LogColumn[]) => void };
export const DEFAULT_LOG_COLUMNS: LogColumn[] = [
  { kind: 'time' },
  { kind: 'severity' },
  { kind: 'service' },
  { kind: 'message' }
];
export function logColumnId(value: LogColumn) {
  return JSON.stringify(value.kind === 'field' ? ['field', value.scope, value.path] : [value.kind]);
}
const columns = z
  .array(logColumnSchema)
  .min(1)
  .max(MAX_LOG_COLUMNS)
  .refine(
    values => values.some(value => value.kind === 'message') && new Set(values.map(logColumnId)).size === values.length
  );
export function validLogColumns(value: unknown): value is LogColumn[] {
  return columns.safeParse(value).success;
}

export function logColumnSortField(column: LogColumn): string | undefined {
  if (column.kind === 'service') return 'builtin:serviceName';
  if (column.kind === 'severity') return 'builtin:severityCategory';
  if (column.kind !== 'field' || column.path.length !== 1 || column.scope === 'instrumentationScope') return undefined;
  const field = `${column.scope === 'attributes' ? 'attribute' : 'resource'}:${column.path[0]}`;
  return logFieldSortSchema.safeParse({ version: 1, field, type: 'text', direction: 'asc' }).success
    ? field
    : undefined;
}
