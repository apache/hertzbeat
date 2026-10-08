/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { logSeverityLabel } from '@/shared/log-severity';
import { logSummary } from '@/shared/log-summary';
import type { TraceTableData } from '@perses-dev/trace-table-plugin';
import { traceEvidenceSchema } from '@/shared/trace-evidence';

import type { LogData, TraceData } from '@perses-dev/spec';
import type { AnyValue, KeyValue } from '@perses-dev/spec/dist/dashboard/query-type/otlp/common/v1/common';

import type { ExactTimeWindow } from '@/shared/query-context';

import type {
  HertzBeatLogRow,
  HertzBeatTableData,
  HertzBeatTraceDetail,
  HertzBeatTraceRow
} from '../datasource/hertzbeat-query-schema';

export class PersesSignalDataError extends Error {
  constructor() {
    super('Perses signal data is incomplete');
    this.name = 'PersesSignalDataError';
  }
}

export function toPersesLogData(
  data: HertzBeatTableData<HertzBeatLogRow>,
  window: ExactTimeWindow,
  sort?: 'newest' | 'oldest' | 'preserve'
): LogData {
  const entries = orderHertzBeatLogRowsForPerses(data.rows, sort).map(row => {
    const observedNanos = row.timeUnixNano ?? row.observedTimeUnixNano;
    if (observedNanos == null) throw new PersesSignalDataError();
    if (typeof row.body !== 'string') assertFiniteJsonNumbers(row.body);
    return {
      timestamp: unixNanoSeconds(observedNanos),
      line: logSummary(row.body) ?? '',
      hertzbeatAttributes: row.attributes,
      ...(typeof row.attributes?.['exception.stacktrace'] === 'string'
        ? { hertzbeatStack: row.attributes['exception.stacktrace'] }
        : {}),
      labels: logLabels(row)
    };
  });
  return {
    timeRange: { start: new Date(window.from), end: new Date(window.to) },
    entries,
    totalCount: data.total,
    hasMore: data.total > entries.length,
    direction: sort === 'oldest' ? 'forward' : 'backward',
    ...(sort === 'preserve' ? { preserveOrder: true } : {})
  };
}

export function orderHertzBeatLogRowsForPerses<Row extends HertzBeatLogRow>(
  rows: readonly Row[],
  sort?: 'newest' | 'oldest' | 'preserve'
): Row[] {
  if (sort === 'preserve') return [...rows];
  const ordered = rows.map((row, index) => ({ row, index, timestamp: logTimestamp(row) }));
  if (ordered.some(item => item.timestamp == null)) return [...rows];
  return ordered
    .sort(
      (left, right) =>
        (sort === 'oldest' ? left.timestamp! - right.timestamp! : right.timestamp! - left.timestamp!) ||
        left.index - right.index
    )
    .map(item => item.row);
}

function logTimestamp(row: HertzBeatLogRow) {
  const observedNanos = row.timeUnixNano ?? row.observedTimeUnixNano;
  if (observedNanos == null) return undefined;
  try {
    return unixNanoSeconds(observedNanos);
  } catch (error) {
    if (error instanceof PersesSignalDataError) return undefined;
    throw error;
  }
}

function unixNanoSeconds(value: string) {
  if (!/^(0|[1-9]\d{0,19})$/u.test(value)) throw new PersesSignalDataError();
  const nanos = BigInt(value);
  if (nanos > 18_446_744_073_709_551_615n) throw new PersesSignalDataError();
  const seconds = nanos / 1_000_000_000n;
  const remainder = nanos % 1_000_000_000n;
  return Number(seconds) + Number(remainder) / 1_000_000_000;
}

function assertFiniteJsonNumbers(value: unknown): void {
  if (value == null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new PersesSignalDataError();
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(assertFiniteJsonNumbers);
    return;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach(assertFiniteJsonNumbers);
    return;
  }
  throw new PersesSignalDataError();
}

export function toPersesTraceSearchData(
  data: HertzBeatTableData<HertzBeatTraceRow>,
  truncated: boolean
): TraceTableData {
  return {
    searchResult: data.rows.map(row => {
      if (!traceEvidenceSchema.safeParse(row).success) throw new PersesSignalDataError();
      return {
        traceId: row.traceId,
        rootServiceName: row.serviceName,
        rootTraceName: row.rootSpanName,
        startTimeUnixMs: row.startTime,
        durationMs: row.durationNanos == null ? null : row.durationNanos / 1_000_000,
        serviceStats: row.serviceStats
      };
    }),
    metadata: { hasMoreResults: truncated }
  };
}

export function toPersesTraceDetailData(detail: HertzBeatTraceDetail): TraceData {
  if (!detail.spans?.length) throw new PersesSignalDataError();
  return {
    trace: {
      resourceSpans: detail.spans.map(span => toPersesResourceSpan(span, detail.traceId))
    }
  };
}

