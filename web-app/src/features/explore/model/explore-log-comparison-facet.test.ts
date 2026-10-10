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
import { logComparisonFacetAction } from './explore-log-comparison-facet';
import { DEFAULT_LOG_ANALYSIS } from '@/platform/perses';
import { draftFromQuery } from './explore-submission-model';
const query = {
  signal: 'logs' as const,
  timeRange: 'last-30m' as const,
  serviceName: 'checkout',
  query: 'status:INFO',
  searchSyntax: 'structured-v1',
  logAnalysis: JSON.stringify({
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'table',
    comparison: { version: 1, search: '@kind:failure', searchSyntax: 'structured-v1' }
  })
};
it('targets b expression without narrowing common scope or changing a', () => {
  const draft = draftFromQuery(query);
  if (draft.signal !== 'logs') throw new Error('Expected logs');
  const action = logComparisonFacetAction(
    draft,
    query,
    'b',
    { id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' },
    'ERROR',
    '='
  );
  expect(action?.field).toBe('logAnalysis');
  if (typeof action?.value !== 'string') throw new Error('Expected text update');
  expect(JSON.parse(action.value)).toMatchObject({ comparison: { search: '(@kind:failure) AND status:"ERROR"' } });
  expect(draft.query).toBe('status:INFO');
  expect(draft.serviceName).toBe('checkout');
});
it('refuses literal source reinterpretation and protects locked metadata', () => {
  const draft = draftFromQuery({ ...query, searchSyntax: undefined });
  if (draft.signal !== 'logs') throw new Error('Expected logs');
  expect(
    logComparisonFacetAction(
      draft,
      query,
      'a',
      { id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' },
      'ERROR',
      '='
    )
  ).toBeUndefined();
  expect(
    logComparisonFacetAction(
      draft,
      query,
      'b',
      { id: 'resource:workspace_id', source: 'resource', key: 'workspace_id' },
      'other',
      '='
    )
  ).toBeUndefined();
});
