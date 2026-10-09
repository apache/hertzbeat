/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { parseHertzBeatDashboardDocument } from '@/platform/perses';
import { exploreQueryKeys } from '../controller/explore-query-keys';
import { expect, it } from 'vitest';
import { buildSignalApiPath, buildLogStreamPath } from '../api/explore-api';
import { buildLogFacetPath } from '../api/explore-log-facets-api';
import { buildExplorePath, parseExploreQuery } from './explore-url-model';
import { draftFromQuery, buildSubmissionPatch } from './explore-submission-model';
import { addRecentLogSearch, readRecentLogSearches } from './explore-recent-log-searches';
import { buildSavedQueryPayload, readSavedQuery } from './explore-saved-query-model';
import { buildExploreDashboardHandoff } from './explore-dashboard-handoff';

const expression = 'service:checkout AND (status:error OR @http.status_code:500)';
const query = (syntax?: string) =>
  parseExploreQuery(
    new URLSearchParams({ signal: 'logs', query: expression, ...(syntax ? { searchSyntax: syntax } : {}) })
  );

it('preserves explicit syntax through URL, draft, submitted patch and recent filters while migrating legacy queries as literal text', () => {
  const structured = query('structured-v1');
  expect(structured).toMatchObject({ searchSyntax: 'structured-v1' });
  expect(parseExploreQuery(new URLSearchParams(buildExplorePath(structured).split('?')[1]))).toMatchObject({
    searchSyntax: 'structured-v1',
    query: expression
  });
  const draft = draftFromQuery(structured);
  expect(buildSubmissionPatch(draft)).toMatchObject({ valid: true, patch: { searchSyntax: 'structured-v1' } });
  const history = addRecentLogSearch([], draft);
  expect(readRecentLogSearches(JSON.stringify(history))[0]).toMatchObject({ searchSyntax: 'structured-v1' });
  expect(addRecentLogSearch(history, draftFromQuery(query()))).toHaveLength(2);
  expect(query()).toMatchObject({ searchSyntax: 'structured-v1', query: JSON.stringify(expression) });
});
it('sends syntax to history, facet and live API paths and preserves unknown mode for server rejection', () => {
  for (const syntax of ['structured-v1', 'future-mode']) {
    const parsed = query(syntax);
    if (parsed.signal !== 'logs') throw new Error('Expected logs');
    for (const path of [
      buildSignalApiPath(parsed),
      buildLogStreamPath(parsed),
      buildLogFacetPath(parsed, { from: 1000, to: 2000 }, 'fields')
    ]) {
      expect(new URL(path, 'http://local').searchParams.get('searchSyntax')).toBe(syntax);
    }
  }
});
it('round trips supported syntax in saved payloads and legacy-route conversion while rejecting unknown saved syntax', () => {
  const saved = buildSavedQueryPayload(query('structured-v1'), 'syntax', 'Structured filters', '');
  expect(readSavedQuery(saved)).toMatchObject({
    kind: 'ready',
    query: { searchSyntax: 'structured-v1', query: expression }
  });
  expect(
    readSavedQuery({
      signal: 'logs',
      viewKey: 'route',
      label: 'Route',
      route: buildExplorePath(query('structured-v1'))
    })
  ).toMatchObject({ kind: 'ready', query: { searchSyntax: 'structured-v1' } });
  expect(() => buildSavedQueryPayload(query('future-mode'), 'future', 'Unknown', '')).toThrow();
});
it('retains syntax when creating a supported Dashboard panel', () => {
  const handoff = buildExploreDashboardHandoff(query('structured-v1'), {
    timeWindow: { from: 1000, to: 2000 },
    timeZone: 'UTC',
    title: 'Logs',
    dashboardKey: 'logs'
  });
  expect(handoff.state).toBe('ready');
  if (handoff.state !== 'ready') throw new Error('Expected supported panel');
  expect(
    Object.values(parseHertzBeatDashboardDocument(handoff.handoff.document).spec.panels)[0]?.spec.queries[0].spec.plugin
      .spec.query
  ).toMatchObject({
    searchSyntax: 'structured-v1',
    search: expression
  });
});

