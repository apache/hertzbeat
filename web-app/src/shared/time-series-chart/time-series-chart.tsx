/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';

import type {
  TimeSeriesChartRenderInput,
  TimeSeriesChartRuntime,
  TimeSeriesChartSeries
} from './time-series-chart-runtime';

export function TimeSeriesChart({
  title,
  ariaLabel,
  series,
  className
}: {
  title: string;
  ariaLabel: string;
  series: TimeSeriesChartSeries[];
  className?: string | undefined;
}) {
  const element = useRef<HTMLDivElement>(null);
  const runtime = useRef<TimeSeriesChartRuntime | undefined>(undefined);
  const input = useMemo<TimeSeriesChartRenderInput>(() => ({ title, series }), [series, title]);
  const latest = useRef(input);
  useEffect(() => {
    latest.current = input;
    runtime.current?.update(input);
  }, [input]);
  useEffect(() => {
    let cancelled = false;
    async function mountChart() {
      const module = await import('./time-series-chart-runtime');
      if (cancelled || !element.current) return;
      runtime.current = module.createTimeSeriesChart(element.current, latest.current);
    }
    void mountChart();
    return () => {
      cancelled = true;
      runtime.current?.dispose();
      runtime.current = undefined;
    };
  }, [title]);
  return <div ref={element} className={className} role="img" aria-label={ariaLabel} />;
}
