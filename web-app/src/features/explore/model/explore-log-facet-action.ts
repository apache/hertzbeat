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

import type { LogFacetField } from './explore-log-facets';
import type { LogExploreQuery } from './explore-query';
import type { ExploreQueryPatch } from './explore-model';
import type { ExploreDraftFieldUpdate, LogExploreSubmissionDraft } from './explore-submission-model';
import { structuredFacetAction } from './explore-log-structured-facet-action';
import { migrateVisibleLegacyLogFilters } from './explore-log-search-migration';
import { parseLogFilterExpression } from './explore-log-filter-expression';

export type FacetValueAction = (
  field: LogFacetField,
  value: string,
  operator: '=' | '!=',
  intent?: 'single' | 'toggle'
) => {
  disabled: boolean;
  selected: boolean;
  onClick: () => void;
  reason?: 'legacy-value' | 'literal-query-exclusion' | 'pending-query' | undefined;
};

type Action = {
  selected: boolean;
  update?: ExploreDraftFieldUpdate;
  patch?: ExploreQueryPatch;
  reason?: 'legacy-value' | 'literal-query-exclusion';
};

export function logFacetAction(
  draft: LogExploreSubmissionDraft,
  scope: LogExploreQuery,
  field: LogFacetField,
  value: string,
  operator: '=' | '!=',
  intent: 'single' | 'toggle' = 'toggle'
): Action {
  if (draft.searchSyntax === 'structured-v1' || draft.searchSyntax === 'structured-v2')
    return structuredFacetAction(draft, scope, field, value, operator, intent);
  if (
    (draft.resourceFilter && !parseLogFilterExpression(draft.resourceFilter).valid) ||
    (draft.attributeFilter && !parseLogFilterExpression(draft.attributeFilter).valid)
  )
    return { selected: false };
  const migrated = migrateVisibleLegacyLogFilters(draft);
  if (migrated.searchSyntax !== 'structured-v1') return { selected: false };
  const action = structuredFacetAction(
    { ...draft, query: migrated.query ?? '', searchSyntax: 'structured-v1' },
    scope,
    field,
    value,
    operator,
    intent
  );
  return action.update
    ? {
        selected: action.selected,
        patch: { ...migrated, query: action.update.value, searchSyntax: 'structured-v1' }
      }
    : action;
}
