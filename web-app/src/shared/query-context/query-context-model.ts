/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { isSensitiveFieldName } from '@/core/security/sensitive-field';
import { applicationRoutePaths } from '@/shared/navigation/app-paths';

export type QueryContext = {
  collectorId?: string | undefined;
  serviceName?: string | undefined;
  serviceNamespace?: string | undefined;
  environment?: string | undefined;
  instance?: string | undefined;
  endpoint?: string | undefined;
};

export type QueryContextField = keyof QueryContext;
export type SignalKind = 'metrics' | 'logs' | 'traces';
export type ExactTimeWindow = { from: number; to: number };

export const QUERY_CONTEXT_FIELDS = {
  collectorId: 'collectorId',
  serviceName: 'serviceName',
  serviceNamespace: 'serviceNamespace',
  environment: 'environment',
  instance: 'instance',
  endpoint: 'endpoint'
} as const satisfies Record<QueryContextField, QueryContextField>;

const contextFields = Object.values(QUERY_CONTEXT_FIELDS);

export function parseQueryContext(params: URLSearchParams): QueryContext {
  return Object.fromEntries(
    contextFields.flatMap(field => {
      const value = normalizeValue(params.get(field));
      return value ? [[field, value]] : [];
    })
  );
}

export function writeQueryContext(source: URLSearchParams, context: QueryContext): URLSearchParams {
  rejectSensitiveRecord(context);
  const params = new URLSearchParams(source);
  for (const key of [...params.keys()]) {
    if (contextFields.includes(key as QueryContextField) || isSensitiveFieldName(key)) params.delete(key);
  }
  for (const field of contextFields) {
    const value = normalizeValue(context[field]);
    if (value) params.set(field, value);
  }
  return params;
}

export function mergeQueryContext(current: QueryContext, patch: Partial<QueryContext>): QueryContext {
  rejectSensitiveRecord(patch);
  const normalizedPatch = normalizeContext(patch);
  const firstChanged = contextFields.findIndex(
    field => Object.hasOwn(patch, field) && normalizedPatch[field] !== normalizeValue(current[field])
  );
  const next = normalizeContext(current);
  if (firstChanged >= 0) {
    for (const field of contextFields.slice(firstChanged)) delete next[field];
  }
  for (const field of contextFields) {
    if (!Object.hasOwn(patch, field)) continue;
    const value = normalizedPatch[field];
    if (value) next[field] = value;
    else delete next[field];
  }
  return next;
}

export function clearQueryContext(context: QueryContext, from: QueryContextField): QueryContext {
  const start = contextFields.indexOf(from);
  if (start < 0) return normalizeContext(context);
  const next = normalizeContext(context);
  for (const field of contextFields.slice(start)) delete next[field];
  return next;
}

export function queryContextScopeKey(context: QueryContext) {
  const normalized = normalizeContext(context);
  return JSON.stringify(contextFields.map(field => normalized[field] ?? ''));
}

export function buildSignalHandoffPath(signal: SignalKind, context: QueryContext, window: ExactTimeWindow) {
  requireExactWindow(window);
  rejectSensitiveRecord(context);
  const params = new URLSearchParams({ signal });
  append(params, 'serviceName', context.serviceName);
  append(params, 'serviceNamespace', context.serviceNamespace);
  append(params, 'environment', context.environment);
  append(params, 'collectorId', context.collectorId);
  append(params, 'instance', context.instance);
  append(params, 'endpoint', context.endpoint);
  params.set('start', String(window.from));
  params.set('end', String(window.to));
  return `${applicationRoutePaths.explore}?${params.toString()}`;
}

export function scopedQueryKey(
  prefix: readonly unknown[],
  context: QueryContext,
  window: ExactTimeWindow | undefined,
  refreshRevision: number
) {
  return [
    ...prefix,
    {
      context: queryContextScopeKey(context),
      window: window ? `${window.from}:${window.to}` : 'none',
      refreshRevision
    }
  ] as const;
}

function normalizeContext(context: Partial<QueryContext>): QueryContext {
  return Object.fromEntries(
    contextFields.flatMap(field => {
      const value = normalizeValue(context[field]);
      return value ? [[field, value]] : [];
    })
  );
}

function normalizeValue(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function rejectSensitiveRecord(record: Record<string, unknown>) {
  const sensitive = Object.keys(record).find(isSensitiveFieldName);
  if (sensitive) throw new Error(`Sensitive query context field is forbidden: ${sensitive}`);
}

function append(params: URLSearchParams, field: QueryContextField, value: string | undefined) {
  const normalized = normalizeValue(value);
  if (normalized) params.set(field, normalized);
}

function requireExactWindow(window: ExactTimeWindow) {
  if (
    !Number.isSafeInteger(window.from) ||
    !Number.isSafeInteger(window.to) ||
    window.from <= 0 ||
    window.from >= window.to
  ) {
    throw new Error('Cross-signal handoff requires an exact time window');
  }
}
