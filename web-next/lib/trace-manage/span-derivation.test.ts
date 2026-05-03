import { describe, expect, it } from 'vitest';
import { buildSpanRows } from './span-derivation';

describe('trace span derivation', () => {
  it('orders spans by parent-child hierarchy and computes layout fields', () => {
    const rows = buildSpanRows([
      {
        spanId: 'child',
        parentSpanId: 'root',
        spanName: 'db.query',
        startTime: 2_000_000,
        durationNanos: 100_000_000
      },
      {
        spanId: 'root',
        parentSpanId: null,
        spanName: 'http.request',
        startTime: 1_000_000,
        durationNanos: 400_000_000
      }
    ]);

    expect(rows.map(row => row.spanId)).toEqual(['root', 'child']);
    expect(rows[0].depth).toBe(0);
    expect(rows[1].depth).toBe(1);
    expect(rows[0].leftPct).toBeGreaterThanOrEqual(0);
    expect(rows[1].widthPct).toBeGreaterThan(0);
  });

  it('falls back gracefully when no explicit root exists', () => {
    const rows = buildSpanRows([
      {
        spanId: 'orphan',
        parentSpanId: 'missing',
        spanName: 'orphan',
        startTime: 1_000_000,
        durationNanos: 10_000_000
      }
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].spanId).toBe('orphan');
    expect(rows[0].depth).toBe(0);
  });

  it('keeps all orphan spans when parent references are missing', () => {
    const rows = buildSpanRows([
      {
        spanId: 'first',
        parentSpanId: 'missing-a',
        spanName: 'first',
        startTime: 1_000_000,
        durationNanos: 10_000_000
      },
      {
        spanId: 'second',
        parentSpanId: 'missing-b',
        spanName: 'second',
        startTime: 2_000_000,
        durationNanos: 10_000_000
      }
    ]);

    expect(rows.map(row => row.spanId)).toEqual(['first', 'second']);
  });

  it('treats string timestamps as millisecond wall clock values', () => {
    const rows = buildSpanRows([
      {
        spanId: 'root',
        parentSpanId: null,
        spanName: 'root',
        startTime: '2026-04-10T00:00:00.000Z',
        durationNanos: 400_000_000
      },
      {
        spanId: 'child',
        parentSpanId: 'root',
        spanName: 'child',
        startTime: '2026-04-10T00:00:00.100Z',
        durationNanos: 100_000_000
      }
    ]);

    expect(rows[1].startOffsetMs).toBe(100);
    expect(rows[1].leftPct).toBeGreaterThan(20);
  });

  it('uses overall trace extent instead of the longest single span for layout percentages', () => {
    const rows = buildSpanRows([
      {
        spanId: 'root-a',
        parentSpanId: null,
        spanName: 'root-a',
        startTime: '2026-04-10T00:00:00.000Z',
        durationNanos: 100_000_000
      },
      {
        spanId: 'root-b',
        parentSpanId: null,
        spanName: 'root-b',
        startTime: '2026-04-10T00:00:00.500Z',
        durationNanos: 100_000_000
      }
    ]);

    expect(rows.map(row => row.spanId)).toEqual(['root-a', 'root-b']);
    expect(rows[1].startOffsetMs).toBe(500);
    expect(rows[1].leftPct).toBeGreaterThan(80);
    expect(rows[1].leftPct).toBeLessThan(90);
    expect(rows[1].widthPct).toBeGreaterThan(15);
    expect(rows[1].widthPct).toBeLessThan(20);
  });
});
