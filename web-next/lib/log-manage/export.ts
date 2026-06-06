import type { LogExplorerRow } from './view-model';
import { DEFAULT_LOG_TABLE_COLUMNS, type LogFieldColumnKey, type LogTableColumnKey } from './query-state';

export type LogExportFormat = 'csv' | 'jsonl';
export type LogExportExtraColumn = {
  key: LogFieldColumnKey;
  header?: string;
  valuesByRowKey: Record<string, string>;
};

const logCsvColumns: Record<LogTableColumnKey, { header: string; read: (row: LogExplorerRow) => string }> = {
  time: {
    header: 'timestamp',
    read: row => row.timestamp
  },
  severity: {
    header: 'severity',
    read: row => row.severity
  },
  service: {
    header: 'service',
    read: row => row.service
  },
  body: {
    header: 'message',
    read: row => row.message
  },
  'trace-id': {
    header: 'traceId',
    read: row => row.traceId
  },
  'span-id': {
    header: 'spanId',
    read: row => row.spanId
  }
};

function escapeCsvValue(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildLogCsv(
  rows: LogExplorerRow[],
  columns: LogTableColumnKey[] = DEFAULT_LOG_TABLE_COLUMNS,
  extraColumns: LogExportExtraColumn[] = []
) {
  const selectedColumns = columns.length > 0 ? columns : DEFAULT_LOG_TABLE_COLUMNS;
  const headers = [
    ...selectedColumns.map(column => logCsvColumns[column].header),
    ...extraColumns.map(column => column.header || column.key)
  ];
  const body = rows.map(row => [
    ...selectedColumns.map(column => escapeCsvValue(String(logCsvColumns[column].read(row) ?? ''))),
    ...extraColumns.map(column => escapeCsvValue(String(column.valuesByRowKey[row.key] ?? '-')))
  ].join(','));

  return [headers.join(','), ...body].join('\n');
}

export function buildLogJsonl(
  rows: LogExplorerRow[],
  columns: LogTableColumnKey[] = DEFAULT_LOG_TABLE_COLUMNS,
  extraColumns: LogExportExtraColumn[] = []
) {
  const selectedColumns = columns.length > 0 ? columns : DEFAULT_LOG_TABLE_COLUMNS;
  return rows.map(row => {
    const payload = Object.fromEntries([
      ...selectedColumns.map(column => [
        logCsvColumns[column].header,
        logCsvColumns[column].read(row)
      ]),
      ...extraColumns.map(column => [
        column.header || column.key,
        column.valuesByRowKey[row.key] ?? '-'
      ])
    ]);
    return JSON.stringify(payload);
  }).join('\n');
}

export function buildLogExportFilename(format: LogExportFormat, date = new Date()) {
  const timestamp = date.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .replace('T', '-');
  return `hertzbeat-logs-${timestamp}.${format}`;
}

export function buildLogCsvFilename(date = new Date()) {
  return buildLogExportFilename('csv', date);
}
