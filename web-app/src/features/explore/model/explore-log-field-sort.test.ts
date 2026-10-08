/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { readLogSort, validLogSort } from './explore-log-order';
import { buildExplorePath, parseExploreQuery, exploreEvidenceScopeKey } from './explore-model';
import { parseSavedExploreQuery } from './explore-saved-query-schema';
import { buildSignalApiPath, buildLogStreamPath } from '../api/explore-api';
import { draftFromQuery, buildSubmissionPatch } from './explore-submission-model';
import { exploreQueryKeys } from '../controller/explore-query-keys';
const descriptor = { version: 1, field: 'attribute:duration', type: 'number', direction: 'desc' } as const;
const logSort = JSON.stringify(descriptor);
const query = {
  signal: 'logs' as const,
  timeRange: 'last-30m' as const,
  start: 100000,
  end: 200000,
  timeZone: 'UTC',
  logSort
};
it('roundtrips typed sorting through URL, saved query, history request and cache identity', () => {
  expect(readLogSort(logSort)).toEqual(descriptor);
  expect(parseExploreQuery(new URL(buildExplorePath(query), 'http://local').searchParams)).toMatchObject(query);
  expect(parseSavedExploreQuery(query)).toMatchObject(query);
  expect(new URL(buildSignalApiPath(query), 'http://local').searchParams.get('logSort')).toBe(logSort);
  expect(exploreQueryKeys.history(query, { from: 100000, to: 200000 }, 0)).not.toEqual(
    exploreQueryKeys.history({ ...query, logSort: undefined }, { from: 100000, to: 200000 }, 0)
  );
});
it.each([
  'null',
  '{}',
  logSort.replace('"version":1', '"version":1,"version":1'),
  logSort.replace('"number"', '"boolean"'),
  logSort.replace('attribute:duration', 'builtin:severityCategory'),
  logSort.replace('"desc"', '"up"')
])('rejects invalid ordering without silently resetting it: %s', raw => {
  expect(validLogSort(raw)).toBe(false);
  const invalid = parseExploreQuery(new URLSearchParams({ signal: 'logs', logSort: raw }));
  expect(invalid).toMatchObject({ logSort: raw });
  expect(parseSavedExploreQuery({ ...query, logSort: raw })).toBeUndefined();
  expect(() => buildSignalApiPath(invalid)).toThrow();
});
it('commits draft sorting with filters and resets paging, rejects ambiguous timestamp ordering', () => {
  const draft = draftFromQuery(query);
  expect(buildSubmissionPatch({ ...draft, query: 'timeout' })).toMatchObject({
    valid: true,
    patch: { logSort, query: 'timeout', pageIndex: undefined }
  });
  expect(validLogSort(logSort, 'oldest')).toBe(false);
});
it('keeps historical sorting out of Live transport and Live buffer identity only', () => {
  const live = { ...query, live: true };
  expect(buildLogStreamPath(live)).toBe(buildLogStreamPath({ ...live, logSort: undefined }));
  expect(exploreEvidenceScopeKey(live)).toBe(exploreEvidenceScopeKey({ ...live, logSort: undefined, sort: 'oldest' }));
  expect(exploreEvidenceScopeKey(query)).not.toBe(exploreEvidenceScopeKey({ ...query, logSort: undefined }));
});
it('retains sorted list return context when opening a record', async () => {
  const { buildLogInvestigationPath } = await import('./explore-investigation-model');
  const path = buildLogInvestigationPath(
    query,
    { logRecordUid: '00000000-0000-0000-0000-000000000001', timeUnixNano: '120000000000' },
    { from: 100000, to: 200000 },
    'UTC'
  );
  const detail = parseExploreQuery(new URL(path, 'http://local').searchParams);
  const original = parseExploreQuery(new URL(detail.returnTo!, 'http://local').searchParams);
  expect(original).toMatchObject({ logSort, start: 100000, end: 200000, timeZone: 'UTC' });
});
it('does not mark unsupported columns sorted, and preserves true applied direction', async () => {
  const { appliedLogColumnSort, logSortField } = await import('./explore-log-order');
  expect(appliedLogColumnSort({ kind: 'message' }, { sort: 'newest' })).toBeUndefined();
  expect(appliedLogColumnSort({ kind: 'field', scope: 'attributes', path: ['duration'] }, query)).toBe('descending');
  expect(appliedLogColumnSort({ kind: 'time' }, query)).toBeUndefined();
  expect(logSortField({ kind: 'field', scope: 'attributes', path: ['outer', 'duration'] })).toBeUndefined();
  expect(logSortField({ kind: 'field', scope: 'attributes', path: ['http.duration'] })).toBe('attribute:http.duration');
});

it.each(['workspace_id', 'hertzbeat_workspace_id', 'hertzbeat.workspace.id'])(
  'accepts the canonical field grammar for sorting without changing scope: %s',
  key => {
    expect(readLogSort(JSON.stringify({ ...descriptor, field: `attribute:${key}` }))).toEqual({
      ...descriptor,
      field: `attribute:${key}`
    });
  }
);
it.each(['1.0', '1e0'])('accepts numerical JSON version one spelling %s', version => {
  expect(readLogSort(logSort.replace('"version":1', `"version":${version}`))).toEqual(descriptor);
});
