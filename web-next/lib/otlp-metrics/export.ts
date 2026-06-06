import type { OtlpMetricSeriesView } from './view-model';

export type OtlpMetricsExportFormat = 'csv' | 'jsonl';
export type OtlpMetricsExportScope = 'all' | 'selected';

type OtlpMetricsExportRow = {
  metric: string;
  seriesKey: string;
  timestamp: number;
  value: number | null;
  labels: Record<string, string>;
};

function escapeCsvValue(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildOtlpMetricsExportRows(seriesList: OtlpMetricSeriesView[]): OtlpMetricsExportRow[] {
  return seriesList.flatMap(series => series.points.map(([timestamp, value]) => ({
    metric: series.name,
    seriesKey: series.key,
    timestamp,
    value,
    labels: series.labels
  })));
}

export function buildOtlpMetricsCsv(seriesList: OtlpMetricSeriesView[]) {
  const rows = buildOtlpMetricsExportRows(seriesList);
  const headers = ['metric', 'seriesKey', 'timestamp', 'value', 'labels'];
  const body = rows.map(row => [
    row.metric,
    row.seriesKey,
    String(row.timestamp),
    row.value == null ? '' : String(row.value),
    JSON.stringify(row.labels)
  ].map(escapeCsvValue).join(','));

  return [headers.join(','), ...body].join('\n');
}

export function buildOtlpMetricsJsonl(seriesList: OtlpMetricSeriesView[]) {
  return buildOtlpMetricsExportRows(seriesList)
    .map(row => JSON.stringify(row))
    .join('\n');
}

export function buildOtlpMetricsExportFilename(format: OtlpMetricsExportFormat, date = new Date()) {
  const timestamp = date.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .replace('T', '-');
  return `hertzbeat-metrics-${timestamp}.${format}`;
}
