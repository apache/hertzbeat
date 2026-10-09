/* Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. See the NOTICE file distributed with this work for additional information regarding copyright ownership. */
import { expect, it } from 'vitest';
import { logAnalysisUnitKey } from './log-analysis-unit';

it('labels log counts and throughput without assigning units to unknown formulas or measurements', () => {
  expect(logAnalysisUnitKey({})).toBe('explore.logAnalysis.logsUnit');
  expect(logAnalysisUnitKey({ measure: { function: 'unique', field: 'attribute:user' } })).toBe(
    'explore.logAnalysis.distinctValuesUnit'
  );
  expect(logAnalysisUnitKey({ transform: 'throughput' })).toBe('explore.logAnalysis.throughputLogsUnit');
  expect(
    logAnalysisUnitKey({ measure: { function: 'avg', field: 'attribute:latency' }, transform: 'throughput' })
  ).toBe('explore.logAnalysis.throughputValueUnit');
  expect(logAnalysisUnitKey({ measure: { function: 'avg', field: 'attribute:latency' } })).toBeUndefined();
});
