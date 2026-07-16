/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type ExplorePageResult<T> = { content: T[]; totalElements: number; totalPages: number; number: number; size: number };

export type TraceRow = {
  traceId: string; rootSpanId: string | null; serviceName: string | null; serviceNamespace: string | null;
  rootSpanName: string | null; durationNanos: number | null; status: string | null; startTime: number | null;
  errorSpanCount: number; resourceAttributes: Record<string, string> | null;
};
export type TraceEvent = { timeUnixNano: number | null; name: string | null; attributes: Record<string, JsonValue> | null; droppedAttributesCount: number | null };
export type TraceLink = { traceId: string | null; spanId: string | null; traceState: string | null; attributes: Record<string, JsonValue> | null; droppedAttributesCount: number | null };
export type CodeNavigationHint = { repositoryUrl: string | null; provider: string | null; defaultPath: string | null; searchQuery: string | null; label: string | null };
export type TraceSpan = {
  traceId: string | null; spanId: string | null; parentSpanId: string | null; spanName: string | null;
  serviceName: string | null; status: string | null; spanKind: string | null; statusMessage: string | null;
  traceState: string | null; scopeName: string | null; scopeVersion: string | null; durationNanos: number | null;
  startTime: number | null; highlighted: boolean; resourceAttributes: Record<string, string> | null;
  spanAttributes: Record<string, string> | null; events: TraceEvent[] | null; links: TraceLink[] | null;
  codeNavigationHint: CodeNavigationHint | null;
};
export type TraceDetail = TraceRow & { spans: TraceSpan[] | null };

export type LogRow = {
  timeUnixNano: number | null; observedTimeUnixNano: number | null; severityNumber: number | null;
  severityText: string | null; body: JsonValue; attributes: Record<string, JsonValue> | null;
  droppedAttributesCount: number | null; traceId: string | null; spanId: string | null; traceFlags: number | null;
  resource: Record<string, JsonValue> | null; resourceSchemaUrl: string | null;
  instrumentationScope: { name: string | null; version: string | null; attributes: Record<string, JsonValue> | null; droppedAttributesCount: number | null } | null;
  scopeSchemaUrl: string | null;
};

export type MetricField = { name: string | null; type: 'number' | 'string' | 'time' | 'bool' | null; unit: string | null };
export type MetricFrame = { schema: { fields: MetricField[] | null; labels: Record<string, string> | null; meta: Record<string, string> | null } | null; data: JsonValue[][] | null };
export type MetricConsole = {
  context: { entityId: number | null; entityType: string | null; entityName: string | null; serviceName: string | null;
    serviceNamespace: string | null; environment: string | null; operationName: string | null; start: number | null; end: number | null } | null;
  query: string | null; datasource: string | null; queryMode: string | null;
  results: { refId: string | null; status: number | null; msg: string | null; frames: MetricFrame[] | null } | null;
  stats: { totalSeries: number; nonEmptySeries: number; latestObservedAt: number | null } | null;
  emptyStateReason: string | null; errorMessage: string | null;
};

export class ExploreSignalContractError extends Error {
  constructor(message: string) { super(message); this.name = 'ExploreSignalContractError'; }
}
export class ExploreSignalMissingError extends Error {
  constructor() { super('Explore signal detail is missing'); this.name = 'ExploreSignalMissingError'; }
}

export function parseMetricConsole(value: unknown): MetricConsole {
  const source = record(value, 'metric console');
  return {
    context: nullable(source.context, parseMetricContext), query: nullableString(source.query, 'query'),
    datasource: nullableString(source.datasource, 'datasource'), queryMode: nullableString(source.queryMode, 'queryMode'),
    results: nullable(source.results, parseMetricResults), stats: nullable(source.stats, parseMetricStats),
    emptyStateReason: nullableString(source.emptyStateReason, 'emptyStateReason'),
    errorMessage: nullableString(source.errorMessage, 'errorMessage')
  };
}

export function parseLogPage(value: unknown, pageIndex: number, pageSize: number): ExplorePageResult<LogRow> {
  return parsePage(value, pageIndex, pageSize, parseLogRow);
}

