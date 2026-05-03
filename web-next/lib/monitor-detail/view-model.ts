import type { GrafanaDashboard, Monitor, MonitorDetailMetric, MonitorHistoryData, MonitorHistoryValue, MonitorRealtimeMetricData, Param } from '@/lib/types';
import type { MonitorHistoryMetricCatalogItem } from './controller';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type MonitorMetricTableEvidenceRow = {
  key: string;
  title: string;
  copy: string;
  meta: string;
};

export type MonitorFavoriteJumpRow = {
  key: string;
  title: string;
  copy: string;
  meta: string;
  targetKey: string;
  targetKind: 'realtime' | 'history';
  favoriteToken: string;
};

export type MonitorMetricTableMatrix = {
  columns: Array<{
    key: string;
    title: string;
    unit: string;
  }>;
  rows: Array<{
    key: string;
    label: string;
    values: string[];
  }>;
};

export function filterMonitorMetricTableMatrix(matrix: MonitorMetricTableMatrix, query: string): MonitorMetricTableMatrix {
  const normalizedQuery = normalizeMonitorDetailQuery(query);
  if (!normalizedQuery) return matrix;

  return {
    ...matrix,
    rows: matrix.rows.filter(row => includesMonitorDetailQuery([row.label, ...row.values], normalizedQuery))
  };
}

export type MonitorMetricRowNavigation = {
  selectedIndex: number | null;
  total: number;
  selectedLabel: string | null;
  canPrevious: boolean;
  canNext: boolean;
};

export type MonitorHistorySeriesNavigation = {
  selectedIndex: number | null;
  total: number;
  selectedLabel: string | null;
  canPrevious: boolean;
  canNext: boolean;
};

export type MonitorHistoryPointNavigation = {
  selectedIndex: number | null;
  total: number;
  selectedLabel: string | null;
  canPrevious: boolean;
  canNext: boolean;
};

export type MonitorHistorySeriesRow = {
  key: string;
  title: string;
  copy: string;
  meta: string;
};

export function resolveMonitorHistoryVisibleSeriesKeys(currentKeys: string[], availableKeys: string[]) {
  if (!availableKeys.length) return [];
  const preserved = currentKeys.filter(key => availableKeys.includes(key));
  return preserved.length > 0 ? preserved : availableKeys;
}

export function toggleMonitorHistoryVisibleSeriesKey(currentKeys: string[], toggledKey: string, availableKeys: string[]) {
  const resolvedKeys = resolveMonitorHistoryVisibleSeriesKeys(currentKeys, availableKeys);
  if (!availableKeys.includes(toggledKey)) return resolvedKeys;

  if (resolvedKeys.includes(toggledKey)) {
    if (resolvedKeys.length === 1) return resolvedKeys;
    return availableKeys.filter(key => resolvedKeys.includes(key) && key !== toggledKey);
  }

  const nextKeys = new Set([...resolvedKeys, toggledKey]);
  return availableKeys.filter(key => nextKeys.has(key));
}

export function resolveMonitorMetricTableMode(
  payload: MonitorRealtimeMetricData | null | undefined,
  currentMode: 'table' | 'detail'
): 'table' | 'detail' {
  const rowCount = payload?.valueRows?.length ?? 0;
  if (rowCount <= 1) {
    return 'detail';
  }
  return currentMode;
}

export type SelectableMonitorHistoryPointRow = {
  key: string;
  title: string;
  copy: string;
  meta: string;
};

function normalizeMonitorDetailQuery(value: string) {
  return value.trim().toLowerCase();
}

function includesMonitorDetailQuery(parts: Array<string | undefined | null>, query: string) {
  const normalizedQuery = normalizeMonitorDetailQuery(query);
  if (!normalizedQuery) return true;

  return parts.some(part => part?.toLowerCase().includes(normalizedQuery));
}

export function formatMonitorSchedule(monitor: Monitor, t: Translator) {
  if (monitor.scheduleType === 'cron' && monitor.cronExpression) return monitor.cronExpression;
  if (monitor.intervals != null) return `${monitor.intervals}s`;
  return t('monitor.detail.schedule.empty');
}

export function buildMonitorSummaryStats(monitor: Monitor, t: Translator) {
  return [
    { label: 'ID', value: String(monitor.id) },
    { label: t('monitor.period'), value: formatMonitorSchedule(monitor, t) },
    { label: t('label'), value: String(Object.keys(monitor.labels || {}).length) },
    { label: t('annotation'), value: String(Object.keys(monitor.annotations || {}).length) }
  ];
}

