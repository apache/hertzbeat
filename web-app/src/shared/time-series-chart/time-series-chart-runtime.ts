/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  ToolboxComponent,
  TooltipComponent
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  ToolboxComponent,
  TooltipComponent,
  CanvasRenderer
]);

export type TimeSeriesChartSeries = { name: string; points: [number, number][] };
export type TimeSeriesChartRenderInput = {
  title: string;
  unit?: string | undefined;
  series: TimeSeriesChartSeries[];
  saveImageTitle?: string | undefined;
  presentation?: 'area' | 'line' | 'soft-area' | 'monitor-history' | undefined;
};
export type TimeSeriesChartRuntime = {
  update: (input: TimeSeriesChartRenderInput) => void;
  dispose: () => void;
};

type ChartColors = {
  text: string;
  muted: string;
  border: string;
  grid: string;
  background: string;
  accent: string;
  available: string;
  degraded: string;
};

export function createTimeSeriesChart(
  element: HTMLDivElement,
  input: TimeSeriesChartRenderInput
): TimeSeriesChartRuntime {
  const chart = echarts.init(element, undefined, { renderer: 'canvas' });
  const resize = () => chart.resize();
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resize);
  observer?.observe(element);
  if (!observer) window.addEventListener('resize', resize);
  const update = (next: TimeSeriesChartRenderInput) =>
    chart.setOption(buildTimeSeriesChartOption(next, chartColors(element)), true);
  update(input);
  return {
    update,
    dispose: () => {
      observer?.disconnect();
      if (!observer) window.removeEventListener('resize', resize);
      chart.dispose();
    }
  };
}

export function buildTimeSeriesChartOption(
  input: TimeSeriesChartRenderInput,
  colors: ChartColors
): echarts.EChartsCoreOption {
  const seriesColors = input.series.map((item, index) => seriesColor(item.name, index, colors));
  const showLegend = input.series.length > 1;
  const monitorHistory = input.presentation === 'monitor-history';
  return {
    animationDuration: 220,
    color: seriesColors,
    textStyle: { color: colors.text },
    tooltip: chartTooltip(colors, monitorHistory),
    legend: chartLegend(showLegend, colors),
    toolbox: input.saveImageTitle
      ? {
          top: showLegend ? 32 : 6,
          right: 8,
          feature: {
            saveAsImage: {
              title: input.saveImageTitle,
              name: input.title,
              backgroundColor: colors.background
            }
          }
        }
      : undefined,
    grid: {
      left: monitorHistory ? 8 : 38,
      right: monitorHistory ? 16 : 24,
      top: chartTop(showLegend, input.unit, monitorHistory),
      bottom: monitorHistory ? 20 : input.saveImageTitle ? 92 : 48,
      containLabel: true
    },
    xAxis: timeAxis(input.series, colors, monitorHistory),
    yAxis: valueAxis(input.unit, colors, input.presentation, input.series),
    dataZoom: [
      {
        type: 'inside',
        zoomOnMouseWheel: true,
        moveOnMouseMove: monitorHistory,
        moveOnMouseWheel: false
      },
      ...(input.saveImageTitle
        ? [{ type: 'slider' as const, height: 30, bottom: 18, borderColor: colors.border, showDetail: false }]
        : [])
    ],
    series: chartSeries(input.series, seriesColors, input.presentation)
  };
}

function chartTooltip(colors: ChartColors, monitorHistory: boolean) {
  return {
    trigger: 'axis',
    confine: true,
    axisPointer: {
      type: monitorHistory ? 'line' : 'cross',
      lineStyle: { color: colors.border, type: monitorHistory ? 'solid' : 'dashed' }
    },
    backgroundColor: colors.background,
    borderColor: colors.border,
    textStyle: { color: colors.text }
  };
}

function chartLegend(show: boolean, colors: ChartColors) {
  return {
    show,
    type: 'scroll',
    top: 8,
    right: 12,
    itemWidth: 18,
    itemHeight: 3,
    textStyle: { color: colors.muted, fontSize: 11 }
  };
}

function valueAxis(
  unit: string | undefined,
  colors: ChartColors,
  presentation: TimeSeriesChartRenderInput['presentation'],
  series: TimeSeriesChartSeries[]
) {
  const monitorHistory = presentation === 'monitor-history';
  const monitorBounds = monitorHistory ? monitorHistoryValueAxisBounds(series) : undefined;
  return {
    type: 'value',
    name: unit,
    scale: true,
    ...(monitorHistory ? { ...monitorBounds, splitNumber: 3 } : {}),
    ...(presentation === 'area' ? { minInterval: 1 } : {}),
    nameTextStyle: { color: colors.muted },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: colors.muted,
      fontSize: monitorHistory ? 10 : undefined,
      margin: monitorHistory ? 8 : undefined,
      formatter: monitorHistory ? formatTimeSeriesValue : undefined
    },
    splitLine: {
      lineStyle: {
        color: colors.grid,
        type: monitorHistory ? 'solid' : 'dashed',
        opacity: monitorHistory ? 0.55 : 1
      }
    },
    splitArea:
      presentation !== 'area'
        ? { show: false }
        : { show: true, areaStyle: { color: ['transparent', colors.grid], opacity: 0.28 } }
  };
}

