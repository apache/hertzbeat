/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { metricPoints, type MetricSeries } from './metric-series';
import type { MetricView } from './metric-view';
export type MetricSplitGroup = { value: string | undefined; series: MetricSeries[]; average?: number | undefined };
export function splitMetricSeries(series: MetricSeries[], view: MetricView, rankingSeries = series) {
  const labels = [...new Set(series.flatMap(item => Object.keys(item.labels)))]
    .filter(key => key !== '__name__')
    .sort();
  const rankBy =
    view.splitRankBy && rankingSeries.some(item => item.refId === view.splitRankBy && metricPoints(item).length)
      ? view.splitRankBy
      : series.find(item => item.refId && metricPoints(item).length)?.refId;
  if (!view.splitBy || !labels.includes(view.splitBy)) return { labels, groups: [], total: 0, rankBy };
  const buckets = new Map<string | undefined, MetricSeries[]>();
  for (const item of series) {
    const key = item.labels[view.splitBy];
    const bucket = buckets.get(key) ?? [];
    bucket.push(item);
    buckets.set(key, bucket);
  }
  const groups: MetricSplitGroup[] = [...buckets].map(([value, items]) => {
    const points = rankingSeries
      .filter(item => item.refId === rankBy && item.labels[view.splitBy!] === value)
      .flatMap(metricPoints);
    return {
      value,
      series: items,
      average: points.length
        ? points.reduce((mean, point, index) => mean * (index / (index + 1)) + point.value / (index + 1), 0)
        : undefined
    };
  });
  groups.sort((a, b) => {
    if (a.average === undefined) return b.average === undefined ? 0 : 1;
    if (b.average === undefined) return -1;
    return (
      (view.splitOrder === 'bottom' ? a.average - b.average : b.average - a.average) ||
      (a.value ?? '').localeCompare(b.value ?? '')
    );
  });
  return { labels, rankBy, total: groups.length, groups: groups.slice(0, view.splitLimit ?? 12) };
}
export function metricSplitDomain(groups: MetricSplitGroup[]) {
  const values = groups.flatMap(group =>
    group.series.flatMap(series => metricPoints(series).map(point => point.value))
  );
  if (!values.length) return undefined;
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const padding = min === max ? Math.abs(min) * 0.01 || 1 : 0;
  return { min: Math.max(-Number.MAX_VALUE, min - padding), max: Math.min(Number.MAX_VALUE, max + padding) };
}
