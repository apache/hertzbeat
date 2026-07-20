/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

/** Keeps destructive-write recovery explicit and separate from ordinary list refresh. */
export function StatusDeleteRecoveryAlert({ pending, onRetry }: { pending: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Alert
      type="warning"
      showIcon
      message={t('statusManagement.unknown')}
      action={
        <Button size="small" disabled={pending} loading={pending} onClick={onRetry}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}
