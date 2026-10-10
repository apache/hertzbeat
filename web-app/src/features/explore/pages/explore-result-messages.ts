/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
