/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  deleteStatusComponent,
  loadStatusComponent,
  loadStatusComponents,
  saveStatusComponent
} from '../api/status-management-api';
import type { StatusComponent } from '../model/status-management-contract';
import {
  proveStatusMissing,
  requireStatusExactId,
  requireStatusId
} from './status-management-canonical-proof';
import { statusManagementQueryKeys } from './status-management-query-keys';
import type { StatusManagementNotifications } from './use-status-management-notifications';

type SetComponentEditor = (value: Partial<StatusComponent> | undefined) => void;

export function useStatusComponentTransactions(
  setEditor: SetComponentEditor,
  notify: StatusManagementNotifications
) {
  const queryClient = useQueryClient();
  const refreshQuery = () => queryClient.fetchQuery({
    queryKey: statusManagementQueryKeys.components(),
    queryFn: loadStatusComponents,
    staleTime: 0,
    retry: false
  });
  const refresh = async () => {
    try {
      await refreshQuery();
      return true;
    } catch {
      // The failed Query remains authoritative so the page hides stale cached records.
      return false;
    }
  };
  const save = useMutation({
    mutationFn: async (value: StatusComponent) => {
      const isNew = value.id == null;
      await saveStatusComponent(value, isNew);
      if (!isNew) {
        const id = requireStatusId(value.id);
        requireStatusExactId((await loadStatusComponent(id)).id, id);
      }
      await refreshQuery();
    },
    // Editors close only after the canonical detail/list proof succeeds.
    onSuccess: () => {
      setEditor(undefined);
      notify.saveSuccess();
    },
    onError: notify.saveFailed
  });
  const remove = useMutation({
    mutationFn: async (id: number) => {
      const exactId = requireStatusId(id);
      await deleteStatusComponent(exactId);
      await proveStatusMissing(() => loadStatusComponent(exactId));
      await refreshQuery();
    },
    onSuccess: notify.deleteSuccess,
    onError: notify.deleteFailed
  });
  return { save, remove, refresh };
}
