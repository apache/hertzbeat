/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';
import { metricResultCsv } from './explore-metric-export';

describe('metric result CSV', () => {
  it('exports every valid returned point with exact UTC window, values, source and unit', () => {
    const csv = metricResultCsv(
      [
        {
          key: 'a-1',
          refId: 'a',
          name: 'latency',
          unit: 'ms',
          labels: { service: 'checkout', __name__: 'latency' },
          points: [
            [1000, 0.003974855285274746],
            [2000, 0],
            [3000, 'invalid']
          ]
        }
      ],
      { from: 1000, to: 4000 },
      'latency{service="checkout"}'
    );
    const rows = csv.split('\r\n');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain('"display_timestamp_utc"');
    expect(rows[1]).toContain('"1970-01-01T00:00:01.000Z","0.003974855285274746"');
    expect(rows[2]).toContain('"1970-01-01T00:00:02.000Z","0"');
    expect(rows[1]).toContain('"a","latency","ms"');
    expect(rows[1]).toContain('"1970-01-01T00:00:01.000Z","1970-01-01T00:00:04.000Z"');
    expect(rows[1]).toContain('"latency{service=""checkout""}"');
    expect(rows[1]).toContain('"{');
  });

  it('escapes labels and protects spreadsheet formulas', () => {
    const csv = metricResultCsv(
      [{ key: 'k', name: '=SUM(1,2)', labels: { host: '=1+1' }, points: [[0, 1]] }],
      { from: 0, to: 1 },
      null
    );
    expect(csv).toContain('"\'=SUM(1,2)"');
    expect(csv).toContain('host');
    expect(csv).toContain('=1+1');
  });

  it('does not silently truncate a result that exceeds the export budget', () => {
    const value = 'x'.repeat(8 * 1024 * 1024);
    expect(() =>
      metricResultCsv([{ key: 'k', name: value, labels: {}, points: [[0, 1]] }], { from: 0, to: 1 }, null)
    ).toThrow(new RangeError('METRIC_CSV_TOO_LARGE'));
  });
});
