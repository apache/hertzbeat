import type { EChartsOption } from 'echarts';
import { graphic } from 'echarts/core';
import { buildChartDataZoomTimeContext, sanitizeTimeContext, type ChartDataZoomRange, type TimeContext } from '@/lib/time-context';
import type { MonitorHistoryValue } from '@/lib/types';

export type HistoryChartPoint = {
  x: number;
  y: number;
  label: string;
  rawValue: string;
};

export type HistoryChartSeries = {
  key: string;
  label: string;
  color: string;
  points: HistoryChartPoint[];
};

export type HistoryDataZoomRange = ChartDataZoomRange;

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function displayValue(value: MonitorHistoryValue, aggregated?: boolean) {
  if (aggregated) {
    return value.mean ?? value.origin ?? value.max ?? value.min ?? '-';
  }
  return value.origin ?? value.mean ?? value.max ?? value.min ?? '-';
}

function displaySeriesValue(value: MonitorHistoryValue, key: 'origin' | 'mean' | 'min' | 'max') {
  if (key === 'mean') {
    return value.mean ?? value.origin ?? '-';
  }
  if (key === 'origin') {
    return value.origin ?? value.mean ?? '-';
  }
  return value[key] ?? '-';
}

function toNumericValue(value: MonitorHistoryValue, aggregated?: boolean) {
  const numeric = Number(displayValue(value, aggregated));
  return Number.isFinite(numeric) ? numeric : 0;
}

function toSeriesNumericValue(value: MonitorHistoryValue, key: 'origin' | 'mean' | 'min' | 'max') {
  const numeric = Number(displaySeriesValue(value, key));
  return Number.isFinite(numeric) ? numeric : 0;
}

function toSeriesChartValue(value: MonitorHistoryValue, key: 'origin' | 'mean' | 'min' | 'max') {
  const rawValue = displaySeriesValue(value, key);
  if (rawValue == null || rawValue === '-' || rawValue === '') {
    return null;
  }
  const numeric = Number(rawValue);
  return Number.isFinite(numeric) ? numeric : null;
}

