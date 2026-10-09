/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { ExplorePageResultState, ExploreFailureKind } from '../model/explore-result-model';

export function exploreFailureMessageKey(kind: Exclude<ExploreFailureKind, 'permission'>) {
  if (kind === 'calculated_budget_exceeded') return 'explore.logCalculatedV2.queryBudgetExceeded';
  if (kind === 'calculated_invalid_pattern') return 'explore.logCalculatedV2.queryInvalidPattern';
  if (kind === 'invalid_filter') return 'explore.logQueryBuilder.invalidFilter';
  if (kind === 'invalid_query') return 'explore.metricComposition.states.invalid_query';
  if (kind === 'transport_error') return 'explore.states.transportError';
  if (kind === 'contract_error') return 'explore.states.contractError';
  return 'explore.loadFailed';
}

export function refreshFailureMessageKey(
  errorKind: Extract<ExplorePageResultState, { kind: 'stale_error' }>['errorKind']
) {
  if (errorKind === 'calculated_budget_exceeded') return 'explore.logCalculatedV2.queryBudgetExceeded';
  if (errorKind === 'calculated_invalid_pattern') return 'explore.logCalculatedV2.queryInvalidPattern';
  if (errorKind === 'invalid_filter') return 'explore.logQueryBuilder.invalidFilter';
  if (errorKind === 'invalid_query') return 'explore.metricComposition.states.invalid_query';
  if (errorKind === 'permission') return 'common.permission.roleRequiredDescription';
  if (errorKind === 'transport_error') return 'explore.states.transportError';
  if (errorKind === 'contract_error') return 'explore.states.contractError';
  return 'explore.loadFailed';
}

export function isExploreQueryFailure(
  result: ExplorePageResultState
): result is Extract<ExplorePageResultState, { kind: Exclude<ExploreFailureKind, 'permission'> }> {
  return [
    'transport_error',
    'contract_error',
    'invalid_query',
    'invalid_filter',
    'calculated_budget_exceeded',
    'calculated_invalid_pattern',
    'error'
  ].includes(result.kind);
}
