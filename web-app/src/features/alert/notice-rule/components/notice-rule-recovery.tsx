/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { NoticeRuleOperationRecovery } from '../model/notice-rule-operation-state';

/** Presents retained proof ownership without claiming that an uncertain write failed. */
export function NoticeRuleRecovery({
  recovery,
  canRetry,
  retryBusy,
  retry
}: {
  recovery: NoticeRuleOperationRecovery | undefined;
  canRetry: boolean;
  retryBusy: boolean;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (!recovery) return null;
  return (
    <Alert
      type="warning"
      showIcon
      message={t(recovery.failure === 'error' ? 'common.routeError.description' : 'common.unavailable')}
      action={
        recovery.retryable && canRetry ? (
          <Button size="small" disabled={retryBusy} loading={retryBusy} onClick={() => void retry()}>
            {t('common.retry')}
          </Button>
        ) : undefined
      }
    />
  );
}
