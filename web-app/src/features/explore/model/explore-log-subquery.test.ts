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
import { buildExplorePath, parseExploreQuery } from './explore-model';
import { buildSavedQueryPayload, readSavedQuery } from './explore-saved-query-model';
import { buildSubmissionPatch, draftFromQuery } from './explore-submission-model';
import { parseLogSubquery } from './explore-log-subquery';
import { blockedHandoffMode } from './explore-dashboard-handoff-mode';
import { recentLogSearchSummary } from './explore-recent-log-search-summary';
import type { TFunction } from 'i18next';

const descriptor = {
  version: 1,
  mainField: 'builtin:serviceName',
  operator: 'not_in',
  child: { field: 'builtin:serviceName', searchSyntax: 'structured-v1', search: 'service:node_repl' },
  rank: { direction: 'top', limit: 10, measure: { function: 'count_all' } }
};
const raw = JSON.stringify(descriptor);

it('round trips a subquery through URL, draft Query, and Explorer Saved View without child scope', () => {
  const query = parseExploreQuery(
    new URLSearchParams({
      signal: 'logs',
      timeRange: 'last-1h',
      searchSyntax: 'structured-v1',
      query: 'service:codex-app-server',
      logSubquery: raw
    })
  );
  if (query.signal !== 'logs') throw new Error('Expected Logs query');
  expect(query.logSubquery).toBe(raw);
  expect(parseExploreQuery(new URL(buildExplorePath(query), 'http://local').searchParams)).toMatchObject({
    logSubquery: raw
  });
  const draft = draftFromQuery(query);
  expect(draft.signal).toBe('logs');
  if (draft.signal !== 'logs') return;
  expect(buildSubmissionPatch({ ...draft, logSubquery: raw })).toMatchObject({
    valid: true,
    patch: { logSubquery: raw, query: 'service:codex-app-server' }
  });
  const saved = readSavedQuery(buildSavedQueryPayload(query, 'set-filter', 'Set filter', ''));
  expect(saved).toMatchObject({ kind: 'ready', query: { logSubquery: raw } });
  expect(parseLogSubquery(raw)).toEqual(descriptor);
});

it('rejects malformed or broadened child descriptors and preserves old records', () => {
  for (const value of [
    { ...descriptor, rank: { ...descriptor.rank, limit: 1001 } },
    { ...descriptor, child: { ...descriptor.child, serviceName: 'other' } },
    { ...descriptor, child: { ...descriptor.child, searchSyntax: 'structured-v2' } },
    { ...descriptor, mainField: 'calculated:seconds' }
  ]) {
    expect(parseLogSubquery(JSON.stringify(value))).toBeUndefined();
  }
  const old = readSavedQuery(buildSavedQueryPayload({ signal: 'logs', timeRange: 'last-1h' }, 'old', 'Old', ''));
  expect(old).toMatchObject({ kind: 'ready', query: { logSubquery: undefined } });
});

it('round trips a data-backed distinct-count sort metric', () => {
  const value = {
    ...descriptor,
    rank: {
      ...descriptor.rank,
      measure: { function: 'count_distinct', field: 'resource:host.name' }
    }
  };
  expect(parseLogSubquery(JSON.stringify(value))).toEqual(value);
});

it('keeps unsupported Live and structured-v2 links in a visible historical state', () => {
  const live = parseExploreQuery(
    new URLSearchParams({
      signal: 'logs',
      timeRange: 'last-1h',
      searchSyntax: 'structured-v1',
      mode: 'live',
      logSubquery: raw
    })
  );
  expect(live).toMatchObject({ live: undefined, logSubquery: raw });
  const draft = draftFromQuery(live);
  if (draft.signal !== 'logs') throw new Error('Expected Logs draft');
  expect(buildSubmissionPatch({ ...draft, searchSyntax: 'structured-v2' })).toMatchObject({ valid: false });
  expect(blockedHandoffMode(live)).toEqual({ state: 'unsupported', reason: 'log-subquery' });
  const summary = recentLogSearchSummary({ ...draft, executedAt: 1 }, ((key: string) => key) as TFunction);
  expect(summary).toContain('explore.logSubquery.label');
  expect(summary).not.toContain('"child"');
});
