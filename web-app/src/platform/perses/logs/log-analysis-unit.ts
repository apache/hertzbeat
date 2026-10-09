/* Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. See the NOTICE file distributed with this work for additional information regarding copyright ownership. */
import type { LogMeasure } from './log-measure';

export function logAnalysisUnitKey(analysis: {
  measure?: LogMeasure | null | undefined;
  transform?: 'throughput' | undefined;
}) {
  if (analysis.transform === 'throughput') {
    return analysis.measure ? 'explore.logAnalysis.throughputValueUnit' : 'explore.logAnalysis.throughputLogsUnit';
  }
  if (!analysis.measure) return 'explore.logAnalysis.logsUnit';
  return analysis.measure.function === 'unique' ? 'explore.logAnalysis.distinctValuesUnit' : undefined;
}
