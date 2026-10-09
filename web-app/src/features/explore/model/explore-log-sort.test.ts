/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
