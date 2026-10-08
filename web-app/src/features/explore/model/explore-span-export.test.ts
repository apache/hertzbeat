/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';
import type { TraceSpanRow } from './explore-trace-analytics';
import { spanPageCsv } from './explore-span-export';

const row: TraceSpanRow = {
  traceId: '0123456789abcdef0123456789abcdef',
  spanId: '0123456789abcdef',
  parentSpanId: null,
  serviceName: 'checkout',
  serviceNamespace: 'shop',
  environment: 'production',
  operationName: 'GET /checkout',
  spanKind: 'SERVER',
  status: 'ERROR',
  startTimeUnixNano: '1788761079495000001',
  durationNanos: '1100000001'
};

describe('current-page span CSV', () => {
  it('preserves exact nanosecond strings and exports only supplied rows', () => {
    expect(spanPageCsv([row])).toBe(
      '"trace_id","span_id","service","operation","status","start_time_unix_nano","duration_nano"\r\n' +
        '"0123456789abcdef0123456789abcdef","0123456789abcdef","checkout","GET /checkout","ERROR","1788761079495000001","1100000001"'
    );
    expect(spanPageCsv([]).split('\r\n')).toHaveLength(1);
  });

  it('uses shared formula protection and CSV escaping, leaving unknown values empty', () => {
    const csv = spanPageCsv([{ ...row, serviceName: null, operationName: '=SUM(1,2)"\n', durationNanos: null }]);
    expect(csv).toContain('"\'=SUM(1,2)""\n"');
    expect(csv).toContain('"0123456789abcdef","","\'=SUM');
    expect(csv).toMatch(/,""$/u);
    expect(csv).not.toContain('null');
  });
});
