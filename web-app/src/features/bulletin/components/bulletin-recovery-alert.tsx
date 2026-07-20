/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { BulletinRecovery } from '../model/bulletin-operation-state';

export function BulletinRecoveryAlert({
  recovery,
  recovering,
  onRetry
}: {
  recovery: BulletinRecovery | null;
  recovering: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  if (!recovery) return null;
  return (
    <Alert
      type="error"
      showIcon
      message={t(recoveryMessageKey(recovery))}
      action={
        <Button loading={recovering} onClick={onRetry}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}

function recoveryMessageKey(recovery: BulletinRecovery) {
  if (recovery.stage === 'projection') return 'bulletin.list.error';
  const operation = recovery.stage === 'delete-proof' ? 'deleteError' : 'save';
  return `bulletin.${operation}.${recovery.failure}`;
}
