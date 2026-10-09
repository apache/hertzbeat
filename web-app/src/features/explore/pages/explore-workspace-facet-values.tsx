/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ExactTimeWindow } from '@/shared/query-context';
import { FacetValues } from '../components/explore-log-facet-values';
import type { FacetValueAction } from '../components/explore-log-facet-types';
import { useLogFacetValues } from '../controller/use-log-facet-values';
import type { ExploreQuery } from '../model/explore-model';
import type { ExplorePageResultState } from '../model/explore-result-model';

export function ExploreWorkspaceFacetValues({
  query,
  result,
  fieldId,
  fieldLabel,
  available,
  source,
  appliedWindow,
  actionForValue
}: {
  query: ExploreQuery;
  result: ExplorePageResultState;
  fieldId: string;
  fieldLabel: string;
  available: boolean;
  source: 'a' | 'b';
  appliedWindow?: ExactTimeWindow | undefined;
  actionForValue: FacetValueAction;
}) {
  const values = useLogFacetValues(query, result, fieldId, available, source, appliedWindow);
  return <FacetValues {...values} fieldId={fieldId} fieldLabel={fieldLabel} actionForValue={actionForValue} />;
}
