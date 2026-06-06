import { DEFAULT_TRACE_TABLE_COLUMNS, type TraceTableColumnKey } from './query-state';
import type { TraceExplorerRow } from './view-model';

export type TraceExportFormat = 'csv' | 'jsonl';

const traceExportColumns: Record<TraceTableColumnKey, { header: string; read: (row: TraceExplorerRow) => string }> = {
  start: {
    header: 'startTime',
    read: row => row.startTime
  },
  service: {
    header: 'service',
    read: row => row.service
  },
  'root-span': {
    header: 'rootSpan',
    read: row => row.name
  },
  duration: {
    header: 'duration',
    read: row => row.duration
  },
  status: {
    header: 'status',
    read: row => row.status
  },
  'trace-id': {
    header: 'traceId',
    read: row => row.traceId
  }
};

function escapeCsvValue(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function normalizeTraceExportColumns(columns: TraceTableColumnKey[] = DEFAULT_TRACE_TABLE_COLUMNS) {
  return columns.length > 0 ? columns : DEFAULT_TRACE_TABLE_COLUMNS;
}

export function buildTraceCsv(rows: TraceExplorerRow[], columns: TraceTableColumnKey[] = DEFAULT_TRACE_TABLE_COLUMNS) {
  const selectedColumns = normalizeTraceExportColumns(columns);
  const headers = selectedColumns.map(column => traceExportColumns[column].header);
  const body = rows.map(row => selectedColumns
    .map(column => escapeCsvValue(String(traceExportColumns[column].read(row) ?? '')))
    .join(','));

  return [headers.join(','), ...body].join('\n');
}

export function buildTraceJsonl(rows: TraceExplorerRow[], columns: TraceTableColumnKey[] = DEFAULT_TRACE_TABLE_COLUMNS) {
  const selectedColumns = normalizeTraceExportColumns(columns);
  return rows.map(row => {
    const payload = Object.fromEntries(selectedColumns.map(column => [
      traceExportColumns[column].header,
      traceExportColumns[column].read(row)
    ]));
    return JSON.stringify(payload);
  }).join('\n');
}

export function buildTraceExportFilename(format: TraceExportFormat, date = new Date()) {
  const timestamp = date.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .replace('T', '-');
  return `hertzbeat-traces-${timestamp}.${format}`;
}
