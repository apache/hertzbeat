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
import { logAnalysisGroupAction } from './explore-log-analysis-action';
import { draftFromQuery, type LogExploreSubmissionDraft } from './explore-submission-model';
import { readLogGroupSelection } from '@/shared/log-group-selection';
const scope = { signal: 'logs', timeRange: 'last-30m', entityId: '1', query: 'a OR b' } as const;
const draft = draftFromQuery(scope) as LogExploreSubmissionDraft;
const field = { id: 'attribute:amount', source: 'attribute' as const, key: 'amount' };
it('selects numeric, whitespace and empty groups independently of legacy or structured OR text', () => {
  for (const text of ['2', '2.0', '', ' null ', '"quote"']) {
    for (const searchSyntax of ['', 'structured-v1']) {
      const action = logAnalysisGroupAction({ ...draft, searchSyntax }, field, {
        kind: 'value',
        value: text,
        count: 2,
        buckets: []
      });
      expect(action.available).toBe(true);
      expect(action.update?.field).toBe('logGroupSelection');
      expect(readLogGroupSelection(String(action.update?.value))?.groups).toEqual([
        { field: field.id, kind: 'value', value: text }
      ]);
      expect(draft.query).toBe('a OR b');
    }
  }
});
it('selects missing, null and containers without inventing literal values', () => {
  for (const kind of ['missing', 'null', 'non_scalar'] as const) {
    const action = logAnalysisGroupAction(draft, field, { kind, value: null, count: 2, buckets: [] });
    expect(action.available).toBe(true);
    expect(readLogGroupSelection(String(action.update?.value))?.groups[0]).toEqual({
      field: field.id,
      kind,
      value: null
    });
  }
});
it('does not replace or toggle an existing selector; bounds four distinct groups', () => {
  const logGroupSelection = JSON.stringify({ version: 1, groups: [{ field: field.id, kind: 'value', value: '2' }] });
  expect(
    logAnalysisGroupAction({ ...draft, logGroupSelection }, field, {
      kind: 'value',
      value: '2',
      count: 1,
      buckets: []
    })
  ).toEqual({ available: true });
  expect(
    logAnalysisGroupAction({ ...draft, logGroupSelection }, field, {
      kind: 'value',
      value: '2.0',
      count: 1,
      buckets: []
    })
  ).toEqual({ available: false });
  const full = JSON.stringify({
    version: 1,
    groups: ['a', 'b', 'c', 'd'].map(key => ({ field: `attribute:${key}`, kind: 'missing' }))
  });
  expect(
    logAnalysisGroupAction({ ...draft, logGroupSelection: full }, field, {
      kind: 'missing',
      value: null,
      count: 1,
      buckets: []
    })
  ).toEqual({ available: false });
});
it('fails closed malformed selectors and scope-reserved fields, while ungrouped all remains available', () => {
  expect(
    logAnalysisGroupAction({ ...draft, logGroupSelection: '{}' }, null, {
      kind: 'all',
      value: null,
      count: 1,
      buckets: []
    })
  ).toEqual({ available: false });
  expect(
    logAnalysisGroupAction(
      draft,
      { id: 'resource:workspace_id', source: 'resource', key: 'workspace_id' },
      { kind: 'value', value: 'other', count: 1, buckets: [] }
    )
  ).toEqual({ available: false });
  expect(logAnalysisGroupAction(draft, null, { kind: 'all', value: null, count: 1, buckets: [] })).toEqual({
    available: true
  });
});
it('adds all four exact tuple keys atomically and rejects a conflicting existing selector', () => {
  const keys = ['a', 'b', 'c', 'd'].map((name, index) => ({
    field: `attribute:${name}`,
    kind: 'value' as const,
    value: index ? '2.0' : ''
  }));
  const group = { kind: null, value: null, keys, count: 2, buckets: [] };
  const action = logAnalysisGroupAction(draft, null, group);
  expect(action.available).toBe(true);
  expect(readLogGroupSelection(String(action.update?.value))?.groups).toEqual(keys);
  const logGroupSelection = JSON.stringify({ version: 1, groups: [{ ...keys[3], value: 'different' }] });
  expect(logAnalysisGroupAction({ ...draft, logGroupSelection }, null, group)).toEqual({ available: false });
});
