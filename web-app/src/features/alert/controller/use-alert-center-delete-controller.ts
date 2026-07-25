/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { QueryObserverResult } from '@tanstack/react-query';
import { useNotification } from '@refinedev/core';
import { useTranslation } from 'react-i18next';

import { AlertContractError, type AlertPage } from '../model/alert-model';
import { useAlertCenterDelete } from './use-alert-center-delete';

export function useAlertCenterDeleteController(
  rereadList: () => Promise<QueryObserverResult<AlertPage, Error>>,
  refreshSummary: () => unknown
) {
  const notification = useNotification();
  const { t } = useTranslation();
  return useAlertCenterDelete({
    reread: async () => {
      const result = await rereadList();
      if (result.isError) throw result.error;
      if (!result.data) throw new AlertContractError('Alert delete projection is missing');
    },
    success: () => {
      notification.open?.({ type: 'success', message: t('alert.deleteSuccess') });
      void refreshSummary();
    },
    failure: kind => {
      const message = kind === 'unavailable' ? t('common.unavailable') : t('alert.deleteFailed');
      notification.open?.({ type: 'error', message });
    }
  });
}
