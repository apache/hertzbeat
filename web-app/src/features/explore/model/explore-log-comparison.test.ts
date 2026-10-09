/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { DEFAULT_LOG_ANALYSIS, parseLogAnalysis, encodeLogAnalysis } from '@/platform/perses';
import { parseSavedExploreQuery } from './explore-saved-query-schema';
import { buildSubmissionPatch, draftFromQuery } from './explore-submission-model';

const comparison = { version: 1, search: 'status:error', searchSyntax: 'structured-v1', formula: '100*b/a' };
const state = { ...DEFAULT_LOG_ANALYSIS, representation: 'table', comparison };
it('preserves two query conditions and formula through saved state and atomic submission', () => {
  const logAnalysis = JSON.stringify(state);
  const query = {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    query: 'service:checkout',
    searchSyntax: 'structured-v1',
    logAnalysis
  };
  expect(parseLogAnalysis(logAnalysis)).toMatchObject(state);
  const saved = parseSavedExploreQuery(query);
  expect(saved).toMatchObject({ ...query, logAnalysis: expect.any(String) });
  if (!saved || saved.signal !== 'logs') throw new Error('Expected saved Logs query');
  expect(parseLogAnalysis(saved.logAnalysis!)).toMatchObject({ ...state, representation: 'timeseries' });
  expect(buildSubmissionPatch(draftFromQuery(saved))).toMatchObject({
    valid: true,
    patch: { query: query.query, logAnalysis: saved.logAnalysis }
  });
});
it('retains legacy table analysis when extra measures cannot be represented by the remaining views', () => {
  const raw = JSON.stringify({
    ...state,
    additionalMeasures: [{ function: 'avg', field: 'attribute:duration' }]
  });
  expect(parseLogAnalysis(raw)).toMatchObject({ representation: 'table', comparison });
  expect(parseSavedExploreQuery({ signal: 'logs', timeRange: 'last-30m', logAnalysis: raw })).toMatchObject({
    logAnalysis: raw
  });
});
it('rejects unsupported views and invalid source/formula without dropping comparison', () => {
  for (const patch of [
    { representation: 'logs' },
    { representation: 'toplist' },
    { comparison: { ...comparison, formula: 'a/c' } },
    { comparison: { ...comparison, formula: 'a/' } },
    { comparison: { ...comparison, searchSyntax: 'sql' } },
    { comparison: { ...comparison, extra: true } }
  ]) {
    expect(() => parseLogAnalysis(JSON.stringify({ ...state, ...patch }))).toThrow();
  }
});
it('preserves the permitted structured expression length and count-only records', () => {
  const long = { ...state, comparison: { ...comparison, search: 'x'.repeat(8192) } };
  expect(parseLogAnalysis(JSON.stringify(long))).toMatchObject(long);
  expect(() =>
    parseLogAnalysis(JSON.stringify({ ...state, comparison: { ...comparison, search: 'x'.repeat(8193) } }))
  ).toThrow();
  expect(parseLogAnalysis(encodeLogAnalysis(DEFAULT_LOG_ANALYSIS))).toEqual(DEFAULT_LOG_ANALYSIS);
});
it('retains invalid formula text for correction while refusing submission', async () => {
  const { readLogAnalysisDraft } = await import('./explore-log-analysis');
  const raw = JSON.stringify({ ...state, comparison: { ...comparison, formula: 'a/' } });
  expect(readLogAnalysisDraft(raw)?.comparison?.formula).toBe('a/');
  expect(() => parseLogAnalysis(raw)).toThrow();
});
