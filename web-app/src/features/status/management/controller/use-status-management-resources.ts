/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { loadStatusComponents, loadStatusIncidents, loadStatusOrg } from '../api/status-management-api';
import type { StatusIncidentQuery } from '../model/status-incident-query';
import { statusManagementQueryKeys } from './status-management-query-keys';

export function useStatusManagementResources(query: StatusIncidentQuery) {
  return {
    org: useQuery({
      queryKey: statusManagementQueryKeys.org(),
      queryFn: ({ signal }) => loadStatusOrg(signal),
      retry: false
    }),
    components: useQuery({
      queryKey: statusManagementQueryKeys.components(),
      queryFn: ({ signal }) => loadStatusComponents(signal),
      retry: false
    }),
    incidents: useQuery({
      queryKey: statusManagementQueryKeys.incidents(query),
      queryFn: ({ signal }) => loadStatusIncidents(query, signal),
      retry: false
    })
  };
}
