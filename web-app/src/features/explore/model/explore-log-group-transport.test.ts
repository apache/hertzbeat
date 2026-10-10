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
import { buildSignalApiPath, buildLogStreamPath } from '../api/explore-api';
import { buildLogFacetPath } from '../api/explore-log-facets-api';
import { buildLogAnalysisPath } from '../api/explore-log-analysis-api';
import { exploreQueryKeys } from '../controller/explore-query-keys';
import { DEFAULT_LOG_ANALYSIS } from '@/platform/perses';
import { buildSavedQueryPayload, readSavedQuery } from './explore-saved-query-model';
import { materializeLogInvestigation } from './explore-agent-handoff';
import { buildExploreDashboardHandoff } from './explore-dashboard-handoff';
const logGroupSelection = JSON.stringify({
  version: 1,
  groups: [{ field: 'attribute:proof.status', kind: 'value', value: '2.0' }]
});
const query = {
  signal: 'logs',
  timeRange: 'last-30m',
  query: 'a OR b',
  searchSyntax: 'structured-v1',
  serviceName: 'checkout',
  logGroupSelection
} as const;
const window = { from: 1000, to: 3000 };
it('includes the selector in history, facet, analysis and Live paths and evidence keys', () => {
  for (const path of [
    buildSignalApiPath(query),
    buildLogStreamPath(query),
    buildLogFacetPath(query, window, 'fields'),
    buildLogFacetPath(query, window, 'values', 'attribute:proof.status'),
    buildLogAnalysisPath(query, window, DEFAULT_LOG_ANALYSIS)
  ]) {
    expect(new URLSearchParams(path.split('?')[1]).get('logGroupSelection')).toBe(logGroupSelection);
  }
  expect(exploreQueryKeys.history(query, window, 0)).not.toEqual(
    exploreQueryKeys.history({ ...query, logGroupSelection: undefined }, window, 0)
  );
});
it('persists exact selectors in the authoritative payload and keeps malformed saved records invalid', () => {
  const saved = buildSavedQueryPayload(query, 'selector-proof', 'Selector proof', '');
  expect(saved.route).toBe('/explore?signal=logs');
  expect(readSavedQuery(saved)).toMatchObject({ kind: 'ready', query });
  const invalid = {
    ...saved,
    payload: JSON.stringify({ version: 1, query: { ...query, logGroupSelection: '{"version":2}' } })
  };
  expect(readSavedQuery(invalid)).toMatchObject({ kind: 'unavailable', reason: 'invalidQuery' });
  expect(invalid.payload).toContain('version');
});
it('blocks unsupported AI and Dashboard handoffs instead of dropping the selector', () => {
  expect(
    materializeLogInvestigation(
      { ...query, searchSyntax: undefined },
      { totalElements: 1, number: 0, size: 20, contentCount: 1 },
      window
    )
  ).toBeUndefined();
  expect(
    buildExploreDashboardHandoff(query, { timeWindow: window, timeZone: 'UTC', title: 'Proof', dashboardKey: 'proof' })
  ).toEqual({ state: 'unsupported', reason: 'log-group-selection' });
});
it('round-trips a four-key exact Live selection without converting numeric spelling or replaying a window', async () => {
  const { buildExplorePath, parseExploreQuery } = await import('./explore-url-model');
  const selection = JSON.stringify({
    version: 1,
    groups: [
      { field: 'attribute:number', kind: 'value', value: '2.0' },
      { field: 'attribute:empty', kind: 'value', value: '' },
      { field: 'resource:missing', kind: 'missing', value: null },
      { field: 'attribute:null', kind: 'null', value: null }
    ]
  });
  const live = { ...query, live: true, logGroupSelection: selection };
  const reopened = parseExploreQuery(new URLSearchParams(buildExplorePath(live).split('?')[1]));
  expect(reopened).toMatchObject(live);
  expect(readSavedQuery(buildSavedQueryPayload(live, 'live-selection', 'Live selection', ''))).toMatchObject({
    kind: 'ready',
    query: live
  });
  const params = new URLSearchParams(buildLogStreamPath(reopened as typeof live).split('?')[1]);
  expect(params.get('logGroupSelection')).toBe(selection);
  expect(params.has('start')).toBe(false);
  expect(params.has('end')).toBe(false);
});
