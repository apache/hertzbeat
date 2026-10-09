/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { TimeSeriesData } from '@perses-dev/spec';

import type { ExactTimeWindow } from '@/shared/query-context';

export type HertzBeatTimeSeries = {
  displayName?: string;
  key: string;
  name: string;
  labels: Record<string, string>;
  points: Array<{ timestamp: number; value: number | null }>;
};

export function toPersesTimeSeriesData(
  series: HertzBeatTimeSeries[],
  requestedWindow?: ExactTimeWindow
): TimeSeriesData {
  const timeRange = resolveTimeRange(series, requestedWindow);
  return {
    timeRange: { start: new Date(timeRange.from), end: new Date(timeRange.to) },
    stepMs: resolveStepMs(series),
    series: series.map(item => ({
      name: item.key,
      formattedName: item.displayName ?? formatSeriesName(item),
      labels: item.labels,
      values: item.points.map(point => [point.timestamp, point.value])
    }))
  };
}

export function resolvePersesTimeWindow(
  series: HertzBeatTimeSeries[],
  requestedWindow?: ExactTimeWindow
): ExactTimeWindow {
  return resolveTimeRange(series, requestedWindow);
}

function resolveTimeRange(series: HertzBeatTimeSeries[], requestedWindow?: ExactTimeWindow): ExactTimeWindow {
  if (isValidWindow(requestedWindow)) return requestedWindow;
  let from = Number.POSITIVE_INFINITY;
  let observedTo = Number.NEGATIVE_INFINITY;
  for (const item of series) {
    for (const point of item.points) {
      if (!Number.isFinite(point.timestamp)) continue;
      if (point.timestamp < from) from = point.timestamp;
      if (point.timestamp > observedTo) observedTo = point.timestamp;
    }
  }
  if (!Number.isFinite(from)) {
    const now = Date.now();
    return { from: now - 30 * 60 * 1000, to: now };
  }
  return { from, to: observedTo > from ? observedTo : from + 1 };
}

function resolveStepMs(series: HertzBeatTimeSeries[]) {
  let smallestStep = Number.POSITIVE_INFINITY;
  for (const item of series) {
    for (let index = 1; index < item.points.length; index += 1) {
      const current = item.points[index];
      const previous = item.points[index - 1];
      if (!current || !previous) continue;
      const difference = current.timestamp - previous.timestamp;
      if (difference > 0 && Number.isFinite(difference) && difference < smallestStep) smallestStep = difference;
    }
  }
  return Number.isFinite(smallestStep) ? smallestStep : 15_000;
}

function formatSeriesName(series: HertzBeatTimeSeries) {
  const labels = Object.entries(series.labels)
    .filter(([name]) => name !== '__name__')
    .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
    .join(', ');
  return labels ? `${series.name}{${labels}}` : series.name;
}

function isValidWindow(window: ExactTimeWindow | undefined): window is ExactTimeWindow {
  return Boolean(
    window &&
    Number.isSafeInteger(window.from) &&
    Number.isSafeInteger(window.to) &&
    window.from > 0 &&
    window.to > window.from
  );
}
