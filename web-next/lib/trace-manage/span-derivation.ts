export type SpanLike = {
  spanId: string;
  parentSpanId?: string | null;
  startTime?: number | string | null;
  durationNanos?: number | null;
};

export type DerivedSpanRow<T extends SpanLike> = T & {
  depth: number;
  startOffsetMs: number;
  widthPct: number;
  leftPct: number;
};

function toEpochMs(value?: number | string | null): number {
  if (value == null) return 0;
  if (typeof value === 'number') {
    if (value > 1_000_000_000_000_000) return value / 1_000_000;
    if (value > 1_000_000_000_000) return value;
    return value / 1_000_000;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function buildSpanRows<T extends SpanLike>(spans: T[]): Array<DerivedSpanRow<T>> {
  if (spans.length === 0) return [];

  const children = new Map<string | null, T[]>();
  for (const span of spans) {
    const key = span.parentSpanId ?? null;
    if (!children.has(key)) children.set(key, []);
    children.get(key)!.push(span);
  }

  for (const list of children.values()) {
    list.sort((a, b) => toEpochMs(a.startTime) - toEpochMs(b.startTime));
  }

  const nonZeroStarts = spans.map(span => toEpochMs(span.startTime)).filter(Boolean);
  const traceStart = nonZeroStarts.length > 0 ? Math.min(...nonZeroStarts) : 0;
  const totalMs = Math.max(
    ...spans.map(span => {
      const startOffsetMs = Math.max(toEpochMs(span.startTime) - traceStart, 0);
      const durationMs = Math.max((span.durationNanos ?? 0) / 1_000_000, 0.5);
      return startOffsetMs + durationMs;
    }),
    1
  );
  const spanIds = new Set(spans.map(span => span.spanId));
  const roots = spans
    .filter(span => span.parentSpanId == null || !spanIds.has(span.parentSpanId))
    .sort((a, b) => toEpochMs(a.startTime) - toEpochMs(b.startTime));

  const ordered: Array<DerivedSpanRow<T>> = [];
  const visit = (span: T, depth: number) => {
    const startOffsetMs = Math.max(toEpochMs(span.startTime) - traceStart, 0);
    const durationMs = Math.max((span.durationNanos ?? 0) / 1_000_000, 0.5);
    ordered.push({
      ...span,
      depth,
      startOffsetMs,
      leftPct: Math.min((startOffsetMs / totalMs) * 100, 100),
      widthPct: Math.max((durationMs / totalMs) * 100, 1)
    });
    for (const child of children.get(span.spanId) ?? []) {
      visit(child, depth + 1);
    }
  };

  (roots.length > 0 ? roots : spans.slice(0, 1)).forEach(root => visit(root, 0));
  return ordered;
}
