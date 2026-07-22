/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { QueryClient } from '@tanstack/react-query';

import { loadStatusComponent, loadStatusComponents } from '../api/status-management-api';
import { StatusManagementContractError, type StatusComponent } from '../model/status-management-contract';
import { requireStatusComponentWritable, requireStatusId } from './status-management-canonical-proof';
import { statusManagementQueryKeys } from './status-management-query-keys';

export function projectStatusComponents(
  queryClient: QueryClient,
  committedDeletes: Set<number>,
  before?: (signal: AbortSignal) => Promise<void>,
  validate?: (records: StatusComponent[]) => void,
  isCurrent?: () => boolean
) {
  return queryClient.fetchQuery({
    queryKey: statusManagementQueryKeys.components(),
    queryFn: async ({ signal }) => {
      await before?.(signal);
      requireCurrentProjection(isCurrent);
      const records = await loadStatusComponents(signal);
      requireCurrentProjection(isCurrent);
      validate?.(records);
      if (records.some(record => record.id != null && committedDeletes.has(record.id))) {
        throw new StatusManagementContractError();
      }
      committedDeletes.clear();
      return records;
    },
    staleTime: 0,
    retry: false
  });
}

export function projectStatusComponentUpdate(
  queryClient: QueryClient,
  committedDeletes: Set<number>,
  value: StatusComponent,
  isCurrent?: () => boolean
) {
  if (value.id == null) return projectStatusComponents(queryClient, committedDeletes, undefined, undefined, isCurrent);
  const id = requireStatusId(value.id);
  return projectStatusComponents(
    queryClient,
    committedDeletes,
    async signal => {
      requireStatusComponentWritable(await loadStatusComponent(id, signal), value);
    },
    undefined,
    isCurrent
  );
}

function requireCurrentProjection(isCurrent: (() => boolean) | undefined) {
  if (isCurrent && !isCurrent()) throw new StatusManagementContractError();
}
