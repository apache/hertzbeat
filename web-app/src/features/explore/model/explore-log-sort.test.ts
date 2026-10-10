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
import { buildExplorePath, parseExploreQuery, exploreHandoffState } from './explore-model';
import { buildSignalApiPath } from '../api/explore-api';
import { buildLogFacetPath } from '../api/explore-log-facets-api';
import { exploreQueryKeys } from '../controller/explore-query-keys';
import { parseSavedExploreQuery } from './explore-saved-query-schema';
const query = {
  signal: 'logs' as const,
  timeRange: 'last-30m' as const,
  start: 100000,
  end: 200000,
  timeZone: 'UTC',
  sort: 'oldest' as const
};
it('roundtrips timestamp sort in routes, saved queries and backend requests', () => {
  expect(parseExploreQuery(new URL(buildExplorePath(query), 'http://local').searchParams)).toMatchObject(query);
  expect(parseSavedExploreQuery(query)).toMatchObject(query);
  expect(new URL(buildSignalApiPath(query), 'http://local').searchParams.get('sort')).toBe('oldest');
  expect(exploreQueryKeys.history(query, { from: 100000, to: 200000 }, 0)).not.toEqual(
    exploreQueryKeys.history({ ...query, sort: 'newest' }, { from: 100000, to: 200000 }, 0)
  );
  expect(buildLogFacetPath(query, { from: 100000, to: 200000 }, 'fields')).toBe(
    buildLogFacetPath({ ...query, sort: 'newest' }, { from: 100000, to: 200000 }, 'fields')
  );
});
it('does not silently reinterpret an unsupported log ordering', () => {
  const invalid = parseExploreQuery(new URLSearchParams('signal=logs&sort=duration_desc'));
  expect(invalid).toMatchObject({ sort: 'duration_desc' });
  expect(exploreHandoffState(invalid)).toBe('invalid');
  expect(parseSavedExploreQuery({ ...query, sort: 'duration_desc' })).toBeUndefined();
  expect(() => buildSignalApiPath(invalid)).toThrow();
});