export function buildMonitorSummaryMetaRows(monitor: Monitor, t: Translator, formatTime: (value?: number | string | null) => string) {
  const rows = [
    { label: t('common.instance'), value: monitor.instance || '-' },
    monitor.description ? { label: t('monitor.detail.description'), value: monitor.description } : null,
    { label: t('common.new-time'), value: formatTime(monitor.gmtCreate || null) },
    { label: t('common.edit-time'), value: formatTime(monitor.gmtUpdate || monitor.gmtCreate || null) }
  ];
  return rows.filter(Boolean) as Array<{ label: string; value: string }>;
}

export function monitorStatusLabel(status: number): string {
  if (status === 1) return 'UP';
  if (status === 2) return 'DOWN';
  return 'PAUSED';
}

export function buildMonitorDetailFacts(monitor: Monitor, t: Translator, formatTime: (value?: number | string | null) => string) {
  return [
    { label: t('monitor.detail.fact.id'), value: String(monitor.id) },
    { label: t('common.status'), value: monitorStatusLabel(monitor.status) },
    { label: t('common.app'), value: monitor.app || '-' },
    { label: t('common.updated'), value: formatTime(monitor.gmtUpdate || monitor.gmtCreate || null) }
  ];
}

export function buildMonitorWorkbenchSummaryFacts(
  realtimeMetricCount: number,
  historyChartCount: number,
  favoriteCount: number,
  t: Translator
) {
  return [
    { key: 'realtime', label: t('monitor.detail.workbench.summary.realtime'), value: String(realtimeMetricCount) },
    { key: 'history', label: t('monitor.detail.workbench.summary.history'), value: String(historyChartCount) },
    { key: 'favorite', label: t('monitor.detail.workbench.summary.favorite'), value: String(favoriteCount) }
  ];
}

export function buildMonitorEvidenceRows(monitor: Monitor, t: Translator, formatTime: (value?: number | string | null) => string) {
  return [
    { title: t('common.instance'), copy: monitor.instance || '-', meta: t('monitor.detail.meta.target') },
    { title: t('common.application'), copy: monitor.app || '-', meta: t('monitor.detail.meta.category') },
    { title: t('monitor.detail.last-update'), copy: formatTime(monitor.gmtUpdate || monitor.gmtCreate || null), meta: t('monitor.detail.meta.backend') }
  ];
}

export function buildMonitorLabelRows(labels: Record<string, string> | undefined, t: Translator) {
  return Object.entries(labels || {}).map(([key, value]) => ({
    title: key,
    copy: value,
    meta: t('common.label')
  }));
}

export function buildMonitorNextRows(t: Translator) {
  return [
    { title: t('monitor.detail.next.back.title'), copy: t('monitor.detail.next.back.copy'), meta: 'monitors' },
    { title: t('monitor.detail.next.charts.title'), copy: t('monitor.detail.next.charts.copy'), meta: 'next' }
  ];
}

export function buildMonitorGrafanaRows(grafana: GrafanaDashboard | null | undefined, t: Translator) {
  if (!grafana?.enabled || !grafana.url) {
    return [
      {
        title: t('monitor.detail.grafana.empty.title'),
        copy: t('monitor.detail.grafana.empty.copy'),
        meta: '-'
      }
    ];
  }

  return [
    {
      title: t('monitor.detail.grafana.enabled.title'),
      copy: grafana.url,
      meta: t('monitor.detail.grafana.enabled.meta')
    }
  ];
}

export function buildMonitorParamRows(params: Param[], t: Translator) {
  return params
    .filter(param => param.display !== false)
    .map(param => ({
      title: param.field || t('monitor.detail.param.unknown'),
      copy: String(param.paramValue ?? '-'),
      meta: t('monitor.detail.param.meta')
    }));
}

export function buildMonitorMetricCatalogRows(metrics: MonitorDetailMetric[], t: Translator) {
  return metrics
    .filter(metric => metric.visible !== false)
    .map(metric => ({
      key: metric.name,
      title: metric.name,
      copy: String((metric.fields || []).length),
      meta: t('monitor.detail.metric.fields')
    }));
}