export function parseTracePage(value: unknown, pageIndex: number, pageSize: number): ExplorePageResult<TraceRow> {
  const page = parsePage(value, pageIndex, pageSize, parseTraceRow);
  const ids = new Set<string>();
  page.content.forEach(row => {
    const traceId = row.traceId;
    if (!traceId) fail('traceId is required');
    if (ids.has(traceId)) fail('trace page contains duplicate traceId');
    ids.add(traceId);
  });
  return page;
}

export function parseTraceDetail(value: unknown, expectedTraceId: string): TraceDetail {
  if (value == null) throw new ExploreSignalMissingError();
  const source = record(value, 'trace detail');
  const row = parseTraceRow(source);
  if (row.traceId !== expectedTraceId) fail('trace detail identity does not match request');
  const spans = nullableArray(source.spans, parseTraceSpan, 'spans');
  const spanIds = new Set<string>();
  spans?.forEach(span => {
    if (!span.spanId) fail('trace spanId is required');
    if (span.traceId !== null && span.traceId !== expectedTraceId) fail('span traceId does not match request');
    if (spanIds.has(span.spanId)) fail('trace detail contains duplicate spanId');
    spanIds.add(span.spanId);
  });
  return { ...row, spans };
}

function parsePage<T>(value: unknown, pageIndex: number, pageSize: number, item: (value: unknown) => T): ExplorePageResult<T> {
  const source = record(value, 'Spring page');
  const number = integer(source.number, 'number', 0);
  const size = integer(source.size, 'size', 1);
  const totalElements = integer(source.totalElements, 'totalElements', 0);
  const totalPages = integer(source.totalPages, 'totalPages', 0);
  if (number !== pageIndex || size !== pageSize) fail('Spring page does not match request');
  if (totalPages !== Math.ceil(totalElements / size)) fail('Spring page totals are inconsistent');
  const contentBound = Math.min(size, Math.max(0, totalElements - number * size));
  if (!Array.isArray(source.content) || source.content.length > contentBound) fail('Spring page content is invalid');
  if (number < totalPages && source.content.length === 0 && totalElements > 0) fail('Spring page content is missing');
  return { content: source.content.map(item), totalElements, totalPages, number, size };
}

function parseTraceRow(value: unknown): TraceRow {
  const source = record(value, 'trace');
  const traceId = requiredString(source.traceId, 'traceId');
  return {
    traceId, rootSpanId: nullableString(source.rootSpanId, 'rootSpanId'), serviceName: nullableString(source.serviceName, 'serviceName'),
    serviceNamespace: nullableString(source.serviceNamespace, 'serviceNamespace'), rootSpanName: nullableString(source.rootSpanName, 'rootSpanName'),
    durationNanos: nullableLong(source.durationNanos, 'durationNanos', 0), status: nullableString(source.status, 'status'),
    startTime: nullableInteger(source.startTime, 'startTime', 0), errorSpanCount: integer(source.errorSpanCount, 'errorSpanCount', 0),
    resourceAttributes: nullableStringMap(source.resourceAttributes, 'resourceAttributes')
  };
}

function parseTraceSpan(value: unknown): TraceSpan {
  const source = record(value, 'trace span');
  return {
    traceId: nullableString(source.traceId, 'span.traceId'), spanId: nullableString(source.spanId, 'spanId'),
    parentSpanId: nullableString(source.parentSpanId, 'parentSpanId'), spanName: nullableString(source.spanName, 'spanName'),
    serviceName: nullableString(source.serviceName, 'serviceName'), status: nullableString(source.status, 'status'),
    spanKind: nullableString(source.spanKind, 'spanKind'), statusMessage: nullableString(source.statusMessage, 'statusMessage'),
    traceState: nullableString(source.traceState, 'traceState'), scopeName: nullableString(source.scopeName, 'scopeName'),
    scopeVersion: nullableString(source.scopeVersion, 'scopeVersion'), durationNanos: nullableLong(source.durationNanos, 'durationNanos', 0),
    startTime: nullableInteger(source.startTime, 'startTime', 0), highlighted: boolean(source.highlighted, 'highlighted'),
    resourceAttributes: nullableStringMap(source.resourceAttributes, 'resourceAttributes'), spanAttributes: nullableStringMap(source.spanAttributes, 'spanAttributes'),
    events: nullableArray(source.events, parseTraceEvent, 'events'), links: nullableArray(source.links, parseTraceLink, 'links'),
    codeNavigationHint: nullable(source.codeNavigationHint, parseCodeNavigationHint)
  };
}

