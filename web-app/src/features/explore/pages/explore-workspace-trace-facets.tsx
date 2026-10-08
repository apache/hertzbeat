/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
