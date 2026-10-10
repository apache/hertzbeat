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

import type { TFunction } from 'i18next';
import type { ExploreFailureKind, ExplorePageResultState } from '../model/explore-result-model';
import { logFilterFailureDescription } from '../model/explore-log-filter-failure';
import { invalidExploreContextMessageKey } from '../model/explore-retired-log-reference-message';
import type { ExploreQuery } from '../model/explore-query';
import { exploreFailureMessageKey, refreshFailureMessageKey } from './explore-result-messages';

const retryKinds = new Set<ExploreFailureKind>([
  'transport_error',
  'contract_error',
  'error',
  'calculated_budget_exceeded',
  'calculated_invalid_pattern'
]);

export function trendAction(result: ExplorePageResultState) {
  const kind = result.kind === 'stale_error' ? result.errorKind : result.kind;
  if (kind === 'invalid_filter' || kind === 'invalid_query') return 'review';
  if (retryKinds.has(kind as ExploreFailureKind)) return 'retry';
  return undefined;
}

export function trendFailureMessage(result: ExplorePageResultState, t: TFunction, query: ExploreQuery) {
  if (result.kind === 'loading') return t('explore.states.loading');
  if (result.kind === 'invalid') return t(invalidExploreContextMessageKey(query));
  const kind = result.kind === 'stale_error' ? result.errorKind : result.kind;
  if (kind === 'permission') return t('common.permission.roleRequiredDescription');
  if (kind === 'invalid_filter')
    return logFilterFailureDescription(
      t,
      'invalidFilterReason' in result ? result.invalidFilterReason : undefined,
      'syntaxDiagnostic' in result ? result.syntaxDiagnostic : undefined
    );
  if (result.kind === 'stale_error') return t(refreshFailureMessageKey(result.errorKind));
  if (retryKinds.has(kind as ExploreFailureKind) || kind === 'invalid_query')
    return t(exploreFailureMessageKey(kind as Exclude<ExploreFailureKind, 'permission'>));
  return t('exploreLog.statisticsUnavailable');
}
