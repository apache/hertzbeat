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
import { calculatedFacetSelection } from './explore-calculated-facet-action';
import { draftFromQuery, type LogExploreSubmissionDraft } from './explore-submission-model';

const scope = { signal: 'logs' as const, timeRange: 'last-30m' as const, searchSyntax: 'structured-v2' as const };

it('preserves an OR query and represents number and boolean selections in the shared grammar', () => {
  const draft = draftFromQuery({ ...scope, query: 'service:api OR service:worker' }) as LogExploreSubmissionDraft;
  expect(calculatedFacetSelection(draft, scope, 'calculated:seconds', 1.5, 'single')).toMatchObject({
    selected: false,
    update: { field: 'query', value: '(service:api OR service:worker) AND #seconds:"1.5"' }
  });
  expect(calculatedFacetSelection(draft, scope, 'calculated:flag', false, 'single')).toMatchObject({
    update: { field: 'query', value: '(service:api OR service:worker) AND #flag:"false"' }
  });
});

it('retains selected checkbox and groups multiple derived values', () => {
  const draft = draftFromQuery({ ...scope, query: '#seconds:"1"' }) as LogExploreSubmissionDraft;
  expect(calculatedFacetSelection(draft, scope, 'calculated:seconds', 1, 'toggle').selected).toBe(true);
  expect(calculatedFacetSelection(draft, scope, 'calculated:seconds', 2, 'single')).toMatchObject({
    update: { field: 'query', value: '#seconds:"2"' }
  });
  expect(calculatedFacetSelection(draft, scope, 'calculated:seconds', 2, 'toggle')).toMatchObject({
    update: { field: 'query', value: '#seconds:("1" OR "2")' }
  });
});
