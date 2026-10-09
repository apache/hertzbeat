/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import { logFacetFieldSchema } from '@/shared/log-field';
import { validLogCalculatedMode } from './explore-log-calculated';
export const logTransactionStateSchema = z
  .object({
    version: z.literal(1),
    field: z.string().max(266).refine(validTransactionField),
    limit: z.number().int().min(1).max(100),
    order: z.literal('related-count-desc')
  })
  .strict();
export type LogTransactionState = z.infer<typeof logTransactionStateSchema>;
export function validTransactionField(field: string) {
  const separator = field.indexOf(':');
  const source = field.slice(0, separator),
    key = field.slice(separator + 1);
  return (
    source !== 'builtin' &&
    logFacetFieldSchema.safeParse({ id: field, source, key }).success &&
    !['hertzbeat_workspace_id', 'workspace_id', 'hertzbeat_entity_id'].includes(key.replaceAll('.', '_'))
  );
}
export function parseLogTransactions(raw: string | undefined): LogTransactionState | undefined {
  if (raw === undefined || raw.length > 2048) return undefined;
  try {
    const value = logTransactionStateSchema.parse(JSON.parse(raw));
    const keys = [...raw.matchAll(/("(?:\\.|[^"\\])*")\s*:/gu)].map(match => JSON.parse(match[1]!) as unknown);
    return keys.length === 4 && new Set(keys).size === 4 ? value : undefined;
  } catch {
    return undefined;
  }
}
export function validLogTransactionMode(mode: string | undefined, raw: string | undefined) {
  if (
    mode !== undefined &&
    mode !== 'fields' &&
    mode !== 'transactions' &&
    mode !== 'patterns' &&
    mode !== 'calculated'
  )
    return false;
  return raw === undefined ? mode !== 'transactions' : parseLogTransactions(raw) !== undefined;
}

export function validLogTransactionQuery(query: {
  logAggregation?: string | undefined;
  logTransactions?: string | undefined;
  logCalculated?: string | undefined;
  live?: boolean | undefined;
}) {
  return (
    validLogTransactionMode(query.logAggregation, query.logTransactions) &&
    validLogCalculatedMode(query.logAggregation, query.logCalculated) &&
    !(['transactions', 'patterns', 'calculated'].includes(query.logAggregation ?? '') && query.live)
  );
}
