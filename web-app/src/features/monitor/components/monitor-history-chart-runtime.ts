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

import type { MonitorHistorySeries } from '../model/monitor-detail-model';
import { historyLineSeries, historySeriesColors } from './monitor-history-chart-series';

echarts.use([
  LineChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  ToolboxComponent,
  TooltipComponent,
  CanvasRenderer
]);

export type MonitorHistoryChartRuntime = {
  update: (input: MonitorHistoryChartRenderInput) => void;
  dispose: () => void;
};

export type MonitorHistoryChartRenderInput = {
  title: string;
  unit?: string | undefined;
  series: MonitorHistorySeries[];
  saveImageTitle: string;
};

type MonitorHistoryChartColors = {
  text: string;
  muted: string;
  border: string;
  grid: string;
  background: string;
};

export function createMonitorHistoryChart(
  element: HTMLDivElement,
  input: MonitorHistoryChartRenderInput
): MonitorHistoryChartRuntime {
  const chart = echarts.init(element, undefined, { renderer: 'canvas' });
  const resize = () => chart.resize();
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resize);
  observer?.observe(element);
  if (!observer) window.addEventListener('resize', resize);
  const update = (next: MonitorHistoryChartRenderInput) =>
    chart.setOption(buildMonitorHistoryChartOption(next, chartColors(element)), true);
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

/**
 * Keeps visual semantics independent from the ECharts lifecycle so palette and
 * legend behavior remain deterministic across lazy mounts and theme refreshes.
 */
export function buildMonitorHistoryChartOption(
  input: MonitorHistoryChartRenderInput,
  colors: MonitorHistoryChartColors
): echarts.EChartsCoreOption {
  const seriesColors = historySeriesColors(input.series);
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
    toolbox: {
      top: showLegend ? 32 : 6,
      right: 8,
      feature: { saveAsImage: { title: input.saveImageTitle, name: input.title, backgroundColor: colors.background } }
    },
    grid: {
      left: 38,
      right: 24,
      top: showLegend ? 52 : input.unit ? 38 : 28,
      bottom: 92,
      containLabel: true
    },
    xAxis: historyTimeAxis(input.series, colors),
    yAxis: historyValueAxis(input.unit, colors),
    dataZoom: [
      { type: 'inside', zoomOnMouseWheel: true, moveOnMouseMove: false, moveOnMouseWheel: false },
      { type: 'slider', height: 30, bottom: 18, borderColor: colors.border, showDetail: false }
    ],
    series: historyLineSeries(input.series, seriesColors)
  };
}

function historyTimeAxis(series: MonitorHistorySeries[], colors: MonitorHistoryChartColors) {
  const { firstTimestamp, lastTimestamp } = historyTimeBounds(series);
  const rangeMs =
    firstTimestamp === undefined || lastTimestamp === undefined ? 0 : Math.max(lastTimestamp - firstTimestamp, 0);
  return {
    type: 'time',
    splitNumber: 5,
    min: firstTimestamp,
    max: lastTimestamp,
    axisLine: { lineStyle: { color: colors.border } },
    axisTick: { show: false },
    axisLabel: {
      color: colors.muted,
      fontSize: 10,
      margin: 12,
      hideOverlap: true,
      showMinLabel: true,
      showMaxLabel: true,
      formatter: (value: number) => formatMonitorHistoryAxisTickLabel(value, rangeMs)
    },
    splitLine: { show: false }
  };
}

function historyTimeBounds(series: MonitorHistorySeries[]) {
  let firstTimestamp: number | undefined;
  let lastTimestamp: number | undefined;
  for (const item of series) {
    for (const [timestamp] of item.points) {
      if (!Number.isFinite(timestamp)) continue;
      firstTimestamp = firstTimestamp === undefined ? timestamp : Math.min(firstTimestamp, timestamp);
      lastTimestamp = lastTimestamp === undefined ? timestamp : Math.max(lastTimestamp, timestamp);
    }
  }
  return { firstTimestamp, lastTimestamp };
}

function historyValueAxis(unit: string | undefined, colors: MonitorHistoryChartColors) {
  return {
    type: 'value',
    name: unit,
    scale: true,
    nameTextStyle: { color: colors.muted },
    axisLabel: { color: colors.muted },
    splitLine: { lineStyle: { color: colors.grid, type: 'dashed' } },
    splitArea: { show: true, areaStyle: { color: ['transparent', colors.grid], opacity: 0.28 } }
  };
}

/** Formats dense time axes exactly like the reviewed Next.js monitor chart. */
export function formatMonitorHistoryAxisTickLabel(value: number, rangeMs: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const time = `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
  if (rangeMs <= 24 * 60 * 60 * 1000) return time;
  return `${padDatePart(date.getMonth() + 1)}/${padDatePart(date.getDate())} ${time}`;
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function chartColors(element: HTMLElement) {
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
