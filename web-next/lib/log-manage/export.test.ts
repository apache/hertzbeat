import { describe, expect, it } from 'vitest';
import { buildLogCsv, buildLogExportFilename, buildLogJsonl } from './export';
import type { LogExplorerRow } from './view-model';

describe('log export helpers', () => {
  const rows: LogExplorerRow[] = [
    {
      key: 'trace-123-span-456',
      timestamp: '2026-04-16 22:00:00',
      severity: 'ERROR',
      service: 'checkout',
      traceId: 'trace-123',
      spanId: 'span-456',
      message: 'checkout, timeout\n"retry"',
      severityTone: 'danger'
    }
  ];

  it('builds a CSV file for the current log list rows with escaped values', () => {
    expect(buildLogCsv(rows)).toBe([
      'timestamp,severity,service,message,traceId',
      '2026-04-16 22:00:00,ERROR,checkout,"checkout, timeout\n""retry""",trace-123'
    ].join('\n'));
  });

  it('exports only the selected log table columns when provided', () => {
    expect(buildLogCsv(rows, ['service', 'body', 'span-id'])).toBe([
      'service,message,spanId',
      'checkout,"checkout, timeout\n""retry""",span-456'
    ].join('\n'));
  });

  it('exports selected log resource and attribute field columns', () => {
    const extraColumns = [
      {
        key: 'resource:hertzbeat.entity_id' as const,
        valuesByRowKey: {
          'trace-123-span-456': '7'
        }
      },
      {
        key: 'attribute:region' as const,
        valuesByRowKey: {
          'trace-123-span-456': 'cn'
        }
      }
    ];

    expect(buildLogCsv(rows, ['service', 'body'], extraColumns)).toBe([
      'service,message,resource:hertzbeat.entity_id,attribute:region',
      'checkout,"checkout, timeout\n""retry""",7,cn'
    ].join('\n'));
    expect(buildLogJsonl(rows, ['service'], extraColumns)).toBe(
      '{"service":"checkout","resource:hertzbeat.entity_id":"7","attribute:region":"cn"}'
    );
  });

  it('builds JSONL for the selected log table columns', () => {
    expect(buildLogJsonl(rows, ['service', 'body', 'span-id'])).toBe(
      '{"service":"checkout","message":"checkout, timeout\\n\\"retry\\"","spanId":"span-456"}'
    );
  });

  it('builds filesystem-safe export filenames by format', () => {
    expect(buildLogExportFilename('csv', new Date('2026-04-16T22:03:04.000Z'))).toBe('hertzbeat-logs-20260416-220304.csv');
    expect(buildLogExportFilename('jsonl', new Date('2026-04-16T22:03:04.000Z'))).toBe('hertzbeat-logs-20260416-220304.jsonl');
  });
});
