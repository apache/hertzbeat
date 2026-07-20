/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertInhibitRecovery as RecoveryState } from '../model/alert-inhibit-state';

export function AlertInhibitRecovery({
  recovery,
  retrying,
  retry
}: {
  recovery: RecoveryState | undefined;
  retrying: boolean;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (!recovery) return null;
  return (
    <Alert
      type="warning"
      showIcon
      message={t('common.unavailable')}
      {...(recovery.retryable && {
        action: (
          <Button size="small" disabled={retrying || !recovery.retryable} onClick={() => void retry()}>
            {t('common.retry')}
          </Button>
        )
      })}
    />
  );
}
