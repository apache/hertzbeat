/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { DEFAULT_LOG_ANALYSIS, encodeLogAnalysis, parseLogAnalysis } from '@/platform/perses';
import { readLogAnalysisDraft } from './explore-log-analysis';
import { buildLogComparisonRequest } from '../api/explore-log-comparison-api';
import { buildSavedQueryPayload, readSavedQuery } from './explore-saved-query-model';
import { logComparisonDrilldownPath } from './explore-log-comparison-navigation';
import { parseExploreQuery } from './explore-url-model';
const window = { from: 1000000000, to: 1000001000 };
it.each([3600000, 86400000, 604800000])(
  'preserves fixed %i shift and opens actual b time with exact a return',
  timeShiftMs => {
    const analysis = parseLogAnalysis(
      JSON.stringify({
        ...DEFAULT_LOG_ANALYSIS,
        representation: 'table',
        comparison: { version: 1, search: 'error', timeShiftMs }
      })
    );
    const query = { signal: 'logs' as const, timeRange: 'last-30m' as const, logAnalysis: encodeLogAnalysis(analysis) };
    const migratedAnalysis = encodeLogAnalysis({ ...analysis, representation: 'timeseries' });
    expect(readSavedQuery(buildSavedQueryPayload(query, 'shift', 'Shift', ''))).toMatchObject({
      kind: 'ready',
      query: { ...query, logAnalysis: migratedAnalysis }
    });
    const request = buildLogComparisonRequest(query, window, analysis);
    expect(request.queries[0]).not.toHaveProperty('timeShiftMs');
    expect(request.queries[1]).toHaveProperty('timeShiftMs', timeShiftMs);
    const path = logComparisonDrilldownPath(
      query,
      window,
      analysis,
      { keys: [], a: { count: 2 }, b: { count: 1 }, buckets: [] },
      'b'
    );
    const target = parseExploreQuery(new URLSearchParams(path!.split('?')[1]));
    expect(target).toMatchObject({
      start: window.from - timeShiftMs,
      end: window.to - timeShiftMs,
      query: '"error"',
      searchSyntax: 'structured-v1'
    });
    expect(parseExploreQuery(new URLSearchParams(target.returnTo!.split('?')[1]))).toMatchObject({
      start: window.from,
      end: window.to,
      logAnalysis: migratedAnalysis
    });
  }
);
it.each([0, null, '3600000', 1.5, 3600001])('rejects invalid shift %j', timeShiftMs => {
  expect(() =>
    parseLogAnalysis(
      JSON.stringify({
        ...DEFAULT_LOG_ANALYSIS,
        representation: 'table',
        comparison: { version: 1, search: '', timeShiftMs }
      })
    )
  ).toThrow();
});
it('preserves an invalid numeric shift as editable draft', () => {
  expect(
    readLogAnalysisDraft(
      JSON.stringify({
        ...DEFAULT_LOG_ANALYSIS,
        representation: 'table',
        comparison: { version: 1, search: '', timeShiftMs: 1 }
      })
    )?.comparison
  ).toHaveProperty('timeShiftMs', 1);
});
