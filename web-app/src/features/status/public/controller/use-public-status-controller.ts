/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { loadPublicStatusComponents, loadPublicStatusIncidents, loadPublicStatusOrg } from '../api/public-status-api';
import type { PublicStatusState, PublicStatusViewModel } from '../model/public-status-contract';
import { createPublicStatusIncidentRange, isPublicStatusIncidentYear } from '../model/public-status-incident-range';
import { isCompletePublicStatusIncidentPage, publicStatusState } from '../model/public-status-model';
import { publicStatusQueryKeys } from './public-status-query-keys';

export function usePublicStatusController(): PublicStatusViewModel {
  const [incidentYear, setIncidentYear] = useState(() => new Date().getFullYear());
  const incidentRange = useMemo(() => createPublicStatusIncidentRange(incidentYear), [incidentYear]);
  const org = useQuery({
    queryKey: publicStatusQueryKeys.org(),
    queryFn: ({ signal }) => loadPublicStatusOrg({ signal })
  });
  const components = useQuery({
    queryKey: publicStatusQueryKeys.components(),
    queryFn: ({ signal }) => loadPublicStatusComponents({ signal })
  });
  const incidents = useQuery({
    queryKey: publicStatusQueryKeys.incidents(incidentRange),
    queryFn: ({ signal }) => loadPublicStatusIncidents(incidentRange, { signal })
  });
  const state = publicStatusState(org.error, components.error, incidents.error);
  const actions = {
    incidentLoading: incidents.isPending,
    incidentRange,
    incidentRefreshing: incidents.isFetching && !incidents.isPending,
    refreshIncidents: incidents.refetch,
    selectIncidentYear: (year: number) => {
      if (isPublicStatusIncidentYear(year, new Date().getFullYear())) setIncidentYear(year);
    }
  };

  // Pending evidence wins over cached data so a partial first load cannot appear ready.
  if (org.isPending || components.isPending) return emptyViewModel(state, true, actions);
  if (state !== 'ready') {
    return { ...emptyViewModel(state, false, actions), org: org.error ? undefined : org.data };
  }
  if (org.data === undefined || components.data === undefined) return emptyViewModel('error', false, actions);
  if (incidents.isPending) {
    return { ...actions, org: org.data, components: components.data, incidents: [], loading: false, state: 'ready' };
  }
  if (incidents.data === undefined || !isCompletePublicStatusIncidentPage(incidents.data)) {
    return emptyViewModel('error', false, actions);
  }
  return {
    ...actions,
    org: org.data,
    components: components.data,
    incidents: incidents.data.content,
    loading: false,
    state: 'ready'
  };
}

function emptyViewModel(
  state: PublicStatusState,
  loading: boolean,
  actions: Pick<
    PublicStatusViewModel,
    'incidentLoading' | 'incidentRange' | 'incidentRefreshing' | 'refreshIncidents' | 'selectIncidentYear'
  >
): PublicStatusViewModel {
  return { ...actions, org: undefined, components: [], incidents: [], loading, state };
}
