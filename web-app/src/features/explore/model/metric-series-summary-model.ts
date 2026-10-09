/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { MetricSeries } from './explore-signal-model';

export function groupMetricSeriesSummary(series: MetricSeries[]) {
  const groups = new Map<string, { item: MetricSeries; number: number }[]>();
  series.forEach((item, index) => {
    const identity = JSON.stringify([item.name, item.unit ?? null]);
    const rows = groups.get(identity) ?? [];
    rows.push({ item, number: index + 1 });
    groups.set(identity, rows);
  });
  return [...groups].map(([identity, rows]) => ({
    identity,
    rows,
    common: Object.fromEntries(
      Object.entries(rows[0]!.item.labels ?? {}).filter(
        ([key, value]) => key !== '__name__' && rows.every(({ item }) => item.labels?.[key] === value)
      )
    )
  }));
}
