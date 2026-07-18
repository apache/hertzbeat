/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  deleteStatusIncident,
  loadStatusIncident,
  loadStatusIncidents,
  saveStatusIncident
} from '../api/status-management-api';
import type { StatusIncident } from '../model/status-management-contract';
import type { StatusIncidentQuery } from '../model/status-incident-query';
import {
  proveStatusMissing,
  requireStatusExactId,
  requireStatusId
} from './status-management-canonical-proof';
import { statusManagementQueryKeys } from './status-management-query-keys';
import type { StatusManagementNotifications } from './use-status-management-notifications';

export function useStatusIncidentTransactions(
  query: StatusIncidentQuery,
  closeEditor: () => void,
  notify: StatusManagementNotifications
) {
  const queryClient = useQueryClient();
  const refreshQuery = () => queryClient.fetchQuery({
    queryKey: statusManagementQueryKeys.incidents(query),
    queryFn: () => loadStatusIncidents(query),
    staleTime: 0,
    retry: false
  });
  const refresh = async () => {
    try {
      await refreshQuery();
      return true;
    } catch {
      // Keep the failed current-query cache state visible instead of reporting success.
      return false;
    }
  };
  const save = useMutation({
    mutationFn: async (value: StatusIncident) => {
      const isNew = value.id == null;
      await saveStatusIncident(value, isNew);
      if (!isNew) {
        const id = requireStatusId(value.id);
        requireStatusExactId((await loadStatusIncident(id)).id, id);
      }
      await refreshQuery();
    },
    // A failed proof leaves the editor open with the operator's draft intact.
    onSuccess: () => {
      closeEditor();
      notify.saveSuccess();
    },
    onError: notify.saveFailed
  });
  const remove = useMutation({
    mutationFn: async (id: number) => {
      const exactId = requireStatusId(id);
      await deleteStatusIncident(exactId);
      await proveStatusMissing(() => loadStatusIncident(exactId));
      await refreshQuery();
    },
    onSuccess: notify.deleteSuccess,
    onError: notify.deleteFailed
  });
  return { save, remove, refresh };
}
