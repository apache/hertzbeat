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

import { describe, expect, it } from 'vitest';
import { buildSignalApiPath } from '../api/explore-api';
import { parseTracePage } from '../api/explore-trace-schema';
import { exploreQueryKeys } from '../controller/explore-query-keys';
import { buildExplorePath, mergeExploreQuery, parseExploreQuery } from './explore-model';
import { buildSubmissionPatch, draftFromQuery } from './explore-submission-model';

const empty = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 };

describe('Trace server sorting contract', () => {
  it('round-trips explicit sorting through URL, submission and API and resets the page', () => {
    const query = parseExploreQuery(new URLSearchParams('signal=traces&sort=duration_desc&page=3&errorOnly=true'));
    expect(query).toMatchObject({ sort: 'duration_desc', pageIndex: 3, errorOnly: true });
    expect(buildExplorePath(query)).toContain('sort=duration_desc');
    expect(buildSignalApiPath(query)).toContain('sort=duration_desc');
    const draft = draftFromQuery(query);
    expect(draft).toMatchObject({ sort: 'duration_desc' });
    expect(buildSubmissionPatch(draft)).toMatchObject({
      valid: true,
      patch: { sort: 'duration_desc', pageIndex: undefined }
    });
    expect(mergeExploreQuery(query, { sort: 'newest' })).toMatchObject({
      sort: 'newest',
      pageIndex: undefined,
      errorOnly: true
    });
  });

  it('uses newest for missing or unsupported sort and partitions evidence by requested sorting', () => {
    const base = parseExploreQuery(new URLSearchParams('signal=traces'));
    const newest = parseExploreQuery(new URLSearchParams('signal=traces&sort=newest'));
    const duration = parseExploreQuery(new URLSearchParams('signal=traces&sort=duration_desc'));
    expect(buildSignalApiPath(parseExploreQuery(new URLSearchParams('signal=traces&sort=arbitrary')))).toContain(
      'sort=newest'
    );
    expect(exploreQueryKeys.history(base, undefined, 0)).toEqual(exploreQueryKeys.history(newest, undefined, 0));
    expect(exploreQueryKeys.history(duration, undefined, 0)).not.toEqual(
      exploreQueryKeys.history(newest, undefined, 0)
    );
  });

  it('retains backend coverage and leaves legacy responses explicitly unknown', () => {
    const query = { sort: 'duration_desc', coverage: 'bounded', rowLimit: 1500, truncated: true };
    expect(parseTracePage({ ...empty, query }, 0, 20)).toMatchObject({ query });
    expect(parseTracePage(empty, 0, 20).query).toBeUndefined();
  });

  it('rejects server metadata for a different requested order', () => {
    expect(() =>
      parseTracePage(
        { ...empty, query: { sort: 'newest', coverage: 'window', rowLimit: null, truncated: false } },
        0,
        20,
        'duration_desc'
      )
    ).toThrow();
  });

  it.each([
    { sort: 'oldest', coverage: 'window', rowLimit: null, truncated: false },
    { sort: 'newest', coverage: 'window', rowLimit: 1500, truncated: false },
    { sort: 'newest', coverage: 'bounded', rowLimit: null, truncated: false },
    { sort: 'newest', coverage: 'bounded', rowLimit: 1500, truncated: 'false' }
  ])('rejects misleading query metadata: %s', query => {
    expect(() => parseTracePage({ ...empty, query }, 0, 20)).toThrow();
  });
});
