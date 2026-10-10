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
import { DEFAULT_LOG_ANALYSIS, encodeLogAnalysis, parseLogAnalysis } from '@/platform/perses';
import { readLogAnalysisDraft } from './explore-log-analysis';
import { buildLogAnalysisPath } from '../api/explore-log-analysis-api';
import { buildLogComparisonRequest } from '../api/explore-log-comparison-api';
import { buildSavedQueryPayload, readSavedQuery } from './explore-saved-query-model';
const measures = [
  { function: 'avg', field: 'attribute:duration' },
  { function: 'unique', field: 'builtin:serviceName' },
  { function: 'p95', field: 'attribute:duration' }
];
const query = { signal: 'logs' as const, timeRange: 'last-30m' as const };
it.each([1, 3])('preserves table view and %i extras in saved and analysis contracts', size => {
  const additionalMeasures = measures.slice(0, size);
  const state = parseLogAnalysis(
    JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, representation: 'table', additionalMeasures })
  );
  const saved = { ...query, logAnalysis: encodeLogAnalysis(state) };
  const reopened = readSavedQuery(buildSavedQueryPayload(saved, 'extras', 'Extras', ''));
  expect(reopened.kind).toBe('ready');
  if (reopened.kind !== 'ready' || reopened.query.signal !== 'logs') throw new Error('Expected saved Logs query');
  expect(reopened.query).toMatchObject({ signal: 'logs', timeRange: query.timeRange });
  expect(parseLogAnalysis(reopened.query.logAnalysis!)).toMatchObject({
    representation: 'table',
    additionalMeasures
  });
  for (const representation of ['table', 'toplist', 'timeseries', 'logs'] as const) {
    const current = { ...state, representation };
    expect(parseLogAnalysis(encodeLogAnalysis(current))).toHaveProperty('additionalMeasures', additionalMeasures);
    const params = new URLSearchParams(buildLogAnalysisPath(query, { from: 0, to: 1000 }, current).split('?')[1]);
    expect(params.get('additionalMeasures')).toBe(
      representation === 'table' ? JSON.stringify(additionalMeasures) : null
    );
  }
  expect(
    buildLogComparisonRequest(query, { from: 0, to: 1000 }, { ...state, comparison: { version: 1, search: '' } })
      .parameters.additionalMeasures
  ).toBe(JSON.stringify(additionalMeasures));
});
it.each([[], null, [...measures, measures[0]], [measures[0], measures[0]], [{ function: 'count' }]])(
  'rejects invalid extra definitions %j',
  additionalMeasures => {
    expect(() => parseLogAnalysis(JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, additionalMeasures }))).toThrow();
  }
);
it('retains a primary duplicate as editable draft while blocking submission', () => {
  const raw = JSON.stringify({
    ...DEFAULT_LOG_ANALYSIS,
    measure: measures[0],
    order: 'measure-desc',
    additionalMeasures: [measures[0]]
  });
  expect(readLogAnalysisDraft(raw)).toHaveProperty('additionalMeasures', [measures[0]]);
  expect(() => parseLogAnalysis(raw)).toThrow();
});
