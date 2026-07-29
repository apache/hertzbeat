/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Empty } from 'antd';
import { useTranslation } from 'react-i18next';

import type { BulletinCommand, BulletinOutcomeNotice, BulletinRecovery } from '../model/bulletin-operation-state';
import { BulletinOutcomeNoticeAlert, BulletinRecoveryAlert } from './bulletin-recovery-alert';

type BulletinListKind =
  'idle' | 'loading' | 'correcting' | 'empty' | 'ready' | 'invalid' | 'permission' | 'unavailable' | 'error';

export function BulletinPageStatus({
  command,
  list,
  notice,
  recovery,
  onDismissNotice,
  onRetry,
  onStopVerification
}: {
  command: BulletinCommand;
  list: { kind: BulletinListKind };
  notice: BulletinOutcomeNotice | null;
  recovery: BulletinRecovery | null;
  onDismissNotice: () => void;
  onRetry: () => void;
  onStopVerification: () => void;
}) {
  const { t } = useTranslation();
  const listFailed =
    list.kind === 'invalid' || list.kind === 'permission' || list.kind === 'unavailable' || list.kind === 'error';
  return (
    <>
      {listFailed && <Alert type="error" showIcon message={t(`bulletin.list.${list.kind}`)} />}
      {list.kind === 'empty' && <Empty description={t('bulletin.empty')} />}
      <BulletinRecoveryAlert
        recovery={recovery}
        recovering={command === 'recovering'}
        onRetry={onRetry}
        onStop={onStopVerification}
      />
      <BulletinOutcomeNoticeAlert notice={notice} onDismiss={onDismissNotice} />
    </>
  );
}
