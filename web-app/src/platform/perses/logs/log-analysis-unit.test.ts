/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