export function filterMonitorMetricCatalog(metrics: MonitorDetailMetric[], query: string) {
  const visibleMetrics = metrics.filter(metric => metric.visible !== false);
  if (!normalizeMonitorDetailQuery(query)) return visibleMetrics;

  return visibleMetrics.filter(metric =>
    includesMonitorDetailQuery(
      [
        metric.name,
        ...(metric.fields || []).flatMap(field => [field.field, field.unit])
      ],
      query
    )
  );
}

export function buildMonitorMetricFieldRows(metric: MonitorDetailMetric | null, t: Translator) {
  return (metric?.fields || []).map(field => ({
    title: field.field || t('monitor.detail.metric.field'),
    copy: field.unit || '-',
    meta: field.type === 0 ? t('monitor.detail.metric.numeric') : t('monitor.detail.metric.other')
  }));
}

export function buildMonitorMetricPayloadRows(payload: unknown, t: Translator) {
  if (payload == null || typeof payload !== 'object') {
    return [
      {
        title: t('monitor.detail.metric.payload.empty.title'),
        copy: t('monitor.detail.metric.payload.empty.copy'),
        meta: '-'
      }
    ];
  }

  return Object.entries(payload as Record<string, unknown>).slice(0, 8).map(([key, value]) => ({
    title: key,
    copy: typeof value === 'string' ? value : JSON.stringify(value),
    meta: t('monitor.detail.metric.payload.meta')
  }));
}

export function buildMonitorMetricTableRows(payload: MonitorRealtimeMetricData | null | undefined, t: Translator) {
  if (!payload?.fields?.length || !payload.valueRows?.length) {
    return [];
  }

  return payload.valueRows.slice(0, 5).map((row, index) => {
    const values = payload.fields!
      .map((field, fieldIndex) => `${field.name || `field-${fieldIndex + 1}`}: ${row.values?.[fieldIndex]?.origin || t('monitor.detail.value.null')}`)
      .join(' | ');
    const labels = Object.entries(row.labels || {}).map(([key, value]) => `${key}=${value}`).join(', ');
    return {
      title: labels || t('monitor.detail.metric.row').replace('{{index}}', String(index + 1)),
      copy: values,
      meta: t('monitor.detail.metric.payload.meta')
    };
  });
}

export function buildMonitorMetricTableEvidenceRows(payload: MonitorRealtimeMetricData | null | undefined, t: Translator): MonitorMetricTableEvidenceRow[] {
  return buildMonitorMetricTableRows(payload, t).map((row, index) => ({
    key: String(index),
    ...row
  }));
}

export function buildMonitorMetricRealtimeFactRows(
  payload: MonitorRealtimeMetricData | null | undefined,
  t: Translator,
  formatTime: (value?: number | string | null) => string
) {
  if (!payload) {
    return [
      {
        title: t('monitor.detail.metric.facts.empty.title'),
        copy: t('monitor.detail.metric.facts.empty.copy'),
        meta: '-'
      }
    ];
  }

  return [
    {
      title: t('monitor.detail.metric.facts.time'),
      copy: formatTime(payload.time ?? null),
      meta: t('monitor.detail.metric.payload.meta')
    },
    {
      title: t('monitor.detail.metric.facts.fields'),
      copy: String(payload.fields?.length ?? 0),
      meta: t('monitor.detail.metric.payload.meta')
    },
    {
      title: t('monitor.detail.metric.facts.rows'),
      copy: String(payload.valueRows?.length ?? 0),
      meta: t('monitor.detail.metric.payload.meta')
    }
  ];
}

export function buildMonitorMetricTableMatrix(payload: MonitorRealtimeMetricData | null | undefined, t: Translator): MonitorMetricTableMatrix {
  return {
    columns: (payload?.fields || []).map((field, index) => ({
      key: field.name || `field-${index + 1}`,
      title: field.name || `field-${index + 1}`,
      unit: field.unit || ''
    })),
    rows: (payload?.valueRows || []).map((row, rowIndex) => ({
      key: String(rowIndex),
      label: Object.entries(row.labels || {}).map(([key, value]) => `${key}=${value}`).join(', ') || t('monitor.detail.metric.row').replace('{{index}}', String(rowIndex + 1)),
      values: (row.values || []).map(value => String(value.origin ?? t('monitor.detail.value.null')))
    }))
  };
}

