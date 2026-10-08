/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type OperationSpan = {
  spanId: string;
  parentSpanId: string | null;
  serviceName: string | null;
  spanName: string | null;
  startTimeUnixNano: string;
  durationNanos: string;
};
type Interval = { start: bigint; end: bigint };
type TimedSpan = OperationSpan & Interval;
export type OperationGroup = {
  key: string;
  serviceName: string | null;
  spanName: string | null;
  count: number;
  sumNanos: bigint;
  selfNanos: bigint;
  spans: TimedSpan[];
};
export type OperationSort = 'sum' | 'average' | 'self' | 'count';
const MAX_UINT64 = 18_446_744_073_709_551_615n;
export const LOADED_SPAN_LIMIT = 5000;

export function traceOperationStatistics(spans: readonly OperationSpan[], options: { partial?: boolean } = {}) {
  const counts = new Map<string, number>();
  for (const span of spans) counts.set(span.spanId, (counts.get(span.spanId) ?? 0) + 1);
  const duplicateSpans = spans.filter(span => counts.get(span.spanId) !== 1).length;
  const unique = new Map(spans.filter(span => counts.get(span.spanId) === 1).map(span => [span.spanId, span]));
  const cycles = cyclicIds(unique);
  const timed = spans.flatMap(span => {
    if (counts.get(span.spanId) !== 1 || cycles.has(span.spanId)) return [];
    const interval = readInterval(span);
    return interval ? [{ ...span, ...interval }] : [];
  });
  const ids = new Set(timed.map(span => span.spanId));
  const missingParents = timed.filter(span => span.parentSpanId !== null && !ids.has(span.parentSpanId)).length;
  const children = new Map<string, TimedSpan[]>();
  for (const span of timed) {
    if (span.parentSpanId === null) continue;
    const siblings = children.get(span.parentSpanId) ?? [];
    siblings.push(span);
    children.set(span.parentSpanId, siblings);
  }
  const groups = new Map<string, OperationGroup>();
  for (const span of timed) addToGroup(groups, span, children.get(span.spanId) ?? []);
  const capped = spans.length >= LOADED_SPAN_LIMIT;
  const skipped = spans.length - timed.length;
  return {
    groups: [...groups.values()],
    loadedCount: spans.length,
    validCount: timed.length,
    skipped,
    duplicateSpans,
    cyclicSpans: cycles.size,
    missingParents,
    capped,
    partial: Boolean(options.partial || capped || skipped || missingParents)
  };
}

function readInterval(span: OperationSpan): Interval | undefined {
  const parse = (value: string) => (/^\d{1,20}$/.test(value) ? BigInt(value) : undefined);
  const start = parse(span.startTimeUnixNano);
  const duration = parse(span.durationNanos);
  if (start === undefined || duration === undefined || start + duration > MAX_UINT64) return undefined;
  return { start, end: start + duration };
}

function cyclicIds(spans: Map<string, OperationSpan>) {
  const cycles = new Set<string>();
  const done = new Set<string>();
  for (const first of spans.keys()) {
    const path: string[] = [];
    const positions = new Map<string, number>();
    let id: string | null = first;
    while (id !== null && spans.has(id) && !done.has(id)) {
      const previous = positions.get(id);
      if (previous !== undefined) {
        for (const member of path.slice(previous)) cycles.add(member);
        break;
      }
      positions.set(id, path.length);
      path.push(id);
      id = spans.get(id)!.parentSpanId;
    }
    for (const visited of path) done.add(visited);
  }
  return cycles;
}

function addToGroup(groups: Map<string, OperationGroup>, span: TimedSpan, children: TimedSpan[]) {
  const key = JSON.stringify([span.serviceName, span.spanName]);
  const group = groups.get(key) ?? {
    key,
    serviceName: span.serviceName,
    spanName: span.spanName,
    count: 0,
    sumNanos: 0n,
    selfNanos: 0n,
    spans: []
  };
  group.count++;
  group.sumNanos += span.end - span.start;
  group.selfNanos += span.end - span.start - childCoverage(span, children);
  group.spans.push(span);
  groups.set(key, group);
}

function childCoverage(parent: Interval, children: Interval[]) {
  const clipped = children
    .map(child => ({
      start: child.start > parent.start ? child.start : parent.start,
      end: child.end < parent.end ? child.end : parent.end
    }))
    .filter(child => child.end > child.start)
    .sort((a, b) => compareBigInt(a.start, b.start));
  let end = parent.start;
  let covered = 0n;
  for (const child of clipped) {
    const start = child.start > end ? child.start : end;
    if (child.end > start) covered += child.end - start;
    if (child.end > end) end = child.end;
  }
  return covered;
}

export function compareOperationGroups(a: OperationGroup, b: OperationGroup, sort: OperationSort) {
  const value =
    sort === 'count'
      ? b.count - a.count
      : sort === 'average'
        ? compareBigInt(b.sumNanos * BigInt(a.count), a.sumNanos * BigInt(b.count))
        : compareBigInt(sort === 'self' ? b.selfNanos : b.sumNanos, sort === 'self' ? a.selfNanos : a.sumNanos);
  return value || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
}

function compareBigInt(a: bigint, b: bigint) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function formatOperationDuration(nanos: bigint, count = 1) {
  const divisor = BigInt(count);
  const average = nanos / divisor;
  const [scale, unit] =
    average >= 1_000_000_000n
      ? [1_000_000_000n, 's']
      : average >= 1_000_000n
        ? [1_000_000n, 'ms']
        : average >= 1000n
          ? [1000n, 'µs']
          : [1n, 'ns'];
  const denominator = divisor * scale;
  const hundredths = (nanos * 100n + denominator / 2n) / denominator;
  if (nanos > 0n && hundredths === 0n) return `<0.01 ${unit}`;
  return `${hundredths / 100n}.${(hundredths % 100n).toString().padStart(2, '0')} ${unit}`;
}
