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
import { calculateLogField, parseLogCalculated } from './explore-log-calculated';
import type { LogRow } from './explore-signal-contract';
import { buildExplorePath, parseExploreQuery } from './explore-model';
import { parseSavedExploreQuery } from './explore-saved-query-schema';
import { buildSubmissionPatch, draftFromQuery } from './explore-submission-model';

const row = {
  body: 'payment attempt 202 failed',
  attributes: { client_latency: 30, server_latency: 12, text_latency: '12' },
  resource: { 'service.name': 'checkout' }
} as unknown as LogRow;

it('calculates a typed arithmetic value from exact raw attributes', () => {
  const field = parseLogCalculated(
    JSON.stringify({
      version: 1,
      name: 'latency_gap',
      kind: 'formula',
      left: 'attribute:client_latency',
      operator: '-',
      right: 'attribute:server_latency'
    })
  );
  expect(field).toBeDefined();
  expect(calculateLogField(row, field!)).toBe(18);
  expect(calculateLogField({ ...row, attributes: { ...row.attributes, server_latency: 0 } }, field!)).toBe(30);
  expect(calculateLogField({ ...row, attributes: { client_latency: 30, server_latency: '12' } }, field!)).toBeNull();
});

it('returns null for division by zero and non-finite results', () => {
  const field = parseLogCalculated(
    JSON.stringify({
      version: 1,
      name: 'ratio',
      kind: 'formula',
      left: 'attribute:client_latency',
      operator: '/',
      right: 'attribute:server_latency'
    })
  );
  expect(calculateLogField({ ...row, attributes: { client_latency: 30, server_latency: 0 } }, field!)).toBeNull();
});

it('extracts only a literal-delimited value and leaves source logs intact', () => {
  const field = parseLogCalculated(
    JSON.stringify({
      version: 1,
      name: 'attempt',
      kind: 'extract',
      source: 'body',
      before: 'attempt ',
      after: ' failed'
    })
  );
  expect(calculateLogField(row, field!)).toBe('202');
  expect(calculateLogField({ ...row, body: 'unrelated' }, field!)).toBeNull();
  expect(row.body).toBe('payment attempt 202 failed');
});

it('rejects invalid descriptors instead of evaluating a wider expression', () => {
  for (const raw of [
    '{broken',
    JSON.stringify({ version: 1, name: 'bad field', kind: 'extract', source: 'body', before: '', after: '' }),
    JSON.stringify({
      version: 1,
      name: 'a',
      kind: 'formula',
      left: 'builtin:serviceName',
      operator: '-',
      right: 'attribute:x'
    }),
    JSON.stringify({
      version: 1,
      name: 'a',
      kind: 'formula',
      left: 'attribute:x',
      operator: '^',
      right: 'attribute:y'
    }),
    JSON.stringify({ version: 1, name: 'a', kind: 'extract', source: 'body', before: 'x', after: 'y', extra: true })
  ])
    expect(parseLogCalculated(raw)).toBeUndefined();
});

it('preserves an applied calculated field across URL, submission and saved query', () => {
  const raw = JSON.stringify({
    version: 1,
    name: 'attempt',
    kind: 'extract',
    source: 'body',
    before: 'attempt ',
    after: ' failed'
  });
  const query = {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    logAggregation: 'calculated',
    logCalculated: raw
  };
  expect(parseExploreQuery(new URL(buildExplorePath(query), 'http://local').searchParams)).toMatchObject(query);
  expect(parseSavedExploreQuery(query)).toMatchObject(query);
  expect(buildSubmissionPatch(draftFromQuery(query))).toMatchObject({
    valid: true,
    patch: { logAggregation: 'calculated', logCalculated: raw }
  });
  expect(parseSavedExploreQuery({ ...query, logCalculated: 'broken' })).toBeUndefined();
  expect(buildSubmissionPatch(draftFromQuery({ ...query, logCalculated: 'broken' }))).toMatchObject({ valid: false });
});