export function buildMonitorMetricRowNavigation(
  payload: MonitorRealtimeMetricData | null | undefined,
  selectedRowKey: string | null | undefined,
  t: Translator
): MonitorMetricRowNavigation {
  const matrix = buildMonitorMetricTableMatrix(payload, t);
  const selectedIndex = selectedRowKey == null ? null : matrix.rows.findIndex(row => row.key === selectedRowKey);
  const normalizedIndex = selectedIndex != null && selectedIndex >= 0 ? selectedIndex : null;
  const selectedLabel = normalizedIndex == null ? null : matrix.rows[normalizedIndex]?.label || null;

  return {
    selectedIndex: normalizedIndex,
    total: matrix.rows.length,
    selectedLabel,
    canPrevious: normalizedIndex != null && normalizedIndex > 0,
    canNext: normalizedIndex != null && normalizedIndex < matrix.rows.length - 1
  };
}

export function buildMonitorHistorySeriesNavigation(
  payload: MonitorHistoryData | null | undefined,
  selectedSeriesKey: string | null | undefined,
  visibleSeriesKeys?: string[]
): MonitorHistorySeriesNavigation {
  const seriesKeys = visibleSeriesKeys?.length ? visibleSeriesKeys : Object.keys(payload?.values || {});
  const selectedIndex = selectedSeriesKey == null ? null : seriesKeys.findIndex(key => key === selectedSeriesKey);
  const normalizedIndex = selectedIndex != null && selectedIndex >= 0 ? selectedIndex : null;

  return {
    selectedIndex: normalizedIndex,
    total: seriesKeys.length,
    selectedLabel: normalizedIndex == null ? null : seriesKeys[normalizedIndex] || null,
    canPrevious: normalizedIndex != null && normalizedIndex > 0,
    canNext: normalizedIndex != null && normalizedIndex < seriesKeys.length - 1
  };
}

export function buildMonitorHistoryPointNavigation(
  payload: MonitorHistoryData | null | undefined,
  selectedSeriesKey: string | null | undefined,
  selectedPointIndex: number | null | undefined,
  formatTime: (value?: number | string | null) => string
): MonitorHistoryPointNavigation {
  const values = selectedSeriesKey ? payload?.values?.[selectedSeriesKey] || [] : [];
  const normalizedIndex =
    selectedPointIndex != null && selectedPointIndex >= 0 && selectedPointIndex < values.length ? selectedPointIndex : null;
  const selectedLabel = normalizedIndex == null ? null : formatTime(values[normalizedIndex]?.time ?? null);

  return {
    selectedIndex: normalizedIndex,
    total: values.length,
    selectedLabel,
    canPrevious: normalizedIndex != null && normalizedIndex > 0,
    canNext: normalizedIndex != null && normalizedIndex < values.length - 1
  };
}

export function buildMonitorMetricSelectedRowRows(payload: MonitorRealtimeMetricData | null | undefined, rowIndex: number | null | undefined, t: Translator) {
  if (!payload?.fields?.length || !payload.valueRows?.length || rowIndex == null || !payload.valueRows[rowIndex]) {
    return [
      {
        title: t('monitor.detail.metric.table.empty.title'),
        copy: t('monitor.detail.metric.table.empty.copy'),
        meta: '-'
      }
    ];
  }

  const row = payload.valueRows[rowIndex];
  const labelText = Object.entries(row.labels || {}).map(([key, value]) => `${key}=${value}`).join(', ');
  return [
    {
      title: t('common.labels'),
      copy: labelText || '-',
      meta: t('monitor.detail.metric.payload.meta')
    },
    ...payload.fields.map((field, fieldIndex) => ({
      title: field.name || `field-${fieldIndex + 1}`,
      copy: row.values?.[fieldIndex]?.origin || t('monitor.detail.value.null'),
      meta: field.unit || t('monitor.detail.metric.payload.meta')
    }))
  ];
}

export function buildMonitorMetricSelectedRowTableRows(payload: MonitorRealtimeMetricData | null | undefined, rowIndex: number | null | undefined, t: Translator) {
  if (!payload?.fields?.length || !payload.valueRows?.length || rowIndex == null || !payload.valueRows[rowIndex]) {
    return [
      {
        title: t('monitor.detail.metric.table.empty.title'),
        copy: t('monitor.detail.metric.table.empty.copy'),
        meta: '-'
      }
    ];
  }

  const row = payload.valueRows[rowIndex];
  return payload.fields.map((field, fieldIndex) => ({
    title: field.name || `field-${fieldIndex + 1}`,
    copy: row.values?.[fieldIndex]?.origin || t('monitor.detail.value.null'),
    meta: field.unit || t('monitor.detail.metric.payload.meta')
  }));
}

