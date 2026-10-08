/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
export type ExploreTimeRange = 'last-15m' | 'last-30m' | 'last-1h' | 'last-6h' | 'last-24h';
export function timeRangeMilliseconds(timeRange: ExploreTimeRange) {
  const minutes: Record<ExploreTimeRange, number> = {
    'last-15m': 15,
    'last-30m': 30,
    'last-1h': 60,
    'last-6h': 360,
    'last-24h': 1440
  };
  return minutes[timeRange] * 60_000;
}
