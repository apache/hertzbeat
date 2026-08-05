/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { MonitorHistorySeries } from '../model/monitor-detail-model';

const fallbackSeriesColors = ['#60a5fa', '#a78bfa', '#22d3ee', '#fb7185', '#f97316', '#84cc16'];

export function historySeriesColors(series: MonitorHistorySeries[]) {
  return series.map((item, index) => historySeriesColor(item.name, index));
}

export function historyLineSeries(series: MonitorHistorySeries[], colors: string[]) {
  return series.map((item, index) => ({
    name: item.name,
    type: 'line',
    data: item.points,
    showSymbol: false,
    smooth: true,
    sampling: 'lttb',
    emphasis: { focus: 'series' },
    lineStyle: { width: isPrimarySeries(item.name) ? 2.4 : 1.8, color: colors[index] },
    itemStyle: { color: colors[index] },
    areaStyle: isPrimarySeries(item.name) ? primaryAreaStyle(colors[index]!) : undefined
  }));
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

function historySeriesColor(name: string, index: number) {
  switch (name.toLowerCase()) {
    case 'origin':
    case 'mean':
      return '#60a5fa';
    case 'min':
      return '#34d399';
    case 'max':
      return '#fbbf24';
    default:
      return fallbackSeriesColors[index % fallbackSeriesColors.length]!;
  }
}

function isPrimarySeries(name: string) {
  const normalized = name.toLowerCase();
  return normalized === 'origin' || normalized === 'mean';
}
