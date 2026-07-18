/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveStatusOrg } from '../api/status-management-api';
import type { StatusOrg, StatusOrgRecord } from '../model/status-management-contract';
import { statusManagementQueryKeys } from './status-management-query-keys';
import type { StatusManagementNotifications } from './use-status-management-notifications';

export function useStatusOrgSave(
  org: StatusOrgRecord | undefined,
  notify: StatusManagementNotifications
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: StatusOrg) => saveStatusOrg({ ...org, ...value }),
    onSuccess: canonical => {
      queryClient.setQueryData(statusManagementQueryKeys.org(), canonical);
      notify.saveSuccess();
    },
    onError: notify.saveFailed
  });
}
