import { describe, expect, it } from 'vitest';
import { buildTraceCsv, buildTraceExportFilename, buildTraceJsonl } from './export';
import type { TraceExplorerRow } from './view-model';

describe('trace export helpers', () => {
  const rows: TraceExplorerRow[] = [
    {
      key: 'trace-123',
      traceId: 'trace-123',
      rootSpanId: 'span-456',
      name: 'POST /checkout, retry',
      service: 'checkout',
      namespace: 'payments',
      duration: '420ms',
      durationMs: '420',
      status: 'ERROR',
      statusTone: 'danger',
      startTime: '2026-04-16 22:00:00'
    }
  ];

  it('builds a CSV file for trace rows with escaped values', () => {
    expect(buildTraceCsv(rows)).toBe([
      'startTime,service,rootSpan,duration,status,traceId',
      '2026-04-16 22:00:00,checkout,"POST /checkout, retry",420ms,ERROR,trace-123'
    ].join('\n'));
  });

  it('exports only the selected trace table columns when provided', () => {
    expect(buildTraceCsv(rows, ['service', 'root-span', 'trace-id'])).toBe([
      'service,rootSpan,traceId',
      'checkout,"POST /checkout, retry",trace-123'
    ].join('\n'));
  });

  it('builds JSONL for selected trace table columns', () => {
    expect(buildTraceJsonl(rows, ['service', 'duration', 'status'])).toBe(
      '{"service":"checkout","duration":"420ms","status":"ERROR"}'
    );
  });

  it('builds filesystem-safe export filenames by format', () => {
    expect(buildTraceExportFilename('csv', new Date('2026-04-16T22:03:04.000Z'))).toBe('hertzbeat-traces-20260416-220304.csv');
    expect(buildTraceExportFilename('jsonl', new Date('2026-04-16T22:03:04.000Z'))).toBe('hertzbeat-traces-20260416-220304.jsonl');
  });
});
