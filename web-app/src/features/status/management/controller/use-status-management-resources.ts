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

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect } from 'react';

import { loadStatusComponents, loadStatusIncidents, loadStatusOrg } from '../api/status-management-api';
import type { StatusIncidentQuery } from '../model/status-incident-query';
import { statusManagementQueryKeys } from './status-management-query-keys';

export function useStatusManagementResources(query: StatusIncidentQuery, canRead: boolean) {
  const queryClient = useQueryClient();
  useLayoutEffect(() => {
    if (canRead) return;
    const filters = { queryKey: statusManagementQueryKeys.root() };
    void queryClient.cancelQueries(filters);
    queryClient.removeQueries(filters);
  }, [canRead, queryClient]);
  return {
    org: useQuery({
      queryKey: statusManagementQueryKeys.org(),
      queryFn: ({ signal }) => loadStatusOrg(signal),
      enabled: canRead,
      retry: false
    }),
    components: useQuery({
      queryKey: statusManagementQueryKeys.components(),
      queryFn: ({ signal }) => loadStatusComponents(signal),
      enabled: canRead,
      retry: false
    }),
    incidents: useQuery({
      queryKey: statusManagementQueryKeys.incidents(query),
      queryFn: ({ signal }) => loadStatusIncidents(query, signal),
      enabled: canRead,
      retry: false
    })
  };
}
