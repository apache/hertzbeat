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

import type { useExplorePageController } from './use-explore-page-controller';
import type { FacetValueAction } from '../model/explore-log-facet-action';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';
import { logComparisonFacetAction } from '../model/explore-log-comparison-facet';
import { logFacetAction } from '../model/explore-log-facet-action';
import { structuredFacetAction } from '../model/explore-log-structured-facet-action';

export function facetAction(
  controller: ReturnType<typeof useExplorePageController>,
  enabled: boolean,
  source: 'a' | 'b',
  comparison: boolean
): FacetValueAction {
  const { query, submission } = controller;
  if (comparison)
    return (field, value, operator) => {
      if (submission.draft.signal !== 'logs' || query.signal !== 'logs' || !enabled)
        return { selected: false, disabled: true, onClick: () => {} };
      const update = logComparisonFacetAction(submission.draft, query, source, field, value, operator);
      return {
        selected: false,
        disabled: !update,
        onClick: () => {
          if (update) submission.updateField(update);
        }
      };
    };
  return (field, value, operator, intent = 'toggle') => {
    if (submission.draft.signal !== 'logs' || query.signal !== 'logs' || !enabled)
      return { selected: false, disabled: true, onClick: () => {} };
    const action = logFacetAction(submission.draft, query, field, value, operator, intent);
    const patch = action.patch;
    return {
      selected: action.selected,
      disabled: !action.update && !patch,
      reason: action.reason,
      onClick: () => {
        if (patch) {
          for (const [field, value] of Object.entries(patch))
            submission.updateField({
              field,
              value
            } as import('../model/explore-submission-model').ExploreDraftFieldUpdate);
          submission.submit();
          return;
        }
        if (!action.update) return;
        submission.updateField(action.update);
        submission.submit();
      }
    };
  };
}

export function querySetFacetAction(
  controller: ReturnType<typeof useExplorePageController>,
  enabled: boolean,
  refId: string
): FacetValueAction {
  // eslint-disable-next-line complexity -- maps the shared structured facet action back to one query source.
  return (field, value, operator, intent = 'toggle') => {
    const { query, submission } = controller;
    const draft = submission.draft;
    const draftAnalysis = draft.signal === 'logs' ? readLogAnalysisDraft(draft.logAnalysis) : undefined;
    const source = draftAnalysis?.querySet?.queries.find(item => item.refId === refId);
    if (!enabled || query.signal !== 'logs' || draft.signal !== 'logs' || !draftAnalysis || !source)
      return { selected: false, disabled: true, onClick: () => {} };
    const syntax = source.searchSyntax ?? draft.searchSyntax;
    const text = source.search ?? '';
    if (syntax !== 'structured-v1') return { selected: false, disabled: true, onClick: () => {} };
    const projected = { ...draft, query: text, searchSyntax: syntax };
    const action = structuredFacetAction(projected, query, field, value, operator, intent);
    const search = action.update?.value;
    if (search === undefined)
      return { selected: action.selected, disabled: true, reason: action.reason, onClick: () => {} };
    const update = {
      field: 'logAnalysis' as const,
      value: JSON.stringify({
        ...draftAnalysis,
        querySet: {
          ...draftAnalysis.querySet!,
          queries: draftAnalysis.querySet!.queries.map(item =>
            item.refId === refId ? { ...item, search, searchSyntax: 'structured-v1' as const } : item
          )
        }
      })
    };
    return {
      selected: action.selected,
      disabled: false,
      onClick: () => {
        submission.updateField(update);
        submission.submit();
      }
    };
  };
}
