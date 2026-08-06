/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { ExplorePageResultState } from '../model/explore-result-model';

export function exploreFailureMessageKey(kind: 'transport_error' | 'contract_error' | 'error') {
  if (kind === 'transport_error') return 'explore.states.transportError';
  if (kind === 'contract_error') return 'explore.states.contractError';
  return 'explore.loadFailed';
}

export function refreshFailureMessageKey(
  errorKind: Extract<ExplorePageResultState, { kind: 'stale_error' }>['errorKind']
) {
  if (errorKind === 'permission') return 'common.permission.roleRequiredDescription';
  if (errorKind === 'transport_error') return 'explore.states.transportError';
  if (errorKind === 'contract_error') return 'explore.states.contractError';
  return 'explore.loadFailed';
}
