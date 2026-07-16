/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  deleteStatusComponent,
  deleteStatusIncident,
  saveStatusComponent,
  saveStatusIncident,
  saveStatusOrg
} from '../api/status-management-api';
import type { StatusComponent, StatusIncident, StatusOrg } from '../model/status-management-contract';

export function useStatusManagementMutations(
  org: StatusOrg | undefined,
  closeComponentEditor: () => void,
  closeIncidentEditor: () => void
) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const refresh = (key: string) => void queryClient.invalidateQueries({ queryKey: [key] });
  const saveSucceeded = () => void message.success(t('statusManagement.saveSuccess'));
  const saveFailed = () => void message.error(t('statusManagement.saveFailed'));
  const deleteSucceeded = () => void message.success(t('statusManagement.deleteSuccess'));
  const deleteFailed = () => void message.error(t('statusManagement.deleteFailed'));

  const orgSave = useMutation({
    mutationFn: (value: StatusOrg) => saveStatusOrg({ ...org, ...value }),
    onSuccess: () => { refresh('status-page-org'); saveSucceeded(); },
    onError: saveFailed
  });
  const componentSave = useMutation({
    mutationFn: (value: StatusComponent) => saveStatusComponent(value, value.id == null),
    onSuccess: () => {
      closeComponentEditor();
      refresh('status-page-components');
      saveSucceeded();
    },
    onError: saveFailed
  });
  const componentRemove = useMutation({
    mutationFn: (id: number) => deleteStatusComponent(id),
    onSuccess: () => { refresh('status-page-components'); deleteSucceeded(); },
    onError: deleteFailed
  });
  const incidentSave = useMutation({
    mutationFn: (value: StatusIncident) => saveStatusIncident(value, value.id == null),
    onSuccess: () => {
      closeIncidentEditor();
      refresh('status-page-incidents');
      saveSucceeded();
    },
    onError: saveFailed
  });
  const incidentRemove = useMutation({
    mutationFn: (id: number) => deleteStatusIncident(id),
    onSuccess: () => { refresh('status-page-incidents'); deleteSucceeded(); },
    onError: deleteFailed
  });
  return { orgSave, componentSave, componentRemove, incidentSave, incidentRemove };
}
