/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ExactTimeWindow } from '@/shared/query-context';
import type { HertzBeatMetricData } from '../datasource/hertzbeat-query-schema';
import { metricNumber, type MetricSeries } from './metric-series';

export function metricDisplayData(series: MetricSeries[], timeWindow: ExactTimeWindow): HertzBeatMetricData {
  return {
    source: null,
    timeWindow,
    series: series.map(item => ({
      ...item,
      displayName: item.refId ? `${item.refId} · ${item.name}` : item.name,
      points: item.points.flatMap(point => {
        const timestamp = metricNumber(point[0]);
        return timestamp == null ? [] : [{ timestamp, value: metricNumber(point[1]) ?? null }];
      })
    }))
  };
}
