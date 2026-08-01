/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

/** Keeps destructive-write recovery explicit and separate from ordinary list refresh. */
export function StatusDeleteRecoveryAlert({ pending, onRetry }: { pending: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <OperationalStatePanel
      kind="unavailable"
      title={t('statusManagement.unknown')}
      action={
        <Button size="small" disabled={pending} loading={pending} onClick={onRetry}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}
