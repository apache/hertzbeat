/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertCenterDeleteRecovery } from '../model/alert-center-operation-state';

export function AlertCenterRecovery({
  recovery,
  retrying,
  retry
}: {
  recovery: AlertCenterDeleteRecovery | null;
  retrying: boolean;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (!recovery) return null;
  return (
    <Alert
      type="warning"
      showIcon
      message={t(recovery.failure === 'unavailable' ? 'common.unavailable' : 'alert.deleteFailed')}
      action={
        <Button size="small" loading={retrying} disabled={retrying} onClick={() => void retry()}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}
