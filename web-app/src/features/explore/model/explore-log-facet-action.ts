/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogFacetField } from './explore-log-facets';
import type { LogExploreQuery } from './explore-query';
import type { ExploreQueryPatch } from './explore-model';
import type { ExploreDraftFieldUpdate, LogExploreSubmissionDraft } from './explore-submission-model';
import { structuredFacetAction } from './explore-log-structured-facet-action';
import { migrateVisibleLegacyLogFilters } from './explore-log-search-migration';
import { parseLogFilterExpression } from './explore-log-filter-expression';

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