function parseTraceEvent(value: unknown): TraceEvent {
  const source = record(value, 'trace event');
  return { timeUnixNano: nullableLong(source.timeUnixNano, 'timeUnixNano', 0), name: nullableString(source.name, 'name'),
    attributes: nullableJsonMap(source.attributes, 'attributes'), droppedAttributesCount: nullableInteger(source.droppedAttributesCount, 'droppedAttributesCount', 0) };
}

function parseTraceLink(value: unknown): TraceLink {
  const source = record(value, 'trace link');
  return { traceId: nullableString(source.traceId, 'traceId'), spanId: nullableString(source.spanId, 'spanId'),
    traceState: nullableString(source.traceState, 'traceState'), attributes: nullableJsonMap(source.attributes, 'attributes'),
    droppedAttributesCount: nullableInteger(source.droppedAttributesCount, 'droppedAttributesCount', 0) };
}

function parseCodeNavigationHint(value: unknown): CodeNavigationHint {
  const source = record(value, 'code navigation hint');
  return { repositoryUrl: nullableString(source.repositoryUrl, 'repositoryUrl'), provider: nullableString(source.provider, 'provider'),
    defaultPath: nullableString(source.defaultPath, 'defaultPath'), searchQuery: nullableString(source.searchQuery, 'searchQuery'), label: nullableString(source.label, 'label') };
}

function parseLogRow(value: unknown): LogRow {
  const source = record(value, 'log entry');
  return {
    timeUnixNano: nullableLong(source.timeUnixNano, 'timeUnixNano', 0), observedTimeUnixNano: nullableLong(source.observedTimeUnixNano, 'observedTimeUnixNano', 0),
    severityNumber: nullableInteger(source.severityNumber, 'severityNumber', 0), severityText: nullableString(source.severityText, 'severityText'),
    body: json(source.body, 'body'), attributes: nullableJsonMap(source.attributes, 'attributes'),
    droppedAttributesCount: nullableInteger(source.droppedAttributesCount, 'droppedAttributesCount', 0), traceId: nullableString(source.traceId, 'traceId'),
    spanId: nullableString(source.spanId, 'spanId'), traceFlags: nullableInteger(source.traceFlags, 'traceFlags', 0),
    resource: nullableJsonMap(source.resource, 'resource'), resourceSchemaUrl: nullableString(source.resourceSchemaUrl, 'resourceSchemaUrl'),
    instrumentationScope: nullable(source.instrumentationScope, parseInstrumentationScope), scopeSchemaUrl: nullableString(source.scopeSchemaUrl, 'scopeSchemaUrl')
  };
}

function parseInstrumentationScope(value: unknown) {
  const source = record(value, 'instrumentation scope');
  return { name: nullableString(source.name, 'name'), version: nullableString(source.version, 'version'),
    attributes: nullableJsonMap(source.attributes, 'attributes'), droppedAttributesCount: nullableInteger(source.droppedAttributesCount, 'droppedAttributesCount', 0) };
}

function parseMetricContext(value: unknown) {
  const source = record(value, 'metric context');
  return { entityId: nullableInteger(source.entityId, 'entityId', 0), entityType: nullableString(source.entityType, 'entityType'),
    entityName: nullableString(source.entityName, 'entityName'), serviceName: nullableString(source.serviceName, 'serviceName'),
    serviceNamespace: nullableString(source.serviceNamespace, 'serviceNamespace'), environment: nullableString(source.environment, 'environment'),
    operationName: nullableString(source.operationName, 'operationName'), start: nullableInteger(source.start, 'start', 0), end: nullableInteger(source.end, 'end', 0) };
}

function parseMetricResults(value: unknown) {
  const source = record(value, 'metric results');
  return { refId: nullableString(source.refId, 'refId'), status: nullableInteger(source.status, 'status'), msg: nullableString(source.msg, 'msg'),
    frames: nullableArray(source.frames, parseMetricFrame, 'frames') };
}

