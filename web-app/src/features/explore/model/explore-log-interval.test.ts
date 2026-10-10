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

import { validLogIntervalGrid, DEFAULT_LOG_ANALYSIS, encodeLogAnalysis, parseLogAnalysis } from '@/platform/perses';
import { expect, it } from 'vitest';

import { buildLogAnalysisPath } from '../api/explore-log-analysis-api';
import { buildLogComparisonRequest } from '../api/explore-log-comparison-api';
import { buildSavedQueryPayload, readSavedQuery } from './explore-saved-query-model';
const query = { signal: 'logs' as const, timeRange: 'last-30m' as const };
it.each([1000, 5000, 10000, 30000, 60000, 300000, 900000, 1800000, 3600000, 21600000, 86400000])(
  'persists %i interval but sends it only for timeseries',
  intervalMs => {
    const analysis = parseLogAnalysis(
      JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries', intervalMs })
    );
    const saved = { ...query, logAnalysis: encodeLogAnalysis(analysis) };
    expect(readSavedQuery(buildSavedQueryPayload(saved, 'rollup', 'Rollup', ''))).toMatchObject({
      kind: 'ready',
      query: saved
    });
    for (const representation of ['timeseries', 'table', 'toplist', 'logs'] as const) {
      const state = { ...analysis, representation };
      const params = new URLSearchParams(buildLogAnalysisPath(query, { from: 0, to: 59000 }, state).split('?')[1]);
      expect(params.get('intervalMs')).toBe(representation === 'timeseries' ? String(intervalMs) : null);
    }
    expect(
      buildLogComparisonRequest(query, { from: 0, to: 59000 }, { ...analysis, comparison: { version: 1, search: '' } })
        .parameters.intervalMs
    ).toBe(String(intervalMs));
  }
);
it.each([0, 1, 1001, 1.5, '1000', null])('rejects invalid explicit interval %s', intervalMs => {
  expect(() =>
    parseLogAnalysis(JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries', intervalMs }))
  ).toThrow();
});

it('includes both endpoint buckets in the sixty bucket bound', () => {
  expect(validLogIntervalGrid({ start: 999, end: 59999 }, 1000)).toBe(true);
  expect(validLogIntervalGrid({ start: 999, end: 60000 }, 1000)).toBe(false);
});
