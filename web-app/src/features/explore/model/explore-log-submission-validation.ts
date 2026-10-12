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

import { validLogTransactionMode } from './explore-log-transactions';
import { hasUnclosedSearchQuote } from './explore-log-search-authoring';
import { validLogCalculatedMode } from './explore-log-calculated';
import { validLogCalculatedV2Query } from './explore-log-calculated-v2';
import { validLogSubqueryQuery, parseLogSubquery } from './explore-log-subquery';
import { validLogNumericRange } from '@/shared/log-numeric-range';
import { validLogSort } from './explore-log-order';
import { validLogAnalysis, parseLogAnalysis } from '@/platform/perses';
import { validLogGroupSelection } from '@/shared/log-group-selection';
import type { LogExploreSubmissionDraft } from './explore-submission-types';

export function logModeError(draft: LogExploreSubmissionDraft) {
  if (draft.logReferenceJoin !== undefined)
    return { field: 'logReferenceJoin' as const, code: 'retired_log_reference_join' as const };
  if (!validLogTransactionMode(draft.logAggregation, draft.logTransactions))
    return { field: 'logTransactions' as const, code: 'invalid_log_transactions' as const };
  if (!validLogCalculatedMode(draft.logAggregation, draft.logCalculated))
    return { field: 'logCalculated' as const, code: 'invalid_log_calculated' as const };
  if (!validLogAnalysis(draft.logAnalysis))
    return { field: 'logAnalysis' as const, code: 'invalid_log_analysis' as const };
  if (!validLogCalculatedV2Query(draft))
    return { field: 'logCalculatedV2' as const, code: 'invalid_log_calculated_v2' as const };
  if (!validLogSubqueryQuery(draft)) return { field: 'logSubquery' as const, code: 'invalid_log_subquery' as const };
  if (
    !validLogSort(draft.logSort, draft.sort) ||
    (draft.sort !== undefined && !['newest', 'oldest'].includes(draft.sort))
  )
    return { field: 'logSort' as const, code: 'invalid_log_sort' as const };
  return undefined;
}

export function logFilterError(draft: LogExploreSubmissionDraft) {
  if (hasInvalidMainQuote(draft)) return { field: 'query' as const, code: 'unclosed_quote' as const };
  const child = parseLogSubquery(draft.logSubquery)?.child;
  if (child && hasUnclosedSearchQuote(child.search))
    return { field: 'logSubquery' as const, code: 'invalid_log_subquery' as const };
  if (!validLogNumericRange(draft.logNumericRange))
    return { field: 'logNumericRange' as const, code: 'invalid_log_numeric_range' as const };
  if (!validLogGroupSelection(draft.logGroupSelection))
    return { field: 'logGroupSelection' as const, code: 'invalid_log_group_selection' as const };
  const querySet = draft.logAnalysis ? parseLogAnalysis(draft.logAnalysis).querySet : undefined;
  if (
    querySet?.queries.some(
      source => source.searchSyntax === 'structured-v1' && hasUnclosedSearchQuote(source.search ?? '')
    )
  )
    return { field: 'query' as const, code: 'unclosed_quote' as const };
  return undefined;
}

function hasInvalidMainQuote(draft: LogExploreSubmissionDraft) {
  return ['structured-v1', 'structured-v2'].includes(draft.searchSyntax ?? '') && hasUnclosedSearchQuote(draft.query);
}
