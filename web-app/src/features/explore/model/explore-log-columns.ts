/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { logSeverityLabel } from '@/shared/log-severity';
import type { TFunction } from 'i18next';
import type { LogRow } from './explore-signal-contract';
import { logBody, logServiceName, logTimestampMs } from './explore-signal-model';
import { formatShortLocalTime } from '@/shared/time';
export { MAX_LOG_COLUMNS, DEFAULT_LOG_COLUMNS, logColumnId, validLogColumns } from '@/platform/perses';
export type { LogColumn, LogColumnControls } from '@/platform/perses';
import { DEFAULT_LOG_COLUMNS, logColumnId, logColumnSchema, type LogColumn } from '@/platform/perses';
export function logColumnLabel(value: LogColumn, t: TFunction, standardizeHeaders = true): string {
  if (value.kind === 'field') return fieldColumnLabel(value, t, standardizeHeaders);
  if (standardizeHeaders) return t(`explore.logColumns.fields.${value.kind}`);
  return value.kind === 'time' || value.kind === 'message' ? t(`explore.logColumns.fields.${value.kind}`) : value.kind;
}

function fieldColumnLabel(value: Extract<LogColumn, { kind: 'field' }>, t: TFunction, standardizeHeaders: boolean) {
  if (value.scope === 'resource' && value.path.join('.') === 'host.name')
    return standardizeHeaders ? t('explore.logFacets.core.host') : 'host';
  if (value.scope === 'attributes') return `@${value.path.join('.')}`;
  if (!standardizeHeaders) return `${value.scope === 'resource' ? 'resource.' : 'scope.'}${value.path.join('.')}`;
  return `${value.scope}[${value.path.map(part => JSON.stringify(part)).join('][')}]`;
}
export function logColumnValue(row: LogRow, value: LogColumn): string | undefined {
  if (value.kind === 'field') return fieldColumnValue(row, value);
  if (value.kind === 'time') {
    const stamp = logTimestampMs(row);
    return stamp == null ? undefined : formatShortLocalTime(stamp, { milliseconds: true });
  }
  if (value.kind === 'message') return logBody(row) ?? undefined;
  if (value.kind === 'service') return logServiceName(row);
  if (value.kind === 'severity') return logSeverityLabel(row);
  return row[value.kind] ?? undefined;
}
function scalarText(value: unknown) {
  if (typeof value === 'number' && !Number.isFinite(value)) return undefined;
  return typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number'
    ? String(value)
    : undefined;
}
export function availableLogColumns(
  rows: Pick<LogRow, 'resource' | 'attributes' | 'instrumentationScope'>[]
): LogColumn[] {
  const found = new Map<string, LogColumn>(
    [...DEFAULT_LOG_COLUMNS, { kind: 'traceId' } as const, { kind: 'spanId' } as const].map(value => [
      logColumnId(value),
      value
    ])
  );
  for (const row of rows)
    for (const scope of ['resource', 'attributes', 'instrumentationScope'] as const)
      collectColumns(row[scope], scope, [], found);
  return [...found.values()];
}
function collectColumns(
  value: unknown,
  scope: Extract<LogColumn, { kind: 'field' }>['scope'],
  path: string[],
  found: Map<string, LogColumn>
) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || path.length >= 8 || found.size >= 100) return;
  for (const [key, item] of Object.entries(value)) {
    if (found.size >= 100) break;
    const next = [...path, key];
    if (scalarText(item) !== undefined) {
      const candidate: LogColumn = { kind: 'field', scope, path: next };
      if (logColumnSchema.safeParse(candidate).success) found.set(logColumnId(candidate), candidate);
    } else collectColumns(item, scope, next, found);
  }
}

function fieldColumnValue(row: LogRow, value: Extract<LogColumn, { kind: 'field' }>) {
  let current: unknown = row[value.scope];
  for (const key of value.path) {
    if (!current || typeof current !== 'object' || !Object.hasOwn(current, key)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return scalarText(current);
}
