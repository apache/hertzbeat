/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { buildExplorePath, parseExploreQuery, exploreEvidenceScopeKey } from './explore-model';
import { exploreQueryKeys } from '../controller/explore-query-keys';
import { parseSavedExploreQuery } from './explore-saved-query-schema';
import { parseTraceView, encodeTraceView, traceViewPatch, DEFAULT_TRACE_VIEW } from './explore-trace-view';
const view = {
  version: 1 as const,
  columns: ['traceName', 'duration', 'traceId'] as const,
  density: 'compact' as const,
  mode: 'groups' as const,
  population: 'matched_traces' as const,
  groupBy: 'operationName' as const
};
const query = { signal: 'traces' as const, timeRange: 'last-30m' as const, serviceName: 'checkout', errorOnly: true };
it('round trips ordered columns and grouped view independently of query predicates', () => {
  const encoded = encodeTraceView({ ...view, columns: [...view.columns] });
  const saved = { ...query, traceView: encoded };
  expect(parseExploreQuery(new URL(buildExplorePath(saved), 'http://local').searchParams)).toMatchObject(saved);
  expect(parseSavedExploreQuery(saved)).toMatchObject(saved);
  expect(parseTraceView(encoded)).toEqual(view);
  expect(exploreEvidenceScopeKey(saved)).toBe(exploreEvidenceScopeKey(query));
  expect(exploreQueryKeys.history(saved, { from: 1000, to: 2000 }, 0)).toEqual(
    exploreQueryKeys.history(query, { from: 1000, to: 2000 }, 0)
  );
});
it('retains an invalid route for explicit reset but rejects incompatible saved views', () => {
  expect(parseExploreQuery(new URLSearchParams('signal=traces&traceView=broken'))).toMatchObject({
    traceView: 'broken'
  });
  expect(parseSavedExploreQuery({ ...query, traceView: 'broken' })).toBeUndefined();
  for (const columns of [['duration'], ['traceName', 'traceName'], ['traceName', 'sql']])
    expect(() => parseTraceView(JSON.stringify({ ...view, columns }))).toThrow();
  expect(() => parseTraceView(JSON.stringify({ ...view, unexpected: true }))).toThrow();
});
it('preserves half-open histogram windows and includes their semantics in request identity', () => {
  const exclusive = { ...query, start: 1000, end: 2000, timeZone: 'UTC', endExclusive: true };
  expect(parseExploreQuery(new URL(buildExplorePath(exclusive), 'http://local').searchParams)).toMatchObject(exclusive);
  expect(parseSavedExploreQuery(exclusive)).toMatchObject(exclusive);
  expect(exploreQueryKeys.history(exclusive, { from: 1000, to: 2000 }, 0)).not.toEqual(
    exploreQueryKeys.history({ ...exclusive, endExclusive: undefined }, { from: 1000, to: 2000 }, 0)
  );
});
it('resets paging only when changing the row population', () => {
  const before = { ...query, pageIndex: 8, traceView: encodeTraceView({ ...view, columns: [...view.columns] }) };
  const display = encodeTraceView({ ...view, columns: [...view.columns], density: 'comfortable' });
  expect(traceViewPatch(before, display)).toEqual({ traceView: display });
  const spans = encodeTraceView({ ...view, columns: [...view.columns], population: 'matched_spans' });
  expect(traceViewPatch(before, spans)).toEqual({ traceView: spans, pageIndex: undefined });
});
it('uses service and error evidence for the default span columns while preserving custom columns', () => {
  const next = { ...DEFAULT_TRACE_VIEW, population: 'matched_spans' as const };
  const patch = traceViewPatch(query, encodeTraceView(next));
  const columns = parseTraceView(patch.traceView!).columns;
  expect(columns).toContain('service');
  expect(columns).toContain('errorCount');
  expect(columns).not.toContain('spanCount');
  const custom = { ...next, columns: ['traceName', 'traceId'] as ('traceName' | 'traceId')[] };
  expect(parseTraceView(traceViewPatch(query, encodeTraceView(custom)).traceView!).columns).toEqual(custom.columns);
});