it('separates history cache identity when only syntax changes', () => {
  expect(exploreQueryKeys.history(query('structured-v1'), undefined, 0)).not.toEqual(
    exploreQueryKeys.history(query(), undefined, 0)
  );
});

it('reads earlier recent records with no syntax field as legacy and never infers structured mode from the body', () => {
  const old = { ...draftFromQuery(query()), query: expression, executedAt: 1000 };
  Reflect.deleteProperty(old, 'searchSyntax');
  expect(readRecentLogSearches(JSON.stringify([old]))[0]).toMatchObject({ searchSyntax: '', query: expression });
  const migrated = new URL(buildSignalApiPath(query()), 'http://local').searchParams;
  expect(migrated.get('searchSyntax')).toBe('structured-v1');
  expect(migrated.get('search')).toBe(JSON.stringify(expression));
});

it.each([
  '@literal.key[]:4',
  'resource.allowed_codes[]:[2 TO 6]',
  '@permissions[]:(4 6)',
  '@names[]:"Peter"',
  '@codes[]:"4"',
  '@names[]:""',
  'resource.names[]:"Peter"',
  String.raw`@names[]:"a\"b\\c's*?"`,
  '@names[]:"caf\u00e9"',
  '@names[]:"Peter Parker"',
  '@codes[]:(4 "4") AND NOT @names[]:""',
  '@users[]["codes"][]:[2 TO 6]',
  '@users[]["name"][]:"Peter"',
  'resource.users[]["name"][]:""',
  '@users.name[]["codes.v"][]:"4"',
  '@users[ ]["codes"] [ ] : (4 "4")',
  '@users[]["name"][]:"Peter" AND NOT @users[]["role"][]:"guest"'
])('preserves the exact collection expression through every persisted and query boundary: %s', expression => {
  const initial = parseExploreQuery(
    new URLSearchParams({ signal: 'logs', searchSyntax: 'structured-v1', query: expression })
  );
  const patch = buildSubmissionPatch(draftFromQuery(initial));
  expect(patch).toMatchObject({ valid: true, patch: { query: expression, searchSyntax: 'structured-v1' } });
  const reopened = parseExploreQuery(new URLSearchParams(buildExplorePath(initial).split('?')[1]));
  if (reopened.signal !== 'logs') throw new Error('Expected logs');
  expect(reopened.query).toBe(expression);
  const saved = readSavedQuery(buildSavedQueryPayload(reopened, 'collection', 'Collection', ''));
  expect(saved).toMatchObject({ kind: 'ready', query: { query: expression, searchSyntax: 'structured-v1' } });
  const recent = readRecentLogSearches(JSON.stringify(addRecentLogSearch([], draftFromQuery(reopened))));
  expect(recent[0]).toMatchObject({ query: expression, searchSyntax: 'structured-v1' });
  for (const path of [buildSignalApiPath(reopened), buildLogFacetPath(reopened, { from: 1000, to: 2000 }, 'fields')]) {
    expect(new URL(path, 'http://local').searchParams.get('search')).toBe(expression);
  }
  const stream = new URL(buildLogStreamPath(reopened), 'http://local').searchParams;
  expect(stream.get('logContent')).toBe(expression);
  expect(stream.get('searchSyntax')).toBe('structured-v1');
  const handoff = buildExploreDashboardHandoff(reopened, {
    timeWindow: { from: 1000, to: 2000 },
    timeZone: 'UTC',
    title: 'Collection',
    dashboardKey: 'collection'
  });
  if (handoff.state !== 'ready') throw new Error('Expected supported panel');
  expect(
    Object.values(parseHertzBeatDashboardDocument(handoff.handoff.document).spec.panels)[0]?.spec.queries[0].spec.plugin
      .spec.query
  ).toMatchObject({ search: expression, searchSyntax: 'structured-v1' });
});
