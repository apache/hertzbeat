/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { useExplorePageController } from './use-explore-page-controller';
import { useTraceSpanFilters } from './use-trace-span-filters';
import { draftFromQuery } from '../model/explore-submission-model';
const query = { signal: 'traces' as const, timeRange: 'last-30m' as const, serviceName: 'checkout' };
const target = { scope: 'attribute' as const, key: 'http.status_code', value: '500' };
function fixture() {
  return {
    query,
    result: { kind: 'ready' },
    submission: {
      draft: draftFromQuery(query),
      updateField: vi.fn(),
      submit: vi.fn()
    }
  };
}
afterEach(cleanup);
it('stages a guarded span filter and applies only on explicit submission', () => {
  const controller = fixture();
  const hook = renderHook(() =>
    useTraceSpanFilters(controller as unknown as ReturnType<typeof useExplorePageController>)
  );
  act(() => expect(hook.result.current.onAddSpanFilter?.(target, '=')).toBe(true));
  expect(controller.submission.updateField).toHaveBeenCalledWith({
    field: 'attributeFilter',
    value: 'http.status_code = "500"'
  });
  expect(controller.submission.submit).not.toHaveBeenCalled();
  act(() => hook.result.current.onApplySpanFilters?.());
  expect(controller.submission.submit).toHaveBeenCalledOnce();
});
it('refuses unrepresentable scalar values and disables actions while evidence is stale', () => {
  const controller = fixture();
  const hook = renderHook(() =>
    useTraceSpanFilters(controller as unknown as ReturnType<typeof useExplorePageController>)
  );
  act(() => expect(hook.result.current.onAddSpanFilter?.({ ...target, value: ' 500 ' }, '=')).toBe(false));
  expect(controller.submission.updateField).not.toHaveBeenCalled();
  controller.result.kind = 'refreshing';
  hook.rerender();
  expect(hook.result.current.onAddSpanFilter).toBeUndefined();
  expect(hook.result.current.onApplySpanFilters).toBeUndefined();
});
