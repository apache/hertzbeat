/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { logComparisonFacetAction } from './explore-log-comparison-facet';
import { DEFAULT_LOG_ANALYSIS } from '@/platform/perses';
import { draftFromQuery } from './explore-submission-model';
const query = {
  signal: 'logs' as const,
  timeRange: 'last-30m' as const,
  serviceName: 'checkout',
  query: 'status:INFO',
  searchSyntax: 'structured-v1',
  logAnalysis: JSON.stringify({
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'table',
    comparison: { version: 1, search: '@kind:failure', searchSyntax: 'structured-v1' }
  })
};
it('targets b expression without narrowing common scope or changing a', () => {
  const draft = draftFromQuery(query);
  if (draft.signal !== 'logs') throw new Error('Expected logs');
  const action = logComparisonFacetAction(
    draft,
    query,
    'b',
    { id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' },
    'ERROR',
    '='
  );
  expect(action?.field).toBe('logAnalysis');
  if (typeof action?.value !== 'string') throw new Error('Expected text update');
  expect(JSON.parse(action.value)).toMatchObject({ comparison: { search: '(@kind:failure) AND status:"ERROR"' } });
  expect(draft.query).toBe('status:INFO');
  expect(draft.serviceName).toBe('checkout');
});
it('refuses literal source reinterpretation and protects locked metadata', () => {
  const draft = draftFromQuery({ ...query, searchSyntax: undefined });
  if (draft.signal !== 'logs') throw new Error('Expected logs');
  expect(
    logComparisonFacetAction(
      draft,
      query,
      'a',
      { id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' },
      'ERROR',
      '='
    )
  ).toBeUndefined();
  expect(
    logComparisonFacetAction(
      draft,
      query,
      'b',
      { id: 'resource:workspace_id', source: 'resource', key: 'workspace_id' },
      'other',
      '='
    )
  ).toBeUndefined();
});
