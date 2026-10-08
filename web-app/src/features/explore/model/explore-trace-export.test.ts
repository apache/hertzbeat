/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';
import { traceEvidenceFixture } from '@/test/trace-evidence-fixtures';
import { tracePageCsv } from './explore-trace-export';

describe('current-page trace CSV', () => {
  it('exports only supplied rows, quotes untrusted cells, and leaves unavailable root duration empty', () => {
    const csv = tracePageCsv([
      traceEvidenceFixture({ rootSpanName: '=SUM(1,2)"\n', durationNanos: 1_280_000_000 }),
      traceEvidenceFixture({
        traceId: 'missing-root',
        rootState: 'missing',
        rootSpanCount: 0,
        rootSpanId: null,
        rootSpanName: null,
        durationNanos: null
      })
    ]);
    expect(csv).toContain('"root_duration_ms"');
    expect(csv).toContain('"1280"');
    expect(csv).toContain('"\'=SUM(1,2)""\n"');
    expect(csv.split('\r\n')).toHaveLength(3);
    expect(csv.split('\r\n')[2]).toContain('"missing",""');
    expect(csv.split('\r\n')[2]).toContain('"missing","","1","0"');
  });
});
