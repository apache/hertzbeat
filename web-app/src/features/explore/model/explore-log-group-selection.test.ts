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
import { readLogGroupSelection, validLogGroupSelection } from '@/shared/log-group-selection';
import { buildExplorePath, parseExploreQuery } from './explore-url-model';
import { draftFromQuery, buildSubmissionPatch } from './explore-submission-model';
const selection = JSON.stringify({
  version: 1,
  groups: [{ field: 'attribute:proof.status', kind: 'value', value: ' 2.0 ' }]
});
it('preserves exact scalar text through URL and submitted draft', () => {
  const query = {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    query: 'a OR b',
    searchSyntax: 'structured-v1',
    logGroupSelection: selection
  };
  const restored = parseExploreQuery(new URLSearchParams(buildExplorePath(query).split('?')[1]));
  expect(restored).toMatchObject(query);
  expect(buildSubmissionPatch(draftFromQuery(restored))).toMatchObject({
    valid: true,
    patch: { logGroupSelection: selection, query: 'a OR b' }
  });
});
it('strictly validates version, distinct canonical fields, sizes and group kinds', () => {
  expect(readLogGroupSelection(selection)?.groups[0]?.value).toBe(' 2.0 ');
  expect(validLogGroupSelection(undefined)).toBe(true);
  for (const raw of [
    '',
    '{}',
    JSON.stringify({ version: 2, groups: [] }),
    JSON.stringify({ version: 1, groups: [{ field: 'attribute:x', kind: 'value', value: 'x'.repeat(1025) }] }),
    JSON.stringify({
      version: 1,
      groups: [
        { field: 'attribute:x', kind: 'missing' },
        { field: 'attribute:x', kind: 'null' }
      ]
    })
  ])
    expect(validLogGroupSelection(raw)).toBe(false);
  for (const kind of ['missing', 'null', 'non_scalar'])
    expect(validLogGroupSelection(JSON.stringify({ version: 1, groups: [{ field: 'attribute:x', kind }] }))).toBe(true);
  expect(
    validLogGroupSelection(JSON.stringify({ version: 1, groups: [{ field: 'attribute:x', kind: 'value', value: '' }] }))
  ).toBe(true);
});
it('retains invalid route input and refuses submission rather than deleting it', () => {
  const raw = ' {"version":2} ';
  const query = parseExploreQuery(new URLSearchParams({ signal: 'logs', logGroupSelection: raw }));
  expect(query).toHaveProperty('logGroupSelection', raw);
  expect(buildSubmissionPatch(draftFromQuery(query))).toEqual({
    valid: false,
    errors: [{ field: 'logGroupSelection', code: 'invalid_log_group_selection' }]
  });
});

it('bounds raw UTF-16 JSON and rejects unknown properties and more than four groups', () => {
  const raw = JSON.stringify({ version: 1, groups: [{ field: 'attribute:x', kind: 'value', value: 'x' }] });
  expect(validLogGroupSelection(raw.padEnd(4096, ' '))).toBe(true);
  expect(validLogGroupSelection(raw.padEnd(4097, ' '))).toBe(false);
  expect(
    validLogGroupSelection(
      JSON.stringify({ version: 1, extra: true, groups: [{ field: 'attribute:x', kind: 'missing' }] })
    )
  ).toBe(false);
  expect(
    validLogGroupSelection(
      JSON.stringify({
        version: 1,
        groups: ['a', 'b', 'c', 'd', 'e'].map(key => ({ field: `attribute:${key}`, kind: 'missing' }))
      })
    )
  ).toBe(false);
});
