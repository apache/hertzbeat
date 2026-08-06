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

export type MonitorHistoryChartRuntime = TimeSeriesChartRuntime;
export type MonitorHistoryChartRenderInput = TimeSeriesChartRenderInput & { saveImageTitle: string };
export const createMonitorHistoryChart = createTimeSeriesChart;
export const buildMonitorHistoryChartOption = buildTimeSeriesChartOption;
export const formatMonitorHistoryAxisTickLabel = formatTimeSeriesAxisTickLabel;
