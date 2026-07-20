/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { QueryClient } from '@tanstack/react-query';

import { loadStatusIncident, loadStatusIncidents } from '../api/status-management-api';
import { StatusManagementContractError, type StatusIncident } from '../model/status-management-contract';
import type { StatusIncidentQuery } from '../model/status-incident-query';
import { requireStatusId, requireStatusIncidentWritable } from './status-management-canonical-proof';
import { statusManagementQueryKeys } from './status-management-query-keys';

export function projectStatusIncidents(
  queryClient: QueryClient,
  query: StatusIncidentQuery,
  committedDeletes: Set<number>,
  before?: () => Promise<void>,
  isCurrent?: () => boolean
) {
  return queryClient.fetchQuery({
    queryKey: statusManagementQueryKeys.incidents(query),
    queryFn: async () => {
      await before?.();
      requireCurrentProjection(isCurrent);
      const page = await loadStatusIncidents(query);
      requireCurrentProjection(isCurrent);
      if (page.content.some(record => record.id != null && committedDeletes.has(record.id))) {
        throw new StatusManagementContractError();
      }
      committedDeletes.clear();
      return page;
    },
    staleTime: 0,
    retry: false
  });
}

export function projectStatusIncidentUpdate(
  queryClient: QueryClient,
  query: StatusIncidentQuery,
  committedDeletes: Set<number>,
  value: StatusIncident,
  isCurrent?: () => boolean
) {
  if (value.id == null) return projectStatusIncidents(queryClient, query, committedDeletes, undefined, isCurrent);
  const id = requireStatusId(value.id);
  return projectStatusIncidents(
    queryClient,
    query,
    committedDeletes,
    async () => {
      requireStatusIncidentWritable(await loadStatusIncident(id), value);
    },
    isCurrent
  );
}

function requireCurrentProjection(isCurrent: (() => boolean) | undefined) {
  if (isCurrent && !isCurrent()) throw new StatusManagementContractError();
}
