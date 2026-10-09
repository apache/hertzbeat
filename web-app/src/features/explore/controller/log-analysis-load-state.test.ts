/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { ApiMessageError } from '@/core/http/api-message';
import { analysisLoadState } from './log-analysis-load-state';
it('recognizes only the authenticated 400 interval failure and never overrides loading', () => {
  const base = {
    isFetching: false,
    isPending: false,
    isError: true,
    error: new ApiMessageError('observability_log_analysis_interval_too_small', { status: 400 })
  };
  expect(analysisLoadState(base, true)).toBe('interval_too_small');
  expect(analysisLoadState({ ...base, isFetching: true }, true)).toBe('loading');
  expect(
    analysisLoadState(
      { ...base, error: new ApiMessageError('observability_log_analysis_interval_too_small', { status: 403 }) },
      true
    )
  ).toBe('permission');
});
