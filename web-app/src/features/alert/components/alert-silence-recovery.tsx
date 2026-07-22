/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertSilenceRecovery as RecoveryState } from '../model/alert-silence-page-model';

export function AlertSilenceRecovery({
  busy,
  recovery,
  retry
}: {
  busy: boolean;
  recovery: RecoveryState | null;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (!recovery) return null;
  return (
    <Alert
      showIcon
      type="warning"
      message={t(recoveryMessageKey(recovery))}
      action={
        recovery.retryable ? (
          <Button size="small" disabled={busy} onClick={() => void retry()}>
            {t('common.retry')}
          </Button>
        ) : undefined
      }
    />
  );
}

function recoveryMessageKey(recovery: RecoveryState) {
  if (recovery.phase === 'projection') return 'common.routeError.description';
  if (recovery.kind === 'create' || recovery.kind === 'update') return 'alertSilences.saveFailed';
  return 'alertSilences.operationFailed';
}
