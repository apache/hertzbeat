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

import type { useExplorePageController } from '../controller/use-explore-page-controller';
import type { useTraceAnalytics } from '../controller/use-trace-analytics';
import { ExploreTraceFacets } from '../components/explore-trace-facets';
import { TraceFacetGroups } from '../components/explore-trace-facet-groups';
import { readTraceFacetGroup, traceFacetAction } from '../model/explore-trace-facet-action';
export function ExploreWorkspaceTraceFacets({
  controller,
  analytics
}: {
  controller: ReturnType<typeof useExplorePageController>;
  analytics: ReturnType<typeof useTraceAnalytics>;
}) {
  const { query, submission, result } = controller,
    { facets, field, onFieldChange, facetSelection } = analytics,
    draft = submission.draft;
  const group =
    query.signal === 'traces' && draft.signal === 'traces' ? readTraceFacetGroup(draft, query, field) : undefined;
  if (query.signal !== 'traces' || draft.signal !== 'traces') return null;
  const enabled = ['ready', 'empty'].includes(result.kind) && facets.state === 'ready';
  return (
    <ExploreTraceFacets
      load={facets}
      field={field}
      onFieldChange={onFieldChange}
      retry={facets.retry}
      controls={
        <TraceFacetGroups
          draft={draft}
          scope={query}
          field={field}
          mode={facetSelection.mode(field)}
          enabled={enabled}
          onModeChange={mode => facetSelection.onModeChange(field, mode)}
          onChange={submission.updateField}
        />
      }
      action={value => {
        const update = enabled ? traceFacetAction(draft, query, field, value, facetSelection.mode(field)) : undefined;
        return {
          selected: group?.values.includes(value) ?? false,
          disabled: !update,
          run: () => {
            if (update) submission.updateField(update);
          }
        };
      }}
    />
  );
}
