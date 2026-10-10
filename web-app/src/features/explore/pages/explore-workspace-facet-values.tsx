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
