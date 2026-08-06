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
};
export type TimeSeriesChartRuntime = {
  update: (input: TimeSeriesChartRenderInput) => void;
  dispose: () => void;
};

type ChartColors = { text: string; muted: string; border: string; grid: string; background: string };

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
  const seriesColors = input.series.map((item, index) => seriesColor(item.name, index));
  const showLegend = input.series.length > 1;
  return {
    animationDuration: 220,
    color: seriesColors,
    textStyle: { color: colors.text },
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'cross', lineStyle: { color: colors.border, type: 'dashed' } },
      backgroundColor: colors.background,
      borderColor: colors.border,
      textStyle: { color: colors.text }
    },
    legend: {
      show: showLegend,
      type: 'scroll',
      top: 8,
      right: 12,
      itemWidth: 18,
      itemHeight: 3,
      textStyle: { color: colors.muted, fontSize: 11 }
    },
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
      left: 38,
      right: 24,
      top: chartTop(showLegend, input.unit),
      bottom: input.saveImageTitle ? 92 : 48,
      containLabel: true
    },
    xAxis: timeAxis(input.series, colors),
    yAxis: {
      type: 'value',
      name: input.unit,
      scale: true,
      minInterval: 1,
      nameTextStyle: { color: colors.muted },
      axisLabel: { color: colors.muted },
      splitLine: { lineStyle: { color: colors.grid, type: 'dashed' } },
      splitArea: { show: true, areaStyle: { color: ['transparent', colors.grid], opacity: 0.28 } }
    },
    dataZoom: [
      { type: 'inside', zoomOnMouseWheel: true, moveOnMouseMove: false, moveOnMouseWheel: false },
      ...(input.saveImageTitle
        ? [{ type: 'slider' as const, height: 30, bottom: 18, borderColor: colors.border, showDetail: false }]
        : [])
    ],
    series: input.series.map((item, index) => {
      const primary = input.series.length === 1 || isPrimarySeries(item.name);
      return {
        name: item.name,
        type: 'line',
        data: item.points,
        showSymbol: false,
        smooth: true,
        sampling: 'lttb',
        emphasis: { focus: 'series' },
        lineStyle: { width: primary ? 2.4 : 1.8, color: seriesColors[index] },
        itemStyle: { color: seriesColors[index] },
        areaStyle: primary ? primaryAreaStyle(seriesColors[index]!) : undefined
      };
    })
  };
}

function timeAxis(series: TimeSeriesChartSeries[], colors: ChartColors) {
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
    splitNumber: 5,
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
      showMaxLabel: true,
      formatter: (value: number) => formatTimeSeriesAxisTickLabel(value, range)
    },
    splitLine: { show: false }
  };
}

function chartTop(showLegend: boolean, unit: string | undefined) {
  if (showLegend) return 52;
  return unit ? 38 : 28;
}

export function formatTimeSeriesAxisTickLabel(value: number, rangeMs: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return rangeMs <= 24 * 60 * 60 * 1000 ? time : `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${time}`;
}

function primaryAreaStyle(color: string) {
  return {
    opacity: 0.2,
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

function seriesColor(name: string, index: number) {
  const colors = ['#60a5fa', '#a78bfa', '#22d3ee', '#fb7185', '#f97316', '#84cc16'];
  if (name.toLowerCase() === 'min') return '#34d399';
  if (name.toLowerCase() === 'max') return '#fbbf24';
  if (isPrimarySeries(name)) return '#60a5fa';
  return colors[index % colors.length]!;
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
    background: read('--hb-bg-raised', '#11151c')
  };
}
