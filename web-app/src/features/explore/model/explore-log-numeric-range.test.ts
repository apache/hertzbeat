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
import { buildExplorePath, parseExploreQuery, exploreEvidenceScopeKey } from './explore-model';
import { parseSavedExploreQuery } from './explore-saved-query-schema';
import { draftFromQuery, buildSubmissionPatch } from './explore-submission-model';
import { addRecentLogSearch, readRecentLogSearches } from './explore-recent-log-searches';
import { buildSignalApiPath, buildLogStreamPath } from '../api/explore-api';
import { buildLogAnalysisPath } from '../api/explore-log-analysis-api';
import { buildLogComparisonRequest } from '../api/explore-log-comparison-api';
import { DEFAULT_LOG_ANALYSIS, encodeLogAnalysis } from '@/platform/perses';
import { exploreQueryKeys } from '../controller/explore-query-keys';
const logNumericRange = '{"version":1,"field":"attribute:duration","min":2.5,"max":6.75}';
const query = {
  signal: 'logs' as const,
  timeRange: 'last-30m' as const,
  timeZone: 'UTC',
  start: 10000000,
  end: 20000000,
  query: 'left OR right',
  searchSyntax: 'structured-v1' as const,
  logNumericRange
};
const window = { from: query.start, to: query.end };
it('preserves the outer range through draft, opaque URL, saved and recent queries', () => {
  expect(parseExploreQuery(new URL(buildExplorePath(query), 'http://local').searchParams)).toMatchObject(query);
  expect(parseSavedExploreQuery(query)).toMatchObject(query);
  const draft = draftFromQuery(query);
  if (draft.signal !== 'logs') throw new Error('Expected logs');
  expect(buildSubmissionPatch(draft)).toMatchObject({
    valid: true,
    patch: { logNumericRange, query: 'left OR right' }
  });
  expect(readRecentLogSearches(JSON.stringify(addRecentLogSearch([], draft)))[0]).toMatchObject({ logNumericRange });
  expect(buildSubmissionPatch({ ...draft, logNumericRange: undefined })).toMatchObject({
    valid: true,
    patch: { logNumericRange: undefined }
  });
});
it('sends one unchanged shared range to raw, Live, analysis and comparison, owning cache identity', () => {
  for (const path of [
    buildSignalApiPath(query),
    buildLogStreamPath({ ...query, live: true }),
    buildLogAnalysisPath(query, window, { ...DEFAULT_LOG_ANALYSIS, representation: 'table' })
  ])
    expect(new URL(path, 'http://local').searchParams.get('logNumericRange')).toBe(logNumericRange);
  const comparison = buildLogComparisonRequest(query, window, {
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'table',
    comparison: { version: 1, search: 'other', timeShiftMs: 3600000 }
  });
  expect(comparison.parameters.logNumericRange).toBe(logNumericRange);
  expect(exploreQueryKeys.history(query, window, 0)).not.toEqual(
    exploreQueryKeys.history({ ...query, logNumericRange: undefined }, window, 0)
  );
  expect(exploreEvidenceScopeKey({ ...query, live: true })).not.toBe(
    exploreEvidenceScopeKey({ ...query, live: true, logNumericRange: undefined })
  );
});
it('retains invalid raw range in draft and URL while blocking query and saved submission', () => {
  const invalid = { ...query, logNumericRange: '{"version":1,"field":"attribute:duration","min":null,"max":6}' };
  expect(draftFromQuery(invalid)).toMatchObject({ logNumericRange: invalid.logNumericRange });
  expect(parseExploreQuery(new URL(buildExplorePath(invalid), 'http://local').searchParams)).toMatchObject({
    logNumericRange: invalid.logNumericRange
  });
  expect(buildSubmissionPatch(draftFromQuery(invalid))).toMatchObject({
    valid: false,
    errors: [{ field: 'logNumericRange', code: 'invalid_log_numeric_range' }]
  });
  expect(parseSavedExploreQuery(invalid)).toBeUndefined();
  expect(() => buildSignalApiPath(invalid)).toThrow();
});
it('keeps exact range in group and record returns and rejects broadened AI population handoffs', async () => {
  const { logAnalysisDrilldownPath } = await import('./explore-log-analysis-navigation');
  const { buildLogInvestigationPath } = await import('./explore-investigation-model');
  const { materializeLogInvestigation } = await import('./explore-agent-handoff');
  const group = logAnalysisDrilldownPath(
    {
      ...query,
      logAnalysis: encodeLogAnalysis({
        ...DEFAULT_LOG_ANALYSIS,
        representation: 'timeseries',
        field: 'attribute:status'
      })
    },
    window,
    { id: 'attribute:status', source: 'attribute', key: 'status' },
    { kind: 'value', value: 'ok', count: 2, buckets: [] }
  );
  const selected = parseExploreQuery(new URL(group!, 'http://local').searchParams);
  expect(selected).toMatchObject({ logNumericRange });
  expect(parseExploreQuery(new URL(selected.returnTo!, 'http://local').searchParams)).toMatchObject({
    logNumericRange
  });
  const detail = parseExploreQuery(
    new URL(
      buildLogInvestigationPath(
        query,
        { logRecordUid: '00000000-0000-0000-0000-000000000001', timeUnixNano: '12000000000000000' },
        window,
        'UTC'
      ),
      'http://local'
    ).searchParams
  );
  expect(parseExploreQuery(new URL(detail.returnTo!, 'http://local').searchParams)).toMatchObject({ logNumericRange });
  expect(
    materializeLogInvestigation(
      { ...query, searchSyntax: undefined },
      { totalElements: 2, number: 0, size: 20, contentCount: 2 },
      window
    )
  ).toBeUndefined();
});
