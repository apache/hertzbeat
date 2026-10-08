/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { buildExplorePath, parseExploreQuery, exploreEvidenceScopeKey } from './explore-model';
import { exploreQueryKeys } from '../controller/explore-query-keys';
import { parseSavedExploreQuery } from './explore-saved-query-schema';
import { parseLogView, encodeLogView, DEFAULT_LOG_ANALYSIS, migrateLogQuerySet } from '@/platform/perses';
const view = {
  version: 1 as const,
  columns: [
    { kind: 'message' as const },
    { kind: 'field' as const, scope: 'attributes' as const, path: ['http.status_code'] }
  ],
  density: 'compact' as const,
  wrap: false
};
const query = {
  signal: 'logs' as const,
  timeRange: 'last-30m' as const,
  serviceName: 'checkout',
  attributeFilter: 'status=error'
};
it('preserves ordered exact field descriptors through route and saved query', () => {
  const saved = { ...query, logView: encodeLogView(view) };
  expect(parseExploreQuery(new URL(buildExplorePath(saved), 'http://local').searchParams)).toMatchObject(saved);
  expect(parseSavedExploreQuery(saved)).toMatchObject(saved);
  expect(parseLogView(saved.logView)).toEqual(view);
});
it('accepts explicit display options in version one views and keeps old views readable', () => {
  expect(
    parseLogView(
      encodeLogView({
        ...view,
        rowHeight: 'large',
        contentDisplay: 'stack',
        showContent: false
      })
    )
  ).toMatchObject({ rowHeight: 'large', contentDisplay: 'stack', showContent: false });
  expect(parseLogView(JSON.stringify(view))).toEqual(view);
});
it('keeps display outside query and evidence identity', () => {
  const display = { ...query, logView: encodeLogView(view) };
  expect(exploreQueryKeys.history(display, { from: 1000, to: 2000 }, 0)).toEqual(
    exploreQueryKeys.history(query, { from: 1000, to: 2000 }, 0)
  );
  expect(exploreEvidenceScopeKey(display)).toBe(exploreEvidenceScopeKey(query));
});
it('rejects corrupt views without overwriting the saved record', () => {
  expect(() => parseLogView('{broken')).toThrow();
  expect(parseSavedExploreQuery({ ...query, logView: '{broken' })).toBeUndefined();
  expect(() => parseLogView(JSON.stringify({ ...view, columns: [{ kind: 'time' }] }))).toThrow();
  expect(() => parseLogView(JSON.stringify({ ...view, script: 'unexpected' }))).toThrow();
});

it('opens query-set links and saved queries in history mode even when live is requested', () => {
  const logAnalysis = JSON.stringify({
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'timeseries',
    querySet: migrateLogQuerySet(DEFAULT_LOG_ANALYSIS, 'service:api')
  });
  const requested = { ...query, logAnalysis, live: true };
  const params = new URLSearchParams({ signal: 'logs', timeRange: 'last-30m', logAnalysis, live: 'true' });
  expect(parseExploreQuery(params)).toMatchObject({
    logAnalysis,
    live: undefined
  });
  expect(parseSavedExploreQuery(requested)).toMatchObject({ logAnalysis, live: undefined });
});
