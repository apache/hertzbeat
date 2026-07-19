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

import { loadPublicStatusComponents, loadPublicStatusIncidents, loadPublicStatusOrg } from '../api/public-status-api';
import type { PublicStatusState, PublicStatusViewModel } from '../model/public-status-contract';
import { publicStatusState } from '../model/public-status-model';
import { publicStatusQueryKeys } from './public-status-query-keys';

export function usePublicStatusController(): PublicStatusViewModel {
  const org = useQuery({ queryKey: publicStatusQueryKeys.org(), queryFn: loadPublicStatusOrg });
  const components = useQuery({
    queryKey: publicStatusQueryKeys.components(),
    queryFn: loadPublicStatusComponents
  });
  const incidents = useQuery({
    queryKey: publicStatusQueryKeys.incidents(),
    queryFn: loadPublicStatusIncidents
  });
  const state = publicStatusState(org.error, components.error, incidents.error);

  // Pending evidence wins over cached data so a partial first load cannot appear ready.
  if (org.isPending || components.isPending || incidents.isPending) return emptyViewModel(state, true);
  if (state !== 'ready') {
    return { ...emptyViewModel(state, false), org: org.error ? undefined : org.data };
  }
  if (org.data === undefined || components.data === undefined || incidents.data === undefined) {
    return emptyViewModel('unavailable', false);
  }
  return {
    org: org.data,
    components: components.data,
    incidents: incidents.data.content,
    loading: false,
    state: 'ready'
  };
}

function emptyViewModel(state: PublicStatusState, loading: boolean): PublicStatusViewModel {
  return { org: undefined, components: [], incidents: [], loading, state };
}