function parseMetricFrame(value: unknown): MetricFrame {
  const source = record(value, 'metric frame');
  const data = nullableArray(source.data, row => {
    if (!Array.isArray(row)) fail('metric data row must be an array');
    return row.map((cell, index) => json(cell, `metric cell ${index}`));
  }, 'data');
  return { schema: nullable(source.schema, parseMetricSchema), data };
}

function parseMetricSchema(value: unknown) {
  const source = record(value, 'metric schema');
  return { fields: nullableArray(source.fields, parseMetricField, 'fields'), labels: nullableStringMap(source.labels, 'labels'), meta: nullableStringMap(source.meta, 'meta') };
}

function parseMetricField(value: unknown): MetricField {
  const source = record(value, 'metric field');
  const type = nullableString(source.type, 'field.type');
  if (type !== null && !['number', 'string', 'time', 'bool'].includes(type)) fail('metric field type is unsupported');
  return { name: nullableString(source.name, 'field.name'), type: type as MetricField['type'], unit: nullableString(source.unit, 'field.unit') };
}

function parseMetricStats(value: unknown) {
  const source = record(value, 'metric stats');
  const totalSeries = integer(source.totalSeries, 'totalSeries', 0);
  const nonEmptySeries = integer(source.nonEmptySeries, 'nonEmptySeries', 0);
  if (nonEmptySeries > totalSeries) fail('metric stats are inconsistent');
  return { totalSeries, nonEmptySeries, latestObservedAt: nullableInteger(source.latestObservedAt, 'latestObservedAt', 0) };
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value as Record<string, unknown>;
}
function nullable<T>(value: unknown, parser: (value: unknown) => T): T | null { return value == null ? null : parser(value); }
function nullableArray<T>(value: unknown, parser: (value: unknown) => T, label: string): T[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value.map(parser);
}
function requiredString(value: unknown, label: string): string {
  const result = nullableString(value, label);
  if (!result) fail(`${label} is required`);
  return result;
}
function nullableString(value: unknown, label: string): string | null { if (value == null) return null; if (typeof value !== 'string') fail(`${label} must be a string`); return value; }
function integer(value: unknown, label: string, minimum?: number) { if (!Number.isSafeInteger(value) || minimum !== undefined && (value as number) < minimum) fail(`${label} must be an integer`); return value as number; }
function nullableInteger(value: unknown, label: string, minimum?: number) { return value == null ? null : integer(value, label, minimum); }
function nullableLong(value: unknown, label: string, minimum?: number) {
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || minimum !== undefined && value < minimum) {
    fail(`${label} must be an integer`);
  }
  return value;
}
function boolean(value: unknown, label: string) { if (typeof value !== 'boolean') fail(`${label} must be boolean`); return value; }
function nullableStringMap(value: unknown, label: string): Record<string, string> | null {
  if (value == null) return null;
  const source = record(value, label);
  return Object.fromEntries(Object.entries(source).map(([key, item]) => { if (typeof item !== 'string') fail(`${label}.${key} must be a string`); return [key, item]; }));
}
function nullableJsonMap(value: unknown, label: string): Record<string, JsonValue> | null {
  if (value == null) return null;
  const parsed = json(value, label);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail(`${label} must be an object`);
  return parsed;
}
function json(value: unknown, label: string, seen = new Set<object>()): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return jsonArray(value, label, seen);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) return jsonRecord(value, label, seen);
  fail(`${label} must be JSON-safe`);
}
function jsonArray(value: unknown[], label: string, seen: Set<object>): JsonValue[] {
  if (seen.has(value)) fail(`${label} must be JSON-safe`);
  seen.add(value);
  const result = value.map((item, index) => json(item, `${label}[${index}]`, seen));
  seen.delete(value);
  return result;
}
function jsonRecord(value: object, label: string, seen: Set<object>): Record<string, JsonValue> {
  if (seen.has(value)) fail(`${label} must be JSON-safe`);
  seen.add(value);
  const result = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, json(item, `${label}.${key}`, seen)]));
  seen.delete(value);
  return result;
}
function fail(message: string): never { throw new ExploreSignalContractError(message); }