export function buildMonitorHistoryMetricRows(items: MonitorHistoryMetricCatalogItem[], t: Translator) {
  return items.map(item => ({
    key: `${item.metrics}:${item.metric}`,
    title: item.metrics,
    copy: item.metric,
    meta: item.unit || t('monitor.detail.history-metric.meta')
  }));
}

export function filterMonitorHistoryMetricCatalog(items: MonitorHistoryMetricCatalogItem[], query: string) {
  if (!normalizeMonitorDetailQuery(query)) return items;

  return items.filter(item => includesMonitorDetailQuery([item.metrics, item.metric, `${item.metrics}.${item.metric}`, item.unit], query));
}

function extractHistoryValueSamples(payload: MonitorHistoryData) {
  return Object.entries(payload.values || {});
}

function latestHistoryValue(values: MonitorHistoryValue[]) {
  return [...values]
    .filter(value => value.time != null)
    .sort((left, right) => (right.time || 0) - (left.time || 0))[0] || values[values.length - 1];
}

export function buildMonitorHistoryPayloadRows(
  payload: MonitorHistoryData | null | undefined,
  t: Translator,
  formatTime: (value?: number | string | null) => string
) {
  if (!payload || extractHistoryValueSamples(payload).length === 0) {
    return [
      {
        title: t('monitor.detail.history-payload.empty.title'),
        copy: t('monitor.detail.history-payload.empty.copy'),
        meta: '-'
      }
    ];
  }

  const series = extractHistoryValueSamples(payload);
  const totalSamples = series.reduce((count, [, values]) => count + values.length, 0);
  const latest = series
    .flatMap(([, values]) => values)
    .filter(value => value.time != null)
    .sort((left, right) => (right.time || 0) - (left.time || 0))[0];

  return [
    { title: t('monitor.detail.history-payload.series'), copy: String(series.length), meta: t('monitor.detail.history-payload.meta') },
    { title: t('monitor.detail.history-payload.samples'), copy: String(totalSamples), meta: t('monitor.detail.history-payload.meta') },
    {
      title: t('monitor.detail.history-payload.field'),
      copy: [payload.metrics, payload.field?.name].filter(Boolean).join('.') || '-',
      meta: payload.field?.unit || t('monitor.detail.history-payload.meta')
    },
    {
      title: t('monitor.detail.history-payload.latest'),
      copy: formatTime(latest?.time ?? null),
      meta: t('monitor.detail.history-payload.meta')
    }
  ];
}

export function buildMonitorHistorySeriesRows(
  payload: MonitorHistoryData | null | undefined,
  t: Translator,
  formatTime: (value?: number | string | null) => string
): MonitorHistorySeriesRow[] {
  if (!payload || extractHistoryValueSamples(payload).length === 0) {
    return [
      {
        key: 'empty',
        title: t('monitor.detail.history-series.empty.title'),
        copy: t('monitor.detail.history-series.empty.copy'),
        meta: '-'
      }
    ];
  }

  return extractHistoryValueSamples(payload)
    .slice(0, 8)
    .map(([seriesKey, values]) => {
      const latest = latestHistoryValue(values);
      return {
        key: seriesKey,
        title: seriesKey,
        copy: latest?.origin || '-',
        meta: `${values.length} ${t('monitor.detail.history-series.samples')} · ${formatTime(latest?.time ?? null)}`
      };
    });
}

export function buildMonitorHistorySeriesSelectorRows(
  payload: MonitorHistoryData | null | undefined,
  t: Translator,
  formatTime: (value?: number | string | null) => string,
  aggregated = false
): MonitorHistorySeriesRow[] {
  if (!payload || extractHistoryValueSamples(payload).length === 0) {
    return [
      {
        key: 'empty',
        title: t('monitor.detail.history-series.empty.title'),
        copy: t('monitor.detail.history-series.empty.copy'),
        meta: '-'
      }
    ];
  }

  return extractHistoryValueSamples(payload)
    .map(([seriesKey, values]) => {
      const latest = latestHistoryValue(values);
      const primaryValue = aggregated ? latest?.mean ?? latest?.origin ?? '-' : latest?.origin ?? latest?.mean ?? '-';
      const meta = aggregated
        ? [latest?.min ? `min ${latest.min}` : null, latest?.max ? `max ${latest.max}` : null, formatTime(latest?.time ?? null)].filter(Boolean).join(' · ')
        : `${values.length} ${t('monitor.detail.history-series.samples')} · ${formatTime(latest?.time ?? null)}`;

      return {
        key: seriesKey,
        title: seriesKey,
        copy: primaryValue,
        meta
      };
    })
    .slice(0, 8);
}

