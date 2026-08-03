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

export function createMonitorHistoryChart(
  element: HTMLDivElement,
  input: MonitorHistoryChartRenderInput
): MonitorHistoryChartRuntime {
  const chart = echarts.init(element, undefined, { renderer: 'canvas' });
  const resize = () => chart.resize();
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resize);
  observer?.observe(element);
  if (!observer) window.addEventListener('resize', resize);
  const update = (next: MonitorHistoryChartRenderInput) => chart.setOption(chartOption(element, next), true);
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

function chartOption(element: HTMLElement, input: MonitorHistoryChartRenderInput): echarts.EChartsCoreOption {
  const colors = chartColors(element);
  return {
    animationDuration: 220,
    color: colors.series,
    textStyle: { color: colors.text },
    tooltip: { trigger: 'axis', confine: true },
    legend: input.series.length > 1 ? { type: 'scroll', bottom: 30, textStyle: { color: colors.muted } } : undefined,
    toolbox: {
      right: 8,
      feature: { saveAsImage: { title: input.saveImageTitle, name: input.title, backgroundColor: colors.background } }
    },
    grid: {
      left: 16,
      right: 22,
      top: input.unit ? 38 : 28,
      bottom: input.series.length > 1 ? 78 : 56,
      containLabel: true
    },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.muted },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      name: input.unit,
      scale: true,
      nameTextStyle: { color: colors.muted },
      axisLabel: { color: colors.muted },
      splitLine: { lineStyle: { color: colors.grid } }
    },
    dataZoom: [
      { type: 'inside', zoomOnMouseWheel: true, moveOnMouseMove: false, moveOnMouseWheel: false },
      { type: 'slider', height: 16, bottom: input.series.length > 1 ? 52 : 22, borderColor: colors.border }
    ],
    series: input.series.map(series => ({
      name: series.name,
      type: 'line',
      data: series.points,
      showSymbol: false,
      sampling: 'lttb',
      emphasis: { focus: 'series' },
      lineStyle: { width: 1.5 }
    }))
  };
}

function chartColors(element: HTMLElement) {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    text: read('--hb-text-primary', '#d7dce5'),
    muted: read('--hb-text-secondary', '#8d96a8'),
    border: read('--hb-border-subtle', '#28303d'),
    grid: read('--hb-border-muted', '#202733'),
    background: read('--hb-bg-raised', '#11151c'),
    series: ['#8f5bd7', '#43a7d8', '#52b788', '#f3a712', '#e76f51', '#b8a1e3']
  };
}
