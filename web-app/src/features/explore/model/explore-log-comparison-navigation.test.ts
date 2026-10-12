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
import { logComparisonDrilldownPath } from './explore-log-comparison-navigation';
import { DEFAULT_LOG_ANALYSIS, encodeLogAnalysis, parseLogAnalysis } from '@/platform/perses';
import { parseExploreQuery } from './explore-url-model';
it('opens b with all exact keys but returns to the original a/b analysis', () => {
  const analysis = {
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'table' as const,
    comparison: { version: 1 as const, search: 'error', formula: 'b/a' }
  };
  const query = {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    query: 'request',
    logAnalysis: encodeLogAnalysis(analysis)
  };
  const keys = [
    { field: 'attribute:status', kind: 'value' as const, value: '503' },
    { field: 'builtin:serviceName', kind: 'value' as const, value: 'checkout' }
  ];
  const path = logComparisonDrilldownPath(
    query,
    { from: 1000, to: 3000 },
    analysis,
    { keys, a: { count: 3 }, b: { count: 1 }, buckets: [] },
    'b'
  );
  expect(path).toBeDefined();
  const target = parseExploreQuery(new URLSearchParams(path!.split('?')[1]));
  expect(target).toMatchObject({
    query: '"error"',
    searchSyntax: 'structured-v1',
    start: 1000,
    end: 3000,
    logGroupSelection: JSON.stringify({ version: 1, groups: keys })
  });
  const back = parseExploreQuery(new URLSearchParams(target.returnTo!.split('?')[1]));
  expect(back).toMatchObject({ query: '"request"', searchSyntax: 'structured-v1' });
  if (back.signal !== 'logs') throw new Error('Expected Logs return');
  expect(parseLogAnalysis(back.logAnalysis!)).toMatchObject({
    representation: 'timeseries',
    comparison: analysis.comparison
  });
});
