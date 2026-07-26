/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertCenterOperationRecovery } from '../model/alert-center-operation-state';

export function AlertCenterRecovery({
  recovery,
  retrying,
  retry
}: {
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
      message={t(recovery.failure === 'unavailable' ? 'common.unavailable' : failureKey)}
      action={
        <Button size="small" loading={retrying} disabled={retrying} onClick={() => void retry()}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}

function operationFailureKey(recovery: AlertCenterOperationRecovery) {
  if (recovery.kind === 'delete') return 'alert.deleteFailed';
  return `alert.${recovery.action}Failed`;
}