type HertzBeatTraceSpan = NonNullable<HertzBeatTraceDetail['spans']>[number];

function toPersesResourceSpan(span: HertzBeatTraceSpan, detailTraceId: string) {
  const traceId = span.traceId ?? detailTraceId;
  if (!span.spanId || span.startTime == null || span.durationNanos == null) throw new PersesSignalDataError();
  const startTimeUnixNano = toBigInt(span.startTimeUnixNano).toString();
  const endTimeUnixNano = (BigInt(startTimeUnixNano) + toBigInt(span.durationNanos)).toString();
  return {
    resource: { attributes: resourceAttributes(span.resourceAttributes, span.serviceName) },
    scopeSpans: [
      {
        scope: {
          ...(span.scopeName ? { name: span.scopeName } : {}),
          ...(span.scopeVersion ? { version: span.scopeVersion } : {})
        },
        spans: [
          {
            traceId,
            spanId: span.spanId,
            ...(span.parentSpanId ? { parentSpanId: span.parentSpanId } : {}),
            name: span.spanName ?? '',
            ...(span.spanKind ? { kind: span.spanKind } : {}),
            startTimeUnixNano,
            endTimeUnixNano,
            attributes: keyValues(span.spanAttributes),
            ...(span.events ? { events: span.events.map(toPersesEvent) } : {}),
            ...(span.links ? { links: span.links.map(toPersesLink) } : {}),
            status: traceStatus(span.status, span.statusMessage)
          }
        ]
      }
    ]
  };
}

function toPersesEvent(event: HertzBeatTraceSpan['events'] extends (infer Event)[] | null ? Event : never) {
  if (event.timeUnixNano == null) throw new PersesSignalDataError();
  return {
    timeUnixNano: event.timeUnixNano,
    name: event.name ?? '',
    attributes: keyValues(event.attributes)
  };
}

function toPersesLink(link: HertzBeatTraceSpan['links'] extends (infer Link)[] | null ? Link : never) {
  if (!link.traceId || !link.spanId) throw new PersesSignalDataError();
  return { traceId: link.traceId, spanId: link.spanId, attributes: keyValues(link.attributes) };
}

function logLabels(row: HertzBeatLogRow) {
  return {
    ...primitiveLabels(row.resource, 'resource.'),
    ...primitiveLabels(row.attributes, 'attribute.'),
    ...(logSeverityLabel(row) ? { severity: logSeverityLabel(row)! } : {}),
    ...(row.traceId ? { trace_id: row.traceId } : {}),
    ...(row.spanId ? { span_id: row.spanId } : {})
  };
}

function primitiveLabels(values: Record<string, unknown> | null, prefix: string) {
  if (!values) return {};
  return Object.fromEntries(
    Object.entries(values).flatMap(([key, value]) => {
      if (typeof value === 'number' && !Number.isFinite(value)) {
        throw new PersesSignalDataError();
      }
      return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? [[`${prefix}${key}`, String(value)]]
        : [];
    })
  );
}

function resourceAttributes(values: Record<string, string> | null, serviceName: string | null) {
  const resource = { ...(values ?? {}) };
  if (serviceName && !resource['service.name']) resource['service.name'] = serviceName;
  return keyValues(resource);
}

function keyValues(values: Record<string, unknown> | null): KeyValue[] {
  if (!values) return [];
  return Object.entries(values).flatMap(([key, value]) => (value == null ? [] : [{ key, value: anyValue(value) }]));
}

function anyValue(value: NonNullable<unknown>): AnyValue {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { boolValue: value };
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) {
      throw new PersesSignalDataError();
    }
    return Number.isInteger(value) ? { intValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(anyValue) } };
  if (value && typeof value === 'object')
    return { kvlistValue: { values: keyValues(value as Record<string, unknown>) } };
  throw new PersesSignalDataError();
}

function traceStatus(status: string | null, message: string | null) {
  const code =
    status?.toUpperCase() === 'ERROR'
      ? 'STATUS_CODE_ERROR'
      : status?.toUpperCase() === 'OK'
        ? 'STATUS_CODE_OK'
        : 'STATUS_CODE_UNSET';
  return { code, ...(message ? { message } : {}) } as const;
}

function toBigInt(value: number | string) {
  if (typeof value === 'string') {
    if (!/^(0|[1-9]\d{0,18})$/u.test(value) || BigInt(value) > 9223372036854775807n) {
      throw new PersesSignalDataError();
    }
    return BigInt(value);
  }
  // JSON numbers above this bound have already lost integer precision. Never
  // present a rounded value to the official OTLP model as exact nanoseconds.
  if (!Number.isSafeInteger(value) || value < 0) throw new PersesSignalDataError();
  return BigInt(value);
}