function withAlpha(color: string, alpha: number) {
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  return color;
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

export function formatHistoryAxisTickLabel(
  value: number | string | null | undefined,
  formatTime: (value?: number | string | null) => string,
  rangeMs = 0
) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return formatTime(value ?? null);

  const date = new Date(numeric);
  if (Number.isNaN(date.getTime())) return formatTime(value ?? null);

  const time = `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
  if (rangeMs <= 24 * 60 * 60 * 1000) return time;

  return `${padDatePart(date.getMonth() + 1)}/${padDatePart(date.getDate())} ${time}`;
}

export function buildHistoryChartPoints(values: MonitorHistoryValue[], formatTime: (value?: number | string | null) => string, aggregated = false): HistoryChartPoint[] {
  if (!values.length) return [];

  const numericValues = values.map(value => toNumericValue(value, aggregated));
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const span = max - min || 1;

  return values.map((value, index) => ({
    x: values.length === 1 ? 50 : (index / (values.length - 1)) * 100,
    y: 100 - ((numericValues[index] - min) / span) * 100,
    label: formatTime(value.time ?? null),
    rawValue: displayValue(value, aggregated)
  }));
}

export function buildHistoryChartPolyline(points: HistoryChartPoint[]) {
  return points.map(point => `${point.x},${point.y}`).join(' ');
}

export function findNearestHistoryChartPointIndex(points: HistoryChartPoint[], x: number) {
  if (!points.length) return null;

  let nearestIndex = 0;
  let nearestDistance = Math.abs(points[0].x - x);

  for (let index = 1; index < points.length; index += 1) {
    const distance = Math.abs(points[index].x - x);
    if (distance < nearestDistance) {
      nearestIndex = index;
      nearestDistance = distance;
    }
  }

  return nearestIndex;
}

export function buildHistoryChartSeries(values: MonitorHistoryValue[], formatTime: (value?: number | string | null) => string, aggregated = false): HistoryChartSeries[] {
  if (!values.length) return [];

  const seriesDefs = aggregated
    ? [
        { key: 'mean' as const, label: 'Mean', color: 'rgb(96,165,250)' },
        { key: 'min' as const, label: 'Min', color: 'rgb(52,211,153)' },
        { key: 'max' as const, label: 'Max', color: 'rgb(251,191,36)' }
      ]
    : [{ key: 'origin' as const, label: 'Value', color: 'rgb(96,165,250)' }];

  const activeDefs = seriesDefs.filter(def => values.some(value => displaySeriesValue(value, def.key) !== '-'));
  if (!activeDefs.length) return [];

  const numericValues = activeDefs.flatMap(def => values.map(value => toSeriesNumericValue(value, def.key)));
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const span = max - min || 1;

  return activeDefs.map(def => ({
    key: def.key,
    label: def.label,
    color: def.color,
    points: values.map((value, index) => ({
      x: values.length === 1 ? 50 : (index / (values.length - 1)) * 100,
      y: 100 - ((toSeriesNumericValue(value, def.key) - min) / span) * 100,
      label: formatTime(value.time ?? null),
      rawValue: displaySeriesValue(value, def.key)
    }))
  }));
}

export function buildHistoryChartSvgDocument(series: HistoryChartSeries[], selectedPointIndex: number | null = null) {
  const seriesMarkup = series
    .map(item => {
      const polyline = `<polyline fill="none" stroke="${item.color}" stroke-width="${item.key === 'mean' || item.key === 'origin' ? '2' : '1.4'}" points="${buildHistoryChartPolyline(item.points)}" />`;
      const circles = item.points
        .map((point, index) => {
          const selected = selectedPointIndex === index;
          const title = `${item.label} · ${point.label} · ${point.rawValue}`;
          return `<circle cx="${point.x}" cy="${point.y}" r="${selected ? '3' : item.key === 'mean' || item.key === 'origin' ? '1.8' : '1.3'}" fill="${item.color}" stroke="${selected ? 'white' : 'transparent'}" stroke-width="${selected ? '0.9' : '0'}"><title>${escapeXml(title)}</title></circle>`;
        })
        .join('');
      return `<g data-series="${escapeXml(item.key)}">${polyline}${circles}</g>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><line x1="0" y1="100" x2="100" y2="100" stroke="rgba(255,255,255,0.12)" stroke-width="1" /><line x1="0" y1="0" x2="0" y2="100" stroke="rgba(255,255,255,0.12)" stroke-width="1" />${seriesMarkup}</svg>`;
}

export function buildHistoryChartSvgDataUrl(svgDocument: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgDocument)}`;
}

export function buildHistoryChartDownloadName(aggregated = false) {
  return aggregated ? 'monitor-history-aggregated.svg' : 'monitor-history-raw.svg';
}

export function buildHistoryDataZoomTimeContext(
  values: MonitorHistoryValue[],
  zoomRange: HistoryDataZoomRange | null | undefined,
  fallbackTimeRange?: string
): TimeContext | null {
  return buildChartDataZoomTimeContext(values.map(value => value.time as number | string | null | undefined), zoomRange, fallbackTimeRange);
}

export function buildHistoryDataZoomPreviewTimeContext(
  values: MonitorHistoryValue[],
  zoomRange: HistoryDataZoomRange | null | undefined,
  currentTimeContext: TimeContext | undefined,
  fallbackTimeRange?: string
): TimeContext | null {
  const zoomContext = buildHistoryDataZoomTimeContext(values, zoomRange, fallbackTimeRange);
  if (!zoomContext) return null;

  const timezone = currentTimeContext?.timezone || currentTimeContext?.tz;
  return sanitizeTimeContext({
    ...zoomContext,
    refresh: currentTimeContext?.refresh,
    live: currentTimeContext?.live,
    tz: currentTimeContext?.tz || timezone,
    timezone
  });
}

