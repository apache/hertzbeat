/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  buildMonitorHistoryChartOption,
  formatMonitorHistoryAxisTickLabel,
  type MonitorHistoryChartRenderInput
} from './monitor-history-chart-runtime';

type ChartOptionContract = {
  color: string[];
  tooltip: { trigger: string; confine: boolean; axisPointer: { type: string } };
  legend: { show: boolean; top: number; right: number };
  toolbox?: unknown;
  grid: { left: number; right: number; top: number; bottom: number; containLabel: boolean };
  dataZoom: Array<{
    type: string;
    zoomOnMouseWheel?: boolean;
    moveOnMouseMove?: boolean;
    moveOnMouseWheel?: boolean;
  }>;
  series: Array<{
    smooth: boolean;
    showSymbol: boolean;
    symbolSize: number;
    lineStyle: { color: string; width: number };
    areaStyle?: unknown;
  }>;
  xAxis: {
    splitNumber: number;
    min?: number;
    max?: number;
    axisTick: { show: boolean };
    axisLabel: { hideOverlap: boolean; showMinLabel: boolean; showMaxLabel: boolean };
  };
  yAxis: {
    minInterval?: number;
    splitNumber: number;
    min: number;
    max: number;
    interval: number;
    splitLine: { lineStyle: { type: string } };
    splitArea: { show: boolean };
  };
};

const colors = {
  text: '#d7dce5',
  muted: '#8d96a8',
  border: '#28303d',
  grid: '#202733',
  background: '#11151c',
  accent: '#9b5bb3',
  available: '#49aa19',
  degraded: '#d89614'
};

function chartOption(input: MonitorHistoryChartRenderInput) {
  return buildMonitorHistoryChartOption(input, colors) as unknown as ChartOptionContract;
}

describe('monitor history chart runtime', () => {
  it('uses the verified Next.js sparse time-axis labels', () => {
    const timestamp = new Date(2026, 7, 3, 23, 4).getTime();

    expect(formatMonitorHistoryAxisTickLabel(timestamp, 30 * 60 * 1000)).toBe('23:04');
    expect(formatMonitorHistoryAxisTickLabel(timestamp, 48 * 60 * 60 * 1000)).toBe('08/03 23:04');
  });

  it('uses a compact Grafana-like plot without detached toolbox or slider chrome', () => {
    const option = chartOption({
      title: 'basic.max_connections',
      series: [
        {
          name: 'origin',
          points: [
            [1, 151],
            [2, 151]
          ]
        }
      ]
    });

    expect(option.color[0]).toBe('#9b5bb3');
    expect(option.tooltip).toMatchObject({ trigger: 'axis', confine: true, axisPointer: { type: 'line' } });
    expect(option.legend.show).toBe(false);
    expect(option.toolbox).toBeUndefined();
    expect(option.grid).toMatchObject({ left: 8, right: 16, bottom: 20, containLabel: true });
    expect(option.dataZoom).toEqual([
      { type: 'inside', zoomOnMouseWheel: true, moveOnMouseMove: true, moveOnMouseWheel: false }
    ]);
    expect(option.series[0]).toMatchObject({
      smooth: false,
      showSymbol: true,
      symbolSize: 5,
      lineStyle: { color: '#9b5bb3', width: 2 }
    });
    expect(option.series[0]!.areaStyle).toBeDefined();
    expect(option.yAxis.splitArea.show).toBe(false);
    expect(option.yAxis.minInterval).toBeUndefined();
    expect(option.yAxis.splitNumber).toBe(3);
    expect(option.yAxis.splitLine.lineStyle.type).toBe('solid');
    expect(option.yAxis).toMatchObject({ min: 149, max: 153, interval: 2 });
    expect(option.xAxis).toMatchObject({
      splitNumber: 4,
      min: 1,
      max: 2,
      axisTick: { show: false },
      axisLabel: { hideOverlap: true, showMinLabel: true, showMaxLabel: false }
    });
  });

  it('shows a top legend and token-backed semantic colors for interval aggregates', () => {
    const option = chartOption({
      title: 'status.qps',
      series: [
        { name: 'Max', points: [[1, 10]] },
        { name: 'Min', points: [[1, 2]] },
        { name: 'Mean', points: [[1, 6]] }
      ]
    });

    expect(option.legend).toMatchObject({ show: true, top: 8, right: 12 });
    expect(option.series.map(series => series.lineStyle.color)).toEqual(['#d89614', '#49aa19', '#9b5bb3']);
  });

  it('hides symbols once a series is dense enough to read as a continuous signal', () => {
    const option = chartOption({
      title: 'status.qps',
      series: [{ name: 'origin', points: Array.from({ length: 17 }, (_, index) => [index, index]) }]
    });

    expect(option.series[0]).toMatchObject({ showSymbol: false, symbolSize: 5 });
  });
});
