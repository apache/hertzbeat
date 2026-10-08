/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { parseMetricView, parseLogView, parseLogAnalysis } from '@/platform/perses';
import type { ExploreQuery } from './explore-query';
import { readTraceView } from './explore-trace-view';
export function panelOptions(query: ExploreQuery, pinned: boolean) {
  if (query.signal === 'metrics') return query.metricView ? { metricView: parseMetricView(query.metricView) } : {};
  if (query.signal === 'logs' && query.logView) {
    const view = parseLogView(query.logView);
    return { columns: view.columns, density: view.density, allowWrap: view.wrap };
  }
  if (query.signal === 'traces' && !pinned && query.traceView) {
    const view = readTraceView(query.traceView);
    if (!view) throw new Error('Invalid trace view');
    return { columns: view.columns, density: view.density };
  }
  return {};
}

export function analyticalPanelHeight(analysis: ReturnType<typeof parseLogAnalysis> | undefined) {
  if (analysis?.representation === 'timeseries') return analysis.comparison ? 16 : 12;
  return analysis?.comparison ? 12 : 8;
}
