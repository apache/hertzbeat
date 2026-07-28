/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Empty } from 'antd';
import { useTranslation } from 'react-i18next';

import type { BulletinCommand, BulletinRecovery } from '../model/bulletin-operation-state';
import { BulletinRecoveryAlert } from './bulletin-recovery-alert';

type BulletinListKind = 'idle' | 'loading' | 'empty' | 'ready' | 'invalid' | 'permission' | 'unavailable' | 'error';

export function BulletinPageStatus({
  command,
  list,
  recovery,
  onRetry
}: {
  command: BulletinCommand;
  list: { kind: BulletinListKind };
  recovery: BulletinRecovery | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const listFailed =
    list.kind === 'invalid' || list.kind === 'permission' || list.kind === 'unavailable' || list.kind === 'error';
  return (
    <>
      {listFailed && <Alert type="error" showIcon message={t(`bulletin.list.${list.kind}`)} />}
      {list.kind === 'empty' && <Empty description={t('bulletin.empty')} />}
      <BulletinRecoveryAlert recovery={recovery} recovering={command === 'recovering'} onRetry={onRetry} />
    </>
  );
}