export function buildHistoryDataZoomApplyTimeContext(
  values: MonitorHistoryValue[],
  zoomRange: HistoryDataZoomRange | null | undefined,
  currentTimeContext: TimeContext | undefined,
  fallbackTimeRange?: string
): TimeContext | null {
  const zoomContext = buildHistoryDataZoomTimeContext(values, zoomRange, fallbackTimeRange);
  if (!zoomContext?.from || !zoomContext.to) return null;

  const timezone = currentTimeContext?.timezone || currentTimeContext?.tz;
  return sanitizeTimeContext({
    from: zoomContext.from,
    to: zoomContext.to,
    refresh: currentTimeContext?.refresh,
    live: currentTimeContext?.live,
    tz: currentTimeContext?.tz || timezone,
    timezone
  });
}

export function buildHistoryResetTimeContext(
  currentTimeContext: TimeContext | undefined,
  fallbackTimeRange?: string
): TimeContext {
  const timezone = currentTimeContext?.timezone || currentTimeContext?.tz;
  return sanitizeTimeContext({
    timeRange: fallbackTimeRange || currentTimeContext?.timeRange,
    refresh: currentTimeContext?.refresh,
    live: currentTimeContext?.live,
    tz: currentTimeContext?.tz || timezone,
    timezone
  });
}