export function filterMonitorHistorySeriesRows(rows: MonitorHistorySeriesRow[], query: string) {
  if (!normalizeMonitorDetailQuery(query)) return rows;

  return rows.filter(row => includesMonitorDetailQuery([row.title, row.copy, row.meta], query));
}

export function buildMonitorHistoryPointRows(
  payload: MonitorHistoryData | null | undefined,
  seriesKey: string | null | undefined,
  t: Translator,
  formatTime: (value?: number | string | null) => string,
  aggregated = false
) {
  return buildMonitorHistoryPointEvidenceRows(payload, seriesKey, t, formatTime, aggregated).map(({ title, copy, meta }) => ({
    title,
    copy,
    meta
  }));
}

export function buildMonitorHistoryPointEvidenceRows(
  payload: MonitorHistoryData | null | undefined,
  seriesKey: string | null | undefined,
  t: Translator,
  formatTime: (value?: number | string | null) => string,
  aggregated = false
): SelectableMonitorHistoryPointRow[] {
  if (!payload || !seriesKey || !payload.values?.[seriesKey]?.length) {
    return [
      {
        key: 'empty',
        title: t('monitor.detail.history-points.empty.title'),
        copy: t('monitor.detail.history-points.empty.copy'),
        meta: '-'
      }
    ];
  }

  const seriesValues = payload.values[seriesKey];

  return seriesValues
    .slice(-8)
    .reverse()
    .map((value, index, values) => {
      const sourceIndex = seriesValues.length - values.length + (values.length - index - 1);
      const primaryValue = aggregated ? value.mean ?? value.origin ?? '-' : value.origin ?? value.mean ?? '-';
      const meta = aggregated
        ? [value.min ? `min ${value.min}` : null, value.max ? `max ${value.max}` : null].filter(Boolean).join(' · ') || t('monitor.detail.history-points.meta').replace('{{index}}', String(index + 1))
        : t('monitor.detail.history-points.meta').replace('{{index}}', String(index + 1));
      return {
        key: String(sourceIndex),
        title: formatTime(value.time ?? null),
        copy: primaryValue,
        meta
      };
    });
}

export function buildMonitorHistorySelectedPointRows(
  payload: MonitorHistoryData | null | undefined,
  seriesKey: string | null | undefined,
  pointIndex: number | null | undefined,
  t: Translator,
  formatTime: (value?: number | string | null) => string,
  aggregated = false
) {
  if (!payload || !seriesKey || pointIndex == null || !payload.values?.[seriesKey]?.[pointIndex]) {
    return [
      {
        title: t('monitor.detail.history-selected.empty.title'),
        copy: t('monitor.detail.history-selected.empty.copy'),
        meta: '-'
      }
    ];
  }

  const value = payload.values[seriesKey][pointIndex];
  const rows = [
    {
      title: t('monitor.detail.history-selected.time'),
      copy: formatTime(value.time ?? null),
      meta: t('monitor.detail.history-selected.meta')
    }
  ];

  if (aggregated) {
    rows.push(
      {
        title: t('monitor.detail.history-selected.mean'),
        copy: value.mean ?? value.origin ?? '-',
        meta: t('monitor.detail.history-selected.meta')
      },
      {
        title: t('monitor.detail.history-selected.min'),
        copy: value.min ?? '-',
        meta: t('monitor.detail.history-selected.meta')
      },
      {
        title: t('monitor.detail.history-selected.max'),
        copy: value.max ?? '-',
        meta: t('monitor.detail.history-selected.meta')
      }
    );
  } else {
    rows.push({
      title: t('monitor.detail.history-selected.value'),
      copy: value.origin ?? value.mean ?? '-',
      meta: t('monitor.detail.history-selected.meta')
    });
  }

  return rows;
}

