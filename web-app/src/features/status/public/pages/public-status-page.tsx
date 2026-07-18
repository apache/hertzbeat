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

import {
  loadPublicStatusComponents,
  loadPublicStatusIncidents,
  loadPublicStatusOrg
} from '../api/public-status-api';
import { publicStatusQueryKeys } from '../api/public-status-query-keys';
import { PublicStatusView } from '../components/public-status-view';
import { publicStatusState } from '../model/public-status-model';

export function PublicStatusPage() {
  const org = useQuery({ queryKey: publicStatusQueryKeys.org(), queryFn: loadPublicStatusOrg });
  const components = useQuery({
    queryKey: publicStatusQueryKeys.components(),
    queryFn: loadPublicStatusComponents
  });
  const incidents = useQuery({
    queryKey: publicStatusQueryKeys.incidents(),
    queryFn: loadPublicStatusIncidents
  });
  const queries = [org, components, incidents];

  return (
    <PublicStatusView
      org={org.data}
      components={components.data ?? []}
      incidents={incidents.data?.content ?? []}
      loading={queries.some(query => query.isPending)}
      state={publicStatusState(org.error, components.error, incidents.error)}
    />
  );
}