function chartSeries(
  series: TimeSeriesChartSeries[],
  colors: string[],
  presentation: TimeSeriesChartRenderInput['presentation']
) {
  return series.map((item, index) => {
    const primary = series.length === 1 || isPrimarySeries(item.name);
    const monitorHistory = presentation === 'monitor-history';
    return {
      name: item.name,
      type: 'line',
      data: item.points,
      showSymbol: monitorHistory && item.points.length <= 16,
      symbol: monitorHistory ? 'circle' : undefined,
      symbolSize: monitorHistory ? 5 : undefined,
      smooth: !monitorHistory,
      sampling: 'lttb',
      connectNulls: false,
      emphasis: { focus: 'series' },
      lineStyle: { width: monitorHistory ? (primary ? 2 : 1.6) : primary ? 2.4 : 1.8, color: colors[index] },
      itemStyle: { color: colors[index] },
      areaStyle:
        primary && presentation !== 'line' ? primaryAreaStyle(colors[index]!, monitorHistory ? 0.1 : 0.2) : undefined
    };
  });
}

function timeAxis(series: TimeSeriesChartSeries[], colors: ChartColors, monitorHistory: boolean) {
  let first: number | undefined;
  let last: number | undefined;
  for (const item of series) {
    for (const [timestamp] of item.points) {
      if (!Number.isFinite(timestamp)) continue;
      first = first === undefined ? timestamp : Math.min(first, timestamp);
      last = last === undefined ? timestamp : Math.max(last, timestamp);
    }
  }
  const range = first === undefined || last === undefined ? 0 : Math.max(last - first, 0);
  return {
    type: 'time',
    splitNumber: monitorHistory ? 4 : 5,
    min: first,
    max: last,
    axisLine: { lineStyle: { color: colors.border } },
    axisTick: { show: false },
    axisLabel: {
      color: colors.muted,
      fontSize: 10,
      margin: 12,
      hideOverlap: true,
      showMinLabel: true,
      showMaxLabel: !monitorHistory,
      formatter: (value: number) => formatTimeSeriesAxisTickLabel(value, range)
    },
    splitLine: { show: false }
  };
}

function chartTop(showLegend: boolean, unit: string | undefined, monitorHistory: boolean) {
  if (showLegend) return monitorHistory ? 44 : 52;
  if (monitorHistory) return unit ? 26 : 16;
  return unit ? 38 : 28;
}

export function formatTimeSeriesAxisTickLabel(value: number, rangeMs: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return rangeMs <= 24 * 60 * 60 * 1000 ? time : `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${time}`;
}

function primaryAreaStyle(color: string, opacity: number) {
  return {
    opacity,
    color: {
      type: 'linear',
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: `${color}66` },
        { offset: 1, color: `${color}05` }
      ]
    }
  };
}

function seriesColor(name: string, index: number, colors: ChartColors) {
  const palette = [colors.accent, '#a78bfa', '#22d3ee', '#fb7185', '#f97316', '#84cc16'];
  if (name.toLowerCase() === 'min') return colors.available;
  if (name.toLowerCase() === 'max') return colors.degraded;
  if (isPrimarySeries(name)) return colors.accent;
  return palette[index % palette.length]!;
}

function monitorHistoryValueAxisBounds(series: TimeSeriesChartSeries[]) {
  const values = series.flatMap(item => item.points.map(([, value]) => value)).filter(Number.isFinite);
  if (values.length === 0) return undefined;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = maximum - minimum;
  if (span !== 0) {
    const padding = Math.max(span * 0.08, 0.01);
    return { min: minimum - padding, max: maximum + padding };
  }
  const padding = Math.max(Math.abs(minimum) * 0.01, 1);
  const lower = Math.floor(minimum - padding);
  const upper = Math.ceil(maximum + padding);
  return { min: lower, max: upper, interval: (upper - lower) / 2 };
}

function formatTimeSeriesValue(value: number) {
  if (!Number.isFinite(value)) return '';
  const absolute = Math.abs(value);
  if (absolute < 1000) return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function isPrimarySeries(name: string) {
  const normalized = name.toLowerCase();
  return normalized === 'origin' || normalized === 'mean';
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function chartColors(element: HTMLElement): ChartColors {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    text: read('--hb-text-primary', '#d7dce5'),
    muted: read('--hb-text-secondary', '#8d96a8'),
    border: read('--hb-border-subtle', '#28303d'),
    grid: read('--hb-border-muted', '#202733'),
    background: read('--hb-bg-raised', '#11151c'),
    accent: read('--hb-brand-accent', '#9b5bb3'),
    available: read('--hb-status-available', '#49aa19'),
    degraded: read('--hb-status-degraded', '#d89614')
  };
}
