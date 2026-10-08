/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState } from 'react';
import type { ExploreQuery } from '../model/explore-query';
import type { ExploreSubmissionDraft } from '../model/explore-submission-model';
import type { TraceFacetField } from '../model/explore-trace-analytics';
import { readTraceFacetGroup, type TraceFacetMode } from '../model/explore-trace-facet-action';
export function useTraceFacetSelection(query: ExploreQuery, draft: ExploreSubmissionDraft) {
  const scope = Object.fromEntries(Object.entries(query).filter(([key]) => !['pageIndex', 'traceView'].includes(key)));
  const owner = JSON.stringify([
    scope,
    draft.signal === 'traces' ? [draft.resourceFilter, draft.attributeFilter] : null
  ]);
  const [selection, setSelection] = useState<{
    owner: string;
    modes: Partial<Record<TraceFacetField, TraceFacetMode>>;
  }>({ owner, modes: {} });
  if (selection.owner !== owner) setSelection({ owner, modes: {} });
  return {
    mode: (field: TraceFacetField): TraceFacetMode =>
      (selection.owner === owner ? selection.modes[field] : undefined) ??
      (query.signal === 'traces' && draft.signal === 'traces'
        ? readTraceFacetGroup(draft, query, field).mode
        : 'include'),
    onModeChange: (field: TraceFacetField, mode: TraceFacetMode) =>
      setSelection(previous => ({
        owner,
        modes: { ...(previous.owner === owner ? previous.modes : {}), [field]: mode }
      }))
  };
}
