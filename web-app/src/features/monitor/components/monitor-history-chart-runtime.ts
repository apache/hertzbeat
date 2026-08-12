/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  buildTimeSeriesChartOption,
  createTimeSeriesChart,
  formatTimeSeriesAxisTickLabel,
  type TimeSeriesChartRenderInput,
  type TimeSeriesChartRuntime
} from '@/shared/time-series-chart/time-series-chart-runtime';

export type MonitorHistoryChartRuntime = Omit<TimeSeriesChartRuntime, 'update'> & {
  update: (input: MonitorHistoryChartRenderInput) => void;
};
export type MonitorHistoryChartRenderInput = Omit<TimeSeriesChartRenderInput, 'presentation' | 'saveImageTitle'>;
export const createMonitorHistoryChart = (element: HTMLDivElement, input: MonitorHistoryChartRenderInput) => {
  const runtime = createTimeSeriesChart(element, monitorHistoryInput(input));
  return {
    update: (next: MonitorHistoryChartRenderInput) => runtime.update(monitorHistoryInput(next)),
    dispose: runtime.dispose
  };
};
export const buildMonitorHistoryChartOption = (
  input: MonitorHistoryChartRenderInput,
  colors: Parameters<typeof buildTimeSeriesChartOption>[1]
) => buildTimeSeriesChartOption(monitorHistoryInput(input), colors);
export const formatMonitorHistoryAxisTickLabel = formatTimeSeriesAxisTickLabel;

function monitorHistoryInput(input: MonitorHistoryChartRenderInput): TimeSeriesChartRenderInput {
  return { ...input, presentation: 'monitor-history' };
}
