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

import { buildExplorePath, mergeExploreQuery, parseExploreQuery } from './explore-model';
import { buildSavedQueryPayload } from './explore-saved-query-model';

const dashboard = '/observability/dashboards?dashboard=ops&start=1000&end=2000&timeZone=UTC&varEnvironment=production';

describe('Dashboard investigation return context', () => {
  it('survives signal changes and URL reopen with an exact Dashboard window', () => {
    const params = new URLSearchParams({
      signal: 'metrics',
      query: 'jvm_memory_used_bytes',
      start: '1000',
      end: '2000',
      timeZone: 'UTC',
      dashboardReturnTo: dashboard
    });
    const query = parseExploreQuery(params);
    expect(query.dashboardReturnTo).toBe(dashboard);
    const switched = mergeExploreQuery(query, { signal: 'logs' });
    expect(new URL(buildExplorePath(switched), 'https://hertzbeat.local').searchParams.get('dashboardReturnTo')).toBe(
      dashboard
    );
    expect(
      parseExploreQuery(new URL(buildExplorePath(switched), 'https://hertzbeat.local').searchParams).dashboardReturnTo
    ).toBe(dashboard);
  });

  it('never persists return navigation as saved query authority', () => {
    const query = parseExploreQuery(
      new URLSearchParams({ signal: 'metrics', query: 'jvm_memory_used_bytes', dashboardReturnTo: dashboard })
    );
    const saved = buildSavedQueryPayload(query, 'saved-metric', 'Saved metric', '');
    expect(JSON.parse(saved.payload!).query).not.toHaveProperty('dashboardReturnTo');
  });

  it('drops an external return target', () => {
    expect(
      parseExploreQuery(new URLSearchParams({ signal: 'logs', dashboardReturnTo: 'https://outside.test/' }))
        .dashboardReturnTo
    ).toBeUndefined();
  });
});