export function buildMonitorHistoryPointCompareRows(
  payload: MonitorHistoryData | null | undefined,
  visibleSeriesKeys: string[],
  pointIndex: number | null | undefined,
  selectedSeriesKey: string | null | undefined,
  t: Translator,
  formatTime: (value?: number | string | null) => string,
  aggregated = false
) {
  if (!payload || pointIndex == null || visibleSeriesKeys.length === 0) {
    return [
      {
        key: 'empty',
        title: t('monitor.detail.history-compare.empty.title'),
        copy: t('monitor.detail.history-compare.empty.copy'),
        meta: '-'
      }
    ];
  }

  const rows = visibleSeriesKeys
    .map(seriesKey => {
      const point = payload.values?.[seriesKey]?.[pointIndex];
      if (!point) return null;
      const primaryValue = aggregated ? point.mean ?? point.origin ?? '-' : point.origin ?? point.mean ?? '-';
      const meta = aggregated
        ? [point.min ? `min ${point.min}` : null, point.max ? `max ${point.max}` : null, formatTime(point.time ?? null)].filter(Boolean).join(' · ')
        : formatTime(point.time ?? null);

      return {
        key: seriesKey,
        title: seriesKey,
        copy: primaryValue,
        meta: selectedSeriesKey === seriesKey ? `${t('monitor.detail.history-compare.selected')} · ${meta}` : meta
      };
    })
    .filter(Boolean) as Array<{ key: string; title: string; copy: string; meta: string }>;

  if (rows.length === 0) {
    return [
      {
        key: 'empty',
        title: t('monitor.detail.history-compare.empty.title'),
        copy: t('monitor.detail.history-compare.empty.copy'),
        meta: '-'
      }
    ];
  }

  return rows;
}

export function buildMonitorHistorySeriesSummaryRows(
  payload: MonitorHistoryData | null | undefined,
  seriesKey: string | null | undefined,
  t: Translator,
  formatTime: (value?: number | string | null) => string,
  aggregated = false
) {
  if (!payload || !seriesKey || !payload.values?.[seriesKey]?.length) {
    return [
      {
        title: t('monitor.detail.history-summary.empty.title'),
        copy: t('monitor.detail.history-summary.empty.copy'),
        meta: '-'
      }
    ];
  }

  const values = payload.values[seriesKey];
  const latest = latestHistoryValue(values);
  const latestValue = aggregated ? latest.mean ?? latest.origin ?? '-' : latest.origin ?? latest.mean ?? '-';

  return [
    {
      title: t('monitor.detail.history-summary.series'),
      copy: seriesKey,
      meta: t('monitor.detail.history-summary.meta')
    },
    {
      title: t('monitor.detail.history-summary.samples'),
      copy: String(values.length),
      meta: t('monitor.detail.history-summary.meta')
    },
    {
      title: t('monitor.detail.history-summary.latest'),
      copy: formatTime(latest.time ?? null),
      meta: aggregated
        ? `mean ${latestValue} · min ${latest.min ?? '-'} · max ${latest.max ?? '-'}`
        : latestValue
    }
  ];
}

export function buildMonitorFavoriteJumpRows(
  favoriteNames: string[],
  metrics: MonitorDetailMetric[],
  historyMetrics: MonitorHistoryMetricCatalogItem[],
  t: Translator
): MonitorFavoriteJumpRow[] {
  const rows: MonitorFavoriteJumpRow[] = [];

  for (const metric of metrics) {
    if (favoriteNames.includes(metric.name)) {
      rows.push({
        key: `realtime:${metric.name}`,
        title: metric.name,
        copy: t('monitor.detail.favorite.realtime.copy'),
        meta: t('monitor.detail.favorite.realtime.meta'),
        targetKey: metric.name,
        targetKind: 'realtime',
        favoriteToken: metric.name
      });
    }
  }

  for (const item of historyMetrics) {
    const fullPath = `${item.metrics}.${item.metric}`;
    if (favoriteNames.includes(fullPath) || favoriteNames.includes(item.metrics) || favoriteNames.includes(item.metric)) {
      rows.push({
        key: `history:${fullPath}`,
        title: fullPath,
        copy: item.unit || t('monitor.detail.favorite.history.copy'),
        meta: t('monitor.detail.favorite.history.meta'),
        targetKey: `${item.metrics}:${item.metric}`,
        targetKind: 'history',
        favoriteToken: favoriteNames.includes(fullPath)
          ? fullPath
          : favoriteNames.includes(item.metrics)
            ? item.metrics
            : item.metric
      });
    }
  }

  return rows;
}
