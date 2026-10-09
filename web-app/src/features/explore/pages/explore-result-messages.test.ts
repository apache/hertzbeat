/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { ApiMessageError } from '@/core/http/api-message';
import { classifyExploreSignalError } from '../api/explore-signal-api-model';
import { exploreFailureMessageKey, refreshFailureMessageKey } from './explore-result-messages';

it('gives a specific recovery message for calculated budget and invalid pattern failures', () => {
  const actualBudgetError = new ApiMessageError('observability_log_filter_invalid', {
    status: 400,
    data: { reason: 'calculated_budget_exceeded' }
  });
  const kind = classifyExploreSignalError(actualBudgetError);
  expect(kind).toBe('calculated_budget_exceeded');
  if (kind !== 'calculated_budget_exceeded') throw new Error('calculated budget classification changed');
  expect(exploreFailureMessageKey(kind)).toBe('explore.logCalculatedV2.queryBudgetExceeded');
  expect(exploreFailureMessageKey('calculated_budget_exceeded')).toBe('explore.logCalculatedV2.queryBudgetExceeded');
  expect(refreshFailureMessageKey('calculated_budget_exceeded')).toBe('explore.logCalculatedV2.queryBudgetExceeded');
  expect(exploreFailureMessageKey('calculated_invalid_pattern')).toBe('explore.logCalculatedV2.queryInvalidPattern');
});
