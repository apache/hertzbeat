/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import type { BulletinOutcomeNotice, BulletinRecovery } from '../model/bulletin-operation-state';

export function BulletinRecoveryAlert({
  recovery,
  recovering,
  onRetry,
  onStop
}: {
  recovery: BulletinRecovery | null;
  recovering: boolean;
  onRetry: () => void;
  onStop: () => void;
}) {
  const { t } = useTranslation();
  if (!recovery) return null;
  return (
    <Alert
      type="error"
      showIcon
      message={t(recoveryMessageKey(recovery))}
      action={
        <Space>
          <Button loading={recovering} onClick={onRetry}>
            {t('common.retry')}
          </Button>
          <Button onClick={onStop}>{t('bulletin.recovery.stop')}</Button>
        </Space>
      }
    />
  );
}

export function BulletinOutcomeNoticeAlert({
  notice,
  onDismiss
}: {
  notice: BulletinOutcomeNotice | null;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  if (!notice) return null;
  return (
    <Alert
      type="warning"
      showIcon
      message={t(outcomeMessageKey(notice), outcomeMessageValues(notice))}
      action={<Button onClick={onDismiss}>{t('bulletin.recovery.dismiss')}</Button>}
    />
  );
}

function recoveryMessageKey(recovery: BulletinRecovery) {
  if (recovery.stage === 'projection') return 'bulletin.recovery.projectionStale';
  const operation = recovery.stage === 'delete-proof' ? 'deleteError' : 'save';
  return `bulletin.${operation}.${recovery.failure}`;
}

function outcomeMessageKey(notice: BulletinOutcomeNotice) {
  if (notice.kind === 'projection-stopped') return `bulletin.recovery.projection.${notice.operation}`;
  if (notice.stage === 'create-proof') return 'bulletin.recovery.create';
  if (notice.stage === 'update-proof') return 'bulletin.recovery.update';
  return notice.batch ? 'bulletin.recovery.deleteBatch' : 'bulletin.recovery.delete';
}

function outcomeMessageValues(notice: BulletinOutcomeNotice) {
  if (notice.kind === 'projection-stopped') return {};
  if (notice.stage === 'create-proof') return { name: notice.draft.name };
  if (notice.stage === 'update-proof') return { name: notice.draft.name, id: notice.draft.id };
  return { count: notice.count, ids: notice.ids.join(', ') };
}