export function buildHistoryChartEChartsOption({
  values,
  formatTime,
  aggregated = false,
  selectedPointIndex = null,
  visibleSeriesKeys,
  enableDataZoom = true
}: {
  values: MonitorHistoryValue[];
  formatTime: (value?: number | string | null) => string;
  aggregated?: boolean;
  selectedPointIndex?: number | null;
  visibleSeriesKeys?: string[];
  enableDataZoom?: boolean;
}): EChartsOption {
  const series = buildHistoryChartSeries(values, formatTime, aggregated);
  const seriesKeys = series.map(item => item.key);
  const resolvedVisibleSeriesKeys = visibleSeriesKeys?.length ? visibleSeriesKeys.filter(key => seriesKeys.includes(key)) : seriesKeys;
  const visibleSeries = series.filter(item => resolvedVisibleSeriesKeys.includes(item.key));
  const activePointIndex = selectedPointIndex != null && selectedPointIndex >= 0 ? selectedPointIndex : undefined;
  const timedValues = values.filter(value => value.time != null);
  const firstTime = Number(timedValues[0]?.time);
  const lastTime = Number(timedValues[timedValues.length - 1]?.time);
  const historyRangeMs = Number.isFinite(firstTime) && Number.isFinite(lastTime) ? Math.max(lastTime - firstTime, 0) : 0;
  const shouldRenderDataZoom = enableDataZoom && values.length > 1;
  const palette = {
    panel: 'rgba(11, 18, 32, 0.96)',
    border: 'rgba(148, 163, 184, 0.18)',
    text: 'rgba(241, 245, 249, 0.92)',
    muted: 'rgba(148, 163, 184, 0.72)',
    grid: 'rgba(148, 163, 184, 0.14)',
    axis: 'rgba(148, 163, 184, 0.24)',
    crosshair: 'rgba(96, 165, 250, 0.42)'
  };

  return {
    animation: false,
    backgroundColor: 'transparent',
    color: visibleSeries.map(item => item.color),
    grid: {
      left: 38,
      right: 24,
      top: 34,
      bottom: visibleSeries.length > 0 && shouldRenderDataZoom ? 92 : 46,
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: 'rgba(15, 23, 42, 0.98)',
          color: palette.text
        },
        crossStyle: {
          color: palette.crosshair,
          type: 'dashed'
        },
        lineStyle: {
          color: palette.crosshair,
          type: 'dashed'
        }
      },
      backgroundColor: palette.panel,
      borderColor: palette.border,
      borderWidth: 1,
      extraCssText: 'box-shadow: 0 14px 36px rgba(2, 6, 23, 0.42); border-radius: 10px; padding: 0;',
      textStyle: { color: palette.text },
      formatter: (params: any) => {
        const rows = Array.isArray(params) ? params : [params];
        const pointLabel =
          rows[0]?.axisValueLabel ||
          (Array.isArray(rows[0]?.value) ? formatTime(rows[0]?.value?.[0] ?? null) : rows[0]?.name) ||
          '-';
        const body = rows
          .map(row => {
            const marker = row.marker || '';
            const seriesName = row.seriesName || row.name || '-';
            const value = Array.isArray(row.value) ? row.value[row.value.length - 1] : row.value;
            return `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;"><span style="color:${palette.muted};">${marker}${seriesName}</span><strong style="color:${palette.text};font-weight:600;">${value ?? '-'}</strong></div>`;
          })
          .join('');
        return `<div style="min-width:180px;padding:10px 12px;">
          <div style="margin-bottom:8px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${palette.muted};">${pointLabel}</div>
          <div style="display:grid;gap:6px;">${body}</div>
        </div>`;
      }
    },
    legend: {
      show: visibleSeries.length > 1,
      top: 0,
      right: 0,
      textStyle: {
        color: palette.muted,
        fontSize: 11
      }
    },
    toolbox: {
      show: false
    },
    xAxis: {
      type: 'time',
      splitNumber: 5,
      axisLine: { lineStyle: { color: palette.axis } },
      axisTick: { show: false },
      min: timedValues[0]?.time,
      max: timedValues[timedValues.length - 1]?.time,
      axisLabel: {
        color: palette.muted,
        fontSize: 10,
        margin: 16,
        hideOverlap: true,
        showMinLabel: true,
        showMaxLabel: true,
        formatter: (value: number) => formatHistoryAxisTickLabel(value, formatTime, historyRangeMs)
      },
      axisPointer: {
        show: true,
        lineStyle: {
          color: palette.crosshair,
          type: 'dashed'
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: palette.grid,
          type: 'dashed'
        }
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(15, 23, 42, 0.18)', 'rgba(15, 23, 42, 0.08)']
        }
      },
      axisLabel: { color: palette.muted, fontSize: 10, margin: 10 }
    },
    dataZoom:
      shouldRenderDataZoom
        ? [
            {
              type: 'slider',
              xAxisIndex: 0,
              filterMode: 'none',
              start: 0,
              end: 100,
              bottom: 18,
              height: 30,
              showDetail: false,
              textStyle: {
                color: palette.muted
              }
            },
            {
              type: 'inside',
              xAxisIndex: 0,
              filterMode: 'none',
              start: 0,
              end: 100,
              zoomOnMouseWheel: false,
              moveOnMouseMove: false,
              moveOnMouseWheel: false
            }
          ]
        : undefined,
    series: visibleSeries.map(item => {
      const seriesKey = item.key as 'origin' | 'mean' | 'min' | 'max';
      const seriesData = values.map(value => [value.time ?? null, toSeriesChartValue(value, seriesKey)] as [number | null, number | null]) as any;
      const selectedValue = activePointIndex != null ? toSeriesChartValue(values[activePointIndex] ?? {}, seriesKey) : null;
      const selectedTime = activePointIndex != null ? values[activePointIndex]?.time ?? activePointIndex : null;

      return {
        name: item.label,
        type: 'line',
        smooth: true,
        connectNulls: false,
        symbol: 'circle',
        showSymbol: false,
        lineStyle: {
          width: item.key === 'mean' || item.key === 'origin' ? 2.4 : 1.8,
          color: item.color
        },
        itemStyle: {
          color: item.color
        },
        areaStyle:
          item.key === 'mean' || item.key === 'origin'
            ? {
                opacity: 0.2,
                color: new graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: withAlpha(item.color, 0.34) },
                  { offset: 1, color: withAlpha(item.color, 0.02) }
                ])
              }
            : {
                opacity: 0.08,
                color: new graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: withAlpha(item.color, 0.18) },
                  { offset: 1, color: withAlpha(item.color, 0.01) }
                ])
              },
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: item.key === 'mean' || item.key === 'origin' ? 2.8 : 2.2
          }
        },
        markPoint:
          activePointIndex != null && selectedTime != null && selectedValue != null
            ? {
                symbol: 'circle',
                symbolSize: 10,
                itemStyle: {
                  color: item.color,
                  borderColor: '#ffffff',
                  borderWidth: 1
                },
                data: [
                  {
                    name: item.label,
                    coord: [selectedTime, selectedValue] as [number, number]
                  }
                ]
              }
            : undefined,
        data: seriesData
      };
    })
  };
}
