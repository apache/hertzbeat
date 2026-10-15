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

import type { QueryObserverResult } from '@tanstack/react-query';
import { useNotification } from '@refinedev/core';
import { useTranslation } from 'react-i18next';

import { AlertContractError, type AlertPage } from '../model/alert-model';
import { useAlertCenterOperation } from './use-alert-center-operation';

export function useAlertCenterOperationController(
  rereadList: () => Promise<QueryObserverResult<AlertPage, Error>>,
  refreshSummary: () => unknown
) {
  const notification = useNotification();
  const { t } = useTranslation();
  return useAlertCenterOperation({
    reread: async () => {
      const result = await rereadList();
      if (result.isError) throw result.error;
      if (!result.data) throw new AlertContractError('Alert center projection is missing');
    },
    success: receipt => {
      notification.open?.({ type: 'success', message: t(operationMessageKey(receipt, 'Success')) });
      void refreshSummary();
    },
    failure: (kind, receipt) => {
      notification.open?.({
        type: 'error',
        message: t(operationFailureMessageKey(kind, receipt))
      });
    }
  });
}

function operationFailureMessageKey(
  kind: 'permission' | 'unavailable' | 'error',
  receipt: { kind: 'delete' } | { kind: 'status'; action: 'acknowledge' | 'unacknowledge' | 'resolve' | 'reopen' }
) {
  if (kind === 'permission') return 'common.permission.roleRequiredDescription';
  if (kind === 'unavailable') return 'common.unavailable';
  return operationMessageKey(receipt, 'Failed');
}

function operationMessageKey(
  receipt: { kind: 'delete' } | { kind: 'status'; action: 'acknowledge' | 'unacknowledge' | 'resolve' | 'reopen' },
  outcome: 'Success' | 'Failed'
) {
  if (receipt.kind === 'delete') return `alert.delete${outcome}`;
  return `alert.${receipt.action}${outcome}`;
}
