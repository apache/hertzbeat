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

import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertCenterOperationRecovery } from '../model/alert-center-operation-state';

export function AlertCenterRecovery({
  canRetry,
  recovery,
  retrying,
  retry
}: {
  canRetry: boolean;
  recovery: AlertCenterOperationRecovery | null;
  retrying: boolean;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (!recovery) return null;
  const failureKey = operationFailureKey(recovery);
  return (
    <Alert
      type="warning"
      showIcon
      message={t(recoveryFailureMessageKey(recovery.failure, failureKey))}
      action={
        canRetry ? (
          <Button size="small" loading={retrying} disabled={retrying} onClick={() => void retry()}>
            {t('common.retry')}
          </Button>
        ) : undefined
      }
    />
  );
}

function recoveryFailureMessageKey(failure: AlertCenterOperationRecovery['failure'], operationFailureKey: string) {
  if (failure === 'permission') return 'common.permission.roleRequiredDescription';
  if (failure === 'unavailable') return 'common.unavailable';
  return operationFailureKey;
}

function operationFailureKey(recovery: AlertCenterOperationRecovery) {
  if (recovery.kind === 'delete') return 'alert.deleteFailed';
  return `alert.${recovery.action}Failed`;
}
