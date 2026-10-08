/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { buildExplorePath, parseExploreQuery, exploreEvidenceScopeKey } from './explore-model';
import { parseSavedExploreQuery } from './explore-saved-query-schema';
import { buildSubmissionPatch, draftFromQuery } from './explore-submission-model';
import { DEFAULT_LOG_ANALYSIS, encodeLogAnalysis } from '@/platform/perses';
const query = {
  signal: 'logs' as const,
  timeRange: 'last-30m' as const,
  query: 'service:checkout',
  searchSyntax: 'structured-v1'
};
const logAnalysis = encodeLogAnalysis({
  ...DEFAULT_LOG_ANALYSIS,
  representation: 'toplist',
  field: 'attribute:http.route'
});
it('migrates saved toplist views to Logs without changing query evidence', () => {
  const saved = { ...query, logAnalysis };
  const reopened = parseExploreQuery(new URL(buildExplorePath(saved), 'http://local').searchParams);
  expect(reopened).toMatchObject(query);
  if (reopened.signal !== 'logs') throw new Error('Expected Logs query');
  expect(JSON.parse(reopened.logAnalysis!).representation).toBe('logs');
  const savedQuery = parseSavedExploreQuery(saved);
  expect(savedQuery).toMatchObject(query);
  if (savedQuery?.signal !== 'logs') throw new Error('Expected saved Logs query');
  expect(JSON.parse(savedQuery.logAnalysis!).representation).toBe('logs');
  expect(exploreEvidenceScopeKey(saved)).toBe(exploreEvidenceScopeKey(query));
});
it('retains malformed route state while refusing to reinterpret invalid saved records', () => {
  expect(parseExploreQuery(new URLSearchParams('signal=logs&logAnalysis=broken'))).toHaveProperty(
    'logAnalysis',
    'broken'
  );
  expect(parseSavedExploreQuery({ ...query, logAnalysis: 'broken' })).toBeUndefined();
  expect(parseSavedExploreQuery(query)).toMatchObject(query);
});
it('commits analysis and query scope together and rejects invalid draft analysis', () => {
  const draft = draftFromQuery({ ...query, logAnalysis });
  if (draft.signal !== 'logs') throw new Error('Expected logs draft');
  expect(draft).toHaveProperty('logAnalysis', logAnalysis);
  expect(buildSubmissionPatch({ ...draft, query: 'service:billing' })).toMatchObject({
    valid: true,
    patch: { query: 'service:billing', logAnalysis, pageIndex: undefined }
  });
  expect(buildSubmissionPatch({ ...draft, logAnalysis: 'broken' })).toMatchObject({ valid: false });
});

it('submits the primary v2 source search inside querySet and clears legacy top-level search', () => {
  const querySet = {
    version: 2 as const,
    queries: [
      {
        refId: 'a',
        alias: 'a',
        visible: true,
        searchSyntax: 'structured-v1' as const,
        search: 'service:api',
        analysis: { limit: 20, order: 'count-desc' as const, minCount: 1 }
      }
    ],
    formulas: [],
    nextSourceOrdinal: 1,
    nextFormulaSeq: 1
  };
  const raw = encodeLogAnalysis({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries', querySet });
  const draft = draftFromQuery({ ...query, logAnalysis: raw });
  if (draft.signal !== 'logs') throw new Error('Expected Logs draft');
  expect(buildSubmissionPatch(draft)).toMatchObject({
    valid: true,
    patch: { query: undefined, searchSyntax: undefined, logAnalysis: raw }
  });
  expect(
    buildSubmissionPatch({
      ...draft,
      logAnalysis: JSON.stringify({
        ...DEFAULT_LOG_ANALYSIS,
        representation: 'timeseries',
        querySet: {
          ...querySet,
          formulas: [{ refId: 'f1', alias: 'f1', visible: true, expression: 'f1*2' }],
          nextFormulaSeq: 2
        }
      })
    })
  ).toMatchObject({ valid: false });
});

it('never silently exports count analysis as a raw log dashboard table', async () => {
  const { buildExploreDashboardHandoff } = await import('./explore-dashboard-handoff');
  const options = { timeWindow: { from: 1000, to: 2000 }, timeZone: 'UTC', title: 'Logs', dashboardKey: 'proof' };
  for (const representation of ['table', 'toplist', 'timeseries'] as const) {
    const result = buildExploreDashboardHandoff(
      { ...query, logAnalysis: encodeLogAnalysis({ ...DEFAULT_LOG_ANALYSIS, representation }) },
      options
    );
    expect(result.state).toBe('ready');
    if (result.state !== 'ready') throw new Error('Expected analytical handoff');
    expect(result.handoff.document).toMatchObject({
      spec: {
        panels: {
          explore: {
            spec: {
              plugin: { kind: representation === 'timeseries' ? 'TimeSeriesChart' : 'LogsTable' },
              queries: [
                { spec: { plugin: { spec: { query: { queryKind: 'analysis', analysis: { representation } } } } } }
              ]
            }
          }
        }
      }
    });
  }
  expect(
    buildExploreDashboardHandoff({ ...query, logAnalysis: encodeLogAnalysis(DEFAULT_LOG_ANALYSIS) }, options).state
  ).toBe('ready');
});
