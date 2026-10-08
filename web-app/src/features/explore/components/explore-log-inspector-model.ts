/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { logInspectorAnalysisTarget } from '../model/explore-log-inspector-analysis';
import { validLogColumns, type LogColumn } from '../model/explore-log-columns';
import type { JsonValue, LogRow } from '../model/explore-signal-contract';
import { logInspectorFilterPatch, type LogInspectorFilterTarget } from '../model/explore-log-inspector-filter';
import { builtinInspectorFields, type InspectorField } from '../model/explore-log-inspector-builtin-model';
export type { InspectorField } from '../model/explore-log-inspector-builtin-model';

type MetadataScope = Extract<LogInspectorFilterTarget['scope'], 'resource' | 'attribute'>;

export function logInspectorFields(row: LogRow): InspectorField[] {
  const fields: InspectorField[] = [
    {
      key: 'message',
      path: ['body'],
      value: row.body == null ? null : fieldValue(row.body),
      column: { kind: 'message' }
    },
    { key: 'time', path: ['timeUnixNano'], value: row.timeUnixNano, column: { kind: 'time' } },
    ...builtinInspectorFields(row)
  ];
  flattenFields('resource', row.resource, fields, 'resource');
  flattenFields('attributes', row.attributes, fields, 'attribute');
  flattenFields('instrumentationScope', row.instrumentationScope, fields);
  return fields;
}

function flattenFields(
  prefix: string,
  value: JsonValue | Record<string, unknown> | null,
  target: InspectorField[],
  scope?: MetadataScope,
  columnScope: Extract<LogColumn, { kind: 'field' }>['scope'] = prefix === 'resource'
    ? 'resource'
    : prefix === 'attributes'
      ? 'attributes'
      : 'instrumentationScope',
  path: string[] = [],
  queryPath: string[] = [],
  collection = false,
  unsupportedCollection = false
) {
  if (!value) return;
  for (const [key, nested] of Object.entries(value)) {
    if (nested == null) continue;
    appendField(
      prefix,
      value,
      key,
      nested,
      target,
      scope,
      columnScope,
      path,
      queryPath,
      collection,
      unsupportedCollection
    );
  }
}

function appendField(
  prefix: string,
  parent: JsonValue | Record<string, unknown>,
  key: string,
  value: unknown,
  target: InspectorField[],
  scope: MetadataScope | undefined,
  columnScope: Extract<LogColumn, { kind: 'field' }>['scope'],
  path: string[],
  queryPath: string[],
  collection: boolean,
  unsupportedCollection: boolean
) {
  const fieldKey = `${prefix}.${key}`;
  const nextQueryPath = Array.isArray(parent) ? queryPath : [...queryPath, key];
  const isCollection = collection || Array.isArray(parent) || Array.isArray(value);
  const unsupported = unsupportedCollection || (Array.isArray(parent) && Array.isArray(value));
  if (isPlainObject(value) || Array.isArray(value))
    flattenFields(
      fieldKey,
      value,
      target,
      scope,
      columnScope,
      [...path, key],
      nextQueryPath,
      isCollection,
      unsupported
    );
  else
    target.push(
      scalarField(
        fieldKey,
        value as JsonValue,
        scope,
        columnScope,
        [...path, key],
        nextQueryPath,
        isCollection,
        unsupported
      )
    );
}

function scalarField(
  key: string,
  value: JsonValue,
  scope: MetadataScope | undefined,
  columnScope: Extract<LogColumn, { kind: 'field' }>['scope'],
  path: string[],
  queryPath: string[],
  collection: boolean,
  unsupportedCollection: boolean
): InspectorField {
  const filter = scalarFilter(scope, queryPath, value, collection, unsupportedCollection);
  const analysis =
    queryPath.length === 1 && !collection
      ? logInspectorAnalysisTarget(scope, queryPath[0]!, value, analysisContext(scope, queryPath[0]!))
      : undefined;
  const column: LogColumn = { kind: 'field', scope: columnScope, path };
  const showColumn =
    !collection &&
    ['string', 'number', 'boolean'].includes(typeof value) &&
    validLogColumns([{ kind: 'message' }, column]);
  return {
    ...(showColumn ? { column } : {}),
    key,
    path: [columnScope, ...path],
    value: fieldValue(value),
    ...(filter ? { filter } : {}),
    analysis
  };
}

function scalarFilter(
  scope: MetadataScope | undefined,
  path: string[],
  value: unknown,
  collection: boolean,
  unsupportedCollection: boolean
) {
  if (!scope || !filterScalar(value)) return undefined;
  const key = path[0]!;
  if (scope === 'attribute' && ['hertzbeat.ingest_id', 'hertzbeat.event_id', 'log.record.uid'].includes(key))
    return undefined;
  const target = { scope, key, value: String(value) };
  if (collection || path.length > 1)
    return {
      ...target,
      children: path.slice(1),
      collection: true,
      valueKind: unsupportedCollection ? ('unsupported' as const) : (typeof value as 'string' | 'number' | 'boolean')
    };
  const contextField = scope === 'resource' ? canonicalContextField(key) : undefined;
  const enriched = contextField ? { ...target, contextField } : target;
  return logInspectorFilterPatch({ searchSyntax: 'structured-v1' }, enriched, '=') ? enriched : undefined;
}

function filterScalar(value: unknown): value is string | number | boolean {
  return (
    typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fieldValue(value: JsonValue) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function canonicalContextField(key: string): LogInspectorFilterTarget['contextField'] {
  switch (key.replaceAll('.', '_')) {
    case 'service_name':
      return 'serviceName';
    case 'service_namespace':
      return 'serviceNamespace';
    case 'deployment_environment_name':
      return 'environment';
    default:
      return undefined;
  }
}

function analysisContext(scope: MetadataScope | undefined, key: string) {
  return scope === 'resource' ? canonicalContextField(key) : undefined;
}
