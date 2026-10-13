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
import { logAnalysisDrilldownPath, logAnalysisReturnPath } from './explore-log-analysis-navigation';
import { DEFAULT_LOG_ANALYSIS, encodeLogAnalysis } from '@/platform/perses';
import { parseExploreQuery } from './explore-url-model';
const query = {
  signal: 'logs',
  timeRange: 'last-30m',
  searchSyntax: 'structured-v1',
  query: 'a OR b',
  serviceName: 'checkout',
  logAnalysis: encodeLogAnalysis({ ...DEFAULT_LOG_ANALYSIS, representation: 'toplist', field: 'attribute:path' })
} as const;
it.each([false, true])('restores applied exact-time analysis and optional extras (%s)', additional => {
  const applied = {
    ...query,
    ...(additional
      ? {
          logAnalysis: encodeLogAnalysis({
            ...DEFAULT_LOG_ANALYSIS,
            representation: 'table',
            field: 'attribute:path',
            additionalMeasures: [{ function: 'avg', field: 'attribute:duration' }]
          })
        }
      : {})
  };
  const path = logAnalysisDrilldownPath(
    applied,
    { from: 1000, to: 3000 },
    { id: 'attribute:path', source: 'attribute', key: 'path' },
    { kind: 'value', value: '/checkout', count: 2, buckets: [] }
  );
  expect(path).toBeDefined();
  const target = parseExploreQuery(new URLSearchParams(path!.split('?')[1]));
  expect(target).toMatchObject({
    serviceName: 'checkout',
    start: 1000,
    end: 3000,
    query: 'a OR b',
    logGroupSelection: JSON.stringify({
      version: 1,
      groups: [{ field: 'attribute:path', kind: 'value', value: '/checkout' }]
    })
  });
  const back = logAnalysisReturnPath(target.returnTo);
  if (additional) {
    expect(back).toBeDefined();
    expect(parseExploreQuery(new URLSearchParams(back!.split('?')[1]))).toMatchObject({
      query: 'a OR b',
      logAnalysis: applied.logAnalysis,
      start: 1000,
      end: 3000
    });
  } else {
    expect(back).toBeUndefined();
    expect(target.returnTo).toBeUndefined();
    expect(target).toMatchObject({
      query: 'a OR b',
      searchSyntax: 'structured-v1',
      start: 1000,
      end: 3000
    });
    if (target.signal !== 'logs') throw new Error('Expected Logs route');
    expect(JSON.parse(target.logAnalysis!).representation).toBe('logs');
  }
});
it('selects exact numeric groups and refuses unsafe return targets', () => {
  expect(
    logAnalysisDrilldownPath(
      query,
      { from: 1000, to: 3000 },
      { id: 'attribute:amount', source: 'attribute', key: 'amount' },
      { kind: 'value', value: '2.0', count: 2, buckets: [] }
    )
  ).toContain('logGroupSelection=');
  expect(logAnalysisReturnPath('https://example.com')).toBeUndefined();
});
