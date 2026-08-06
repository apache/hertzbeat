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
  series: Array<{
    smooth: boolean;
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
};

const colors = {
  text: '#d7dce5',
  muted: '#8d96a8',
  border: '#28303d',
  grid: '#202733',
  background: '#11151c'
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

  it('uses the established blue primary curve and a subtle area fill', () => {
    const option = chartOption({
      title: 'basic.max_connections',
      series: [
        {
          name: 'origin',
          points: [
            [1, 151],
            [2, 152]
          ]
        }
      ],
      saveImageTitle: 'Save image'
    });

    expect(option.color[0]).toBe('#60a5fa');
    expect(option.tooltip).toMatchObject({ trigger: 'axis', confine: true, axisPointer: { type: 'cross' } });
    expect(option.legend.show).toBe(false);
    expect(option.series[0]).toMatchObject({
      smooth: true,
      lineStyle: { color: '#60a5fa', width: 2.4 },
      areaStyle: expect.any(Object)
    });
    expect(option.xAxis).toMatchObject({
      splitNumber: 5,
      min: 1,
      max: 2,
      axisTick: { show: false },
      axisLabel: { hideOverlap: true, showMinLabel: true, showMaxLabel: true }
    });
  });

  it('shows a top legend and stable semantic colors for interval aggregates', () => {
    const option = chartOption({
      title: 'status.qps',
      series: [
        { name: 'Max', points: [[1, 10]] },
        { name: 'Min', points: [[1, 2]] },
        { name: 'Mean', points: [[1, 6]] }
      ],
      saveImageTitle: 'Save image'
    });

    expect(option.legend).toMatchObject({ show: true, top: 8, right: 12 });
    expect(option.series.map(series => series.lineStyle.color)).toEqual(['#fbbf24', '#34d399', '#60a5fa']);
  });
});
