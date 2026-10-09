/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { useExplorePageController } from './use-explore-page-controller';
import { draftFromQuery } from '../model/explore-submission-model';
import { useLogInspectorAnalysis } from './use-log-inspector-analysis';

it('reports an invalid pending draft without changing analysis or closing the inspector', () => {
  const query = { signal: 'logs' as const, timeRange: 'last-30m' as const };
  const draft = draftFromQuery(query);
  if (draft.signal !== 'logs') throw new Error('Expected log draft');
  draft.logNumericRange = '{';
  const submit = vi.fn();
  const updateField = vi.fn();
  const controller = {
    query,
    result: { kind: 'ready' },
    submission: { draft, submit, updateField }
  } as unknown as ReturnType<typeof useExplorePageController>;
  const { result } = renderHook(() => useLogInspectorAnalysis(controller, true));
  expect(
    result.current.controls.onAnalyzeLogField?.(
      {
        field: { source: 'attribute', key: 'status', id: 'attribute:status' },
        numeric: false
      },
      'graph'
    )
  ).toBe(false);
  expect(submit).toHaveBeenCalledOnce();
  expect(updateField).not.toHaveBeenCalled();
});
