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
import {
  buildExplorePath,
  parseExploreQuery,
  signalSelectionPatch,
  mergeExploreQuery,
  exploreHandoffState
} from './explore-model';
import { parseSavedExploreQuery } from './explore-saved-query-schema';
import { buildSubmissionPatch, draftFromQuery } from './explore-submission-model';
import { calculatedGroupByAnalysis } from './explore-log-calculated-group-action';

const definitions = JSON.stringify({
  version: 2,
  nextFieldSeq: 2,
  fields: [{ id: 'c1', name: 'durationSeconds', kind: 'formula', expression: '@duration_ms / 1000' }]
});

it('round trips v2 definitions independently of the sampled v1 mode', () => {
  const saved = {
    signal: 'logs',
    timeRange: 'last-30m',
    searchSyntax: 'structured-v2',
    logCalculatedV2: definitions
  } as const;
  expect(parseSavedExploreQuery(saved)).toMatchObject(saved);
  const params = new URLSearchParams({
    signal: 'logs',
    timeRange: 'last-30m',
    searchSyntax: 'structured-v2',
    logCalculatedV2: definitions
  });
  expect(parseExploreQuery(params)).toHaveProperty('logCalculatedV2', definitions);
  expect(buildExplorePath(saved).includes('logCalculatedV2=')).toBe(true);
});

it('round trips a calculated grouping and rejects an orphaned calculated output', () => {
  const analysis = JSON.stringify({
    version: 1,
    representation: 'timeseries',
    field: 'calculated:durationSeconds',
    limit: 20,
    order: 'count-desc',
    minCount: 1
  });
  const query = {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    searchSyntax: 'structured-v2',
    logCalculatedV2: definitions,
    logAnalysis: analysis
  };
  expect(parseSavedExploreQuery(query)).toMatchObject(query);
  expect(parseExploreQuery(new URL(buildExplorePath(query), 'http://localhost').searchParams)).toMatchObject(query);
  expect(parseSavedExploreQuery({ ...query, logCalculatedV2: undefined })).toBeUndefined();
  expect(parseSavedExploreQuery({ signal: 'logs', timeRange: 'last-30m', logAnalysis: '{broken' })).toBeUndefined();
  expect(
    exploreHandoffState(
      parseExploreQuery(
        new URL(
          buildExplorePath({ ...query, logCalculatedV2: undefined, searchSyntax: 'structured-v1' }),
          'http://localhost'
        ).searchParams
      )
    )
  ).toBe('invalid');
  expect(
    parseSavedExploreQuery({
      ...query,
      logCalculatedV2: definitions.replace('durationSeconds', 'otherName')
    })
  ).toBeUndefined();
});

it('adds a calculated group without dropping existing grouping or measurement', () => {
  const existing = {
    version: 1 as const,
    representation: 'timeseries' as const,
    field: 'builtin:serviceName',
    limit: 20,
    order: 'measure-desc' as const,
    minCount: 1,
    measure: { function: 'avg' as const, field: 'calculated:durationSeconds' }
  };
  const next = calculatedGroupByAnalysis(existing, 'durationSeconds');
  expect(next).toMatchObject({
    grouping: {
      dimensions: [
        { field: 'builtin:serviceName', limit: 20 },
        { field: 'calculated:durationSeconds', limit: 5 }
      ]
    },
    limit: 100,
    measure: existing.measure,
    order: 'measure-desc'
  });
});

it('submits the versioned search with definitions and drops both when switching signal', () => {
  const query = {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    query: 'service:api OR #durationSeconds:>=1',
    searchSyntax: 'structured-v2',
    logCalculatedV2: definitions
  };
  expect(buildSubmissionPatch(draftFromQuery(query))).toMatchObject({
    valid: true,
    patch: { query: query.query, searchSyntax: 'structured-v2', logCalculatedV2: definitions }
  });
  const metrics = mergeExploreQuery(query, signalSelectionPatch('metrics'));
  expect(metrics.signal).toBe('metrics');
  expect(buildExplorePath(metrics)).not.toContain('logCalculatedV2');
  expect(buildExplorePath(metrics)).not.toContain('structured-v2');
});

it('rejects v2 syntax without definitions and incompatible modes', () => {
  const base = { signal: 'logs' as const, timeRange: 'last-30m' as const };
  expect(parseSavedExploreQuery({ ...base, searchSyntax: 'structured-v2' })).toBeUndefined();
  expect(
    parseSavedExploreQuery({ ...base, logCalculatedV2: definitions, searchSyntax: 'structured-v1' })
  ).toBeUndefined();
  expect(
    parseSavedExploreQuery({ ...base, logCalculatedV2: definitions, searchSyntax: 'structured-v2', live: true })
  ).toMatchObject({ logCalculatedV2: definitions, live: undefined });
  expect(buildSubmissionPatch(draftFromQuery({ ...base, searchSyntax: 'structured-v2' }))).toMatchObject({
    valid: false
  });
  expect(
    buildSubmissionPatch(
      draftFromQuery({
        ...base,
        logCalculatedV2: definitions,
        searchSyntax: 'structured-v2',
        query: '#durationSeconds:"'
      })
    )
  ).toMatchObject({
    valid: false,
    errors: [{ field: 'query', code: 'unclosed_quote' }]
  });
});
