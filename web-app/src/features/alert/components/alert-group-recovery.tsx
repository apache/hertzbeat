/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertGroupOperationRecovery } from '../model/alert-group-operation-state';

/** Renders retained proof ownership without presenting an uncertain write as failed. */
export function AlertGroupRecovery({
  recovery,
  retrying,
  retry
}: {
  recovery: AlertGroupOperationRecovery | undefined;
  retrying: boolean;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (!recovery) return null;
  return (
    <Alert
      type="warning"
      showIcon
      message={t(recovery.failure === 'unavailable' ? 'common.unavailable' : 'common.routeError.description')}
      action={
        <Button size="small" disabled={retrying} loading={retrying} onClick={() => void retry()}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}
